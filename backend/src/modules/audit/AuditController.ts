import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { AuditService } from './AuditService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class AuditController extends BaseController {
  private auditService: AuditService;

  constructor() {
    super();
    this.auditService = new AuditService(prisma);
  }

  getLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page, limit
    };

    const logs = await this.auditService.getLogs(filters);
    return this.paginated(res, logs.data, { page: logs.page, limit: logs.limit, total: logs.total }, 'Audit logs retrieved successfully');
  });

  getEntityLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entityType, entityId } = req.params;
    const { page, limit } = this.getPaginationParams(req);

    const logs = await this.auditService.getEntityLogs(entityType, entityId, { page, limit });
    return this.paginated(res, logs.data, { page: logs.page, limit: logs.limit, total: logs.total }, `Audit logs for ${entityType} retrieved successfully`);
  });

  getUserLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      page, limit,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const logs = await this.auditService.getUserLogs(userId, filters);
    return this.paginated(res, logs.data, { page: logs.page, limit: logs.limit, total: logs.total }, 'Audit logs for user retrieved successfully');
  });

  getLogById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const log = await this.auditService.getLogById(req.params.id);
      return this.ok(res, log, 'Audit log retrieved successfully');
    } catch (error: any) {
      if (error.message === 'Audit log not found') return this.notFound(res, 'Audit log');
      throw error;
    }
  });

  exportLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';
    const filters = {
      format: format as 'json' | 'csv',
      entityType: req.query.entityType as string,
      action: req.query.action as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    };

    const exportData = await this.auditService.exportLogs(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
      return res.send(exportData);
    } else {
      return this.ok(res, exportData, 'Audit logs exported successfully');
    }
  });
}

export const auditController = new AuditController();