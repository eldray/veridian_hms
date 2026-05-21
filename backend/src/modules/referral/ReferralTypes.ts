// modules/referral/ReferralTypes.ts
import { ReferralType, ReferralStatus, Priority } from '@prisma/client';

// ==========================================
// DTOs
// ==========================================

export interface CreateOutgoingReferralDTO {
  patientId: string;
  attendanceId?: string;
  referralReason: string;
  referredToFacility: string;
  referredToDoctor?: string;
  referredToDepartment?: string;
  urgency?: Priority;
  referralNotes?: string;
  // ✅ ADDED - Corporate/NHIS fields
  nhisCCC?: string;  // NHIS claim code
  insuranceProviderId?: string;
  corporateAccountId?: string;
}

export interface CreateIncomingReferralDTO {
  patientId: string;
  referralReason: string;
  referredFromFacility: string;
  referredFromDoctor?: string;
  urgency?: Priority;
  referralNotes?: string;
  referringFacilityContact?: string;
  // ✅ ADDED
  outcomeNotes?: string;  // For tracking referral outcome
}

export interface UpdateReferralStatusDTO {
  status: ReferralStatus;
  acceptanceNotes?: string;
  rejectedReason?: string;
  outcomeNotes?: string;  // ✅ ADDED - schema field
}

export interface ReferralFilters {
  referralType?: ReferralType;
  status?: ReferralStatus;
  patientId?: string;
  patientPaymentMode?: string;  // ✅ ADDED - filter by payment mode (corporate, nhis, cash)
  corporateAccountId?: string;  // ✅ ADDED - filter by corporate account
  insuranceProviderId?: string;  // ✅ ADDED - filter by insurance
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// ==========================================
// Response Types
// ==========================================

export interface ReferralResponse {
  id: string;
  referralNumber: string;
  referralType: ReferralType;
  status: ReferralStatus;
  urgency: Priority;
  referralReason: string;
  referredToFacility?: string;
  referredFromFacility?: string;
  referredToDoctor?: string;
  referredFromDoctor?: string;
  referredToDepartment?: string;
  referralNotes?: string;
  acceptanceNotes?: string;
  rejectedReason?: string;
  outcomeNotes?: string;  // ✅ ADDED
  referralDate: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  completedAt?: Date;
  patient: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
    contact: string;
    dateOfBirth?: Date;
    gender?: string;
    fullName: string;
    paymentMode?: string;  // ✅ ADDED - important for corporate
    nhisNumber?: string;   // ✅ ADDED
    corporateAccountId?: string;  // ✅ ADDED
  };
  attendance?: {
    id: string;
    attendanceNumber: string;
    dateTime: Date;
    attendanceType: string;
    encounterCategory?: string;
    paymentMode?: string;  // ✅ ADDED
    insuranceProvider?: {  // ✅ ADDED
      id: string;
      name: string;
      type: string;
    };
    corporateAccount?: {  // ✅ ADDED
      id: string;
      companyName: string;
    };
  } | null;
  createdBy: {
    id: string;
    fullName: string;
    role: string;
  };
}

export interface ReferralStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  completed: number;
  urgent: number;
  byPaymentMode?: {  // ✅ ADDED
    cash: number;
    nhis: number;
    private_insurance: number;
    corporate: number;
  };
  byReferralType?: {
    outgoing: number;
    incoming: number;
  };
}