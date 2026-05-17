// modules/notification/NotificationRoutes.ts

import { Router } from 'express';
import { NotificationController } from './NotificationController';
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createNotificationRoutes = (prisma: any): Router => {
  const router = Router();
  const controller = new NotificationController(prisma);

  // All routes require authentication
  router.use(protect);

  // ============================================
  // USER NOTIFICATION ROUTES
  // ============================================

  // Get user notifications
  router.get('/', controller.getUserNotifications.bind(controller));

  // Get unread count
  router.get('/unread-count', controller.getUnreadCount.bind(controller));

  // Get notification stats
  router.get('/stats', controller.getNotificationStats.bind(controller));

  // Mark notification as read
  router.patch('/:id/read', controller.markNotificationAsRead.bind(controller));

  // Mark all notifications as read
  router.patch('/mark-all-read', controller.markAllNotificationsAsRead.bind(controller));

  // Delete notification
  router.delete('/:id', controller.deleteNotification.bind(controller));

  // ============================================
  // ADMIN/BULK NOTIFICATION ROUTES
  // ============================================

  // Send bulk notification (Admin only)
  router.post(
    '/bulk',
    requireRole(['admin']),
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']),
    controller.sendBulkNotification.bind(controller)
  );

  // Send role-based notification (Admin only)
  router.post(
    '/role',
    requireRole(['admin']),
    body('roles').isArray().withMessage('Roles array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
    body('priority').isIn(['low', 'medium', 'high', 'urgent']),
    controller.sendRoleNotification.bind(controller)
  );

  // ============================================
  // USER-TO-USER MESSAGING ROUTES
  // ============================================

  // Send user message (available to all authenticated users)
  router.post(
    '/message',
    body('toUserId').notEmpty().withMessage('Recipient user ID is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    controller.sendUserMessage.bind(controller)
  );

  // Send bulk user messages (Admin only)
  router.post(
    '/message/bulk',
    requireRole(['admin']),
    body('userIds').isArray().withMessage('User IDs array is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    controller.sendBulkUserMessages.bind(controller)
  );

  // Get conversations (available to all authenticated users)
  router.get('/conversations', controller.getConversations.bind(controller));

  // ============================================
  // SYSTEM MAINTENANCE ROUTES (Admin only)
  // ============================================

  // Cleanup old notifications
  router.delete('/cleanup', requireRole(['admin']), controller.cleanupOldNotifications.bind(controller));

  // Trigger low stock check
  router.post('/trigger/low-stock', requireRole(['admin']), controller.triggerLowStockCheck.bind(controller));

  // Trigger appointment reminders
  router.post('/trigger/appointment-reminders', requireRole(['admin']), controller.triggerAppointmentReminders.bind(controller));

  return router;
};