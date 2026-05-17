// InsuranceProviderTypes.ts
import { InsuranceType } from '@prisma/client';

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  [key: string]: any;
}

export interface InsuranceProvider {
  id: string;
  name: string;
  type: InsuranceType;
  coveragePercentage: number;
  contactInfo?: ContactInfo | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInsuranceProviderDTO {
  name: string;
  type: InsuranceType;
  coveragePercentage: number;
  contactInfo?: ContactInfo | null;
  isActive?: boolean;
}

export interface UpdateInsuranceProviderDTO {
  name?: string;
  type?: InsuranceType;
  coveragePercentage?: number;
  contactInfo?: ContactInfo | null;
  isActive?: boolean;
}

export interface InsuranceProviderStats {
  provider: {
    id: string;
    name: string;
    type: InsuranceType;
    coveragePercentage: number;
    isActive: boolean;
  };
  counts: {
    patients: number;
    attendances: number;
    bills: number;
    insuranceClaims: number;
  };
  financials: {
    totalBilling: number;
    pendingBalance: number;
    totalClaims: number;
    approvedClaims: number;
  };
  billStatus: {
    draft: number;
    pending: number;
    paid: number;
  };
  claimStatus: {
    draft: number;
    pending: number;
    approved: number;
    paid: number;
  };
}

export interface InsuranceProviderWithRelations extends InsuranceProvider {
  patients?: Array<{
    id: string;
    folderNumber: string;
    fullName: string;
    contact?: string | null;
  }>;
  attendances?: Array<{
    id: string;
    attendanceNumber: string;
    attendanceType: string;
    status: string;
    dateTime: Date;
  }>;
  bills?: Array<{
    id: string;
    billNumber: string;
    totalAmount: number;
    status: string;
    billDate: Date;
  }>;
  insuranceClaims?: Array<{
    id: string;
    claimNumber: string;
    totalClaimAmount: number;
    status: string;
    submissionDate: Date;
  }>;
  _count?: {
    patients: number;
    attendances: number;
    bills: number;
    insuranceClaims: number;
  };
}
