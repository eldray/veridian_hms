// app.ts - NEW MODULAR ARCHITECTURE (FIXED - NO /api prefix)
import { Router, Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerModules } from './modules';

const router = Router();
const prisma = new PrismaClient();

// Register all modules - they will mount their own paths
// The modules should mount routes at root level (e.g., /auth, /patients, etc.)
// Then server.ts will add the /api prefix
registerModules(router as unknown as Express, prisma);

// Health check endpoint (mounted at root, will become /api/health after server.ts adds prefix)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Hospital Management System API is running (Modular Architecture)',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    architecture: 'modular'
  });
});

export default router;