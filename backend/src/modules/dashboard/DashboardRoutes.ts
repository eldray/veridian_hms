import { Router } from 'express';
import { DashboardController } from './DashboardController';
import { protect, requireRole } from '../../middleware/authMiddleware';

const dashboardController = new DashboardController();
const router = Router();

// All routes require authentication
router.use(protect);

// Dashboard routes - accessible to all authenticated users
router.get('/stats', dashboardController.getDashboardStats);

export default router;