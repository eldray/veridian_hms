// src/types/index.ts - FULLY UPDATED WITH STATUS HELPERS & CLEANED STRUCTURE

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
  id?: string; // For frontend compatibility
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

// src/types/index.ts
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
// CLINICAL WORKFLOW
// ======================

export interface Vitals {
  _id?: string;
  attendanceId?: string; // To associate with attendance in frontend stores
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
    // ADD THESE PRICING FIELDS:
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
  priority: 'routine' | 'urgent' | 'stat';
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
  verifiedBy?: string;
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
  duration?: number;
  notes?: string;
  complications?: string;
  outcome?: string;
  createdBy: string;
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
// STATUS HELPER LOGIC
// ======================

export type ActivityPhase = 'planning' | 'execution' | 'completed';

export const getAttendancePhase = (status: AttendanceStatus): ActivityPhase => {
  switch (status) {
    case 'pending':
      return 'planning';
    case 'active':
      return 'execution';
    case 'completed':
    case 'cancelled':
    case 'admitted':
    case 'discharged':
      return 'completed';
    default:
      return 'planning';
  }
};

export const canAddActivities = (attendance: Attendance): boolean => {
  return ['pending', 'active'].includes(attendance.status);
};

export const canPerformActivities = (attendance: Attendance): boolean => {
  return attendance.status === 'active';
};

export const canModifyActivities = (attendance: Attendance): boolean => {
  return ['pending', 'active'].includes(attendance.status);
};

// ======================
// BILLING
// ======================

export type BillStatus = 'pending' | 'partial' | 'paid' | 'cancelled' | 'generated';

export interface BillItem {
  _id: string;
  description: string;
  category: 'consultation' | 'procedure' | 'lab' | 'scan' | 'medication' | 'consumable' | 'ward' | 'other';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  insuranceCovered?: number; // ✅ ADD
  patientPayable?: number;   // ✅ ADD
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

// Payment Method (for transactions)
export type PaymentMethod = 
  | 'cash' 
  | 'card' 
  | 'mobile_money' 
  | 'bank_transfer' 
  | 'insurance_claim';

// CLAIM STATUS from backend
export type ClaimStatus = 'not_required' | 'pending' | 'submitted' | 'approved' | 'rejected';

export interface Bill {
  _id: string;
  billNumber: string;
  patientId: string;
  patient?: Patient;
  attendanceId?: string;
  admissionId?: string;
  
  // Financial breakdown (from backend)
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;        // ✅ was 'tax' → now matches backend 'taxAmount'
  totalAmount: number;
  insuranceCovered: number; // ✅ NEW: amount covered by insurance
  patientPayable: number;   // ✅ NEW: what patient actually pays
  paidAmount: number;
  balance: number;
  
  // Status and tracking
  status: BillStatus;
  
  // Payment mode
  paymentMode: PaymentMode; // ✅ NEW: matches backend
  
  // Insurance information (from backend)
  insuranceProviderId?: string; // ✅ NEW
  preAuthNumber?: string;       // ✅ already present, good
  claimNumber?: string;         // ✅ NEW
  claimStatus: ClaimStatus;     // ✅ NEW (use the type above)
  
  // References
  createdBy: string;
  updatedBy?: string;           // ✅ NEW
  
  // Timestamps (from backend)
  billDate: string;             // ✅ NEW: date bill was issued
  dueDate?: string;             // ✅ NEW: payment due date
  
  // Audit
  createdAt: string;
  updatedAt: string;
  
  // Payments
  payments: Payment[];
}


// ======================
// INSURANCE
// ======================

export type ClaimStatus = 'draft' | 'submitted' | 'processing' | 'approved' | 'partially_approved' | 'rejected' | 'paid';

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

// ADD TO src/types/index.ts
export interface InsuranceClaimAnalytics {
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  paidClaims: number;
  totalClaimAmount: number;
  approvedAmount: number;
  byProvider: Record<string, number>;
  byStatus: Record<string, number>;
  averageProcessingTime: number;
}


// ======================
// STOCK MANAGEMENT
// ======================

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
  insurancePrice: number;
  isActive: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceUsageAnalytics {
  totalServices: number;
  byServiceType: Record<string, number>;
  byCategory: Record<string, number>;
  totalRevenue: number;
  mostUsedServices: Array<{
    name: string;
    usage: number;
    revenue: number;
  }>;
}

// ======================
// TEMPLATES (MISSING INTERFACES)
// ======================

export interface DiagnosisTemplate {
  _id: string;
  name: string;
  icdCode?: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabTestTemplate {
  _id: string;
  name: string;
  description?: string;
  normalRange?: string;
  units?: string;
  cost?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureTemplate {
  _id: string;
  name: string;
  description?: string;
  duration?: number;
  cost?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface ScanEntry {
  _id: string;
  scanType: string;
  description: string;
  bodyPart: string;
  priority: 'routine' | 'urgent';
  notes: string;
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
  status?: string; // ADDED: Filter by attendance status
  insuranceProviderId?: string;
  patientId?: string;
  groupBy?: 'day' | 'week' | 'month';
  includeStatusAnalytics?: boolean; // ADDED
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

// ADD TO src/types/index.ts
export interface StatusAnalyticsReport {
  reportType: 'status';
  period: { startDate?: string; endDate?: string };
  summary: {
    totalAttendances: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
  };
  analytics: {
    avgDurationByStatus: Record<string, string>;
    pendingToActiveRate: string;
    completionRate: string;
  };
  generatedAt: string;
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
   T;
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

// ======================
// EXPORTS
// ======================

// Re-export for convenience if needed (optional)
// export * from './other-file'; // Only if you have split files

// All types are already exported individually above
