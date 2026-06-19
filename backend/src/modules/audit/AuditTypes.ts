import { AuditAction } from '@prisma/client';

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: AuditAction | string; // ✅ Aligned with Prisma Enum
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogExportFilters extends AuditLogFilters {
  format?: 'json' | 'csv';
}

// Keep AuditEntityType as string union since it's not a Prisma enum
export type AuditEntityType =
  | 'Patient' | 'Attendance' | 'Admission' | 'Bill' | 'Payment' | 'Invoice'
  | 'ProformaInvoice' | 'InsuranceClaim' | 'CorporateAccount' | 'User'
  | 'Department' | 'ServiceCatalog' | 'LabTest' | 'Scan' | 'Procedure'
  | 'Medication' | 'Diagnosis' | 'Appointment' | 'Ward' | 'Bed'
  | 'StockItem' | 'Requisition' | 'Waiver' | 'Notification' | 'Report';