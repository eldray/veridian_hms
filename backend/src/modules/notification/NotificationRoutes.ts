// modules/notification/NotificationRoutes.ts

import { Router } from 'express';
import { NotificationController } from './NotificationController';
import { body } from 'express-validator';
import { authenticate, authorize } from '../../middleware/authMiddleware';

export const createNotificationRoutes = (prisma: any): Router => {
  const router = Router();
  const controller = new NotificationController(prisma);

  // All routes require authentication
  router.use(authenticate);

  // ============================================
  // USER NOTIFICATION ROUTES
  // ============================================

  // Get user notifications
  router.get('/', controller.getUserNotifications);

  // Get unread count
  router.get('/unread-count', controller.getUnreadCount);

  // Get notification stats
  router.get('/stats', controller.getNotificationStats);

  // Mark notification as read
  router.patch('/:id/read', controller.markNotificationAsRead);

  // Mark all notifications as read
  router.patch('/mark-all-read', controller.markAllNotificationsAsRead);

  // Delete notification
  router.delete('/:id', controller.deleteNotification);

  // ============================================
  // ADMIN/BULK NOTIFICATION ROUTES
  // ============================================

  // Send bulk notification (Admin only)
  router.post(
    '/bulk',
    authorize(['admin']),
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']),
    controller.sendBulkNotification
  );

  // Send role-based notification (Admin only)
  router.post(
    '/role',
    authorize(['admin']),
    body('roles').isArray().withMessage('Roles array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']),
    controller.sendRoleNotification
  );

  // ============================================
  // USER-TO-USER MESSAGING ROUTES
  // ============================================

  // Send user message
  router.post(
    '/message',
    body('toUserId').notEmpty().withMessage('Recipient user ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    controller.sendUserMessage
  );

  // Send bulk user messages
  router.post(
    '/message/bulk',
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    controller.sendBulkUserMessages
  );

  // Get conversations
  router.get('/conversations', controller.getConversations);

  // ============================================
  // SYSTEM MAINTENANCE ROUTES (Admin only)
  // ============================================

  // Cleanup old notifications
  router.delete('/cleanup', authorize(['admin']), controller.cleanupOldNotifications);

  // Trigger low stock check
  router.post('/trigger/low-stock', authorize(['admin']), controller.triggerLowStockCheck);

  // Trigger appointment reminders
  router.post('/trigger/appointment-reminders', authorize(['admin']), controller.triggerAppointmentReminders);

  return router;
};
