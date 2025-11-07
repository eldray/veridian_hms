// AUTO-GENERATED from backend Mongoose models
// DO NOT EDIT MANUALLY

export interface IAttendance {
  _id: string;
  attendanceNumber: string;
  patientId: string;
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
  }>;
  labTests: Array<{
    templateId: string;
    status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
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
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
    status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
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
  progressNotes: Array<{
    note: string;
    type: 'clinical' | 'nursing' | 'progress' | 'discharge';
    createdBy: string;
    createdAt: string;
  }>;
  medicalNotes?: string;
  attendingClinician: string;
  createdBy: string;
  updatedBy?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'admitted' | 'discharged';
  admissionId?: string;
  bedId?: string;
  wardId?: string;
  billId?: string;
  previousAttendanceId?: string;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  createdAt: string;
  updatedAt: string;
  // Billing related fields
  insuranceClaimId?: string;
  preAuthNumber?: string;
  preAuthApproved: boolean;
  preAuthAmount?: number;
  // Service tracking
  servicesRendered: Array<{
    serviceItemId: string;
    quantity: number;
    date: string;
    performedBy: string;
    notes?: string;
  }>;
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
  paymentMode: 'cash' | 'nhis' | 'private_insurance' | 'mixed';
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

export interface IBillItem {
  _id: string;
  billId: string;
  serviceType: 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'other';
  serviceReference: string;
  serviceItemId?: string;
  serviceName: string;
  serviceCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  vatAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  date: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDiagnosis {
  _id: string;
  name: string;
  icdCode: string;
  gdrgCode: string;
  description?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
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
  isActive: boolean;
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
  isActive: boolean;
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
  isActive: boolean;
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
  serviceType: 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'other';
  category?: string;
  // References to existing models
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  // Unified pricing
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  unit: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IServiceItem {
  _id: string;
  name: string;
  description?: string;
  categoryId: string;
  code: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  unit: string;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
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
  isActive: boolean;
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
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

