// src/types/index.ts - FULLY UPDATED TO MATCH BACKEND CONTROLLERS

// ======================
// USER & AUTHENTICATION
// ======================

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
  id?: string;
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

export interface HospitalInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// ======================
// PAYMENT & ATTENDANCE
// ======================

export type PaymentMode = 'cash' | 'nhis' | 'private_insurance';
export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'mobile_money' 
  | 'bank_transfer' 
  | 'insurance_claim';

export type AttendanceType =
  | 'general_opd'
  | 'specialist_consultation'
  | 'antenatal_care'
  | 'diagnostic_opd'
  | 'emergency'
  | 'other_opd'
  | 'inpatient';

export type AttendanceStatus = 'pending' | 'active' | 'completed' | 'cancelled' | 'admitted' | 'discharged';

// ======================
// PATIENT & INSURANCE
// ======================

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

// ======================
// TEMPLATES (UPDATED TO EXACTLY MATCH BACKEND)
// ======================

// DIAGNOSIS TEMPLATE - Matches diagnosisController.ts
export interface DiagnosisTemplate {
  _id: string;
  name: string;                    // ✅ Backend: body('name').notEmpty()
  icdCode: string;                 // ✅ Backend: body('icdCode').notEmpty()
  description?: string;            // ✅ Backend: optional
  cashPrice: number;               // ✅ Backend: body('cashPrice').isNumeric()
  insurancePrice: number;          // ✅ Backend: body('insurancePrice').isNumeric()
  costPrice: number;               // ✅ Backend: body('costPrice').isNumeric()
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;                 // ✅ Backend: body('vatRate').optional().isNumeric()
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

// LAB TEST TEMPLATE - Matches labTestTemplateController.ts
export interface LabTestTemplate {
  _id: string;
  name: string;                    // ✅ Backend: body('name').notEmpty()
  description?: string;            // ✅ Backend: optional
  cashPrice: number;               // ✅ Backend: body('cashPrice').isNumeric()
  insurancePrice: number;          // ✅ Backend: body('insurancePrice').isNumeric()
  costPrice: number;               // ✅ Backend: body('costPrice').isNumeric()
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;                 // ✅ Backend: body('vatRate').optional().isNumeric()
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

// PROCEDURE TEMPLATE - Matches procedureTemplateController.ts
export interface ProcedureTemplate {
  _id: string;
  name: string;                    // ✅ Backend: body('name').notEmpty()
  code: string;                    // ✅ Backend: body('code').notEmpty()
  description?: string;            // ✅ Backend: optional
  cashPrice: number;               // ✅ Backend: body('cashPrice').isNumeric()
  insurancePrice: number;          // ✅ Backend: body('insurancePrice').isNumeric()
  costPrice: number;               // ✅ Backend: body('costPrice').isNumeric()
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;                 // ✅ Backend: body('vatRate').optional().isNumeric()
  isTaxable: boolean;
  duration: number;                // ✅ Backend: body('duration').optional().isNumeric()
  createdAt: string;
  updatedAt: string;
}

// SCAN TEMPLATE - Matches scanTemplateController.ts EXACTLY
export interface ScanTemplate {
  _id: string;
  name: string;                    // ✅ Backend: body('name').notEmpty()
  description: string;             // ✅ Backend: body('description').notEmpty()
  category: string;                // ✅ Backend: body('category').isIn([...])
  bodyPart: string;                // ✅ Backend: body('bodyPart').isIn([...])
  cashPrice: number;               // ✅ Backend: body('cashPrice').isNumeric()
  insurancePrice: number;          // ✅ Backend: body('insurancePrice').isNumeric()
  costPrice: number;               // ✅ Backend: body('costPrice').isNumeric()
  duration: number;                // ✅ Backend: body('duration').isNumeric()
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;                 // ✅ Backend: body('vatRate').optional().isNumeric()
  isTaxable: boolean;
  contrastRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

// STOCK ITEM - Matches stockItemController.ts EXACTLY
export interface StockItem {
  _id: string;
  name: string;                    // ✅ Backend: body('name').notEmpty()
  category: string;                // ✅ Backend: body('category').notEmpty()
  description?: string;            // ✅ Backend: optional
  unitOfMeasure: string;           // ✅ Backend: body('unitOfMeasure').notEmpty()
  reorderLevel: number;            // ✅ Backend: body('reorderLevel').isNumeric()
  unitPrice: number;               // ✅ Backend: body('unitPrice').isNumeric()
  sellingPrice: number;            // ✅ Backend: body('sellingPrice').isNumeric()
  insurancePrice: number;          // ✅ Backend: body('insurancePrice').isNumeric()
  currentStock: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;                 // ✅ Backend: body('vatRate').optional().isNumeric()
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// CLINICAL WORKFLOW
// ======================

export interface Vitals {
  _id?: string;
  attendanceId?: string;
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
  name: string;
  icdCode: string;
  notes?: string;
  primary: boolean;
  date: string;
  createdBy: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
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
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabTest {
  _id: string;
  templateId: string;
  name: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  result?: any;
  normalRange?: string;
  units?: string;
  performedBy?: string;
  verifiedBy?: string;
  requestedAt: string;
  completedAt?: string;
  notes?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  _id: string;
  templateId?: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: 'requested' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent';
  result?: string;
  findings?: string;
  impression?: string;
  performedBy?: string;
  verifiedBy?: string;
  imageUrls?: string[];
  requestedAt: string;
  completedAt?: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
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
  duration?: number;
  notes?: string;
  complications?: string;
  outcome?: string;
  createdBy: string;
  cashPrice: number;
  insurancePrice: number;
  costPrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
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

// ======================
// ATTENDANCE (MAIN ENTITY)
// ======================

export interface Attendance {
  _id: string;
  attendanceNumber: string;
  patientId: string;
  patient?: Patient;
  dateTime: string;
  attendanceType: AttendanceType;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  attendingClinician: string;
  clinician?: User;
  status: AttendanceStatus;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;

  // Billing information
  totalBill?: number;
  paidAmount?: number;
  outstandingBalance?: number;

  // Status timeline
  activatedAt?: string;
  completedAt?: string;

  // Optional references
  admissionId?: string;
  bedId?: string;
  wardId?: string;
  billId?: string;
  previousAttendanceId?: string;
  insuranceClaimId?: string;
  preAuthNumber?: string;
  preAuthApproved?: boolean;
  preAuthAmount?: number;
  medicalNotes?: string;
  followUpDate?: string;

  // Clinical arrays
  vitals?: Vitals[];
  diagnoses?: Diagnosis[];
  medications?: Medication[];
  labTests?: LabTest[];
  scans?: Scan[];
  procedures?: Procedure[];
  progressNotes?: ProgressNote[];
  servicesRendered?: ServiceRendered[];
}

// ======================
// BILLING
// ======================

export type BillStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
export type ClaimStatus = 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected';

export interface BillItem {
  _id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'lab' | 'scan' | 'medication' | 'consumable' | 'ward' | 'other';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCovered?: number;
  patientPayable?: number;
}

export interface Payment {
  _id: string;
  amount: number;
  paymentMode: PaymentMethod;
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
  
  // Financial breakdown
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  
  // Status and tracking
  status: BillStatus;
  
  // Payment mode
  paymentMode: PaymentMode;
  
  // Insurance information
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: ClaimStatus;
  
  // References
  createdBy: string;
  updatedBy?: string;
  
  // Timestamps
  billDate: string;
  dueDate?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  
  // Payments
  payments: Payment[];
}

// ======================
// INSURANCE
// ======================

export type InsuranceClaimStatus = 'draft' | 'submitted' | 'processing' | 'approved' | 'partially_approved' | 'rejected' | 'paid';

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
  status: InsuranceClaimStatus;
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

// ======================
// ADMISSIONS & WARDS
// ======================

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
  requiresAuthorization: boolean;
  vatRate: number;
  isTaxable: boolean;
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

// ======================
// SERVICE CATALOG
// ======================

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
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// REPORTS
// ======================

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
  includeStatusAnalytics?: boolean;
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

// ======================
// UTILITY TYPES
// ======================

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

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface FilterOptions {
  [key: string]: string | number | boolean | undefined;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  status?: number;
}

export interface SearchParams {
  query: string;
  filters?: FilterOptions;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalPatients: number;
  totalAttendances: number;
  totalRevenue: number;
  pendingAttendances: number;
  activeAttendances: number;
  completedAttendances: number;
  monthlyRevenue: number;
  weeklyAttendances: number;
}

export interface Notification {
  _id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface SystemSettings {
  hospitalName: string;
  hospitalAddress: string;
  hospitalPhone: string;
  hospitalEmail: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
}