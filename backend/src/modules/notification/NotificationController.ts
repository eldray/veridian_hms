// modules/notification/NotificationController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { NotificationService } from './NotificationService';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../types/auth';

export class NotificationController extends BaseController {
  private notificationService: NotificationService;

  constructor(prisma: any) {
    super(prisma);
    this.notificationService = new NotificationService(prisma);
  }

  // ============================================
  // GET USER NOTIFICATIONS
  // ============================================

  getUserNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const { unreadOnly, page = 1, limit = 20 } = req.query;

      const result = await this.notificationService.getUserNotifications(
        userId,
        unreadOnly === 'true',
        parseInt(page as string),
        parseInt(limit as string)
      );

      this.handleResponse(res, 200, {
        success: true,
        data: result.notifications,
        pagination: result.pagination,
        unreadCount: result.unreadCount
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching notifications');
    }
  };

  // ============================================
  // GET NOTIFICATION STATS
  // ============================================

  getNotificationStats = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      const stats = await this.notificationService.getNotificationStats(userId);

      this.handleResponse(res, 200, {
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching notification stats');
    }
  };

  // ============================================
  // GET UNREAD COUNT
  // ============================================

  getUnreadCount = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      const count = await this.notificationService.getUnreadCount(userId);

      this.handleResponse(res, 200, {
        success: true,
        data: { unreadCount: count }
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching unread count');
    }
  };

  // ============================================
  // MARK NOTIFICATION AS READ
  // ============================================

  markNotificationAsRead = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      const notification = await this.notificationService.markAsRead(id, userId);

      this.handleResponse(res, 200, {
        success: true,
        message: 'Notification marked as read',
        data: notification
      });
    } catch (error) {
      this.handleError(res, error, 'Error marking notification as read');
    }
  };

  // ============================================
  // MARK ALL NOTIFICATIONS AS READ
  // ============================================

  markAllNotificationsAsRead = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      const result = await this.notificationService.markAllAsRead(userId);

      this.handleResponse(res, 200, {
        success: true,
        message: `${result.markedCount} notifications marked as read`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error marking all notifications as read');
    }
  };

  // ============================================
  // DELETE NOTIFICATION
  // ============================================

  deleteNotification = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as AuthRequest).user?.id;

      await this.notificationService.deleteNotification(id, userId);

      this.handleResponse(res, 200, {
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error, 'Error deleting notification');
    }
  };

  // ============================================
  // SEND BULK NOTIFICATION (Admin only)
  // ============================================

  sendBulkNotification = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
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

      this.handleResponse(res, 200, {
        success: true,
        message: `Sent to ${result.successCount} users (${result.failCount} failed)`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error sending bulk notification');
    }
  };

  // ============================================
  // SEND ROLE NOTIFICATION (Admin only)
  // ============================================

  sendRoleNotification = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
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

      this.handleResponse(res, 200, {
        success: true,
        message: `Sent to ${result.success} users (${result.failed} failed)`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error sending role notification');
    }
  };

  // ============================================
  // SEND USER MESSAGE
  // ============================================

  sendUserMessage = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
      }

      const { toUserId, title, message, priority, actionUrl } = req.body;
      const fromUserId = (req as AuthRequest).user?.id;

      const result = await this.notificationService.sendUserMessage(fromUserId, {
        toUserId,
        title,
        message,
        priority,
        actionUrl
      });

      this.handleResponse(res, 200, {
        success: true,
        message: 'Message sent successfully',
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error sending user message');
    }
  };

  // ============================================
  // SEND BULK USER MESSAGES
  // ============================================

  sendBulkUserMessages = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.handleResponse(res, 400, {
          success: false,
          errors: errors.array()
        });
      }

      const { userIds, title, message, priority, actionUrl } = req.body;
      const fromUserId = (req as AuthRequest).user?.id;

      const result = await this.notificationService.sendBulkUserMessages(fromUserId, {
        userIds,
        title,
        message,
        priority,
        actionUrl
      });

      this.handleResponse(res, 200, {
        success: true,
        message: `Messages sent to ${result.success} user(s)`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error sending bulk user messages');
    }
  };

  // ============================================
  // GET CONVERSATIONS
  // ============================================

  getConversations = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      const conversations = await this.notificationService.getConversations(userId);

      this.handleResponse(res, 200, {
        success: true,
        data: conversations
      });
    } catch (error) {
      this.handleError(res, error, 'Error fetching conversations');
    }
  };

  // ============================================
  // CLEANUP OLD NOTIFICATIONS
  // ============================================

  cleanupOldNotifications = async (req: Request, res: Response) => {
    try {
      const { daysToKeep = 30 } = req.query;
      const count = await this.notificationService.cleanupOldNotifications(parseInt(daysToKeep as string));

      this.handleResponse(res, 200, {
        success: true,
        message: `Cleaned up ${count} old notifications`,
        data: { deletedCount: count }
      });
    } catch (error) {
      this.handleError(res, error, 'Error cleaning up notifications');
    }
  };

  // ============================================
  // SYSTEM MAINTENANCE ENDPOINTS
  // ============================================

  triggerLowStockCheck = async (req: Request, res: Response) => {
    try {
      const result = await this.notificationService.sendLowStockAlerts();

      this.handleResponse(res, 200, {
        success: true,
        message: `Low stock check completed. Sent ${result.sent} notifications for ${result.items.length} low stock items`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error, 'Error triggering low stock check');
    }
  };

  triggerAppointmentReminders = async (req: Request, res: Response) => {
    try {
      const count = await this.notificationService.sendAppointmentReminders();

      this.handleResponse(res, 200, {
        success: true,
        message: `Sent ${count} appointment reminders`,
        data: { remindersSent: count }
      });
    } catch (error) {
      this.handleError(res, error, 'Error triggering appointment reminders');
    }
  };
}
