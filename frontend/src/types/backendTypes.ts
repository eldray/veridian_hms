// Generated from backend Prisma schema and API contracts.
// Regenerate with: cd backend && npm run gen:types
// (The generation script maps Prisma scalar fields to TypeScript types
//  and appends common API response/form types.)

// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Common Form Data Types
export interface CreatePatientData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  contact: string;
  emergencyContact?: string;
  address?: string;
  nhisNumber?: string;
}

export interface CreateAdmissionData {
  patientId: string;
  wardId: string;
  bedId: string;
  reasonForAdmission: string;
  diagnosis: string;
  admittingDoctor: string;
}

export interface CreateAttendanceData {
  patientId: string;
  attendanceType: string;
  paymentMode: string;
  attendingClinician: string;
  department: string;
}

export interface BillItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  serviceItemId?: string;
}

export interface CreateBillData {
  patientId: string;
  attendanceId: string;
  paymentMode: string;
  items: BillItemData[];
}

// NHIS Specific Types
export interface NHISClaimStatus {
  attendanceNumber: string;
  patientName: string;
  isClaimReady: boolean;
  validation: {
    canSubmit: boolean;
    errors: string[];
  };
  missingRequirements: {
    nhisNumber: boolean;
    primaryDiagnosis: boolean;
    servicesWithMissingCodes: string[];
  };
}

// Search and Filter Types
export interface PatientSearchFilters {
  search?: string;
  gender?: string;
  isActive?: boolean;
}

export interface AdmissionFilters {
  status?: string;
  wardId?: string;
  startDate?: string;
  endDate?: string;
}

// Backend Prisma Model Interfaces
// These are generated programmatically — see backend/src/scripts/generateFrontendTypes.ts
// Run `npm run gen:types` in the backend to regenerate.
