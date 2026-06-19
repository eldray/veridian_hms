import { InsuranceType } from '@prisma/client';

export interface ContactInfo {
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  [key: string]: any;
}

export interface CreateInsuranceProviderDTO {
  name: string;
  type: InsuranceType;
  coveragePercentage: number;
  claimSubmissionMethod?: string;
  portalUrl?: string;
  contactInfo?: ContactInfo | null;
  isActive?: boolean;
}

export interface UpdateInsuranceProviderDTO extends Partial<CreateInsuranceProviderDTO> {}

// ✅ FIXED: Aligned relation names with Prisma schema (PascalCase)
export interface InsuranceProviderStats {
  provider: { id: string; name: string; type: InsuranceType; coveragePercentage: number; isActive: boolean; };
  counts: { Patient: number; Attendance: number; Bill: number; InsuranceClaim: number; };
  financials: { totalBilling: number; pendingBalance: number; totalClaims: number; approvedClaims: number; };
  billStatus: Record<string, number>;
  claimStatus: Record<string, number>;
}