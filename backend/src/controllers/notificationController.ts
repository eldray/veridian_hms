import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Internal function to send notifications
export const sendNotification = async (data: {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
}) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        actionType: data.actionType,
        actionId: data.actionId,
        actionUrl: data.actionUrl,
        isRead: false,
        isArchived: false
      }
    });

    // Here you can integrate with real-time notifications (Socket.io, push notifications, etc.)
    console.log(`Notification sent to user ${data.userId}: ${data.title}`);

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

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
      notifications,
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
      message: 'Error fetching notifications', 
      error: (error as Error).message 
    });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      message: 'Notification marked as read',
      notification: updatedNotification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      message: 'Error marking notification as read', 
      error: (error as Error).message 
    });
  }
};

export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({
      message: `${result.count} notifications marked as read`,
      markedCount: result.count
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      message: 'Error marking all notifications as read', 
      error: (error as Error).message 
    });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await prisma.notification.delete({
      where: { id }
    });

    res.json({ 
      message: 'Notification deleted successfully',
      deletedNotification: {
        id: notification.id,
        title: notification.title
      }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      message: 'Error deleting notification', 
      error: (error as Error).message 
    });
  }
};

export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const stats = await prisma.notification.groupBy({
      by: ['type', 'isRead'],
      where: { userId },
      _count: {
        id: true
      }
    });

    const totalNotifications = await prisma.notification.count({ where: { userId } });
    const unreadNotifications = await prisma.notification.count({ 
      where: { userId, isRead: false } 
    });

    const statsByType = stats.reduce((acc, stat) => {
      if (!acc[stat.type]) {
        acc[stat.type] = { total: 0, unread: 0 };
      }
      acc[stat.type].total += stat._count.id;
      if (!stat.isRead) {
        acc[stat.type].unread += stat._count.id;
      }
      return acc;
    }, {} as any);

    res.json({
      total: totalNotifications,
      unread: unreadNotifications,
      byType: statsByType
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      message: 'Error fetching notification stats', 
      error: (error as Error).message 
    });
  }
};

// System-wide notification functions
export const sendBulkNotification = async (req: Request, res: Response) => {
  try {
    const { userIds, title, message, type, priority } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notifications = await Promise.all(
      userIds.map((userId: string) =>
        sendNotification({
          userId,
          title,
          message,
          type,
          priority
        })
      )
    );

    res.json({
      message: `Notification sent to ${notifications.length} users`,
      notifications
    });
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    res.status(500).json({ 
      message: 'Error sending bulk notification', 
      error: (error as Error).message 
    });
  }
};