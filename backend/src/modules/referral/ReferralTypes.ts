// backend/src/modules/referral/ReferralTypes.ts

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
}

export interface CreateIncomingReferralDTO {
  patientId: string;
  referralReason: string;
  referredFromFacility: string;
  referredFromDoctor?: string;
  urgency?: Priority;
  referralNotes?: string;
  referringFacilityContact?: string;
}

export interface UpdateReferralStatusDTO {
  status: ReferralStatus;
  acceptanceNotes?: string;
  rejectedReason?: string;
}

export interface ReferralFilters {
  referralType?: ReferralType;
  status?: ReferralStatus;
  patientId?: string;
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
  };
  attendance?: {
    id: string;
    attendanceNumber: string;
    dateTime: Date;
    attendanceType: string;
  } | null;
  createdBy: {
    id: string;
    fullName: string;
    role: string;
  };
}
