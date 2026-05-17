// modules/encounter/EncounterTypes.ts
import { EncounterCategory, VisitCategory, AttendanceStatus, PaymentMode } from '@prisma/client';

// ============================================
// DTOs for Clinical Encounters (Attendance)
// ============================================

export interface CreateEncounterDTO {
  patientId: string;
  encounterType: 'emergency_acute' | 'antenatal' | 'postnatal' | 'chronic_followup' | 'specialist_consultation' | 'delivery' | 'surgery';
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  nhisCCC?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  complaint?: string;
  referredFrom?: string;
}

export interface UpdateEncounterDTO {
  status?: AttendanceStatus;
  complaint?: string;
  notes?: string;
}

export interface AddDiagnosisDTO {
  diagnosisId: string;
  diagnosisType: 'primary' | 'additional' | 'provisional';
  notes?: string;
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
}

export interface AddLabOrderDTO {
  testId: string;
  priority: 'routine' | 'urgent' | 'stat';
  clinicalNotes?: string;
}

export interface AddScanDTO {
  serviceCatalogId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  clinicalNotes?: string;
}

export interface AddProcedureDTO {
  serviceCatalogId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  performedById?: string;
}

export interface AddServiceDTO {
  serviceCatalogId: string;
  quantity?: number;
  notes?: string;
}

export interface EncounterFilters {
  patientId?: string;
  encounterType?: string;
  status?: AttendanceStatus;
  paymentMode?: PaymentMode;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// ============================================
// Response Types
// ============================================

export interface EncounterWithRelations {
  id: string;
  attendanceNumber: string;
  patientId: string;
  encounterType: string;
  status: AttendanceStatus;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaint?: string;
  notes?: string;
  dateTime: Date;
  createdAt: Date;
  updatedAt: Date;
  patient?: any;
  diagnoses?: any[];
  vitals?: any[];
  prescriptions?: any[];
  labOrders?: any[];
  referrals?: any[];
}

export interface WorklistItem {
  id: string;
  patientId: string;
  patient: {
    firstName: string;
    lastName: string;
    age: number;
    gender: string;
  };
  encounterType: string;
  priority: 'normal' | 'urgent' | 'critical';
  waitTime: number; // minutes
  status: string;
}
