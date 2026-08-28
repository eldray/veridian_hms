// server.ts or app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cron from 'node-cron';
import routes from './app';
import { runDailyWardChargeJob } from './cron/wardChargeCron';
import { initCounterService } from './services/CounterService'; // ✅ ADD THIS

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
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

// ── Production: serve the built frontend from the same Express server ──────
// When packaged as Electron app (ELECTRON=true), main.cjs loads the UI from
// http://127.0.0.1:5000 — so Express must serve the Vite dist/ files too.
if (process.env.ELECTRON === 'true' && process.env.NODE_ENV === 'production') {
  import('path').then(({ default: pathModule }) => {
    import('url').then(({ fileURLToPath }) => {
      import('fs').then(({ default: fsModule }) => {
        // In packaged app: resources/backend/server.js → resources/frontend/dist
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = pathModule.dirname(__filename);
        const frontendDist = pathModule.join(__dirname, '..', 'frontend', 'dist');
        if (fsModule.existsSync(frontendDist)) {
          app.use(express.static(frontendDist));
          console.log(`🌐 Serving frontend from: ${frontendDist}`);
        } else {
          console.warn('⚠️  Frontend dist not found at:', frontendDist);
        }
      });
    });
  });
}

// API routes
app.use('/api', routes);

// SPA fallback — for production Electron, serve index.html for all non-API/asset routes
// This enables React Router's client-side routing to work correctly.
if (process.env.ELECTRON === 'true' && process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    import('path').then(({ default: p }) => {
      import('url').then(({ fileURLToPath }) => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = p.dirname(__filename);
        const indexHtml = p.join(__dirname, '..', 'frontend', 'dist', 'index.html');
        res.sendFile(indexHtml, (err) => {
          if (err) next();
        });
      });
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
  console.error('🚨 Global error handler:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
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

    if (result.testData?.seeded) {
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
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
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

  app.listen(PORT, () => {
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
  });
};

startServer();

export default app;