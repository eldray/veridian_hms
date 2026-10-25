// server.ts or app.ts
import 'dotenv/config';
import express, { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cron from 'node-cron';
import routes from './app';
import { serveUploadFile } from './middleware/fileAccess';
import { requestId } from './middleware/requestId';
import { runDailyWardChargeJob } from './cron/wardChargeCron';
import { initCounterService } from './services/CounterService';
import prisma from './core/database/prisma.client';
import { toHttpError } from './utils/httpError';

const app = express();
const PORT = process.env.PORT || 5000;

// Authentication configuration preflight. Never print the secret itself.
// AuthService rejects missing/short secrets during token signing; warn at startup
// so the API does not appear healthy while every valid login fails with HTTP 500.
const configuredJwtSecret = process.env.JWT_SECRET;
if (!configuredJwtSecret || configuredJwtSecret.length < 32) {
  console.error(
    '🚨 Authentication configuration error: JWT_SECRET is missing or shorter than 32 characters. ' +
    'Set JWT_SECRET in the backend environment and restart the API; login/token generation will fail until corrected.'
  );
} else {
  console.log('🔐 JWT_SECRET configuration check passed');
}

const isDesktopApp = process.env.ELECTRON === 'true' && process.env.NODE_ENV === 'production';

// Correlates a user-visible failure with this request's log line.
app.use(requestId);

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
// Only known UI origins may call the API from a browser. Requests without an
// Origin header (desktop shell, curl, same-origin) are still allowed.
// Additional trusted origins can be supplied with CORS_ALLOWED_ORIGINS.
// The Vite dev server origins are excluded from production builds.
const allowedOrigins = new Set([
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://127.0.0.1:3000']
    : []),
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  ...(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    return callback(null, allowedOrigins.has(origin));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API responses contain patient data, so browsers and intermediaries must not
// reuse them. Uploaded files set their own private cache header in the handler.
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Logging. Search and filter query strings can contain patient names or MRNs,
// so the path is logged without the query string.
morgan.token('path', (req) => req.originalUrl.split('?')[0]);
morgan.token('reqid', (req) => (req as unknown as { id?: string }).id || '-');
app.use(morgan(':remote-addr :method :path :status :res[content-length] - :response-time ms [:reqid]'));

// Uploaded patient, scan and document files are private health data. They are
// served through an authenticated route instead of express.static, so knowing
// a filename is not enough to download it. Login sets an HttpOnly cookie that
// lets <img> and <a> requests authenticate; API clients may use a bearer token.
const uploadFiles = Router();
uploadFiles.get('/:category/:filename', serveUploadFile);
app.use('/uploads', uploadFiles);
app.use('/api/uploads', uploadFiles);

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
    message: 'Route not found',
    requestId: req.id,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { status, message } = toHttpError(error);
  // Expected client errors (404, 400, 409 ...) are not worth a stack trace in the log
  if (status >= 500) console.error(`🚨 [${req.id}] Global error handler:`, error);
  else console.warn(`⚠️  [${req.id}] ${req.method} ${req.originalUrl.split('?')[0]} -> ${status}: ${message}`);

  if (res.headersSent) return next(error);
  res.status(status).json({
    success: false,
    message,
    requestId: req.id,
    ...(process.env.NODE_ENV === 'development' && status >= 500 && { stack: error.stack })
  });
});

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
  const wardChargeTask = cron.schedule('0 0 * * *', async () => {
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

    // Additional info for development. Disabled by default so demo credentials
    // never appear in production logs or support bundles.
    if (process.env.SHOW_DEV_CREDENTIALS === 'true') {
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

  // Drain connections and close Prisma before exiting so scheduled work and
  // in-flight database queries are not killed mid-write.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n${signal} received: shutting down the API...`);
    wardChargeTask.stop();
    const forceExit = setTimeout(() => {
      console.error('Shutdown timed out after 10 seconds; exiting forcefully.');
      process.exit(1);
    }, 10_000);
    forceExit.unref();
    httpServer.close(async () => {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.error('Prisma disconnect failed during shutdown:', error);
      } finally {
        process.exit(0);
      }
    });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
};

startServer().catch((err) => {
  // Surface the real reason (e.g. database unreachable) on stderr so the desktop shell can show it
  console.error('🚨 Failed to start server:', err?.message || err);
  process.exit(1);
});

export default app;