import { ClaimStatus } from '@prisma/client';

// ==========================================
// DTOs (Data Transfer Objects)
// ==========================================

export interface CreateClaimDraftDTO {
  attendanceId: string;
  billId?: string;
  patientId: string;
  insuranceProviderId: string;
  corporateAccountId?: string;
  totalClaimAmount?: number;
  diagnosisCodes?: any;
  procedureCodes?: any;
  labTestCodes?: any;
  scanCodes?: any;
  serviceCodes?: any;
  medicationCodes?: any;
  gdrgCodes?: any;
  nhisServiceCodes?: any;
  principalGDRG?: string;
  claimCheckCode?: string;
  typeOfService?: string;
  serviceOutcome?: string;
  mdcCode?: string;
  typeOfAttendance?: string;
  datesOfService?: any;
  notes?: string;
  metadata?: any;
}

export interface UpdateClaimDraftDTO {
  diagnosisCodes?: any;
  procedureCodes?: any;
  labTestCodes?: any;
  scanCodes?: any;
  serviceCodes?: any;
  medicationCodes?: any;
  gdrgCodes?: any;
  nhisServiceCodes?: any;
  totalClaimAmount?: number;
  notes?: string;
  preAuthNumber?: string;
  principalGDRG?: string;
  typeOfService?: string;
  serviceOutcome?: string;
  typeOfAttendance?: string;
  mdcCode?: string;
  datesOfService?: any;
  metadata?: any;
}

export interface UpdateClaimStatusDTO {
  status: ClaimStatus;
  notes?: string;
}

export interface CreateBatchDTO {
  claimIds: string[];
  description?: string;
  insuranceType?: string; // 'nhis', 'private', 'corporate'
}

export interface AddClaimsToBatchDTO {
  claimIds: string[];
}

export interface ClaimQueryParams {
  status?: string | string[];
  insuranceProviderId?: string;
  patientId?: string;
  corporateAccountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  startDate?: Date; // Alias for dateFrom
  endDate?: Date;   // Alias for dateTo
  page?: number;
  limit?: number;
}

export interface BatchQueryParams {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ==========================================
// RESPONSE INTERFACES
// ==========================================

export interface InsuranceClaimResponse {
  id: string;
  claimNumber: string;
  billId: string | null;
  patientId: string;
  attendanceId: string;
  insuranceProviderId: string;
  corporateAccountId: string | null;
  totalClaimAmount: any; // Decimal
  approvedAmount: any | null;
  rejectedAmount: any | null;
  paidAmount: any | null;
  status: ClaimStatus;
  submissionDate: Date | null;
  approvalDate: Date | null;
  paymentDate: Date | null;
  preAuthNumber: string | null;
  
  diagnosisCodes: any;
  procedureCodes: any;
  labTestCodes: any;
  serviceCodes: any;
  scanCodes: any;
  medicationCodes: any;
  gdrgCodes: any;
  nhisServiceCodes: any;
  
  principalGDRG: string | null;
  claimCheckCode: string | null;
  typeOfService: string | null;
  typeOfAttendance: string | null;
  serviceOutcome: string | null;
  mdcCode: string | null;
  datesOfService: any;
  
  notes: string | null;
  metadata: any;
  
  batchId: string | null;
  createdById: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  InsuranceProvider?: any;
  Patient?: any;
  Attendance?: any;
  Bill?: any;
  CorporateAccount?: any;
}

export interface ClaimBatchResponse {
  id: string;
  batchNumber: string;
  batchDate: Date;
  description: string | null;
  totalAmount: any; // Decimal
  status: string;
  xmlGeneratedAt: Date | null;
  xmlFilePath: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;

  claims?: any[];
  createdBy?: any;
}

export interface FinalizedClaimsTotalResponse {
  total: number;
  totalAmount: number;
  claims: Array<{
    id: string;
    claimNumber: string;
    patientName: string;
    amount: number;
    submissionDate: Date | null;
    provider: string | undefined;
  }>;
}

export interface CreditLimitInfo {
  currentBalance: number;
  projectedBalance: number;
  limit: number;
}