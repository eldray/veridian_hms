// app.ts - NEW MODULAR ARCHITECTURE (FIXED - NO /api prefix)
import { Router, Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerModules } from './modules';

const router = Router();
import prisma from './core/database/prisma.client';

// Register all modules - they will mount their own paths
// The modules should mount routes at root level (e.g., /auth, /patients, etc.)
// Then server.ts will add the /api prefix
registerModules(router as unknown as Express, prisma);

// Liveness: proves the process is up. Readiness (below) also checks the database.
router.get('/health/live', (req, res) => {
  res.json({
    success: true,
    message: 'Hospital Management System API process is running',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
  });
});

// Readiness: the desktop shell and any reverse proxy use this to decide whether
// the API can serve clinical traffic.
router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      message: 'Hospital Management System API is running (Modular Architecture)',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      architecture: 'modular',
      database: 'up',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database is unavailable',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      database: 'down',
    });
  }
});

export default router;