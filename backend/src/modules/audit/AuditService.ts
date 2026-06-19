import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { AuditRepository } from './AuditRepository';
import { AuditLogFilters, AuditLogExportFilters } from './AuditTypes';

export class AuditService extends BaseService {
  private auditRepository: AuditRepository;

  constructor(prisma: PrismaClient) {
    super('AuditService'); // ✅ Passes service name for logging
    this.auditRepository = new AuditRepository(prisma);
  }

  async getLogs(filters: AuditLogFilters) {
    this.logInfo('Fetching audit logs', { filters });
    return this.auditRepository.getLogs(filters);
  }

  async getEntityLogs(entityType: string, entityId: string, filters: Partial<AuditLogFilters>) {
    this.logInfo('Fetching entity audit logs', { entityType, entityId });
    return this.auditRepository.getEntityLogs(entityType, entityId, filters);
  }

  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    this.logInfo('Fetching user audit logs', { userId });
    return this.auditRepository.getUserLogs(userId, filters);
  }

  async getLogById(id: string) {
    const log = await this.auditRepository.getLogById(id);
    if (!log) throw new Error('Audit log not found');
    return log;
  }

  async exportLogs(filters: AuditLogExportFilters) {
    this.logInfo('Exporting audit logs', { format: filters.format });
    const logs = await this.auditRepository.exportLogs(filters);
    
    if (filters.format === 'csv') {
      const csvRows = [
        ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'IP Address'].join(',')
      ];
      
      logs.forEach(log => {
        const row = [
          log.timestamp.toISOString(), // ✅ FIXED: Explicitly format Date to ISO string
          log.action,
          log.entityType,
          log.entityId,
          log.performedBy?.fullName || log.performedBy?.username || 'System',
          log.ipAddress || 'N/A'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
        csvRows.push(row);
      });
      
      return csvRows.join('\n');
    }
    
    return logs;
  }
}