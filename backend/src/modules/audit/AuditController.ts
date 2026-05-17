import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuditService } from './AuditService';
import { AuthRequest } from '../../types/auth.types';

export class AuditController extends BaseController {
  private auditService: AuditService;

  constructor() {
    super();
    this.auditService = new AuditService();
    this.getLogs = this.getLogs.bind(this);
    this.getEntityLogs = this.getEntityLogs.bind(this);
    this.getUserLogs = this.getUserLogs.bind(this);
    this.getLogById = this.getLogById.bind(this);
    this.exportLogs = this.exportLogs.bind(this);
  }

  /**
   * GET /api/audit/logs
   * Get all audit logs with pagination and filters
   */
  async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { 
        page = '1', 
        limit = '20', 
        entityType, 
        action, 
        userId,
        startDate,
        endDate
      } = req.query;

      const filters = {
        entityType: entityType as string,
        action: action as string,
        userId: userId as string,
        startDate: startDate as string,
        endDate: endDate as string
      };

      const logs = await this.auditService.getLogs({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        ...filters
      });

      this.handleSuccess(res, logs, 'Audit logs retrieved successfully');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /api/audit/logs/entity/:entityType/:entityId
   * Get audit logs for a specific entity
   */
  async getEntityLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const { page = '1', limit = '50' } = req.query;

      const logs = await this.auditService.getEntityLogs(entityType, entityId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      this.handleSuccess(res, logs, `Audit logs for ${entityType} retrieved successfully`);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /api/audit/logs/user/:userId
   * Get audit logs for a specific user
   */
  async getUserLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { page = '1', limit = '50', startDate, endDate } = req.query;

      const logs = await this.auditService.getUserLogs(userId, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        startDate: startDate as string,
        endDate: endDate as string
      });

      this.handleSuccess(res, logs, `Audit logs for user retrieved successfully`);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /api/audit/logs/:id
   * Get a specific audit log entry
   */
  async getLogById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const log = await this.auditService.getLogById(id);

      this.handleSuccess(res, log, 'Audit log retrieved successfully');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /api/audit/logs/export
   * Export audit logs to CSV/JSON
   */
  async exportLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { format = 'json', entityType, action, startDate, endDate } = req.query;

      const exportData = await this.auditService.exportLogs({
        format: format as string,
        entityType: entityType as string,
        action: action as string,
        startDate: startDate as string,
        endDate: endDate as string
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
        res.send(exportData);
      } else {
        this.handleSuccess(res, exportData, 'Audit logs exported successfully');
      }
    } catch (error) {
      this.handleError(res, error);
    }
  }
}

export default new AuditController();
