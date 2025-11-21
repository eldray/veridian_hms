import express from 'express';
import {
  getDashboardStats
} from '../controllers/dashboardController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// Dashboard statistics route
router.get('/stats', getDashboardStats);

export default router;