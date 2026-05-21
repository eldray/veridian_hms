import { PrismaClient, AuditLog } from '@prisma/client';
import { AuditLogFilters, AuditLogExportFilters } from './AuditTypes';

export class AuditRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get audit logs with pagination and filters
   */
  async getLogs(filters: AuditLogFilters) {
    const { page = 1, limit = 20, entityType, action, userId, startDate, endDate } = filters;
    
    const skip = (page - 1) * limit;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.performedById = userId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          performedBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string, filters: Partial<AuditLogFilters>) {
    const { page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where = {
      entityType,
      entityId
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          performedBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    const { page = 1, limit = 50, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      performedById: userId
    };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          performedBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
              email: true,
              role: true
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a specific audit log by ID
   */
  async getLogById(id: string) {
    return this.prisma.auditLog.findUnique({
      where: { id },
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * Export audit logs
   */
  async exportLogs(filters: AuditLogExportFilters) {
    const { entityType, action, startDate, endDate } = filters;
    
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        performedBy: {
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(data: {
    entityType: string;
    entityId: string;
    action: string;
    performedById: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    previousState?: any;
    newState?: any;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        ...data,
        timestamp: new Date()
      }
    });
  }
}

export default AuditRepository;