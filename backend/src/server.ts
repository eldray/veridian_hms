// server.ts or app.ts
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import routes from './app';
import { runDailyWardChargeJob } from './cron/wardChargeCron';
import { initCounterService } from './services/CounterService';
import prisma from './core/database/prisma.client';
import { toHttpError } from './utils/httpError';

const app = express();

const isDesktopApp = process.env.ELECTRON === 'true' && process.env.NODE_ENV === 'production';

// Security middleware
app.use(
  helmet(
    isDesktopApp
      ? {
          // The desktop app serves the UI over plain http://127.0.0.1, so do not force https upgrades,
          // and allow blob:/data: image previews (patient photos, scans) used by the UI.
          contentSecurityPolicy: {
            useDefaults: true,
            directives: {
              'img-src': ["'self'", 'data:', 'blob:', 'https:'],
              'upgrade-insecure-requests': null,
            },
          },
          hsts: false,
        }
      : undefined
  )
);
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Static files (uploads)
app.use('/uploads', express.static('uploads'));

// ── Desktop app: serve the built frontend from the same Express server ─────
// main.cjs loads the UI from http://127.0.0.1:<port>, so Express serves the Vite dist/ files.
// IMPORTANT: this must be registered synchronously and BEFORE the SPA fallback below. It used to be
// registered inside promise callbacks, i.e. after the fallback, so every /assets/*.js request got
// index.html back and the window stayed blank.
// Packaged layout: resources/backend/server.mjs -> resources/frontend/dist
const frontendDist =
  process.env.FRONTEND_DIST || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist');

if (isDesktopApp) {
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    console.log(`🌐 Serving frontend from: ${frontendDist}`);
  } else {
    console.warn('⚠️  Frontend dist not found at:', frontendDist);
  }
}

// API routes
app.use('/api', routes);

// SPA fallback — serve index.html for client-side routes (React Router). Never for API/uploads/asset files.
if (isDesktopApp) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || path.extname(req.path)) return next();
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { status, message } = toHttpError(error);
  // Expected client errors (404, 400, 409 ...) are not worth a stack trace in the log
  if (status >= 500) console.error('🚨 Global error handler:', error);
  else console.warn(`⚠️  ${req.method} ${req.originalUrl} -> ${status}: ${message}`);

  if (res.headersSent) return next(error);
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

// ✅ UPDATED: Function to run seed script safely
const runSeedScript = async () => {
  try {
    console.log('🌱 Checking if database needs seeding...');
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Import and run seed script
    const { seedDatabase } = await import('./seed/seedData');
    const result = await seedDatabase();

    if ((result as any).results?.testData?.success) {
      console.log('✅ New data was seeded successfully');
    } else {
      console.log('ℹ️ Database already has data, no seeding needed');
    }

    return result;
  } catch (error) {
    console.error('❌ Database seeding failed:', error);

    // Check if it's a "already seeded" error or a real error
    if (error instanceof Error && (
      error.message.includes('already seeded') ||
      error.message.includes('already exists') ||
      error.message.includes('Real data detected')
    )) {
      console.log('ℹ️  Database already seeded, continuing...');
      return { seeded: false, reason: 'already_exists' };
    } else {
      console.error('🚨 Serious seeding error, but continuing server startup...');
      return { seeded: false, reason: 'error', error: error instanceof Error ? error.message : String(error) };
    }
  }
};

// Start server and run seed script
const startServer = async () => {
  // ✅ Initialize Counter Service FIRST
  await initCounterService(prisma);
  console.log('✅ Counter Service initialized');

  // ✅ UPDATED: Only run seed in development or if explicitly enabled
  const shouldRunSeed = process.env.NODE_ENV === 'development' || process.env.RUN_SEED === 'true';

  if (shouldRunSeed) {
    console.log('🔧 Running database initialization...');
    await runSeedScript();
  } else {
    console.log('🏭 Production: Skipping auto-seeding');
  }

  // 🕐 Schedule daily ward charge job at midnight (00:00) every day
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running scheduled daily ward charge job...');
    await runDailyWardChargeJob();
  }, {
    timezone: 'UTC'
  });

  console.log('✅ Daily ward charge cron job scheduled for midnight UTC');

  const onListening = () => {
    console.log(`🏥 Hospital Management System API running on port ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌱 Auto-seeding: ${shouldRunSeed ? 'enabled' : 'disabled'}`);

    // Additional info for development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n👤 Test User Credentials:');
      console.log('   - doctor1 / doctor123');
      console.log('   - nurse1 / nurse123');
      console.log('   - admin / admin123');
      console.log('\n📋 Test Patients: PAT-10000, PAT-10001');
    }
  };

  // Desktop app binds to 127.0.0.1 only (HOST is set by main.cjs). In dev, keep Node's default
  // dual-stack bind so `localhost` (IPv4 or IPv6) keeps working for the Vite proxy / ngrok.
  const httpServer = process.env.HOST
    ? app.listen(Number(PORT), process.env.HOST, onListening)
    : app.listen(PORT, onListening);

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`🚨 Could not start HTTP server on port ${PORT}: ${err.code || ''} ${err.message}`);
    process.exit(1);
  });
};

startServer().catch((err) => {
  // Surface the real reason (e.g. database unreachable) on stderr so the desktop shell can show it
  console.error('🚨 Failed to start server:', err?.message || err);
  process.exit(1);
});

export default app;