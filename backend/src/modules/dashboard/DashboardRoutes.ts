// modules/dashboard/DashboardRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DashboardController } from './DashboardController';
import { protect } from '../../middleware/authMiddleware';

// FIXED: accepts prisma so the connection pool is shared — no more top-level new PrismaClient()
export function createDashboardRoutes(prisma: PrismaClient): Router {
  const router     = Router();
  // FIXED: passes prisma through to controller → service
  const controller = new DashboardController(prisma);

  router.use(protect);

  router.get('/stats',         controller.getDashboardStats);
  // FIXED: removed stray leading space before /stats/weekly
  router.get('/stats/weekly',  controller.getWeeklyStats);
  router.get('/stats/monthly', controller.getMonthlyStats);

  return router;
}

export default createDashboardRoutes;