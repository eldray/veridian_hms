// modules/admission/types.ts
export interface AdmissionQueryParams {
  status?: string;
  wardId?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CreateAdmissionBody {
  patientId: string;
  wardId: string;
  bedId: string;
  attendanceId?: string;
  primaryDiagnosisId: string;
  admittingDoctor: string;
  reasonForAdmission: string;
  paymentMode?: string;
  admissionDate?: string;
  admissionTime?: string;
  admissionType?: string;
  admissionSource?: string;
  presentOnAdmission?: string;
}

export interface AddSecondaryDiagnosisBody {
  diagnosisId: string;
  diagnosisType: 'additional' | 'provisional';
  notes?: string;
  presentOnAdmission?: string;
}

export interface UpdatePrimaryDiagnosisBody {
  primaryDiagnosisId: string;
  presentOnAdmission?: string;
}

export interface DischargePatientBody {
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeStatus?: string;
  conditionAtDischarge?: string;
}

export interface AddDailyNotesBody {
  notes: string;
  noteType?: string;
}

export interface UpdateAdmissionBody {
  wardId?: string;
  bedId?: string;
  admittingDoctor?: string;
  reasonForAdmission?: string;
  diagnosis?: string;
}

export interface AdmissionResponse {
  success: boolean;
  data?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}