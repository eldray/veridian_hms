import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class NotificationRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'notification');
  }

  async findByUser(userId: string, options: { unreadOnly?: boolean; page?: number; limit?: number } = {}) {
    const { unreadOnly = false, page = 1, limit = 20 } = options;
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    // ✅ Optimized: findManyWithPagination already returns total. We only need one extra query for unreadCount.
    const [paginatedResult, unreadCount] = await Promise.all([
      this.findManyWithPagination({ 
        where, page, limit, 
        orderBy: { createdAt: 'desc' }, 
        include: { sender: { select: { id: true, fullName: true, role: true } } } 
      }),
      this.count({ userId, isRead: false })
    ]);

    return { 
      notifications: paginatedResult.data, 
      pagination: { 
        page: paginatedResult.page, 
        limit: paginatedResult.limit, 
        total: paginatedResult.total, 
        totalPages: paginatedResult.totalPages // ✅ Aligned with BaseController
      }, 
      unreadCount 
    };
  }

  async getStats(userId: string) {
    const [total, unread, byType, byPriority] = await Promise.all([
      this.count({ userId }), 
      this.count({ userId, isRead: false }),
      this.prisma.notification.groupBy({ by: ['type'], where: { userId }, _count: true }),
      this.prisma.notification.groupBy({ by: ['priority'], where: { userId }, _count: true })
    ]);

    const mapGroup = (arr: any[]) => arr.reduce((acc, s) => { acc[s.type || s.priority] = s._count; return acc; }, {} as Record<string, number>);
    return { 
      total, unread, read: total - unread, 
      byType: mapGroup(byType), byPriority: mapGroup(byPriority), 
      unreadPercentage: total > 0 ? Math.round((unread / total) * 100) : 0 
    };
  }

  async getUnreadCount(userId: string) { 
    return this.count({ userId, isRead: false }); 
  }

  async markAsRead(id: string, userId: string) {
    // ✅ Let Prisma throw P2025 if not found, BaseController handles it
    return this.getModel().update({ 
      where: { id, userId }, 
      data: { isRead: true, readAt: new Date() } 
    });
  }

  async markAllAsRead(userId: string) {
    const result = await this.getModel().updateMany({ 
      where: { userId, isRead: false }, 
      data: { isRead: true, readAt: new Date() } 
    });
    return { markedCount: result.count };
  }

  async delete(id: string, userId: string) {
    // ✅ Let Prisma throw P2025 if not found
    await this.getModel().delete({ where: { id, userId } });
  }

  async create(data: any) {
    return this.getModel().create({ 
      data: { ...data, isRead: false, isArchived: false }, 
      include: { sender: { select: { id: true, fullName: true, role: true } } } 
    });
  }

  // ✅ FIXED: Memory leak prevented by limiting query to recent messages
  async getConversations(userId: string) {
    // Fetch only the most recent 200 messages to build the conversation list.
    // Fetching ALL messages would crash the server for active users.
    const recentMessages = await this.getModel().findMany({
      where: { OR: [{ userId, senderId: { not: null } }, { senderId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 200, 
      select: { userId: true, senderId: true, createdAt: true }
    });

    const convMap = new Map<string, { count: number; lastMessageAt: Date }>();
    for (const msg of recentMessages) {
      const otherId = msg.userId === userId ? msg.senderId! : msg.userId;
      if (!otherId) continue; 
      
      if (!convMap.has(otherId)) convMap.set(otherId, { count: 0, lastMessageAt: msg.createdAt });
      const c = convMap.get(otherId)!;
      c.count++;
      if (msg.createdAt > c.lastMessageAt) c.lastMessageAt = msg.createdAt;
    }

    const users = await this.prisma.user.findMany({ 
      where: { id: { in: Array.from(convMap.keys()) } }, 
      select: { id: true, fullName: true, role: true } 
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    return Array.from(convMap.entries()).map(([otherId, data]) => {
      const u = userMap.get(otherId);
      return { 
        userId: otherId, 
        userName: u?.fullName || 'Unknown', 
        userRole: u?.role, 
        messageCount: data.count, 
        lastMessageAt: data.lastMessageAt 
      };
    });
  }

  async cleanupOldNotifications(daysToKeep: number) {
    const cutoff = new Date(); 
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    const result = await this.getModel().deleteMany({ 
      where: { isRead: true, createdAt: { lt: cutoff } } 
    });
    return result.count;
  }
}