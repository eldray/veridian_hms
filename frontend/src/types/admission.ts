// types/admission.ts - Type definitions for admission module

export interface AdmissionFilters {
  patientId?: string;
  wardId?: string;
  status?: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED' | 'DECEASED';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AdmissionStats {
  totalAdmissions: number;
  currentAdmissions: number;
  dischargedToday: number;
  averageLengthOfStay: number;
  wardOccupancy: Array<{
    wardId: string;
    wardName: string;
    capacity: number;
    occupied: number;
    percentage: number;
  }>;
}

export interface DailyNote {
  id: string;
  admissionId: string;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DischargeData {
  dischargeDate: string;
  dischargeType: 'NORMAL' | 'AGAINST_MEDICAL_ADVICE' | 'TRANSFER' | 'DECEASED';
  condition: string;
  instructions: string;
  followUpDate?: string;
}

export interface SecondaryDiagnosisData {
  diagnosisCode: string;
  diagnosisName: string;
  type: 'PRIMARY' | 'SECONDARY';
}

export interface AdmissionDailyNote {
  id: string;
  note: string;
  userId: string;
  userName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionSecondaryDiagnosis {
  id: string;
  admissionId: string;
  diagnosisCode: string;
  diagnosisName: string;
  type: 'PRIMARY' | 'SECONDARY';
  createdAt: string;
}
