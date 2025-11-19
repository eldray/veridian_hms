// ======================
// CORE ENUMS (MATCHING BACKEND)
// ======================

export type UserRole =
  | 'admin'
  | 'doctor'
  | 'nurse'
  | 'midwife'
  | 'records'
  | 'lab_tech'
  | 'pharmacist'
  | 'accounts'
  | 'sonographer';

export type Gender = 'male' | 'female' | 'other';
export type PaymentMode = 'cash' | 'nhis' | 'private_insurance';
export type PaymentMethod = 'cash' | 'mobile_money' | 'card' | 'bank_transfer' | 'cheque';

// Attendance
export type AttendanceType = 
  | 'emergency_acute'
  | 'antenatal'
  | 'postnatal'
  | 'chronic_followup'
  | 'specialist_consultation'
  | 'delivery'
  | 'surgery'
  | 'general_consultation';

export type AttendanceStatus = 'pending' | 'completed' | 'cancelled' | 'admitted' | 'discharged';
export type EncounterCategory = 'opd' | 'ipd' | 'daycase';
export type VisitCategory = 'general' | 'specialist' | 'emergency' | 'inpatient';

// Admissions
export type AdmissionType = 'elective' | 'emergency' | 'transfer';
export type AdmissionSource = 'home' | 'referral' | 'another_facility' | 'opd' | 'emergency';
export type DischargeStatus = 'home' | 'transfer' | 'expired' | 'against_medical_advice';
export type PresentOnAdmission = 'Y' | 'N' | 'U';
export type SecondaryDiagnosisType = 'comorbidity' | 'complication';

// Billing
export type BillStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled';
export type ClaimStatus = 'draft' | 'not_required' | 'pending' | 'submitted' | 'approved' | 'partially_approved' | 'rejected' | 'paid';

// Clinical
export type LabTestStatus = 'requested' | 'completed' | 'cancelled';
export type ProcedureStatus = 'scheduled' | 'completed' | 'cancelled';
export type ScanStatus = 'requested' | 'completed' | 'cancelled';
export type MedicationStatus = 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
export type Priority = 'routine' | 'urgent' | 'stat';
export type ScanPriority = 'routine' | 'urgent';
export type DiagnosisType = 'principal' | 'secondary' | 'comorbidity';

// Appointments
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'antenatal' | 'postnatal' | 'vaccination' | 'lab_test' | 'scan' | 'other';

// Notifications
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Service Catalog
export type ServiceType = 'consultation' | 'ward' | 'lab_test' | 'scan' | 'medication' | 'procedure' | 'diagnosis' | 'miscellaneous';
export type ServiceCategory = 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
export type NHISCoverageType = 'full' | 'partial' | 'not_covered';

// ======================
// USER & AUTHENTICATION
// ======================

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  departmentId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// PATIENT (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface InsuranceDetails {
  providerId?: string;
  memberId: string;
  groupNumber?: string;
  relationship?: 'self' | 'spouse' | 'child' | 'other';
  startDate: string;
  endDate: string;
  isActive: boolean;
  copayment?: number;
  deductible?: number;
  coverageLimit?: number;
}

export interface AdditionalInfo {
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
}

export interface Patient {
  id: string;
  folderNumber: string;
  surname: string;
  otherNames: string;
  gender: Gender;
  dateOfBirth: string;
  age: number;
  contact: string;
  address: string;
  paymentMode?: PaymentMode;
  insuranceDetails?: InsuranceDetails;
  additionalInfo?: AdditionalInfo;
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
  insuranceProviderId?: string;
  createdAt: string;
  updatedAt: string;
}

// ======================
// ATTENDANCE (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface AttendanceDiagnosis {
  id: string;
  attendanceId: string;
  diagnosisId: string;
  primary: boolean;
  notes?: string;
  date: string;
  createdById: string;
  icdCode?: string;
  presentOnAdmission?: PresentOnAdmission;
  diagnosisType?: DiagnosisType;
  createdAt: string;
}

export interface ServiceRendered {
  id: string;
  attendanceId: string;
  serviceItemId: string;
  quantity: number;
  date: string;
  performedById: string;
  notes?: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  attendanceNumber: string;
  patientId: string;
  insuranceProviderId?: string;
  bedId?: string;
  wardId?: string;
  
  attendanceType: AttendanceType;
  dateTime: string;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  
  // NHIS Service Categorization
  encounterCategory: EncounterCategory;
  visitCategory: VisitCategory;
  
  // Billing
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  
  // Insurance Claims
  insuranceClaimId?: string;
  preAuthNumber?: string;
  preAuthApproved: boolean;
  preAuthAmount?: number;
  
  status: AttendanceStatus;
  referringFacility?: string;
  
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  patient?: Patient;
  insuranceProvider?: InsuranceProvider;
  bed?: Bed;
  ward?: Ward;
  insuranceClaim?: InsuranceClaim;
  bill?: Bill;
  admission?: Admission;

  // Clinical arrays
  diagnoses: AttendanceDiagnosis[];
  labTests: LabTest[];
  medications: Medication[];
  procedures: Procedure[];
  scans: Scan[];
  servicesRendered: ServiceRendered[];
  vitals: Vitals[];
}

// Add this to your src/types/index.ts file
export interface VitalsEntry {
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

// ======================
// BILLING (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface BillItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  transactionDate: string;
  receivedById: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  bill?: Bill;
  receivedBy?: User;
}

export interface Bill {
  id: string;
  billNumber: string;
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  
  items: BillItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  
  status: BillStatus;
  paymentMode: PaymentMode;
  
  // Insurance information
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: ClaimStatus;
  
  createdById: string;
  updatedById?: string;
  billDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  patient?: Patient;
  attendance?: Attendance;
  admission?: Admission;
  insuranceProvider?: InsuranceProvider;
  payments: Payment[];
  insuranceClaims: InsuranceClaim[];
}

// ======================
// INSURANCE (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface InsuranceProvider {
  id: string;
  name: string;
  type: 'nhis' | 'private';
  coveragePercentage: number;
  isActive: boolean;
  contactInfo?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InsuranceClaim {
  id: string;
  claimNumber: string;
  billId: string;
  patientId: string;
  insuranceProviderId: string;
  attendanceId: string;
  
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
  
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  bill?: Bill;
  patient?: Patient;
  insuranceProvider?: InsuranceProvider;
  attendance?: Attendance;
  createdBy?: User;
  updatedBy?: User;
}

// ======================
// CLINICAL TEMPLATES (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export type DiagnosisVariant = 'adult' | 'child' | 'complicated' | 'uncomplicated';
export type DiagnosisCategory = 'medical' | 'surgical' | 'obstetric' | 'pediatric' | 'psychiatric';

export interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  gdrgCode: string;
  variant?: DiagnosisVariant;
  description?: string;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  isChronic: boolean;
  isNHISCovered: boolean;
  category: DiagnosisCategory;
  createdAt: string;
  updatedAt: string;
}

export type LabCategory = 'hematology' | 'biochemistry' | 'microbiology' | 'serology' | 'immunology' | 'toxicology' | 'molecular' | 'cytology' | 'histopathology';
export type SpecimenType = 'blood' | 'urine' | 'stool' | 'csf' | 'sputum' | 'fluid' | 'semen' | 'tissue' | 'saliva' | 'swab' | 'other';

export interface LabTestTemplate {
  id: string;
  name: string;
  investigationCode: string;
  category: LabCategory;
  subCategory?: string;
  description?: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPending: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  specimenType: SpecimenType;
  resultTemplate?: any;
  createdAt: string;
  updatedAt: string;
}

export type ProcedureCategory = 'surgical' | 'diagnostic' | 'therapeutic' | 'obstetric' | 'pediatric' | 'dental' | 'ophthalmic';

export interface ProcedureTemplate {
  id: string;
  name: string;
  procedureCode: string;
  description?: string;
  category: ProcedureCategory;
  department: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPending: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export type ScanCategory = 'xray' | 'ultrasound' | 'ct_scan' | 'mri' | 'fluoroscopy' | 'mammography' | 'nuclear' | 'pet_scan' | 'other';
export type BodyPart = 'head' | 'chest' | 'neck' | 'abdomen' | 'pelvis' | 'spine' | 'extremities' | 'breast' | 'other';

export interface ScanTemplate {
  id: string;
  name: string;
  investigationCode: string;
  scanCode: string;
  description: string;
  category: ScanCategory;
  bodyPart: BodyPart;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPending: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  preparationInstructions?: string;
  duration: number;
  contrastRequired: boolean;
  scanType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  strength: string;
  unitOfMeasure: string;
  drugCode: string;
  reorderLevel: number;
  currentStock: number;
  costPrice: number;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  isPending: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// CLINICAL ENTRIES (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface Vitals {
  id: string;
  attendanceId: string;
  patientId: string;
  bloodPressure?: string;
  temperature?: number;
  pulse?: number;
  respiration?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  notes?: string;
  recordedById: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  patient?: Patient;
  recordedBy?: User;
}

export interface Medication {
  id: string;
  attendanceId: string;
  stockItemId?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity: number;
  route?: string;
  instructions?: string;
  status: MedicationStatus;
  prescribedAt: string;
  dispensedAt?: string;
  administeredAt?: string;
  dispensedById?: string;
  administeredById?: string;
  prescribedById: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  stockItem?: StockItem;
  prescribedBy?: User;
  dispensedBy?: User;
  administeredBy?: User;
}

export interface LabTest {
  id: string;
  attendanceId: string;
  templateId: string;
  status: LabTestStatus;
  result?: any;
  normalRange?: string;
  units?: string;
  requestedAt: string;
  completedAt?: string;
  performedById?: string;
  verifiedById?: string;
  notes?: string;
  createdById: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  template?: LabTestTemplate;
  createdBy?: User;
  performedBy?: User;
  verifiedBy?: User;
}

export interface Procedure {
  id: string;
  attendanceId: string;
  templateId: string;
  status: ProcedureStatus;
  scheduledDate?: string;
  performedAt?: string;
  performedById?: string;
  assistantId?: string;
  notes?: string;
  complications?: string;
  outcome?: string;
  cost?: number;
  duration?: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  template?: ProcedureTemplate;
  createdBy?: User;
  performedBy?: User;
  assistant?: User;
}

export interface Scan {
  id: string;
  attendanceId: string;
  templateId: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: ScanStatus;
  requestedAt: string;
  completedAt?: string;
  result?: string;
  findings?: string;
  impression?: string;
  performedById?: string;
  verifiedById?: string;
  imageUrls: string[];
  createdById: string;
  priority: ScanPriority;
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  template?: ScanTemplate;
  createdBy?: User;
  performedBy?: User;
  verifiedBy?: User;
}

// ======================
// ADMISSIONS & WARDS (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface Ward {
  id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;
  cashDailyRate: number;
  nhisDailyRate?: number;
  insuranceDailyRate: number;
  isNHISCovered: boolean;
  nhisRequiresAuth: boolean;
  isPrivateInsExempted: boolean;
  isPending: boolean;
  requiresAuthorization: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bed {
  id: string;
  wardId: string;
  bedNumber: string;
  isOccupied: boolean;
  currentPatientId?: string;
  createdAt: string;
  updatedAt: string;
  
  ward?: Ward;
  currentPatient?: Patient;
  admissions: Admission[];
  attendances: Attendance[];
}

export interface AdmissionSecondaryDiagnosis {
  id: string;
  admissionId: string;
  diagnosisId: string;
  icdCode: string;
  presentOnAdmission: PresentOnAdmission;
  diagnosisType: SecondaryDiagnosisType;
  createdAt: string;
  
  admission?: Admission;
  diagnosis?: Diagnosis;
}

export interface DailyNote {
  id: string;
  date: string;
  vitals: any;
  progressNotes: string;
  medications: any[];
  procedures: any[];
  recordedBy: string;
  recordedAt: string;
}

export interface Admission {
  id: string;
  admissionNumber: string;
  patientId: string;
  attendanceId?: string;
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
  dailyNotes: DailyNote[];
  createdBy: string;
  admissionType: AdmissionType;
  admissionSource: AdmissionSource;
  dischargeStatus?: DischargeStatus;
  lengthOfStay: number;
  principalDiagnosisId: string;
  principalIcdCode: string;
  principalPresentOnAdmission: PresentOnAdmission;
  createdAt: string;
  updatedAt: string;
  
  patient?: Patient;
  attendance?: Attendance;
  ward?: Ward;
  bed?: Bed;
  principalDiagnosis?: Diagnosis;
  secondaryDiagnoses: AdmissionSecondaryDiagnosis[];
  bills: Bill[];
}

// ======================
// SERVICE CATALOG (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface ServiceCatalog {
  id: string;
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  serviceType: ServiceType;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  nhisServiceCode?: string;
  isNHISCovered: boolean;
  tariffCode?: string;
  nhisCoverageType: NHISCoverageType;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  unit: string;
  isPending: boolean;
  requiresClinicalNotes: boolean;
  vatRate: number;
  isTaxable: boolean;
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  scanTemplateId?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  
  diagnosis?: Diagnosis;
  labTestTemplate?: LabTestTemplate;
  procedureTemplate?: ProcedureTemplate;
  stockItem?: StockItem;
  ward?: Ward;
  scanTemplate?: ScanTemplate;
  createdBy?: User;
  servicesRendered: ServiceRendered[];
}

// ======================
// APPOINTMENTS (UPDATED TO MATCH BACKEND PRISMA)
// ======================

export interface Appointment {
  id: string;
  appointmentNumber: string;
  patientId: string;
  doctorId?: string;
  departmentId?: string;
  title: string;
  description?: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  status: AppointmentStatus;
  type: AppointmentType;
  isNHIS: boolean;
  nhisCCC?: string;
  reminderSent: boolean;
  checkedIn: boolean;
  checkedInAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  patient?: Patient;
  doctor?: User;
  department?: Department;
}

// ======================
// DEPARTMENTS
// ======================

export interface Department {
  id: string;
  name: string;
  description?: string;
  headId?: string;
  isActive: boolean;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  
  head?: User;
  users: User[];
  appointments: Appointment[];
}

// ======================
// NOTIFICATIONS
// ======================

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  readAt?: string;
  
  user?: User;
}

// ======================
// HOSPITAL & GDRG TARIFFS
// ======================

export type FacilityType = 'Tertiary' | 'Secondary' | 'Primary' | 'Clinic' | 'Health_Center' | 'Maternity_Home';

export interface HospitalInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  imageUrl?: string;
  nhisFacilityCode: string;
  nhisFacilityType: FacilityType;
  nhisAccreditationNumber?: string;
  nhisAccreditationDate?: string;
  nhisAccreditationExpiry?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  nhisContactPerson?: string;
  nhisContactPhone?: string;
  nhisContactEmail?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GDRGTariff {
  id: string;
  gdrgCode: string;
  description: string;
  nhiaTariff: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  diagnosis?: Diagnosis;
}

// ======================
// STOCK TRANSACTIONS
// ======================

export interface StockTransaction {
  id: string;
  stockItemId: string;
  transactionType: string;
  quantity: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  transactionDate: string;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
  
  stockItem?: StockItem;
}

// ======================
// CONSULTATION TYPES
// ======================

export interface ConsultationType {
  id: string;
  name: string;
  code: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ======================
// UTILITY TYPES
// ======================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
  error?: string;
}

export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface DashboardStats {
  total: number;
  byGender: Array<{ gender: string; _count: number }>;
  byPaymentMode: Array<{ paymentMode: string; _count: number }>;
  recent: number;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}