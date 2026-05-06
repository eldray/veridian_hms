// backend/src/routes/notificationRoutes.ts
import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  sendBulkNotification,
  sendRoleNotification,           // ✅ NEW
  triggerLowStockCheck,           // ✅ NEW
  triggerAppointmentReminders,    // ✅ NEW
  cleanupOldNotifications         // ✅ NEW
} from '../controllers/notificationController';
import { protect, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User notification routes
router.get('/', getUserNotifications);
router.get('/stats', getNotificationStats);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

// Admin notification routes
router.post('/bulk', requireAdmin, sendBulkNotification);
router.post('/role', requireAdmin, sendRoleNotification);           // ✅ NEW - Send to roles
router.post('/trigger/low-stock', requireAdmin, triggerLowStockCheck);      // ✅ NEW
router.post('/trigger/reminders', requireAdmin, triggerAppointmentReminders); // ✅ NEW
router.delete('/cleanup', requireAdmin, cleanupOldNotifications);    // ✅ NEW

export default router;