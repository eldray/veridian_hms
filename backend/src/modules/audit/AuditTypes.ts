export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogExportFilters {
  format?: 'json' | 'csv';
  entityType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogDTO {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedById: string;
  ipAddress: string | null;
  userAgent: string | null;
  previousState: any;
  newState: any;
  metadata: any;
  timestamp: Date;
  performedBy?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
}

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'APPROVE' 
  | 'REJECT'
  | 'SUBMIT'
  | 'VOID'
  | 'EXPORT'
  | 'IMPORT';

export type AuditEntityType =
  | 'Patient'
  | 'Attendance'
  | 'Admission'
  | 'Bill'
  | 'Payment'
  | 'Invoice'
  | 'ProformaInvoice'
  | 'InsuranceClaim'
  | 'CorporateAccount'
  | 'User'
  | 'Department'
  | 'ServiceCatalog'
  | 'LabTest'
  | 'Scan'
  | 'Procedure'
  | 'Medication'
  | 'Diagnosis'
  | 'Appointment'
  | 'Ward'
  | 'Bed'
  | 'StockItem'
  | 'Requisition'
  | 'Waiver'
  | 'Notification'
  | 'Report';
