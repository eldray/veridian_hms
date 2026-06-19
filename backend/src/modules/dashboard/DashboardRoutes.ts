import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DashboardController } from './DashboardController';
import { protect } from '../../middleware/authMiddleware';

export function createDashboardRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new DashboardController(prisma);

  router.use(protect);

  // Specific routes BEFORE dynamic params (though none exist here, good practice)
  router.get('/stats/weekly', controller.getWeeklyStats);
  router.get('/stats/monthly', controller.getMonthlyStats);
  
  // General stats
  router.get('/stats', controller.getDashboardStats);

  return router;
}

export default createDashboardRoutes;