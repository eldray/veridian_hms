import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  sendBulkNotification
} from '../controllers/notificationController';
import { protect, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getUserNotifications);
router.get('/stats', getNotificationStats);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);
router.post('/bulk', requireAdmin, sendBulkNotification);

export default router;