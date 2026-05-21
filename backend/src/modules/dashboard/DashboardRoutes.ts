// modules/dashboard/DashboardRoutes.ts
import { Router } from 'express';
import { DashboardController } from './DashboardController';
import { protect } from '../../middleware/authMiddleware';

const dashboardController = new DashboardController();
const router = Router();

// All routes require authentication
router.use(protect);

// Dashboard routes - accessible to all authenticated users
router.get('/stats', dashboardController.getDashboardStats);

// Optional: Add weekly and monthly stats routes (uncomment if needed)
// router.get('/stats/weekly', dashboardController.getWeeklyStats);
// router.get('/stats/monthly', dashboardController.getMonthlyStats);

export default router;