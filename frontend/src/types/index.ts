// User and Authentication Types
export type UserRole = 
  | 'admin' 
  | 'doctor' 
  | 'nurse' 
  | 'midwife' 
  | 'records' 
  | 'lab_tech' 
  | 'pharmacist' 
  | 'accounts';

export interface User {
  _id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Payment and Insurance Types
export type PaymentMode = 'cash' | 'nhis' | 'private_insurance';  
  
  // src/types/index.ts - ADD THESE TYPES IF MISSING
export type PaymentMode = 'cash' | 'nhis' | 'private_insurance';

export type AttendanceType = 
  | 'general_opd'
  | 'specialist_opd'
  | 'emergency'
  | 'inpatient'
  | 'surgical'
  | 'maternity'
  | 'pediatric'
  | 'dental'
  | 'optical'
  | 'physiotherapy'
  | 'laboratory'
  | 'radiology';

export interface Attendance {
  _id: string;
  patientId: string;
  dateTime: string;
  attendanceType: AttendanceType;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  attendingClinician: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'admitted' | 'discharged';

export interface InsuranceDetails {
  insuranceNumber: string;
  startDate: string;
  endDate: string;
  providerId?: string;
  providerName?: string;
}

export interface AdditionalInfo {
  title?: 'Mr' | 'Mrs' | 'Miss' | 'Dr' | 'Prof' | 'Rev' | 'Chief' | 'Other';
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
}

// Patient interface
export interface Patient {
  _id: string;
  folderNumber: string;
  fullName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  age: number;
  contact: string;
  address: string;
  paymentMode?: PaymentMode;
  insuranceDetails?: InsuranceDetails;
  additionalInfo?: AdditionalInfo;
  imageUrl?: string;
  registeredAt: string;
  registeredBy: string;
  updatedAt: string;
}

// Clinical Workflow Types
export interface Vitals {
  _id?: string;
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedAt: string;
  recordedBy: string;
}

export interface Diagnosis {
  _id: string;
  diagnosisId: string;
  name: string;
  icdCode?: string;
  notes?: string;
  primary: boolean;
  date: string;
  createdBy: string;
}

export interface Medication {
  _id: string;
  stockItemId?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  route: string;
  instructions?: string;
  status: 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
  prescribedAt: string;
  prescribedBy: string;
  dispensedAt?: string;
  dispensedBy?: string;
  administeredAt?: string;
  administeredBy?: string;
  notes?: string;
}

export interface LabTest {
  _id: string;
  templateId: string;
  name: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent';
  result?: string;
  normalRange?: string;
  units?: string;
  performedBy?: string;
  verifiedBy?: string;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
}

export interface Scan {
  _id: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent';
  result?: string;
  findings?: string;
  impression?: string;
  performedBy?: string;
  imageUrls?: string[];
  requestedAt: string;
  completedAt?: string;
}

export interface Procedure {
  _id: string;
  templateId: string;
  name: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledDate: string;
  performedAt?: string;
  performedBy?: string;
  assistant?: string;
  cost?: number;
  notes?: string;
}

export interface ProgressNote {
  _id: string;
  note: string;
  type: 'clinical' | 'nursing' | 'progress' | 'discharge';
  createdBy: string;
  createdAt: string;
}

export interface ServiceRendered {
  _id: string;
  serviceItemId: string;
  name: string;
  quantity: number;
  date: string;
  performedBy: string;
  notes?: string;
}

// Attendance interface
export interface Attendance {
  _id: string;
  attendanceNumber: string;
  patientId: string;
  patient?: Patient;
  dateTime: string;
  attendanceType: AttendanceType;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  insurancePolicyNumber?: string;
  relationshipToPolicyHolder?: string;
  complaints: string;
  vitals: Vitals[];
  diagnoses: Diagnosis[];
  medications: Medication[];
  labTests: LabTest[];
  scans: Scan[];
  procedures: Procedure[];
  servicesRendered: ServiceRendered[];
  progressNotes: ProgressNote[];
  medicalNotes?: string;
  attendingClinician: string;
  clinician?: User;
  status: AttendanceStatus;
  followUpDate?: string;
  previousAttendanceId?: string;
  admissionId?: string;
  bedId?: string;
  wardId?: string;
  billId?: string;
  insuranceClaimId?: string;
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Billing Types
export type BillStatus = 'pending' | 'partial' | 'paid' | 'cancelled' | 'generated';

export interface BillItem {
  _id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'lab' | 'scan' | 'medication' | 'consumable' | 'ward' | 'other';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  _id: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentDate: string;
  receivedBy: string;
  receiptNumber: string;
  reference?: string;
  notes?: string;
}

export interface Bill {
  _id: string;
  billNumber: string;
  patientId: string;
  patient?: Patient;
  attendanceId?: string;
  admissionId?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: BillStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  payments: Payment[];
}

// Insurance Claims
export type ClaimStatus = 'draft' | 'submitted' | 'processing' | 'approved' | 'partially_approved' | 'rejected' | 'paid';

export interface InsuranceClaim {
  _id: string;
  claimNumber: string;
  billId: string;
  bill?: Bill;
  patientId: string;
  patient?: Patient;
  insuranceProviderId: string;
  insuranceProvider?: InsuranceProvider;
  attendanceId: string;
  attendance?: Attendance;
  totalClaimAmount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
  paidAmount?: number;
  status: ClaimStatus;
  submissionDate?: string;
  approvalDate?: string;
  paymentDate?: string;
  preAuthNumber?: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  notes?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceProvider {
  _id: string;
  name: string;
  type: 'nhis' | 'private';
  coveragePercentage: number;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Stock Management Types
export type StockCategory = 'medication' | 'consumable' | 'equipment' | 'supply';

export type TransactionType = 'stock_in' | 'stock_out' | 'adjustment' | 'expired' | 'damaged';

export interface StockItem {
  _id: string;
  name: string;
  category: StockCategory;
  description?: string;
  unitOfMeasure: string;
  reorderLevel: number;
  currentStock: number;
  unitPrice: number;
  sellingPrice: number;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockTransaction {
  _id: string;
  stockItemId: string;
  stockItem?: StockItem;
  transactionType: TransactionType;
  quantity: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  transactionDate: string;
  performedBy: string;
  createdAt: string;
}

// Admissions and Ward Management Types
export type WardType = 'general' | 'private' | 'icu' | 'maternity' | 'pediatric' | 'surgical';

export interface Ward {
  _id: string;
  wardName: string;
  wardType: WardType;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  cashDailyRate: number;
  insuranceDailyRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bed {
  _id: string;
  wardId: string;
  ward?: Ward;
  bedNumber: string;
  isOccupied: boolean;
  currentPatientId?: string;
  currentPatient?: Patient;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdmissionStatus = 'admitted' | 'discharged' | 'transferred';

export interface Admission {
  _id: string;
  admissionNumber: string;
  patientId: string;
  patient?: Patient;
  attendanceId?: string;
  wardId: string;
  ward?: Ward;
  bedId: string;
  bed?: Bed;
  admissionDate: string;
  admissionTime: string;
  admittingDoctor: string;
  reasonForAdmission: string;
  diagnosis: string;
  status: AdmissionStatus;
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeSummary?: string;
  totalBill: number;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Service Catalog Types
export type ServiceType = 'diagnosis' | 'lab_test' | 'procedure' | 'medication' | 'ward' | 'consultation' | 'other';

export interface ServiceCatalog {
  _id: string;
  name: string;
  code: string;
  description?: string;
  serviceType: ServiceType;
  category?: 'consultation' | 'diagnostic' | 'procedural' | 'pharmacy' | 'ward' | 'laboratory' | 'radiology' | 'other';
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
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

// Reports Types
export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  userId?: string;
  attendanceType?: AttendanceType;
  status?: string;
  insuranceProviderId?: string;
  patientId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface FinancialReport {
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRevenue: number;
    totalPaid: number;
    outstandingBalance: number;
    totalAttendances: number;
  };
  breakdown: Array<{
    paymentMode: string;
    attendanceType: string;
    month: number;
    year: number;
    totalAttendances: number;
    totalRevenue: number;
    totalPaid: number;
    outstandingBalance: number;
    averageBillAmount: number;
  }>;
  reportGenerated: string;
}

export interface RevenueReport {
  reportType: string;
  period: { startDate?: string; endDate?: string };
  groupBy: string;
  revenueData: Array<{
    period: any;
    totalRevenue: number;
    totalPaid: number;
    visitCount: number;
    averageRevenuePerVisit: number;
  }>;
  generatedAt: string;
}

export interface InsuranceClaimsReport {
  reportType: string;
  period: { startDate?: string; endDate?: string };
  claimsReport: Array<{
    insuranceProvider: string;
    status: string;
    month: number;
    year: number;
    totalClaims: number;
    totalClaimAmount: number;
    totalApprovedAmount: number;
    totalPaidAmount: number;
    averageProcessingDays: number;
    approvalRate: number;
  }>;
  generatedAt: string;
}

export interface ClinicalReport {
  reportType: string;
  period: { startDate?: string; endDate?: string };
  clinicalReport: Array<{
    diagnosis: string;
    icdCode: string;
    clinician: string;
    month: number;
    totalCases: number;
    averageAge: number;
    genderDistribution: {
      male: number;
      female: number;
    };
    commonComorbidities: string[];
  }>;
  generatedAt: string;
}

export interface AttendanceReport {
  reportType: string;
  period: { startDate?: string; endDate?: string };
  attendanceReport: Array<{
    attendanceType: string;
    status: string;
    month: number;
    year: number;
    count: number;
    averageDuration: number;
  }>;
  generatedAt: string;
}

// Pagination Types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
  success?: boolean;
}
