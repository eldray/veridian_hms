// src/types/medical-entries.ts
// Updated to match backend schema

export interface MedicationEntry {
  stockItemId: string;
  serviceCatalogId?: string;  // For pricing
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  route?: string;
  instructions?: string;
  status?: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
  prescribedBy?: string;
}

export interface LabTestEntry {
  templateId: string;
  serviceCatalogId?: string;  // For pricing
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
  status?: 'requested' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ProcedureEntry {
  templateId: string;
  serviceCatalogId?: string;  // For pricing
  scheduledDate: string;
  notes?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy?: string;
  assistantId?: string;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: number;
}

export interface ScanEntry {
  templateId: string;
  serviceCatalogId?: string;  // For pricing
  scanType: string;
  description: string;
  bodyPart?: string;
  priority: 'routine' | 'urgent';
  notes?: string;
  status?: 'requested' | 'in_progress' | 'completed' | 'cancelled';
}

export interface VitalsEntry {
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

export interface DiagnosisEntry {
  diagnosisId: string;
  notes?: string;
  primary?: boolean;
  presentOnAdmission?: 'Y' | 'N' | 'U';
  diagnosisType?: 'principal' | 'secondary' | 'comorbidity';
}