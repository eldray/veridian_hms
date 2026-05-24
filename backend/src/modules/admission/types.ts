// modules/admission/AdmissionTypes.ts
export interface CreateAdmissionDTO {
  attendanceId: string;      // REQUIRED - links to clinical encounter
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

export interface AdmissionFilters {
  status?: 'active' | 'discharged';
  wardId?: string;
  patientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}