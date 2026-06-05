// modules/encounter/EncounterTypes.ts

import { EncounterCategory, VisitCategory, AttendanceStatus, PaymentMode } from '@prisma/client';

// ============================================
// DTOs for Clinical Encounters (Attendance)
// ============================================

export interface CreateEncounterDTO {
  patientId: string;
  attendanceType: 'emergency_acute' | 'antenatal' | 'postnatal' | 'chronic_followup' | 'specialist_consultation' | 'delivery' | 'surgery' | 'general_consultation';
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  nhisCCC?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  complaint?: string;
  referredFrom?: string;
  bedId?: string;
  wardId?: string;
  // ✅ NEW: For detention/observation distinction
  isObservation?: boolean;
  expectedStayHours?: number;
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
}

export interface UpdateEncounterDTO {
  status?: AttendanceStatus;
  complaint?: string;
  medicalNotes?: string;
  treatmentPlan?: string;
  followUpDate?: Date;
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  bedId?: string | null;
  wardId?: string | null;
  admissionType?: string;  // ✅ NEW
}

export interface BaseWorklistItem {
  id: string;
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface AddDiagnosisDTO {
  diagnosisId: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  notes?: string;
  presentOnAdmission?: 'Y' | 'N' | 'U';
}

export interface AddVitalsDTO {
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
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
  serviceCatalogId?: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

export interface AddScanDTO {
  templateId: string;   
  serviceCatalogId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

export interface AddProcedureDTO {
  templateId: string;   
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
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  status?: AttendanceStatus;
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  hasAdmission?: boolean;
  // ✅ NEW: Filter by admission type
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  patientType?: 'detention' | 'formal_ipd' | 'all';
}

// ============================================
// ADMISSION DTOs
// ============================================

export interface CreateAdmissionDTO {
  attendanceId: string;
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  admissionDate?: Date;
}

export interface UpdateAdmissionDTO {
  dischargeDate?: Date;
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  dailyNotes?: any;
  // ✅ NEW: Convert detention to formal IPD
  convertToFormalIPD?: boolean;
  newAdmissionType?: 'elective' | 'emergency' | 'transfer';
}

export interface AddDailyNoteDTO {
  notes: string;
  noteType?: string;
}

// ============================================
// NEW: Detention/Observation specific DTOs
// ============================================

export interface DetentionPatientFilters {
  status?: 'active' | 'discharged';
  wardId?: string;
  observationHours?: number;  // Filter by hours in observation
  readyForDecision?: boolean; // Flag for patients needing admission/discharge decision
  page?: number;
  limit?: number;
}

export interface DetentionPatientWithDetails {
  id: string;
  attendanceNumber: string;
  patientId: string;
  patientName: string;
  folderNumber: string;
  age: number;
  gender: string;
  wardName: string;
  bedNumber: string;
  admissionDate: string;
  observationHours: number;
  vitalsCount: number;
  diagnosisCount: number;
  lastVitalsAt?: string;
  readyForDecision: boolean;  // True if > 24 hours or unstable
  status: string;
}

export interface ConvertDetentionToIPDDTO {
  admissionType: 'elective' | 'emergency' | 'transfer';
  clinicalNotes?: string;
  decisionReason?: string;
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
  admissionType?: string;  // ✅ NEW
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

// Add this new interface
export interface VitalsWorklistItem {
  id: string;
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  hasVitalsToday: boolean;      // ← KEY: flag for pending/recent
  lastVitals?: {
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
    respiration?: number;
    spo2?: number;
    recordedAt?: string;
  } | null;
  vitalsRecordedAt?: string;
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface VitalsWorklistResponse {
  total: number;
  pending: number;
  recent: number;
  data: VitalsWorklistItem[];
}

// MEDICAL WORKLIST
export interface MedicalWorklistItem extends BaseWorklistItem {
  hasMedicalNotesToday: boolean;
  lastVitals?: {
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
    respiration?: number;
    spo2?: number;
  };
  vitals?: any;
  hasDiagnosis?: boolean;
}

export interface MedicalWorklistResponse {
  total: number;
  pending: number;
  reviewed: number;
  data: MedicalWorklistItem[];
}

// LAB WORKLIST
export interface LabWorklistItem extends BaseWorklistItem {
  testName: string;
  category?: string;
  hasResults: boolean;
  resultEnteredAt?: string;
  requestedBy?: string;
}

export interface LabWorklistResponse {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  data: LabWorklistItem[];
}

// PHARMACY WORKLIST
export interface PharmacyWorklistItem {
  id: string;                    // attendanceId (grouped)
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  prescriptionCount: number;     // Total prescriptions (prescribed + dispensed)
  prescribedCount: number;       // Still need to dispense
  dispensedCount: number;        // Already dispensed
  hasPendingPrescriptions: boolean;  // ← KEY for pending tab
  hasBeenDispensed: boolean;      // ← KEY for recent tab
  oldestPrescribedAt: Date;
  medications: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    status: string;
    prescribedAt: Date;
    dispensedAt?: Date;
  }>;
  nextMedication: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  } | null;
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface PharmacyWorklistResponse {
  total: number;
  pending: number;
  dispensed: number;
  data: PharmacyWorklistItem[];
}

// SCANS/RADIOLOGY WORKLIST
export interface ScansWorklistItem {
  id: string;                    // attendanceId (grouped)
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  scanCount: number;             // Total scans
  requestedCount: number;        // Still requested
  inProgressCount: number;       // In progress
  completedCount: number;        // Completed
  hasPendingScans: boolean;      // ← KEY for pending tab
  hasResults: boolean;           // ← KEY for recent tab
  oldestRequestedAt: Date;
  scanTypes: string;             // Comma-separated list of scan types
  nextScan?: {
    id: string;
    name: string;
    bodyPart?: string;
    requestedAt: Date;
  } | null;
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface ScansWorklistResponse {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  data: ScansWorklistItem[];
}

// THEATRE/PROCEDURES WORKLIST - GROUPED BY PATIENT
export interface TheatreWorklistItem {
  id: string;                    // attendanceId (grouped)
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  procedureCount: number;        // Total procedures
  scheduledCount: number;        // Scheduled procedures     // In progress procedures
  completedCount: number;        // Completed procedures
  hasPendingProcedures: boolean; // ← KEY for pending tab
  hasBeenPerformed: boolean;     // ← KEY for recent tab
  earliestScheduledDate: Date | null;
  procedureNames: string;        // Comma-separated list of procedure names
  nextProcedure?: {
    id: string;
    name: string;
    scheduledDate?: Date;
    status: string;
  } | null;
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface TheatreWorklistResponse {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  data: TheatreWorklistItem[];
}

export interface TheatreWorklistResponse {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  data: TheatreWorklistItem[];
}

export interface MaternalWorklistItem {
  id: string;
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  visitType: 'antenatal' | 'delivery' | 'postnatal';
  status: string;
  hasBeenAttended: boolean;
  completedAt?: string;
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  riskLevel?: 'low' | 'medium' | 'high';
  encounterCategory: string;
  // Antenatal specific
  gestationalAge?: number;
  edd?: string;
  // Delivery specific
  deliveryDate?: Date;
  deliveryType?: 'spontaneous_vertex' | 'forceps_assisted' | 'vacuum_assisted' | 'cesarean_section';
  // Postnatal specific
  postnatalDay?: number;
  complaints?: string;
  // Vitals (only fields that exist in Vitals model)
  latestVitals?: {
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
  };
}

export interface MaternalWorklistResponse {
  total: number;
  pending: number;
  recent: number;
  data: MaternalWorklistItem[];
}