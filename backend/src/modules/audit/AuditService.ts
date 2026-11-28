import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { BaseService } from '../../shared/base/BaseService';
import { AuditRepository } from './AuditRepository';
import {
  AuditLogFilters,
  AuditLogExportFilters,
  AuditLogMeta,
  CreateAuditLogInput,
} from './AuditTypes';

export class AuditService extends BaseService {
  private auditRepository: AuditRepository;

  constructor(prisma: PrismaClient) {
    super('AuditService');
    this.auditRepository = new AuditRepository(prisma);
  }

  async getLogs(filters: AuditLogFilters) {
    return this.auditRepository.getLogs(filters);
  }

  async getEntityLogs(
    entityType: string,
    entityId: string,
    filters: Partial<AuditLogFilters>,
  ) {
    return this.auditRepository.getEntityLogs(entityType, entityId, filters);
  }

  async getUserLogs(userId: string, filters: Partial<AuditLogFilters>) {
    return this.auditRepository.getUserLogs(userId, filters);
  }

  async getLogById(id: string) {
    const log = await this.auditRepository.getLogById(id);
    if (!log) throw new Error('Audit log not found');
    return log;
  }

  async getMeta(): Promise<AuditLogMeta> {
    return this.auditRepository.getMeta();
  }

  async createLog(input: CreateAuditLogInput) {
    return this.auditRepository.createAuditLog(input);
  }

  async verifyChain() {
    return this.auditRepository.verifyChain();
  }

  // Spreadsheet applications interpret cells beginning with formula markers as code.
  // Prefix an apostrophe (after optional control/space characters) before CSV quoting.
  private csvSafeCell(value: unknown): string {
    const text = String(value ?? '');
    const safe = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  async exportLogs(filters: AuditLogExportFilters) {
    const logs = await this.auditRepository.exportLogs(filters);

    if (filters.format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Veridian HMS';
      workbook.subject = 'Immutable system audit trail';
      workbook.title = 'Audit Logs';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Audit Logs');
      worksheet.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 23 },
        { header: 'Action', key: 'action', width: 16 },
        { header: 'Entity Type', key: 'entityType', width: 24 },
        { header: 'Entity ID', key: 'entityId', width: 30 },
        { header: 'Performed By', key: 'performedBy', width: 28 },
        { header: 'Username', key: 'username', width: 22 },
        { header: 'Role', key: 'role', width: 18 },
        { header: 'User ID', key: 'performedById', width: 28 },
        { header: 'IP Address', key: 'ipAddress', width: 20 },
        { header: 'Log ID', key: 'id', width: 30 },
        { header: 'Chain Sequence', key: 'chainSequence', width: 18 },
        { header: 'Previous State (JSON)', key: 'previousState', width: 50 },
        { header: 'New State (JSON)', key: 'newState', width: 50 },
        { header: 'Metadata (JSON)', key: 'metadata', width: 50 },
      ];
      const jsonCell = (value: unknown) => value == null ? '' : JSON.stringify(
        value,
        (_key, item) => typeof item === 'bigint' ? item.toString() : item,
      );
      logs.forEach((log: any) => {
        worksheet.addRow({
          timestamp: log.timestamp,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          performedBy: log.performedBy?.fullName || 'System',
          username: log.performedBy?.username || '',
          role: log.performedBy?.role || '',
          performedById: log.performedById,
          ipAddress: log.ipAddress || '',
          id: log.id,
          chainSequence: log.chainSequence == null ? '' : String(log.chainSequence),
          previousState: jsonCell(log.previousState),
          newState: jsonCell(log.newState),
          metadata: jsonCell(log.metadata),
        });
      });

      const header = worksheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF155E75' } };
      header.alignment = { vertical: 'middle', wrapText: true };
      header.height = 24;
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columns.length },
      };
      worksheet.getColumn('timestamp').numFmt = 'yyyy-mm-dd hh:mm:ss';
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.alignment = { vertical: 'top', wrapText: true };
      });

      return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    if (filters.format === 'csv') {
      const csvRows = [
        ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User', 'IP Address'].join(','),
      ];

      logs.forEach((log: any) => {
        const row = [
          log.timestamp.toISOString(),
          log.action,
          log.entityType,
          log.entityId,
          log.performedBy?.fullName || log.performedBy?.username || 'System',
          log.ipAddress || 'N/A',
        ]
          .map((field) => this.csvSafeCell(field))
          .join(',');
        csvRows.push(row);
      });

      return csvRows.join('\n');
    }

    return logs;
  }
}