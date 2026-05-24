// modules/encounter/EncounterTypes.ts
import { EncounterCategory, VisitCategory, AttendanceStatus, PaymentMode } from '@prisma/client';

// ============================================
// DTOs for Clinical Encounters (Attendance)
// ============================================

export interface CreateEncounterDTO {
  patientId: string;
  attendanceType: 'emergency_acute' | 'antenatal' | 'postnatal' | 'chronic_followup' | 'specialist_consultation' | 'delivery' | 'surgery' | 'general_consultation';
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  encounterCategory?: 'opd' | 'ipd' | 'daycase';  // ✅ NEW
  nhisCCC?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  complaint?: string;
  referredFrom?: string;
  bedId?: string;      // ✅ NEW - for IPD and daycase
  wardId?: string;     // ✅ NEW - for IPD and daycase
}

export interface UpdateEncounterDTO {
  status?: AttendanceStatus;
  complaint?: string;
  medicalNotes?: string;
  treatmentPlan?: string;
  followUpDate?: Date;
  encounterCategory?: 'opd' | 'ipd' | 'daycase';  // ✅ NEW
  bedId?: string | null;
  wardId?: string | null;
}

export interface AddDiagnosisDTO {
  diagnosisId: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  notes?: string;
  presentOnAdmission?: 'Y' | 'N' | 'U';
}

export interface AddVitalsDTO {
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulse?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  muac?: number;
  notes?: string;
}

export interface AddPrescriptionDTO {
  stockItemId: string;
  serviceCatalogId: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  instructions?: string;
  quantity?: number;
}

export interface AddLabTestDTO {
  templateId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

export interface AddScanDTO {
  serviceCatalogId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

export interface AddProcedureDTO {
  serviceCatalogId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  scheduledDate?: Date;
  performedById?: string;
}

export interface AddServiceDTO {
  serviceCatalogId: string;
  quantity?: number;
  notes?: string;
}

export interface EncounterFilters {
  patientId?: string;
  attendanceType?: string;
  encounterCategory?: 'opd' | 'ipd' | 'daycase';  // ✅ NEW
  status?: AttendanceStatus;
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  hasAdmission?: boolean;  // ✅ NEW - filter for admitted patients
}

// ============================================
// ADMISSION DTOs (NEW)
// ============================================

export interface CreateAdmissionDTO {
  attendanceId: string;
  admissionType?: 'emergency' | 'elective' | 'transfer';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  admissionDate?: Date;
}

export interface UpdateAdmissionDTO {
  dischargeDate?: Date;
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  dailyNotes?: any;
}

export interface AddDailyNoteDTO {
  notes: string;
  noteType?: string;
}

// ============================================
// Response Types
// ============================================

export interface EncounterWithRelations {
  id: string;
  attendanceNumber: string;
  patientId: string;
  attendanceType: string;
  encounterCategory: 'opd' | 'ipd' | 'daycase';
  status: AttendanceStatus;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  historyPresentingComplaint?: string;
  physicalExamination?: string;
  treatmentPlan?: string;
  dateTime: Date;
  createdAt: Date;
  updatedAt: Date;
  bedId?: string;
  wardId?: string;
  patient?: any;
  bed?: any;
  ward?: any;
  Admission?: any;
  AttendanceDiagnosis?: any[];
  Vitals?: any[];
  Medication?: any[];
  LabTest?: any[];
  Scan?: any[];
  Procedure?: any[];
  ServiceRendered?: any[];
}

export interface WorklistItem {
  id: string;
  patientId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
  };
  encounterType: string;
  encounterCategory: string;
  priority: 'normal' | 'urgent' | 'critical';
  waitTime: number;
  status: string;
  bedNumber?: string;
  wardName?: string;
}