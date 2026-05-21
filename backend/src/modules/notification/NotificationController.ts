// modules/notification/NotificationController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { BaseController } from '../../shared/base/BaseController';
import { NotificationService } from './NotificationService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor(prisma: any) {
    super(); // BaseController doesn't accept prisma parameter
    this.notificationService = new NotificationService(prisma);
  }

  // ============================================
  // GET USER NOTIFICATIONS
  // ============================================

  getUserNotifications = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }
      
      const { unreadOnly, page = 1, limit = 20 } = req.query;
  
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  
      const result = await this.notificationService.getUserNotifications(
        userId,
        unreadOnly === 'true',
        pageNum,
        limitNum
      );
  
      // ✅ Return proper wrapped response with pagination
      this.ok(res, {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: result.pagination
      }, 'Notifications retrieved successfully');
      
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // GET NOTIFICATION STATS
  // ============================================

  getNotificationStats = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const stats = await this.notificationService.getNotificationStats(userId);
      this.ok(res, stats, 'Notification stats retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // GET UNREAD COUNT
  // ============================================

  getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }
  
      const count = await this.notificationService.getUnreadCount(userId);
      
      // ✅ Return proper wrapped response
      this.ok(res, { unreadCount: count }, 'Unread count retrieved successfully');
      
    } catch (error) {
      this.error(res, error);
    }
  };
  
  // ============================================
  // MARK NOTIFICATION AS READ
  // ============================================

  markNotificationAsRead = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const notification = await this.notificationService.markAsRead(id, userId);
      this.ok(res, notification, 'Notification marked as read');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================

  markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const result = await this.notificationService.markAllAsRead(userId);
      this.ok(res, result, `${result.markedCount} notifications marked as read`);
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // DELETE NOTIFICATION
  // ============================================

  deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }

      await this.notificationService.deleteNotification(id, userId);
      this.ok(res, null, 'Notification deleted successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // SEND BULK NOTIFICATION (Admin only)
  // ============================================

  sendBulkNotification = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const { userIds, title, message, type, priority, actionType, actionId, actionUrl, metadata } = req.body;

      const result = await this.notificationService.sendBulkNotification({
        userIds,
        title,
        message,
        type,
        priority,
        actionType,
        actionId,
        actionUrl,
        metadata
      });

      this.ok(res, result, `Sent to ${result.successCount} users (${result.failCount} failed)`);
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // SEND ROLE NOTIFICATION (Admin only)
  // ============================================

  sendRoleNotification = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const { roles, title, message, type, priority, actionType, actionId, actionUrl, excludeUserId } = req.body;

      const result = await this.notificationService.sendRoleNotification({
        roles,
        title,
        message,
        type,
        priority,
        actionType,
        actionId,
        actionUrl,
        excludeUserId
      });

      this.ok(res, result, `Sent to ${result.success} users (${result.failed} failed)`);
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // SEND USER MESSAGE
  // ============================================

  sendUserMessage = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const { toUserId, title, message, priority, actionUrl } = req.body;
      const fromUserId = req.user?.id;
      
      if (!fromUserId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const result = await this.notificationService.sendUserMessage(fromUserId, {
        toUserId,
        title,
        message,
        priority,
        actionUrl
      });

      this.ok(res, result, 'Message sent successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // SEND BULK USER MESSAGES
  // ============================================

  sendBulkUserMessages = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const { userIds, title, message, priority, actionUrl } = req.body;
      const fromUserId = req.user?.id;
      
      if (!fromUserId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const result = await this.notificationService.sendBulkUserMessages(fromUserId, {
        userIds,
        title,
        message,
        priority,
        actionUrl
      });

      this.ok(res, result, `Messages sent to ${result.success} user(s)`);
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // GET CONVERSATIONS
  // ============================================

  getConversations = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return this.unauthorized(res, 'User authentication required');
      }

      const conversations = await this.notificationService.getConversations(userId);
      this.ok(res, conversations, 'Conversations retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // CLEANUP OLD NOTIFICATIONS
  // ============================================

  cleanupOldNotifications = async (req: AuthRequest, res: Response) => {
    try {
      const { daysToKeep = 30 } = req.query;
      const count = await this.notificationService.cleanupOldNotifications(parseInt(daysToKeep as string));
      this.ok(res, { deletedCount: count }, `Cleaned up ${count} old notifications`);
    } catch (error) {
      this.error(res, error);
    }
  };

  // ============================================
  // SYSTEM MAINTENANCE ENDPOINTS
  // ============================================

  triggerLowStockCheck = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.notificationService.sendLowStockAlerts();
      this.ok(res, result, `Low stock check completed. Sent ${result.sent} notifications for ${result.items.length} low stock items`);
    } catch (error) {
      this.error(res, error);
    }
  };

  triggerAppointmentReminders = async (req: AuthRequest, res: Response) => {
    try {
      const count = await this.notificationService.sendAppointmentReminders();
      this.ok(res, { remindersSent: count }, `Sent ${count} appointment reminders`);
    } catch (error) {
      this.error(res, error);
    }
  };
}