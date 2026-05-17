// app.ts - NEW MODULAR ARCHITECTURE
// This file now delegates to the modular structure in /modules/

import { Router, Express } from 'express';
import { PrismaClient } from '@prisma/client';
import { registerModules } from './modules';

const router = Router();
const prisma = new PrismaClient();

// Register all modules using the new modular architecture
registerModules(router as unknown as Express, prisma);

// Health check endpoint
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