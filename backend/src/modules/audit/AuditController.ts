import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { AuditService } from './AuditService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class AuditController extends BaseController {
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    super();
    this.auditService = new AuditService(prisma);
  }

  getLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      entityType: req.query.entityType as string | undefined,
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      page,
      limit,
    };

    const logs = await this.auditService.getLogs(filters);
    return this.paginated(
      res,
      logs.data,
      { page: logs.page, limit: logs.limit, total: logs.total },
      'Audit logs retrieved successfully',
    );
  });

  getEntityLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { entityType, entityId } = req.params;
    const { page, limit } = this.getPaginationParams(req);

    const logs = await this.auditService.getEntityLogs(entityType, entityId, {
      page,
      limit,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });

    return this.paginated(
      res,
      logs.data,
      { page: logs.page, limit: logs.limit, total: logs.total },
      `Audit logs for ${entityType} retrieved successfully`,
    );
  });

  getUserLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = req.params;
    const { page, limit } = this.getPaginationParams(req);

    const logs = await this.auditService.getUserLogs(userId, {
      page,
      limit,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    });

    return this.paginated(
      res,
      logs.data,
      { page: logs.page, limit: logs.limit, total: logs.total },
      'Audit logs for user retrieved successfully',
    );
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

  getMeta = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    const meta = await this.auditService.getMeta();
    return this.ok(res, meta, 'Audit metadata retrieved successfully');
  });

  exportLogs = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const format = (req.query.format as string) || 'json';
    const filters = {
      format: format as 'json' | 'csv',
      entityType: req.query.entityType as string | undefined,
      action: req.query.action as string | undefined,
      userId: req.query.userId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const exportData = await this.auditService.exportLogs(filters);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=audit-logs-${Date.now()}.csv`,
      );
      return res.send(exportData);
    }

    return this.ok(res, exportData, 'Audit logs exported successfully');
  });
}