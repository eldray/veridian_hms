import { Router } from 'express';
import { DashboardController } from './DashboardController';
import { authenticate, authorize } from '../../middleware/authMiddleware';

const dashboardController = new DashboardController();
const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard routes
router.get('/stats', authorize(['admin', 'staff']), dashboardController.getDashboardStats);

export default router;
