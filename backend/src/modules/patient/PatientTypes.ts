export interface CreatePatientDTO {
  folderNumber?: string;
  surname: string;
  otherNames: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  contact: string;
  address: string;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  insuranceProviderId?: string | null;
  corporateAccountId?: string | null;
  corporateEmployeeId?: string | null;
  nhisNumber?: string;
  nhisExpiryDate?: Date | string | null;
  nhisActive?: boolean;
  phoneNumber?: string;
  email?: string;
  insuranceDetails?: any;
  additionalInfo?: any;
  billingAddress?: any;
  employer?: any;
  imageUrl?: string;
  allergies?: CreateAllergyDTO[];
  medicalHistories?: CreateMedicalHistoryDTO[];
  surgicalHistories?: CreateSurgicalHistoryDTO[];
  familyHistories?: CreateFamilyHistoryDTO[];
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

export interface PatientFilters {
  search?: string;
  nhisNumber?: string;
  phone?: string;
  email?: string;
  gender?: string;
  paymentMode?: string;
  corporateAccountId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PatientSummary {
  id: string;
  folderNumber: string;
  fullName: string;
  age: number;
  gender: string;
  nhisNumber?: string;
  contact?: string;
  paymentMode?: string;
  corporateAccountId?: string;
  registeredAt: Date;
  lastVisit?: Date;
}

export interface PatientResponse {
  id: string;
  folderNumber: string;
  surname: string;
  otherNames: string;
  gender: string;
  dateOfBirth: Date;
  age: number;
  contact: string;
  address: string;
  paymentMode?: string;
  nhisNumber?: string;
  corporateAccount?: { id: string; companyName: string; };
  insuranceProvider?: { id: string; name: string; };
  registeredAt: Date;
}

// ==========================================
// NEW: EMR DTOs
// ==========================================

export interface CreateAllergyDTO {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

export interface CreateMedicalHistoryDTO {
  condition: string;
  diagnosedAt?: Date | string;
  notes?: string;
}

export interface CreateSurgicalHistoryDTO {
  procedure: string;
  surgeryDate?: Date | string;
  notes?: string;
}

export interface CreateFamilyHistoryDTO {
  relation: string;
  condition: string;
  notes?: string;
}