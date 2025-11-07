// src/types/medical-entries.ts - UPDATED TO MATCH BACKEND
export interface MedicationEntry {
  stockItemId?: string;
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
  name?: string;
  priority: 'routine' | 'urgent' | 'stat';
  notes?: string;
  status?: 'requested' | 'in_progress' | 'completed' | 'cancelled';
}

export interface ProcedureEntry {
  templateId: string;
  name?: string;
  scheduledDate: string;
  notes?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy?: string;
}

export interface ScanEntry {
  templateId?: string;  // ✅ Match backend scan template reference
  scanType: string;     // ✅ Match backend scanType field
  description: string;  // ✅ Match backend description field
  bodyPart?: string;    // ✅ Match backend bodyPart field
  priority: 'routine' | 'urgent';
  notes?: string;
  status?: 'requested' | 'in_progress' | 'completed' | 'cancelled';
}