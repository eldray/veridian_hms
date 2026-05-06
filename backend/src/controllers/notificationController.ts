// backend/src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { NotificationService } from '../services/NotificationService';

const prisma = new PrismaClient();

// ============================================
// GET USER NOTIFICATIONS
// ============================================
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const where: any = { userId };
    
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching notifications', 
      error: (error as Error).message 
    });
  }
};

// ============================================
// GET NOTIFICATION STATS
// ============================================
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const [total, unread, byType] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true }
      })
    ]);

    const [byPriority, recentTrend] = await Promise.all([
      prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: { id: true }
      }),
      prisma.notification.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _count: { id: true }
      })
    ]);

    const statsByType = byType.reduce((acc, stat) => {
      acc[stat.type] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    const statsByPriority = byPriority.reduce((acc, stat) => {
      acc[stat.priority] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        total,
        unread,
        read: total - unread,
        byType: statsByType,
        byPriority: statsByPriority,
        unreadPercentage: total > 0 ? Math.round((unread / total) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching notification stats', 
      error: (error as Error).message 
    });
  }
};

// ============================================
// MARK NOTIFICATION AS READ
// ============================================
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: updatedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking notification as read', 
      error: (error as Error).message 
    });
  }
};

// ============================================
// MARK ALL NOTIFICATIONS AS READ
// ============================================
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      success: true,
      message: `${result.count} notifications marked as read`,
      data: { markedCount: result.count }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking all notifications as read', 
      error: (error as Error).message 
    });
  }
};

// ============================================
// DELETE NOTIFICATION
// ============================================
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ 
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting notification', 
      error: (error as Error).message 
    });
  }
};

// ============================================
// SEND BULK NOTIFICATION (Admin only)
// ============================================
export const sendBulkNotification = [
  body('userIds').isArray().withMessage('User IDs array is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { userIds, title, message, type, priority, actionType, actionId, actionUrl, metadata } = req.body;

      let successCount = 0;
      let failCount = 0;
      const failedUsers: string[] = [];

      for (const userId of userIds) {
        try {
          const result = await NotificationService.sendNotification({
            userId,
            title,
            message,
            type,
            priority,
            actionType,
            actionId,
            actionUrl,
            metadata
          });
          
          if (result) {
            successCount++;
          } else {
            failCount++;
            failedUsers.push(userId);
          }
        } catch (err) {
          failCount++;
          failedUsers.push(userId);
        }
      }

      res.json({
        success: true,
        message: `Sent to ${successCount} users (${failCount} failed)`,
        data: { 
          successCount, 
          failCount,
          failedUsers: failedUsers.slice(0, 10) // Only return first 10 failed users
        }
      });
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error sending bulk notification', 
        error: (error as Error).message 
      });
    }
  }
];

// ============================================
// SEND NOTIFICATION TO ROLE (Admin only)
// ============================================
export const sendRoleNotification = [
  body('roles').isArray().withMessage('Roles array is required'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['info', 'success', 'warning', 'error', 'system', 'appointment', 'billing', 'clinical']),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { roles, title, message, type, priority, actionType, actionId, actionUrl, excludeUserId } = req.body;

      const result = await NotificationService.sendRoleNotification({
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

      res.json({
        success: true,
        message: `Sent to ${result.success} users (${result.failed} failed)`,
        data: result
      });
    } catch (error) {
      console.error('Error sending role notification:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error sending role notification', 
        error: (error as Error).message 
      });
    }
  }
];

// ============================================
// TRIGGER EVENT-BASED NOTIFICATIONS
// ============================================

// Call this from admission controller after admission is created
export const notifyAdmissionCreated = async (admissionId: string) => {
  try {
    await NotificationService.sendAdmissionNotifications(admissionId);
  } catch (error) {
    console.error('Error sending admission notifications:', error);
  }
};

// Call this from admission controller after discharge
export const notifyDischargeCompleted = async (admissionId: string) => {
  try {
    await NotificationService.sendDischargeNotifications(admissionId);
  } catch (error) {
    console.error('Error sending discharge notifications:', error);
  }
};

// Call this from lab controller after results are entered
export const notifyLabResultsReady = async (labTestId: string) => {
  try {
    await NotificationService.sendLabResultNotifications(labTestId);
  } catch (error) {
    console.error('Error sending lab result notifications:', error);
  }
};

// Call this from payment controller after payment
export const notifyPaymentReceived = async (billId: string, amount: number) => {
  try {
    await NotificationService.sendPaymentNotifications(billId, amount);
  } catch (error) {
    console.error('Error sending payment notifications:', error);
  }
};

// Call this from medication controller after prescription
export const notifyPrescriptionCreated = async (medicationId: string) => {
  try {
    await NotificationService.sendPrescriptionNotifications(medicationId);
  } catch (error) {
    console.error('Error sending prescription notifications:', error);
  }
};

// ============================================
// SYSTEM MAINTENANCE ENDPOINTS (Admin only)
// ============================================

// Trigger low stock check manually
export const triggerLowStockCheck = async (req: Request, res: Response) => {
  try {
    const result = await NotificationService.sendLowStockAlerts();
    res.json({
      success: true,
      message: `Low stock check completed. Sent ${result.sent} notifications for ${result.items.length} low stock items`,
      data: result
    });
  } catch (error) {
    console.error('Error triggering low stock check:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error triggering low stock check', 
      error: (error as Error).message 
    });
  }
};

// Trigger appointment reminders manually
export const triggerAppointmentReminders = async (req: Request, res: Response) => {
  try {
    const count = await NotificationService.sendAppointmentReminders();
    res.json({
      success: true,
      message: `Sent ${count} appointment reminders`,
      data: { remindersSent: count }
    });
  } catch (error) {
    console.error('Error triggering appointment reminders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error triggering appointment reminders', 
      error: (error as Error).message 
    });
  }
};

// Clean up old notifications
export const cleanupOldNotifications = async (req: Request, res: Response) => {
  try {
    const { daysToKeep = 30 } = req.query;
    const count = await NotificationService.cleanupOldNotifications(parseInt(daysToKeep as string));
    res.json({
      success: true,
      message: `Cleaned up ${count} old notifications`,
      data: { deletedCount: count }
    });
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error cleaning up notifications', 
      error: (error as Error).message 
    });
  }
};