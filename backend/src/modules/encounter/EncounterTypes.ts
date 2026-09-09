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
  complaint?: string; // Mapped to medicalNotes in Service
  medicalNotes?: string; // ✅ ADDED: Direct schema field
  clinicalNotes?: any;   // ✅ ADDED: JSON field for flexible SOAP notes
  referredFrom?: string;
  bedId?: string;
  wardId?: string;
  isObservation?: boolean;
  expectedStayHours?: number;
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
}

export interface UpdateEncounterDTO {
  status?: AttendanceStatus;
  complaint?: string;
  medicalNotes?: string;
  clinicalNotes?: any; // ✅ ADDED
  treatmentPlan?: string;
  followUpDate?: Date;
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  bedId?: string | null;
  wardId?: string | null;
  admissionType?: string;
}

export interface BaseWorklistItem {
  id: string;
  patientId: string;
  attendanceId: string;
  patient: { name: string; age: number; gender: string; folderNumber: string; };
  location?: { ward?: string; bed?: string; };
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

export interface AddDiagnosisDTO { diagnosisId: string; diagnosisType: 'primary' | 'additional' | 'provisional'; notes?: string; presentOnAdmission?: 'Y' | 'N' | 'U'; }
export interface AddVitalsDTO { bloodPressure?: string; temperature?: number; pulse?: number; respiration?: number; spo2?: number; weight?: number; height?: number; muac?: number; notes?: string; }
export interface AddPrescriptionDTO { stockItemId: string; serviceCatalogId: string; dosage: string; frequency: string; duration: string; route?: string; instructions?: string; quantity?: number; }
export type AddMedicationDTO = AddPrescriptionDTO;
export interface AddLabTestDTO { templateId: string; serviceCatalogId?: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; }
export interface AddScanDTO { templateId: string; serviceCatalogId: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; }
export interface AddProcedureDTO { templateId: string; serviceCatalogId: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; scheduledDate?: Date; performedById?: string; }
export interface AddServiceDTO { serviceCatalogId: string; quantity?: number; notes?: string; }

export interface EncounterFilters {
  patientId?: string; attendanceType?: string; encounterCategory?: 'opd' | 'ipd' | 'daycase';
  status?: AttendanceStatus; paymentMode?: PaymentMode; dateFrom?: Date; dateTo?: Date;
  page?: number; limit?: number; hasAdmission?: boolean;
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  patientType?: 'detention' | 'formal_ipd' | 'all';
}

// ============================================
// ADMISSION & DETENTION DTOs
// ============================================

export interface CreateAdmissionDTO { attendanceId: string; admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation'; admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency'; admissionDate?: Date; }
export interface AddDailyNoteDTO { notes: string; noteType?: string; }
export interface DetentionPatientFilters { status?: 'active' | 'discharged'; wardId?: string; observationHours?: number; readyForDecision?: boolean; page?: number; limit?: number; }
export interface ConvertDetentionToIPDDTO { admissionType: 'elective' | 'emergency' | 'transfer'; clinicalNotes?: string; decisionReason?: string; }

// ============================================
// Response Types (SCHEMA-ALIGNED)
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
  
  // ✅ FIXED: Removed old SOAP fields, added new schema fields
  medicalNotes?: string; 
  clinicalNotes?: any; 
  
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

// ============================================
// WORKLIST INTERFACES (Cleaned up duplicates)
// ============================================

export interface VitalsWorklistItem extends BaseWorklistItem {
  hasVitalsToday: boolean;
  lastVitals?: { bloodPressure?: string; temperature?: number; pulse?: number; respiration?: number; spo2?: number; recordedAt?: string; } | null;
}
export interface VitalsWorklistResponse { total: number; pending: number; recent: number; data: VitalsWorklistItem[]; }

export interface MedicalWorklistItem extends BaseWorklistItem { hasMedicalNotesToday: boolean; vitals?: any; hasDiagnosis?: boolean; }
export interface MedicalWorklistResponse { total: number; pending: number; reviewed: number; data: MedicalWorklistItem[]; }

export interface LabWorklistItem extends BaseWorklistItem { testName: string; category?: string; hasResults: boolean; }
export interface LabWorklistResponse { total: number; pending: number; completed: number; inProgress: number; data: any[]; }

export interface PharmacyWorklistItem extends BaseWorklistItem {
  prescriptionCount: number; prescribedCount: number; dispensedCount: number;
  hasPendingPrescriptions: boolean; hasBeenDispensed: boolean; oldestPrescribedAt: Date;
  medications: any[]; nextMedication: any | null;
}
export interface PharmacyWorklistResponse { total: number; pending: number; dispensed: number; data: PharmacyWorklistItem[]; }

export interface ScansWorklistItem extends BaseWorklistItem {
  scanCount: number; requestedCount: number; inProgressCount: number; completedCount: number;
  hasPendingScans: boolean; hasResults: boolean; oldestRequestedAt: Date; scanTypes: string; nextScan?: any | null;
}
export interface ScansWorklistResponse { total: number; pending: number; completed: number; inProgress: number; data: ScansWorklistItem[]; }

export interface TheatreWorklistItem extends BaseWorklistItem {
  procedureCount: number; scheduledCount: number; completedCount: number;
  hasPendingProcedures: boolean; hasBeenPerformed: boolean; earliestScheduledDate: Date | null; procedureNames: string; nextProcedure?: any | null;
}
// ✅ FIXED: Removed duplicate TheatreWorklistResponse
export interface TheatreWorklistResponse { total: number; scheduled: number; inProgress: number; completed: number; data: TheatreWorklistItem[]; }

export interface MaternalWorklistItem extends BaseWorklistItem {
  visitType: string; hasBeenAttended: boolean; completedAt?: Date; riskLevel: 'low' | 'medium' | 'high';
  gestationalAge?: number; edd?: Date; deliveryDate?: Date; deliveryType?: string; postnatalDay?: number; latestVitals?: any;
}
export interface MaternalWorklistResponse { total: number; pending: number; recent: number; data: MaternalWorklistItem[]; }