import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuditService } from './AuditService';
import { AuthRequest } from '../../middleware/authMiddleware';

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

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const filters = {
        entityType: entityType as string,
        action: action as string,
        userId: userId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: pageNum,
        limit: limitNum
      };

      const logs = await this.auditService.getLogs(filters);

      res.json({
        success: true,
        data: logs.data,
        pagination: logs.pagination,
        message: 'Audit logs retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit logs',
        error: (error as Error).message
      });
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

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const logs = await this.auditService.getEntityLogs(entityType, entityId, {
        page: pageNum,
        limit: limitNum
      });

      res.json({
        success: true,
        data: logs.data,
        pagination: logs.pagination,
        message: `Audit logs for ${entityType} retrieved successfully`
      });
    } catch (error) {
      console.error('Error fetching entity audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching entity audit logs',
        error: (error as Error).message
      });
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

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const logs = await this.auditService.getUserLogs(userId, {
        page: pageNum,
        limit: limitNum,
        startDate: startDate as string,
        endDate: endDate as string
      });

      res.json({
        success: true,
        data: logs.data,
        pagination: logs.pagination,
        message: `Audit logs for user retrieved successfully`
      });
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user audit logs',
        error: (error as Error).message
      });
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

      res.json({
        success: true,
        data: log,
        message: 'Audit log retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(404).json({
        success: false,
        message: (error as Error).message
      });
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
        res.json({
          success: true,
          data: exportData,
          message: 'Audit logs exported successfully'
        });
      }
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting audit logs',
        error: (error as Error).message
      });
    }
  }
}

export default new AuditController();