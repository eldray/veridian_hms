import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DashboardController } from './DashboardController';
import { protect } from '../../middleware/authMiddleware';

export function createDashboardRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new DashboardController(prisma);

  router.use(protect);

  // Single unified stats endpoint — period/date handled via query params
  router.get('/stats', controller.getDashboardStats);

  return router;
}

export default createDashboardRoutes;