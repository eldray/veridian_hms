import { Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { NotificationService } from './NotificationService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor(prisma: PrismaClient) {
    super();
    this.notificationService = new NotificationService(prisma);
  }

  getUserNotifications = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    
    // ✅ Use BaseController's safe pagination parser
    const { page, limit } = this.getPaginationParams(req);
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await this.notificationService.getUserNotifications(userId, unreadOnly, page, limit);
    
    // ✅ Use BaseController's paginated response formatter
    return this.paginated(res, result.notifications, result.pagination, 'Notifications retrieved successfully');
  });

  getNotificationStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    const stats = await this.notificationService.getNotificationStats(userId);
    return this.ok(res, stats, 'Notification stats retrieved successfully');
  });

  getUnreadCount = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    const count = await this.notificationService.getUnreadCount(userId);
    return this.ok(res, { unreadCount: count }, 'Unread count retrieved successfully');
  });

  markNotificationAsRead = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    
    try {
      const notification = await this.notificationService.markAsRead(req.params.id, userId);
      return this.ok(res, notification, 'Notification marked as read');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  markAllNotificationsAsRead = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    const result = await this.notificationService.markAllAsRead(userId);
    return this.ok(res, result, `${result.markedCount} notifications marked as read`);
  });

  deleteNotification = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    
    try {
      await this.notificationService.deleteNotification(req.params.id, userId);
      return this.ok(res, null, 'Notification deleted successfully');
    } catch (e: any) {
      return this.error(res, e);
    }
  });

  createNotification = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
    const notification = await this.notificationService.createNotification(req.body);
    return this.created(res, notification, 'Notification created successfully');
  });

  sendBulkNotification = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
    const result = await this.notificationService.sendBulkNotification(req.body);
    return this.ok(res, result, `Sent to ${result.successCount} users (${result.failCount} failed)`);
  });

  sendRoleNotification = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
    const result = await this.notificationService.sendRoleNotification(req.body);
    return this.ok(res, result, `Sent to ${result.success} users`);
  });

  sendUserMessage = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
    const fromUserId = req.user?.id;
    if (!fromUserId) return this.unauthorized(res, 'User authentication required');
    const result = await this.notificationService.sendUserMessage(fromUserId, req.body);
    return this.ok(res, result, 'Message sent successfully');
  });

  sendBulkUserMessages = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return this.badRequest(res, 'Validation failed', errors.array() as any[]);
    const fromUserId = req.user?.id;
    if (!fromUserId) return this.unauthorized(res, 'User authentication required');
    const result = await this.notificationService.sendBulkUserMessages(fromUserId, req.body);
    return this.ok(res, result, `Messages sent to ${result.success} user(s)`);
  });

  getConversations = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return this.unauthorized(res, 'User authentication required');
    const conversations = await this.notificationService.getConversations(userId);
    return this.ok(res, conversations, 'Conversations retrieved successfully');
  });

  cleanupOldNotifications = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const daysToKeep = parseInt(req.query.daysToKeep as string) || 30;
    const count = await this.notificationService.cleanupOldNotifications(daysToKeep);
    return this.ok(res, { deletedCount: count }, `Cleaned up ${count} old notifications`);
  });

  triggerLowStockCheck = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.notificationService.sendLowStockAlerts();
    return this.ok(res, result, `Low stock check completed. Sent ${result.sent} notifications`);
  });

  triggerAppointmentReminders = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const count = await this.notificationService.sendAppointmentReminders();
    return this.ok(res, { remindersSent: count }, `Sent ${count} appointment reminders`);
  });
}