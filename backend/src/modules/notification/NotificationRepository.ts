// modules/notification/NotificationRepository.ts

import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';

export class NotificationRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================
  // FIND NOTIFICATIONS BY USER
  // ============================================


  async findByUser(
    userId: string,
    options: {
      unreadOnly?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { unreadOnly = false, page = 1, limit = 20 } = options;
  
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
  
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }
  
    const skip = (pageNum - 1) * limitNum;
  
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          },
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          }
        }
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } })
    ]);
  
    return {
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      unreadCount
    };
  }
  
  // ============================================
  // GET NOTIFICATION STATS
  // ============================================

  async getStats(userId: string) {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true }
      }),
      this.prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
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

    return {
      total,
      unread,
      read: total - unread,
      byType: statsByType,
      byPriority: statsByPriority,
      unreadPercentage: total > 0 ? Math.round((unread / total) * 100) : 0
    };
  }

  // ============================================
  // GET UNREAD COUNT
  // ============================================

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  // ============================================
  // MARK AS READ
  // ============================================

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }

  // ============================================
  // MARK ALL AS READ
  // ============================================

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { markedCount: result.count };
  }

  // ============================================
  // DELETE NOTIFICATION
  // ============================================

  async delete(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return false;
    }

    await this.prisma.notification.delete({ where: { id } });
    return true;
  }

  // ============================================
  // CREATE NOTIFICATION
  // ============================================

  async create(data: {
    userId: string;
    senderId?: string | null;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionType?: string | null;
    actionId?: string | null;
    actionUrl?: string | null;
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        isRead: false,
        isArchived: false
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });
  }

  // ============================================
  // GET CONVERSATIONS
  // ============================================

  async getConversations(userId: string) {
    const conversations = await this.prisma.notification.groupBy({
      by: ['senderId', 'userId'],
      where: {
        OR: [
          { userId: userId },
          { senderId: userId }
        ],
        type: 'system',
        senderId: { not: null }
      },
      _count: {
        id: true
      },
      _max: {
        createdAt: true
      }
    });

    const userIds = [...new Set(conversations.flatMap(c => [c.senderId, c.userId].filter(Boolean)))];
    
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds as string[] }
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        isActive: true
      }
    });

    return conversations.map(conv => {
      const otherUserId = conv.senderId === userId ? conv.userId : conv.senderId;
      const otherUser = users.find(u => u.id === otherUserId);
      return {
        userId: otherUserId,
        userName: otherUser?.fullName || 'Unknown',
        userRole: otherUser?.role,
        messageCount: conv._count.id,
        lastMessageAt: conv._max.createdAt
      };
    });
  }

  // ============================================
  // CLEANUP OLD NOTIFICATIONS
  // ============================================

  async cleanupOldNotifications(daysToKeep: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  // ============================================
  // FIND BY ID AND USER
  // ============================================

  async findByIdAndUser(id: string, userId: string) {
    return this.prisma.notification.findFirst({
      where: { id, userId },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        }
      }
    });
  }
}
