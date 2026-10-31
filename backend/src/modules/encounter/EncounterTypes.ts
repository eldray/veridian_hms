import { EncounterCategory, VisitCategory, AttendanceStatus, PaymentMode } from '@prisma/client';

// ============================================
// DTOs for Clinical Encounters (Attendance)
// ============================================

export interface CreateEncounterDTO {
  historyPresentingComplaint?: string;
  reviewOfSystems?: Record<string, string>;
  physicalExamination?: string;
  physicalExamStructured?: Record<string, string>;
  assessment?: string;
  treatmentPlan?: string;
  clinicalOutcome?: 'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased' | 'unknown';
  allergyReviewStatus?: 'not_reviewed' | 'no_known_allergies' | 'allergies_present';
  allergyReviewNotes?: string;
  providerId?: string;
  // New vs returning patient at facility level; diagnosis-episode classification is stored per diagnosis.
  patientClassification?: 'NEW' | 'OLD';
  patientId: string;
  attendanceType: 'emergency_acute' | 'antenatal' | 'postnatal' | 'chronic_followup' | 'specialist_consultation' | 'delivery' | 'surgery' | 'general_consultation';
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  nhisCCC?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  complaint?: string;
  complaints?: string;
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
  historyPresentingComplaint?: string | null;
  reviewOfSystems?: Record<string, string> | null;
  physicalExamination?: string | null;
  physicalExamStructured?: Record<string, string> | null;
  assessment?: string | null;
  treatmentPlan?: string | null;
  clinicalOutcome?: 'improved' | 'stable' | 'unchanged' | 'deteriorated' | 'deceased' | 'unknown' | null;
  allergyReviewStatus?: 'not_reviewed' | 'no_known_allergies' | 'allergies_present' | null;
  allergyReviewNotes?: string | null;
  providerId?: string | null;
  status?: AttendanceStatus;
  complaint?: string;
  complaints?: string;
  medicalNotes?: string;
  clinicalNotes?: any; // Legacy JSON compatibility
  followUpDate?: Date | null;
  dateTime?: Date;
  attendanceType?: CreateEncounterDTO['attendanceType'];
  paymentMode?: CreateEncounterDTO['paymentMode'];
  nhisCCC?: string;
  insuranceProviderId?: string | null;
  corporateAccountId?: string | null;
  encounterCategory?: 'opd' | 'ipd' | 'daycase';
  bedId?: string | null;
  wardId?: string | null;
  admissionType?: string;
  updatedById?: string;

  // Legacy SOAP fields kept for compatibility with older clients; normalized server-side
  onsetDurationQuality?: string;
  treatmentNotes?: any[];
  physicianNotes?: any[];
}

export interface BaseWorklistItem {
  id: string;
  // null for a counter ticket, which is served by name instead of by patient folder.
  patientId: string | null;
  attendanceId: string;
  // The visit number is what a clinician reads out ("ATT-10042") and what a paper file is
  // searched by; the folder number identifies the patient. A queue row needs both.
  attendanceNumber: string;
  attendanceDateTime?: string;
  patient: { name: string; age: number | null; gender: string | null; folderNumber: string | null; isCounter?: boolean; };
  location?: { ward?: string; bed?: string; };
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

/**
 * Which end of the queue a worklist request is asking for.
 *  pending     - visits still open: today's work first, then inpatients, then anything overdue
 *  completed   - visits closed today (wider with a date filter), so a desk can review finished work
 *  outstanding - visits closed while a lab, scan or procedure is still unanswered
 */
export type WorklistView = 'pending' | 'completed' | 'outstanding';

export interface WorklistQuery {
  view?: WorklistView;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  /** Narrow an attendance queue to specific visit types; the maternal queue only wants its own. */
  attendanceTypes?: string[];
}

export interface AddDiagnosisDTO {
  diagnosisId: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  // Optional for legacy/non-OPD callers; the OPD diagnosis UI asks for this explicitly.
  classification?: 'NEW_DIAGNOSIS' | 'OLD_DIAGNOSIS';
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
  fetalHeartRate?: number;
  fundalHeight?: number;
  presentingPart?: string;
  fetalMovement?: boolean;
  oedema?: boolean;
}
export interface AddPrescriptionDTO { stockItemId: string; serviceCatalogId: string; dosage: string; frequency: string; duration: string; route?: string; instructions?: string; quantity?: number; }
export type AddMedicationDTO = AddPrescriptionDTO;
export interface AddLabTestDTO { templateId: string; serviceCatalogId?: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; }
export interface AddScanDTO { templateId: string; serviceCatalogId: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; }
export interface AddProcedureDTO { templateId: string; serviceCatalogId: string; priority?: 'routine' | 'urgent' | 'stat'; notes?: string; scheduledDate?: Date; performedById?: string; }
export interface AddServiceDTO { serviceCatalogId: string; quantity?: number; notes?: string; }

export interface EncounterFilters {
  patientId?: string; counterClientId?: string; attendanceType?: string; encounterCategory?: 'opd' | 'ipd' | 'daycase';
  status?: AttendanceStatus; paymentMode?: PaymentMode; dateFrom?: Date; dateTo?: Date;
  page?: number; limit?: number; hasAdmission?: boolean;
  admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation';
  patientType?: 'detention' | 'formal_ipd' | 'all';
}

// ============================================
// ADMISSION & DETENTION DTOs
// ============================================

export interface CreateAdmissionDTO { attendanceId: string; bedId?: string; wardId?: string; admissionType?: 'elective' | 'emergency' | 'transfer' | 'detention_observation'; admissionSource?: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency'; admissionDate?: Date; admissionNotes?: string; }
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