import { PrismaClient, AuditAction } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  AuditLogFilters,
  AuditLogExportFilters,
  AuditLogMeta,
  CreateAuditLogInput,
} from './AuditTypes';

/**
 * Normalize an end-date string so that picking a date like 2025-01-31
 * includes the whole day (up to 23:59:59.999).
 */
const normalizeEndDate = (input: string | Date): Date => {
  const d = input instanceof Date ? new Date(input) : new Date(input);
  // If it looks like a bare date (midnight local), extend to end of day
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
};

export class AuditRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'auditLog');
  }

  private getBaseInclude() {
    return {
      performedBy: {
        select: { id: true, fullName: true, username: true, email: true, role: true },
      },
    };
  }

  private buildWhere(filters: AuditLogFilters) {
    const { entityType, action, userId, startDate, endDate } = filters;
    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action as AuditAction;
    if (userId) where.performedById = userId;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = normalizeEndDate(endDate);
    }

    return where;
  }

  async getLogs(filters: AuditLogFilters) {
    const { page = 1, limit = 20 } = filters;
    const where = this.buildWhere(filters);

    return this.findManyWithPagination({
      where,
      page,
      limit: Math.min(limit, 200),
      orderBy: { timestamp: 'desc' },
      include: this.getBaseInclude(),
    });
  }

  async getEntityLogs(
    entityType: string,
    entityId: string,
    filters: Partial<AuditLogFilters>,
  ) {
    const { page = 1, limit = 20 } = filters;

    // Build date filter but exclude entityType/entityId — those are fixed
    const dateOnlyFilters: AuditLogFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    const where: any = { entityType, entityId, ...this.buildWhere(dateOnlyFilters) };

    return this.findManyWithPagination({
      where,
      page,
      limit: Math.min(limit, 200),
      orderBy: { timestamp: 'desc' },
      include: this.getBaseInclude(),
    });
  }

  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    const { page = 1, limit = 20 } = filters;

    const dateOnlyFilters: AuditLogFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    const where: any = { performedById: userId, ...this.buildWhere(dateOnlyFilters) };

    return this.findManyWithPagination({
      where,
      page,
      limit: Math.min(limit, 200),
      orderBy: { timestamp: 'desc' },
      include: this.getBaseInclude(),
    });
  }

  async getLogById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: this.getBaseInclude(),
    });
  }

  async exportLogs(filters: AuditLogExportFilters) {
    const where = this.buildWhere(filters);
    return this.getModel().findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: this.getBaseInclude(),
    });
  }

  /**
   * Returns the distinct set of entity types, the full enum of actions,
   * and a compact list of users for the picker dropdowns.
   */
  async getMeta(): Promise<AuditLogMeta> {
    const [entityRows, users] = await Promise.all([
      this.getModel().findMany({
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, username: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    return {
      entityTypes: entityRows.map((r: any) => r.entityType),
      actions: Object.values(AuditAction),
      users,
    };
  }

  async createAuditLog(data: CreateAuditLogInput) {
    return this.getModel().create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        performedById: data.performedById,
        ipAddress: data.ipAddress ?? null,
        previousState: data.previousState ?? null,
        newState: data.newState ?? null,
        metadata: data.metadata ?? null,
        timestamp: new Date(),
      },
    });
  }
}