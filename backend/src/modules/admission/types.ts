// modules/admission/types.ts
import { Request, Response, NextFunction } from 'express';

export interface AdmissionQueryParams {
  status?: string;
  wardId?: string;
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
  limit?: string;
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
  dischargeNotes?: string;
  conditionAtDischarge?: string;
}

export interface AddDailyNotesBody {
  notes: string;
  noteType?: string;
}

export interface AdmissionRequest extends Request {
  params: {
    id: string;
  };
  query: AdmissionQueryParams;
  body: any;
}

export interface AdmissionResponse extends Response {}
