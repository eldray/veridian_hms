// routes/notificationRoutes.ts
import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  sendBulkNotification,
  sendRoleNotification,
  sendUserMessage,           // ✅ NEW
  sendBulkUserMessages,      // ✅ NEW
  getConversations,          // ✅ NEW
  triggerLowStockCheck,
  triggerAppointmentReminders,
  cleanupOldNotifications
} from '../controllers/notificationController';
import { protect, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// Existing routes
router.get('/', getUserNotifications);
router.get('/stats', getNotificationStats);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);

// ✅ NEW: User-to-user messaging
router.post('/message', sendUserMessage);
router.post('/messages/bulk', sendBulkUserMessages);
router.get('/conversations', getConversations);

// Admin routes
router.post('/bulk', requireAdmin, sendBulkNotification);
router.post('/role', requireAdmin, sendRoleNotification);
router.post('/trigger/low-stock', requireAdmin, triggerLowStockCheck);
router.post('/trigger/reminders', requireAdmin, triggerAppointmentReminders);
router.delete('/cleanup', requireAdmin, cleanupOldNotifications);

export default router;