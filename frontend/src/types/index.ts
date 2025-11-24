// ======================
// CORE ENUMS (UPDATED TO MATCH BACKEND)
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
export type ClaimStatus = 'draft' | 'submitted' | 'approved' | 'paid' | 'rejected'; // Updated to match backend

// Clinical
export type LabTestStatus = 'requested' | 'completed' | 'cancelled';
export type ProcedureStatus = 'scheduled' | 'completed' | 'cancelled';
export type ScanStatus = 'requested' | 'completed' | 'cancelled';
export type MedicationStatus = 'prescribed' | 'dispensed' | 'administered' | 'cancelled';
export type Priority = 'routine' | 'urgent' | 'stat';
export type ScanPriority = 'routine' | 'urgent';
export type DiagnosisType = 'principal' | 'secondary' | 'comorbidity';
export type DiagnosisVariant = 'adult' | 'child' | 'complicated' | 'uncomplicated';
// Appointments
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'consultation' | 'follow_up' | 'procedure' | 'antenatal' | 'postnatal' | 'vaccination' | 'lab_test' | 'scan' | 'other';

// Notifications
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// Add this to your CORE ENUMS section
export type DiagnosisVariant = 'adult' | 'child' | 'complicated' | 'uncomplicated';

// Add these missing enums too if they're highlighted:
export type LabCategory = 
  | 'hematology'
  | 'biochemistry'
  | 'microbiology'
  | 'serology'
  | 'immunology'
  | 'toxicology'
  | 'molecular'
  | 'cytology'
  | 'histopathology';

export type ProcedureCategory = 
  | 'surgical'
  | 'diagnostic'
  | 'therapeutic'
  | 'obstetric'
  | 'pediatric'
  | 'dental'
  | 'ophthalmic';

export type ScanCategory = 
  | 'xray'
  | 'ultrasound'
  | 'ct_scan'
  | 'mri'
  | 'fluoroscopy'
  | 'mammography'
  | 'nuclear'
  | 'pet_scan'
  | 'other';

export type SpecimenType = 
  | 'blood'
  | 'urine'
  | 'stool'
  | 'csf'
  | 'sputum'
  | 'fluid'
  | 'semen'
  | 'tissue'
  | 'saliva'
  | 'swab'
  | 'other';

export type BodyPart = 
  | 'head'
  | 'chest'
  | 'neck'
  | 'abdomen'
  | 'pelvis'
  | 'spine'
  | 'extremities'
  | 'breast'
  | 'other';

export type FacilityType = 
  | 'Tertiary'
  | 'Secondary'
  | 'Primary'
  | 'Clinic'
  | 'Health_Center'
  | 'Maternity_Home'; 

// Service Catalog
export type ServiceType = 'consultation' | 'ward' | 'lab_test' | 'scan' | 'medication' | 'procedure' | 'diagnosis' | 'miscellaneous';
export type ServiceCategory = 'opd' | 'ipd' | 'diagnostics' | 'pharmacy' | 'other';
export type NHISCoverageType = 'full' | 'partial' | 'not_covered';

// Diagnosis Categories (Updated to match backend)
export type DiagnosisCategory = 
  | 'infectiousAndParasitic'
  | 'neoplasms'
  | 'bloodAndImmune'
  | 'endocrineNutritionalMetabolic'
  | 'mentalAndBehavioral'
  | 'nervousSystem'
  | 'eyeAndAdnexa'
  | 'earAndMastoid'
  | 'circulatory'
  | 'respiratory'
  | 'digestive'
  | 'skinAndSubcutaneous'
  | 'musculoskeletal'
  | 'genitourinary'
  | 'pregnancyChildbirthPuerperium'
  | 'perinatalPeriod'
  | 'congenitalMalformations'
  | 'symptomsSignsAbnormalFindings'
  | 'injuryPoisoningExternalCauses'
  | 'externalMorbidity'
  | 'factorsInfluencingHealthStatus';

// Insurance
export type InsuranceType = 'nhis' | 'private';

// Stock & Requisitions
export type StockTransactionType = 'purchase' | 'adjustment' | 'requisition' | 'sale';
export type RequisitionStatus = 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
export type RequisitionUrgency = 'routine' | 'urgent' | 'emergency';

// ======================
// USER & AUTHENTICATION (UPDATED)
// ======================

export interface User {
  id: string;
  username: string;
  password: string; // Added from backend
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
// PATIENT (UPDATED TO MATCH BACKEND)
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
  ageInMonths?: number;
  contact: string;
  address: string;
  paymentMode?: PaymentMode;
  insuranceProviderId?: string; // ✅ Add this
  insuranceDetails?: InsuranceDetails;
  additionalInfo?: AdditionalInfo;
  billingAddress?: any;
  employer?: any;
  imageUrl?: string;
  registeredAt: string;
  registeredBy: string;
  createdAt: string;
  updatedAt: string;
  
  // ✅ Add these relations that exist in your schema
  admissions?: Admission[];
  attendances?: Attendance[];
  bills?: Bill[];
  insuranceClaims?: InsuranceClaim[];
  vitals?: Vitals[];
  appointments?: Appointment[];
  currentBed?: Bed; // For bed.currentPatientId relation
}

// ======================
// ATTENDANCE (UPDATED TO MATCH BACKEND)
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
  presentOnAdmission?: PresentOnAdmission; // Added from backend
  diagnosisType?: DiagnosisType; // Added from backend
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
  
  attendanceType: AttendanceType; // Added from backend
  dateTime: string;
  paymentMode: PaymentMode;
  nhisCCC?: string;
  complaints: string;
  medicalNotes?: string;
  
  encounterCategory: EncounterCategory; // Added from backend
  visitCategory: VisitCategory; // Added from backend
  
  totalBill: number;
  paidAmount: number;
  outstandingBalance: number;
  
  insuranceClaimId?: string;
  preAuthNumber?: string;
  
  status: AttendanceStatus; // Added from backend
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

// ======================
// BILLING (UPDATED TO MATCH BACKEND)
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
  
  items: BillItem[]; // Stored as JSON in backend
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
  
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: ClaimStatus; // Added from backend
  
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
// INSURANCE (UPDATED TO MATCH BACKEND)
// ======================

export interface InsuranceProvider {
  id: string;
  name: string;
  type: InsuranceType;
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
  labTestCodes: string[]; // Added from backend
  medicationCodes: string[]; // Added from backend
  scanCodes: string[]; // Added from backend
  serviceCodes: string[]; // Added from backend
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
// CLINICAL TEMPLATES (UPDATED TO MATCH BACKEND)
// ======================

export interface Diagnosis {
  id: string;
  name: string;
  icdCode: string;
  gdrgCode: string;
  variant?: DiagnosisVariant; // ✅ Add this
  description?: string;
  category: DiagnosisCategory;
  isActive: boolean; // ✅ Add this
  requiresAuthorization: boolean; // ✅ Add this
  isChronic: boolean; // ✅ Add this
  isNHISCovered: boolean; // ✅ Add this
  tariffCode?: string; // ✅ Add this
  createdAt: string;
  updatedAt: string;
}

export interface LabTestTemplate {
  id: string;
  name: string;
  investigationCode: string;
  category: LabCategory;
  subCategory?: string;
  description?: string;
  
  // ✅ CORRECT: No direct pricing fields (moved to ServicePricing)
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  nhisRequiresAuth: boolean; // ✅ ADDED
  privateInsRequiresAuth: boolean; // ✅ ADDED
  isActive: boolean;
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  specimenType: SpecimenType;
  resultTemplate?: any;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  LabTest?: LabTest[];
  ServiceCatalog?: ServiceCatalog[]; // ✅ Capitalized
}

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
  isActive: boolean; // Added from backend
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

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
  isActive: boolean; // Added from backend
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
  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  supplier?: string;
  expiryDate?: string;
  batchNumber?: string;
  isActive: boolean; // Added from backend
  tariffCode?: string;
  vatRate: number;
  isTaxable: boolean;
  isMedication: boolean;
  createdAt: string;
  updatedAt: string;

  ServiceCatalog?: ServiceCatalog[];
  Medication?: Medication[];
}

// ======================
// CLINICAL ENTRIES (UPDATED TO MATCH BACKEND)
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
  serviceCatalogId?: string;
  ServiceCatalog?: ServiceCatalog; 
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
  serviceCatalogId?: string;
  priority: Priority; // Added from backend
  createdAt: string;
  updatedAt: string;

  LabTestTemplate?: LabTestTemplate;
  ServiceCatalog?: ServiceCatalog;

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
  serviceCatalogId?: string;
  ServiceCatalog?: ServiceCatalog; 
  notes?: string;
  complications?: string;
  outcome?: string;
  cost?: number;
  anesthesiaNotes?: string;
  intraOperativeNotes?: string;
  postOperativeNotes?: string;
  bloodLoss?: number;
  surgicalTeam?: string[]; // Array of user IDs
  anesthesiaType?: string;
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
  serviceCatalogId?: string;
  scanType: string;
  description: string;
  bodyPart?: string;
  status: ScanStatus;
  requestedAt: string;
  completedAt?: string;
  ServiceCatalog?: ServiceCatalog; 
  result?: string;
  findings?: string;
  impression?: string;
  performedById?: string;
  verifiedById?: string;
  imageUrls: string[];
  createdById: string;
  priority: ScanPriority; // Added from backend
  createdAt: string;
  updatedAt: string;
  
  attendance?: Attendance;
  template?: ScanTemplate;
  createdBy?: User;
  performedBy?: User;
  verifiedBy?: User;
}

// ======================
// ADMISSIONS & WARDS (UPDATED TO MATCH BACKEND)
// ======================

export interface Ward {
  id: string;
  wardName: string;
  wardType: string;
  totalBeds: number;
  occupiedBeds: number;

  isNHISCovered: boolean;
  isPrivateInsExempted: boolean;
  isActive: boolean;
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
  presentOnAdmission: PresentOnAdmission; // Added from backend
  diagnosisType: SecondaryDiagnosisType; // Added from backend
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
  dailyNotes?: any;
  createdBy: string;
  admissionType: AdmissionType; // Added from backend
  admissionSource: AdmissionSource; // Added from backend
  dischargeStatus?: DischargeStatus; // Added from backend
  lengthOfStay: number;
  principalDiagnosisId: string;
  principalIcdCode: string;
  principalPresentOnAdmission: PresentOnAdmission; // Added from backend
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
// SERVICE CATALOG (UPDATED TO MATCH BACKEND)
// ======================

export interface ServiceCatalog {
  id: string;
  name: string;
  code: string;
  description?: string;
  serviceCategory: ServiceCategory;
  serviceType: ServiceType;
  
  // ✅ ADDED missing fields from schema
  subType?: string;
  metadata?: any;
  isPending: boolean;
  
  nhisServiceCode?: string;
  isNHISCovered: boolean;
  tariffCode?: string;
  nhisCoverageType: NHISCoverageType;
  nhisRequiresAuth: boolean;
  privateInsRequiresAuth: boolean;
  isPrivateInsuranceExempted: boolean;
  requiresClinicalNotes: boolean;
  unit: string;
  isActive: boolean;

  // Template relationships
  diagnosisId?: string;
  labTestTemplateId?: string;
  procedureTemplateId?: string;
  stockItemId?: string;
  wardId?: string;
  scanTemplateId?: string;
  consultationTypeId?: string;
  createdById?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations (✅ Capitalized to match schema)
  User?: User;
  Diagnosis?: Diagnosis;
  LabTestTemplate?: LabTestTemplate;
  ProcedureTemplate?: ProcedureTemplate;
  ScanTemplate?: ScanTemplate;
  StockItem?: StockItem;
  Ward?: Ward;
  ConsultationType?: ConsultationType;
  
  // ✅ CORRECT: Pricing is separate relation
  pricing?: ServicePricing;
  ServiceRendered?: ServiceRendered[];
  
  // ✅ ADDED: New relations from schema
  labTests?: LabTest[];
  scans?: Scan[];
  procedures?: Procedure[];
  medications?: Medication[];
}

export interface ServicePricing {
  id: string;
  serviceCatalogId: string;
  cashPrice: number;
  nhisPrice: number;
  insurancePrice: number;
  vatRate: number;
  isTaxable: boolean;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  serviceCatalog?: ServiceCatalog;
}

// ======================
// APPOINTMENTS (UPDATED TO MATCH BACKEND)
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
// STOCK & INVENTORY (UPDATED TO MATCH BACKEND)
// ======================

export interface StockTransaction {
  id: string;
  stockItemId: string;
  transactionType: StockTransactionType;
  quantity: number;
  balanceAfter: number;
  reference?: string;
  notes?: string;
  transactionDate: string;
  performedBy: string;
  requisitionId?: string;
  invoiceId?: string;
  createdAt: string;
  updatedAt: string;
  
  stockItem?: StockItem;
  requisition?: Requisition;
  invoice?: Invoice;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  createdBy?: User;
  invoiceItems: InvoiceItem[];
  stockTransactions: StockTransaction[];
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
  
  stockItem?: StockItem;
  invoice?: Invoice;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId: string;
  requestedById: string;
  urgency: RequisitionUrgency;
  requiredDate?: string;
  purpose?: string;
  status: RequisitionStatus;
  approvedById?: string;
  approvedAt?: string;
  fulfilledById?: string;
  fulfilledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  requestingDepartment?: Department;
  requestedBy?: User;
  approvedBy?: User;
  fulfilledBy?: User;
  requisitionItems: RequisitionItem[];
  stockTransactions: StockTransaction[];
}

export interface RequisitionItem {
  id: string;
  requisitionId: string;
  stockItemId: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityFulfilled: number;
  purpose?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  stockItem?: StockItem;
  requisition?: Requisition;
}

// ======================
// OTHER TYPES (UPDATED TO MATCH BACKEND)
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
  requisitions: Requisition[];
}

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
// UTILITY TYPES (UNCHANGED)
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