// modules/patient/PatientTypes.ts
export interface CreatePatientDTO {
  folderNumber?: string;
  surname: string;
  otherNames: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: Date;
  contact: string;
  address: string;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance' | 'corporate';
  insuranceProviderId?: string;
  corporateAccountId?: string;  // ✅ ADDED - for corporate patients
  corporateEmployeeId?: string; // ✅ ADDED - if employee of corporate
  nhisNumber?: string;
  phoneNumber?: string;
  email?: string;
  insuranceDetails?: any;
  additionalInfo?: any;
  billingAddress?: any;
  employer?: any;
  imageUrl?: string;
}

export interface UpdatePatientDTO extends Partial<CreatePatientDTO> {}

export interface PatientFilters {
  search?: string;
  nhisNumber?: string;
  phone?: string;
  email?: string;
  gender?: string;
  paymentMode?: string;  // ✅ ADDED - filter by payment mode
  corporateAccountId?: string;  // ✅ ADDED - filter by corporate
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
  paymentMode?: string;  // ✅ ADDED
  corporateAccountId?: string;  // ✅ ADDED
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
  corporateAccount?: {
    id: string;
    companyName: string;
  };
  insuranceProvider?: {
    id: string;
    name: string;
  };
  registeredAt: Date;
}