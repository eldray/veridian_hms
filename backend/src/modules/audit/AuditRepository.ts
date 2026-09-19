import { PrismaClient, AuditAction } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { AuditLogFilters, AuditLogExportFilters } from './AuditTypes';

export class AuditRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'auditLog');
  }

  private getBaseInclude() {
    return {
      performedBy: {
        select: { id: true, fullName: true, username: true, email: true, role: true }
      }
    };
  }

  async getLogs(filters: AuditLogFilters) {
    const { page = 1, limit = 20, entityType, action, userId, startDate, endDate } = filters;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action as AuditAction;
    if (userId) where.performedById = userId;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // ✅ Uses BaseRepository pagination helper
    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { timestamp: 'desc' }, include: this.getBaseInclude()
    });
  }

  async getEntityLogs(entityType: string, entityId: string, filters: Partial<AuditLogFilters>) {
    const { page = 1, limit = 1000 } = filters;
    return this.findManyWithPagination({
      where: { entityType, entityId }, page, limit: Math.min(limit, 1000), orderBy: { timestamp: 'desc' }, include: this.getBaseInclude()
    });
  }

  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    const { page = 1, limit = 1000, startDate, endDate } = filters;
    const where: any = { performedById: userId };

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { timestamp: 'desc' }, include: this.getBaseInclude()
    });
  }

  async getLogById(id: string) {
    return this.getModel().findUnique({ where: { id }, include: this.getBaseInclude() });
  }

  async exportLogs(filters: AuditLogExportFilters) {
    const { entityType, action, startDate, endDate } = filters;
    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action as AuditAction;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    return this.getModel().findMany({
      where, orderBy: { timestamp: 'desc' }, include: this.getBaseInclude()
    });
  }

  async createAuditLog(data: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    performedById: string;
    ipAddress?: string | null;
    previousState?: any;
    newState?: any;
    metadata?: any;
  }) {
    // ✅ FIXED: Removed userAgent from top-level as it was moved to metadata in the schema
    return this.getModel().create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        performedById: data.performedById,
        ipAddress: data.ipAddress,
        previousState: data.previousState,
        newState: data.newState,
        metadata: data.metadata, // userAgent should be passed inside here
        timestamp: new Date()
      }
    });
  }
}