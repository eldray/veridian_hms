// src/types/medical-entries.ts
export interface MedicationEntry {
  stockItemId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  route: string;
  instructions: string;
}

export interface LabTestEntry {
  templateId: string;
  name: string;
  priority: 'routine' | 'urgent';
  notes: string;
}

export interface ProcedureEntry {
  templateId: string;
  name: string;
  scheduledDate: string;
  notes: string;
}

export interface ScanEntry {
  scanType: string;
  description: string;
  bodyPart: string;
  priority: 'routine' | 'urgent';
  notes: string;
}
