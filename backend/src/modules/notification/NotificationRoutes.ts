import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { NotificationController } from './NotificationController'; // ✅ Import class directly
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createNotificationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new NotificationController(prisma); // ✅ Instantiate directly

  router.use(protect);

  const adminRoles: UserRole[] = ['admin'];

  // ==========================================
  // SPECIFIC ROUTES FIRST
  // ==========================================
  router.get('/unread-count', controller.getUnreadCount);
  router.get('/stats', controller.getNotificationStats);
  router.patch('/mark-all-read', controller.markAllNotificationsAsRead);
  router.get('/conversations', controller.getConversations);
  
  // Admin Maintenance
  router.delete('/cleanup', requireRole(adminRoles), controller.cleanupOldNotifications);
  router.post('/trigger/low-stock', requireRole(adminRoles), controller.triggerLowStockCheck);
  router.post('/trigger/appointment-reminders', requireRole(adminRoles), controller.triggerAppointmentReminders);

  // Create single notification
  router.post('/', [body('userId').notEmpty(), body('title').notEmpty(), body('message').notEmpty(), body('type').notEmpty(), body('priority').notEmpty()], controller.createNotification);

  // Bulk/Role Messaging
  router.post('/bulk', requireRole(adminRoles), [body('userIds').isArray(), body('title').notEmpty(), body('message').notEmpty()], controller.sendBulkNotification);
  router.post('/role', requireRole(adminRoles), [body('roles').isArray(), body('title').notEmpty(), body('message').notEmpty()], controller.sendRoleNotification);
  router.post('/message', [body('toUserId').notEmpty(), body('title').notEmpty(), body('message').notEmpty()], controller.sendUserMessage);
  router.post('/message/bulk', requireRole(adminRoles), [body('userIds').isArray(), body('title').notEmpty(), body('message').notEmpty()], controller.sendBulkUserMessages);

  // ==========================================
  // DYNAMIC ID ROUTES
  // ==========================================
  router.get('/', controller.getUserNotifications);
  router.patch('/:id/read', controller.markNotificationAsRead);
  router.delete('/:id', controller.deleteNotification);

  return router;
}