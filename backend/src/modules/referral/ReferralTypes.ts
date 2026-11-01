// modules/referral/ReferralTypes.ts
import { ReferralType, ReferralStatus, Priority } from '@prisma/client';

// ==========================================
// Structured two-way referral form
// ==========================================

/**
 * Part I — completed by the health worker sending the patient, mirroring the Ghana
 * two-way referral form plus the contact-back and request fields the WHO patient
 * referral form adds, because those are the items referral letters most often omit.
 */
export interface ReferralPartI {
  clientName: string;
  age: string;
  sex: string;
  parity: string;
  clinicName: string;
  dateOfReferral: string;
  generalCondition: string;
  patientComplaints: string;
  clinicalFindings: string;
  diagnosis: string;
  actionsTaken: string;
  reasonForReferral: string;
  requestedAction: string;
  transportNeeds: string;
  contactBackName: string;
  contactBackPhone: string;
  referrerName: string;
  referrerTitle: string;
}

/** Part II — completed by the facility that receives the patient and reports back. */
export interface ReferralPartII {
  institutionName: string;
  dateReceived: string;
  findings: string;
  actionsTaken: string;
  recommendations: string;
  patientDisposition: string;
  dateReported: string;
  receiverName: string;
  receiverTitle: string;
}

export interface ReferralStructuredForm {
  partI?: Partial<ReferralPartI>;
  partII?: Partial<ReferralPartII>;
}

export const PART_I_KEYS: readonly (keyof ReferralPartI)[] = [
  'clientName', 'age', 'sex', 'parity', 'clinicName', 'dateOfReferral',
  'generalCondition', 'patientComplaints', 'clinicalFindings', 'diagnosis',
  'actionsTaken', 'reasonForReferral', 'requestedAction', 'transportNeeds',
  'contactBackName', 'contactBackPhone', 'referrerName', 'referrerTitle',
];

export const PART_II_KEYS: readonly (keyof ReferralPartII)[] = [
  'institutionName', 'dateReceived', 'findings', 'actionsTaken', 'recommendations',
  'patientDisposition', 'dateReported', 'receiverName', 'receiverTitle',
];

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
  structuredForm?: ReferralStructuredForm;
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
  structuredForm?: ReferralStructuredForm;
  referringFacilityContact?: string;
  // ✅ ADDED
  outcomeNotes?: string;  // For tracking referral outcome
}

export interface UpdateReferralStatusDTO {
  status: ReferralStatus;
  acceptanceNotes?: string;
  rejectedReason?: string;
  outcomeNotes?: string;  // ✅ ADDED - schema field
  /** Report-back captured with pending → accepted on an outgoing referral. */
  partII?: Partial<ReferralPartII>;
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
  structuredForm?: ReferralStructuredForm | null;
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