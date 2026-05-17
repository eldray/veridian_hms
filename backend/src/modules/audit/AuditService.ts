import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { AuditRepository } from './AuditRepository';
import { AuditLogFilters, AuditLogExportFilters } from './AuditTypes';

const prisma = new PrismaClient();

export class AuditService extends BaseService {
  private auditRepository: AuditRepository;

  constructor() {
    super();
    this.auditRepository = new AuditRepository(prisma);
  }

  /**
   * Get audit logs with pagination and filters
   */
  async getLogs(filters: AuditLogFilters) {
    try {
      const logs = await this.auditRepository.getLogs(filters);
      return {
        success: true,
        data: logs.data,
        pagination: logs.pagination
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string, filters: Partial<AuditLogFilters>) {
    try {
      const logs = await this.auditRepository.getEntityLogs(entityType, entityId, filters);
      return {
        success: true,
        data: logs.data,
        pagination: logs.pagination
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve entity audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    try {
      const logs = await this.auditRepository.getUserLogs(userId, filters);
      return {
        success: true,
        data: logs.data,
        pagination: logs.pagination
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve user audit logs: ${error.message}`);
    }
  }

  /**
   * Get a specific audit log by ID
   */
  async getLogById(id: string) {
    try {
      const log = await this.auditRepository.getLogById(id);
      if (!log) {
        throw new Error('Audit log not found');
      }
      return {
        success: true,
        data: log
      };
    } catch (error: any) {
      throw new Error(`Failed to retrieve audit log: ${error.message}`);
    }
  }

  /**
   * Export audit logs to CSV or JSON
   */
  async exportLogs(filters: AuditLogExportFilters) {
    try {
      const logs = await this.auditRepository.exportLogs(filters);
      
      if (filters.format === 'csv') {
        // Convert to CSV format
        const csvRows = [
          ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'IP Address'].join(',')
        ];
        
        logs.forEach(log => {
          const row = [
            log.timestamp,
            log.action,
            log.entityType,
            log.entityId,
            log.performedBy?.fullName || 'System',
            log.ipAddress || 'N/A'
          ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
          csvRows.push(row);
        });
        
        return csvRows.join('\n');
      }
      
      return logs;
    } catch (error: any) {
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }
}

export default AuditService;
