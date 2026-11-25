import { AuditAction } from '@prisma/client';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: AuditAction | string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogExportFilters extends AuditLogFilters {
  format?: 'json' | 'csv';
}

export interface AuditLogMeta {
  entityTypes: string[];
  actions: AuditAction[];
  users: Array<{ id: string; fullName: string; username: string; role: string }>;
}

export interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById: string;
  ipAddress?: string | null;
  previousState?: any;
  newState?: any;
  metadata?: any;
}

/**
 * AuditEntityType is intentionally `string`.
 * Audit logs must be able to record anything; pinning this to a union
 * fights the purpose and forces code changes for every new model.
 */
export type AuditEntityType = string;