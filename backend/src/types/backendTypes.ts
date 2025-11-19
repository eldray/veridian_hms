// AUTO-GENERATED from backend Mongoose models
// DO NOT EDIT MANUALLY

export interface IAdmission {
  _id: string;
  admissionNumber: string;
  patientId: string;
  attendanceId: string;
  wardId: string;
  bedId: string;
  admissionDate: string;
  admissionTime: string;
  admittingDoctor: string;
  reasonForAdmission: string;
  diagnosis: string;
  status: string;
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: string;
  dailyNotes: Array<{
    id: string;
    date: string;
    vitals: any;
    progressNotes: string;
    medications: any[];
    procedures: any[];
    recordedBy: string;
    recordedAt: string;
  }>;
  createdBy: string;
  // NHIS ADDITIONS
  admissionType: 'elective' | 'emergency' | 'transfer';
  admissionSource: 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
  dischargeStatus?: 'home' | 'transfer' | 'expired' | 'against_medical_advice';
  lengthOfStay: number;
  principalDiagnosis: {
    diagnosisId: string;
    icdCode: string;
    presentOnAdmission: 'Y' | 'N' | 'U';
  };
  secondaryDiagnoses: Array<{
    diagnosisId: string;
    icdCode: string;
    presentOnAdmission: 'Y' | 'N' | 'U';
    diagnosisType: 'comorbidity' | 'complication';
  }>;
}

export interface IAttendance {
  _id: string;
  attendanceNumber: string;
  patientId: string;
  insuranceProviderId?: string;
  dateTime: string;
  attendanceType: string;
  paymentMode: string;
  nhisCCC?: string;
  complaints: string;
  vitals: Array<{
    vitalId: string;
    recordedAt: string;
    recordedBy: string;
  }>;
  diagnoses: Array<{
    diagnosisId: string;
    primary: boolean;
    notes?: string;
    date: string;
    createdBy: string;
    icdCode?: string;
    // NHIS ADDITIONS
    presentOnAdmission?: 'Y' | 'N' | 'U';
    diagnosisType?: 'principal' | 'secondary' | 'comorbidity';
  }>;
  labTests: Array<{
    templateId: string;
    status: 'requested' | 'completed' | 'cancelled';
    result?: any;
    normalRange?: string;
    units?: string;
    requestedAt: string;
    completedAt?: string;
    performedBy?: string;
    verifiedBy?: string;
    notes?: string;
    createdBy: string;
    priority: 'routine' | 'urgent' | 'stat';
  }>;
  procedures: Array<{
    templateId: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    scheduledDate?: string;
    performedAt?: string;
    performedBy?: string;
    assistant?: string;
    notes?: string;
    complications?: string;
    outcome?: string;
    cost?: number;
    duration?: number;
    createdBy: string;
  }>;
  scans: Array<{
    scanType: string;
    description: string;
    bodyPart?: string;
    status: 'requested' | 'completed' | 'cancelled';
    requestedAt: string;
    completedAt?: string;
    result?: string;
    findings?: string;
    impression?: string;
    performedBy?: string;
    verifiedBy?: string;
    imageUrls: string[];
    createdBy: string;
    priority: 'routine' | 'urgent';
  }>;
  medications: Array<{
    stockItemId?: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    quantity: number;
    route?: string;
    instructions?: string;
    status: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
    prescribedAt: string;
    dispensedAt?: string;
    administeredAt?: string;
    dispensedBy?: string;
    administeredBy?: string;
    prescribedBy: string;
    notes?: string;
  }>;
  medicalNotes?: string;
  attendingClinician: string;
  createdBy: string;
  updatedBy?: string;
  status: 'pending' | 'completed' | 'cancelled' | 'admitted' | 'discharged';
  admissionId?: string;
  bedId?: string;
  wardId?: string;
  billId?: string;
  previousAttendanceId?: string;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  insuranceClaimId?: string;
  preAuthNumber?: string;
  preAuthApproved: boolean;
  preAuthAmount?: number;
  servicesRendered: Array<{
    serviceItemId: string;
    quantity: number;
    date: string;
    performedBy: string;
    notes?: string;
  }>;
  // NHIS ADDITIONS
  encounterCategory: 'opd' | 'ipd' | 'daycase';
  visitCategory: 'general' | 'specialist' | 'emergency' | 'inpatient';
  referringFacility?: string;
}

export interface IBill {
  _id: string;
  billNumber: string;
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  // Financial breakdown
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category?: string;
  }>;
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  // Status and tracking
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
  paymentMode: 'cash' | 'nhis' | 'private_insurance';
  // Insurance information
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected';
  // References
  createdBy: string;
  updatedBy?: string;
  // Timestamps
  billDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDiagnosis {
  _id: string;
  name: string;
  icdCode: string;
  gdrgCode: string;
  variant?: 'adult' | 'child' | 'complicated' | 'uncomplicated';
  description?: string;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  // NHIS ADDITIONS
  isChronic: boolean;
  isNHISCovered: boolean;
  category: 'medical' | 'surgical' | 'obstetric' | 'pediatric' | 'psychiatric';
}

export interface IGDRGTariff {
  _id: string;
  gdrgCode: string;
  description: string;
  nhiaTariff: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export interface IHospital {
  _id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  // NHIS-SPECIFIC FIELDS
  nhisFacilityCode: string;
  nhisFacilityType: string;
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: string;
  nhisAccreditationExpiry?: string;
  // Billing Information
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  // Contact Persons for NHIS
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IInsuranceClaim {
  _id: string;
  claimNumber: string;
  billId: string;
  patientId: string;
  insuranceProviderId: string;
  attendanceId: string;
  // Claim details
  totalClaimAmount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  paidAmount?: number;
  // Status tracking
  status: 'draft' | 'submitted' | 'processing' | 'approved' | 'partially_approved' | 'rejected' | 'paid';
  submissionDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  // Documents and references
  preAuthNumber?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  notes?: string;
  // Tracking
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ILabTestTemplate {
  _id: string;
  name: string;
  investigationCode: string;
  category: string;
  subCategory?: string;
  description?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  specimenType: string;
  resultTemplate: [{
    fieldName: string;
    fieldType: string;
    label: string;
    referenceRange: string;
    options: string[];
    unit?: string;
  }];
  createdAt: string;
  updatedAt: string;
}

export interface IPatient {
  _id: string;
  folderNumber: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  age: number;
  contact: string;
  address: string;
  paymentMode?: 'cash' | 'nhis' | 'private_insurance';
  insuranceDetails?: {
    providerId: string;
    memberId: string;
    groupNumber?: string;
    relationship: 'self' | 'spouse' | 'child' | 'other';
    startDate: string;
    endDate: string;
    isActive: boolean;
    copayment?: number;
    deductible?: number;
    coverageLimit?: number;
  };
  additionalInfo: {
    title?: string;
    email?: string;
    houseNumber?: string;
    idType?: 'GhanaCard' | 'Voter ID' | 'Passport' | 'Driver License' | 'NHIS Card' | 'Other';
    idNumber?: string;
    bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
    occupation?: string;
    nextOfKin?: string;
    emergencyContact?: {
      name: string;
      relationship: string;
      phone: string;
    };
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  employer?: {
    name: string;
    address: string;
    phone: string;
  };
  imageUrl?: string;
  registeredAt: string;
  registeredBy: string;
}

export interface IProcedureTemplate {
  _id: string;
  name: string;
  procedureCode: string;
  description?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number;
  category: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface IScanTemplate {
  _id: string;
  name: string;
  scanCode: string;
  description: string;
  category: string;
  bodyPart: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  preparationInstructions?: string;
  duration: number;
  contrastRequired: boolean;
  scanType: string;
  createdAt: string;
  updatedAt: string;
}

export interface IServiceCatalog {
  _id: string;
  name: string;
  code: string;
  description?: string;
  serviceType: 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'scan' | 'miscellaneous';
  category?: string;
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  scanTemplateId?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  unit: string;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  // NHIS ADDITIONS
  nhisServiceCode: string;
  nhisCategory?: string;
  requiresClinicalNotes: boolean;
}

export interface IStockItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  strength: string;
  unitOfMeasure: string;
  drugCode: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  insurancePrice: number;
  supplier: string;
  expiryDate?: string;
  batchNumber?: string;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IVitals {
  _id: string;
  attendanceId: string;
  patientId: string;
  isPending: boolean;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
    meanArterialPressure?: number;
  };
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  bloodGlucose?: number;
  painScale?: number;
  avpu?: 'alert' | 'voice' | 'pain' | 'unresponsive';
  gcs?: {
    eyes: number;
    verbal: number;
    motor: number;
    total?: number;
  };
  notes?: string;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IWard {
  _id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  // ADD PRICING:
  cashDailyRate: number;
  insuranceDailyRate: number;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

