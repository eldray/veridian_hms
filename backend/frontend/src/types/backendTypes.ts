// AUTO-GENERATED from Prisma schema
// DO NOT EDIT MANUALLY
// Generated on: 2025-11-20T22:36:03.226Z
export enum AdmissionType {
  elective = 'elective',
  emergency = 'emergency',
  transfer = 'transfer',
}
export enum AdmissionSource {
  home = 'home',
  referral = 'referral',
  another_facility = 'another_facility',
  opd = 'opd',
  emergency = 'emergency',
}
export enum DischargeStatus {
  home = 'home',
  transfer = 'transfer',
  expired = 'expired',
  against_medical_advice = 'against_medical_advice',
}
export enum PresentOnAdmission {
  Y = 'Y',
  N = 'N',
  U = 'U',
}
export enum SecondaryDiagnosisType {
  comorbidity = 'comorbidity',
  complication = 'complication',
}
export enum AttendanceType {
  emergency_acute = 'emergency_acute',
  antenatal = 'antenatal',
  postnatal = 'postnatal',
  chronic_followup = 'chronic_followup',
  specialist_consultation = 'specialist_consultation',
  delivery = 'delivery',
  surgery = 'surgery',
  general_consultation = 'general_consultation',
}
export enum PaymentMode {
  cash = 'cash',
  nhis = 'nhis',
  private_insurance = 'private_insurance',
}
export enum AttendanceStatus {
  pending = 'pending',
  completed = 'completed',
  cancelled = 'cancelled',
  admitted = 'admitted',
  discharged = 'discharged',
}
export enum EncounterCategory {
  opd = 'opd',
  ipd = 'ipd',
  daycase = 'daycase',
}
export enum VisitCategory {
  general = 'general',
  specialist = 'specialist',
  emergency = 'emergency',
  inpatient = 'inpatient',
}
export enum BillStatus {
  draft = 'draft',
  pending = 'pending',
  partial = 'partial',
  paid = 'paid',
  cancelled = 'cancelled',
}
export enum ClaimStatus {
  draft = 'draft',

  pending = 'pending',
  submitted = 'submitted',
}
export enum DiagnosisCategory {
  infectiousAndParasitic = 'infectiousAndParasitic',
  neoplasms = 'neoplasms',
  bloodAndImmune = 'bloodAndImmune',
  endocrineNutritionalMetabolic = 'endocrineNutritionalMetabolic',
  mentalAndBehavioral = 'mentalAndBehavioral',
  nervousSystem = 'nervousSystem',
  eyeAndAdnexa = 'eyeAndAdnexa',
  earAndMastoid = 'earAndMastoid',
  circulatory = 'circulatory',
  respiratory = 'respiratory',
  digestive = 'digestive',
  skinAndSubcutaneous = 'skinAndSubcutaneous',
  musculoskeletal = 'musculoskeletal',
  genitourinary = 'genitourinary',
  pregnancyChildbirthPuerperium = 'pregnancyChildbirthPuerperium',
  perinatalPeriod = 'perinatalPeriod',
  congenitalMalformations = 'congenitalMalformations',
  symptomsSignsAbnormalFindings = 'symptomsSignsAbnormalFindings',
  injuryPoisoningExternalCauses = 'injuryPoisoningExternalCauses',
  externalMorbidity = 'externalMorbidity',
  factorsInfluencingHealthStatus = 'factorsInfluencingHealthStatus',
}
export enum FacilityType {
  Tertiary = 'Tertiary',
  Secondary = 'Secondary',
  Primary = 'Primary',
  Clinic = 'Clinic',
  Health_Center = 'Health_Center',
  Maternity_Home = 'Maternity_Home',
}
export enum InsuranceType {
  nhis = 'nhis',
  private = 'private',
}
export enum LabCategory {
  hematology = 'hematology',
  biochemistry = 'biochemistry',
  microbiology = 'microbiology',
  serology = 'serology',
  immunology = 'immunology',
  toxicology = 'toxicology',
  molecular = 'molecular',
  cytology = 'cytology',
  histopathology = 'histopathology',
}
export enum SpecimenType {
  blood = 'blood',
  urine = 'urine',
  stool = 'stool',
  csf = 'csf',
  sputum = 'sputum',
  fluid = 'fluid',
  semen = 'semen',
  tissue = 'tissue',
  saliva = 'saliva',
  swab = 'swab',
  other = 'other',
}
export enum Gender {
  male = 'male',
  female = 'female',
  other = 'other',
}
export enum ProcedureCategory {
  surgical = 'surgical',
  diagnostic = 'diagnostic',
  therapeutic = 'therapeutic',
  obstetric = 'obstetric',
  pediatric = 'pediatric',
  dental = 'dental',
  ophthalmic = 'ophthalmic',
}
export enum ScanCategory {
  xray = 'xray',
  ultrasound = 'ultrasound',
  ct_scan = 'ct_scan',
  mri = 'mri',
  fluoroscopy = 'fluoroscopy',
  mammography = 'mammography',
  nuclear = 'nuclear',
  pet_scan = 'pet_scan',
  other = 'other',
}
export enum BodyPart {
  head = 'head',
  chest = 'chest',
  neck = 'neck',
  abdomen = 'abdomen',
  pelvis = 'pelvis',
  spine = 'spine',
  extremities = 'extremities',
  breast = 'breast',
  other = 'other',
}
export enum ServiceType {
  consultation = 'consultation',
  ward = 'ward',
  lab_test = 'lab_test',
  scan = 'scan',
  medication = 'medication',
  procedure = 'procedure',
  diagnosis = 'diagnosis',
  miscellaneous = 'miscellaneous',
}
export enum ServiceCategory {
  opd = 'opd',
  ipd = 'ipd',
  diagnostics = 'diagnostics',
  pharmacy = 'pharmacy',
  other = 'other',
}
export enum UserRole {
  admin = 'admin',
  doctor = 'doctor',
  nurse = 'nurse',
  midwife = 'midwife',
  records = 'records',
  lab_tech = 'lab_tech',
  pharmacist = 'pharmacist',
  accounts = 'accounts',
  sonographer = 'sonographer',
}
export enum LabTestStatus {
  requested = 'requested',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum ProcedureStatus {
  scheduled = 'scheduled',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum ScanStatus {
  requested = 'requested',
  completed = 'completed',
  cancelled = 'cancelled',
}
export enum MedicationStatus {
  prescribed = 'prescribed',
  dispensed = 'dispensed',
  administered = 'administered',
  cancelled = 'cancelled',
}
export enum Priority {
  routine = 'routine',
  urgent = 'urgent',
  stat = 'stat',
}
export enum ScanPriority {
  routine = 'routine',
  urgent = 'urgent',
}
export enum DiagnosisType {
  principal = 'principal',
  secondary = 'secondary',
  comorbidity = 'comorbidity',
}
export enum AppointmentStatus {
  scheduled = 'scheduled',
  confirmed = 'confirmed',
  checked_in = 'checked_in',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
  no_show = 'no_show',
}
export enum AppointmentType {
  consultation = 'consultation',
  follow_up = 'follow_up',
  procedure = 'procedure',
  antenatal = 'antenatal',
  postnatal = 'postnatal',
  vaccination = 'vaccination',
  lab_test = 'lab_test',
  scan = 'scan',
  other = 'other',
}
export enum NotificationType {
  info = 'info',
  success = 'success',
  warning = 'warning',
  error = 'error',
  system = 'system',
  appointment = 'appointment',
  billing = 'billing',
  clinical = 'clinical',
}
export enum NotificationPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  urgent = 'urgent',
}
export enum NHISCoverageType {
  full = 'full',
  partial = 'partial',
  not_covered = 'not_covered',
}
export enum PaymentMethod {
  cash = 'cash',
  mobile_money = 'mobile_money',
  card = 'card',
  bank_transfer = 'bank_transfer',
  cheque = 'cheque',
}
export enum StockTransactionType {
  purchase = 'purchase',
  adjustment = 'adjustment',
  requisition = 'requisition',
  sale = 'sale',
}
export enum RequisitionStatus {
  draft = 'draft',
  submitted = 'submitted',
  approved = 'approved',
  fulfilled = 'fulfilled',
  cancelled = 'cancelled',
}
export enum RequisitionUrgency {
  routine = 'routine',
  urgent = 'urgent',
  emergency = 'emergency',
}

export interface User {
    id: string;
    username: string;
    password: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    departmentId?: string | null;
    createdAttendances: Attendance[];
    updatedAttendances: Attendance[];
    attendanceDiagnoses: AttendanceDiagnosis[];
    createdBills: Bill[];
    updatedBills: Bill[];
    createdInsuranceClaims: InsuranceClaim[];
    updatedInsuranceClaims: InsuranceClaim[];
    createdLabTests: LabTest[];
    performedLabTests: LabTest[];
    verifiedLabTests: LabTest[];
    administeredMedications: Medication[];
    dispensedMedications: Medication[];
    prescribedMedications: Medication[];
    assistedProcedures: Procedure[];
    createdProcedures: Procedure[];
    performedProcedures: Procedure[];
    createdScans: Scan[];
    performedScans: Scan[];
    verifiedScans: Scan[];
    servicesRendered: ServiceRendered[];
    vitals: Vitals[];
    doctorAppointments: Appointment[];
    notifications: Notification[];
    createdServiceCatalogs: ServiceCatalog[];
    receivedPayments: Payment[];
    createdInvoices: Invoice[];
    requestedRequisitions: Requisition[];
    approvedRequisitions: Requisition[];
    fulfilledRequisitions: Requisition[];
}

export interface Department {
    id: string;
    name: string;
    description?: string | null;
    headId?: string | null;
    isActive: boolean;
    color?: string | null;
    icon?: string | null;
    createdAt: string;
    updatedAt: string;
    users: User[];
    appointments: Appointment[];
    requisitions: Requisition[];
}

export interface Admission {
    id: string;
    admissionNumber: string;
    patientId: string;
    attendanceId?: string | null;
    wardId: string;
    bedId: string;
    admissionDate: string;
    admissionTime: string;
    admittingDoctor: string;
    reasonForAdmission: string;
    diagnosis: string;
    status: string;
    dischargeDate?: string | null;
    dischargeTime?: string | null;
    dischargeSummary?: string | null;
    dailyNotes?: any | null;
    createdBy: string;
    lengthOfStay: number;
    principalDiagnosisId: string;
    principalIcdCode: string;
    createdAt: string;
    updatedAt: string;
    secondaryDiagnoses: AdmissionSecondaryDiagnosis[];
    bills: Bill[];
}

export interface AdmissionSecondaryDiagnosis {
    id: string;
    admissionId: string;
    diagnosisId: string;
    icdCode: string;
    createdAt: string;
}

export interface Attendance {
    id: string;
    attendanceNumber: string;
    patientId: string;
    insuranceProviderId?: string | null;
    bedId?: string | null;
    wardId?: string | null;
    dateTime: string;
    nhisCCC?: string | null;
    complaints: string;
    medicalNotes?: string | null;
    totalBill: number;
    paidAmount: number;
    outstandingBalance: number;
    insuranceClaimId?: string | null;
    preAuthNumber?: string | null;
    preAuthApproved: boolean;
    preAuthAmount?: number | null;
    referringFacility?: string | null;
    createdById: string;
    updatedById?: string | null;
    createdAt: string;
    updatedAt: string;
    diagnoses: AttendanceDiagnosis[];
    labTests: LabTest[];
    medications: Medication[];
    procedures: Procedure[];
    scans: Scan[];
    servicesRendered: ServiceRendered[];
    vitals: Vitals[];
}

export interface Bed {
    id: string;
    wardId: string;
    bedNumber: string;
    isOccupied: boolean;
    currentPatientId?: string | null;
    createdAt: string;
    updatedAt: string;
    admissions: Admission[];
    attendances: Attendance[];
}

export interface Bill {
    id: string;
    billNumber: string;
    patientId: string;
    attendanceId: string;
    admissionId?: string | null;
    items: any;
    subtotal: number;
    discount: number;
    taxAmount: number;
    totalAmount: number;
    insuranceCovered: number;
    patientPayable: number;
    paidAmount: number;
    balance: number;
    insuranceProviderId?: string | null;
    preAuthNumber?: string | null;
    claimNumber?: string | null;
    createdById: string;
    updatedById?: string | null;
    billDate: string;
    dueDate?: string | null;
    createdAt: string;
    updatedAt: string;
    insuranceClaims: InsuranceClaim[];
    payments: Payment[];
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

export interface Diagnosis {
    id: string;
    name: string;
    icdCode: string;
    gdrgCode: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
    principalAdmissions: Admission[];
    secondaryAdmissions: AdmissionSecondaryDiagnosis[];
    attendanceDiagnoses: AttendanceDiagnosis[];
    gdrgTariffs: GDRGTariff[];
    serviceCatalogs: ServiceCatalog[];
}

export interface GDRGTariff {
    id: string;
    gdrgCode: string;
    description: string;
    nhiaTariff: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Hospital {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    imageUrl?: string | null;
    nhisFacilityCode: string;
    nhisAccreditationNumber?: string | null;
    nhisAccreditationDate?: string | null;
    nhisAccreditationExpiry?: string | null;
    bankName?: string | null;
    bankAccountNumber?: string | null;
    bankBranch?: string | null;
    nhisContactPerson?: string | null;
    nhisContactPhone?: string | null;
    nhisContactEmail?: string | null;
    isActive: boolean;
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
    approvedAmount?: number | null;
    rejectedAmount?: number | null;
    paidAmount?: number | null;
    submissionDate?: string | null;
    approvalDate?: string | null;
    paymentDate?: string | null;
    preAuthNumber?: string | null;
    diagnosisCodes: String[];
    procedureCodes: String[];
    notes?: string | null;
    createdById: string;
    updatedById?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InsuranceProvider {
    id: string;
    name: string;
    coveragePercentage: number;
    isActive: boolean;
    contactInfo?: any | null;
    createdAt: string;
    updatedAt: string;
    attendances: Attendance[];
    bills: Bill[];
    insuranceClaims: InsuranceClaim[];
    patients: Patient[];
}

export interface LabTestTemplate {
    id: string;
    name: string;
    investigationCode: string;
    subCategory?: string | null;
    description?: string | null;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    resultTemplate?: any | null;
    createdAt: string;
    updatedAt: string;
    labTests: LabTest[];
    serviceCatalogs: ServiceCatalog[];
}

export interface Patient {
    id: string;
    folderNumber: string;
    surname: string;
    otherNames: string;
    dateOfBirth: string;
    age: number;
    ageInMonths?: number | null;
    contact: string;
    address: string;
    insuranceDetails?: any | null;
    additionalInfo?: any | null;
    billingAddress?: any | null;
    employer?: any | null;
    imageUrl?: string | null;
    registeredAt: string;
    registeredBy: string;
    insuranceProviderId?: string | null;
    createdAt: string;
    updatedAt: string;
    admissions: Admission[];
    attendances: Attendance[];
    beds: Bed[];
    bills: Bill[];
    insuranceClaims: InsuranceClaim[];
    vitals: Vitals[];
    appointments: Appointment[];
}

export interface ProcedureTemplate {
    id: string;
    name: string;
    procedureCode: string;
    description?: string | null;
    department: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    duration: number;
    createdAt: string;
    updatedAt: string;
    procedures: Procedure[];
    serviceCatalogs: ServiceCatalog[];
}

export interface ScanTemplate {
    id: string;
    name: string;
    investigationCode: string;
    scanCode: string;
    description: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    preparationInstructions?: string | null;
    duration: number;
    contrastRequired: boolean;
    scanType?: string | null;
    createdAt: string;
    updatedAt: string;
    scans: Scan[];
    serviceCatalogs: ServiceCatalog[];
}

export interface ServiceCatalog {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    nhisServiceCode?: string | null;
    isNHISCovered: boolean;
    tariffCode?: string | null;
    isPrivateInsuranceExempted: boolean;
    unit: string;
    isActive: boolean;
    requiresClinicalNotes: boolean;
    vatRate: number;
    isTaxable: boolean;
    diagnosisId?: string | null;
    labTestTemplateId?: string | null;
    procedureTemplateId?: string | null;
    stockItemId?: string | null;
    wardId?: string | null;
    scanTemplateId?: string | null;
    createdById?: string | null;
    createdAt: string;
    updatedAt: string;
    servicesRendered: ServiceRendered[];
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    supplierName: string;
    invoiceDate: string;
    totalAmount: number;
    notes?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    invoiceItems: InvoiceItem[];
    stockTransactions: StockTransaction[];
}

export interface InvoiceItem {
    id: string;
    invoiceId: string;
    stockItemId: string;
    quantity: number;
    unitCost: number;
    batchNumber?: string | null;
    expiryDate?: string | null;
    createdAt: string;
}

export interface StockItem {
    id: string;
    name: string;
    category: string;
    description?: string | null;
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
    supplier?: string | null;
    expiryDate?: string | null;
    batchNumber?: string | null;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    isMedication: boolean;
    createdAt: string;
    updatedAt: string;
    medications: Medication[];
    serviceCatalogs: ServiceCatalog[];
    stockTransactions: StockTransaction[];
    invoiceItems: InvoiceItem[];
    requisitionItems: RequisitionItem[];
}

export interface Requisition {
    id: string;
    requisitionNumber: string;
    requestingDepartmentId: string;
    requestedById: string;
    requiredDate?: string | null;
    purpose?: string | null;
    approvedById?: string | null;
    approvedAt?: string | null;
    fulfilledById?: string | null;
    fulfilledAt?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    requisitionItems: RequisitionItem[];
    stockTransactions: StockTransaction[];
}

export interface RequisitionItem {
    id: string;
    requisitionId: string;
    stockItemId: string;
    quantityRequested: number;
    quantityApproved?: number | null;
    quantityFulfilled: number;
    purpose?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StockTransaction {
    id: string;
    stockItemId: string;
    quantity: number;
    balanceAfter: number;
    notes?: string | null;
    transactionDate: string;
    performedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface Vitals {
    id: string;
    attendanceId: string;
    patientId: string;
    bloodPressure?: string | null;
    temperature?: number | null;
    pulse?: number | null;
    respiration?: number | null;
    spo2?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    notes?: string | null;
    recordedById: string;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface Ward {
    id: string;
    wardName: string;
    wardType: string;
    totalBeds: number;
    occupiedBeds: number;
    cashDailyRate: number;
    nhisDailyRate?: number | null;
    insuranceDailyRate: number;
    isNHISCovered: boolean;
    isPrivateInsExempted: boolean;
    isActive: boolean;
    tariffCode?: string | null;
    vatRate: number;
    isTaxable: boolean;
    createdAt: string;
    updatedAt: string;
    admissions: Admission[];
    attendances: Attendance[];
    beds: Bed[];
    serviceCatalogs: ServiceCatalog[];
}

export interface AttendanceDiagnosis {
    id: string;
    attendanceId: string;
    diagnosisId: string;
    primary: boolean;
    notes?: string | null;
    date: string;
    createdById: string;
    icdCode?: string | null;
    createdAt: string;
}

export interface LabTest {
    id: string;
    attendanceId: string;
    templateId: string;
    result?: any | null;
    normalRange?: string | null;
    units?: string | null;
    requestedAt: string;
    completedAt?: string | null;
    performedById?: string | null;
    verifiedById?: string | null;
    notes?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface Procedure {
    id: string;
    attendanceId: string;
    templateId: string;
    scheduledDate?: string | null;
    performedAt?: string | null;
    performedById?: string | null;
    assistantId?: string | null;
    notes?: string | null;
    complications?: string | null;
    outcome?: string | null;
    cost?: number | null;
    duration?: number | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface Scan {
    id: string;
    attendanceId: string;
    templateId: string;
    scanType: string;
    description: string;
    bodyPart?: string | null;
    requestedAt: string;
    completedAt?: string | null;
    result?: string | null;
    findings?: string | null;
    impression?: string | null;
    performedById?: string | null;
    verifiedById?: string | null;
    imageUrls: String[];
    createdById: string;
    createdAt: string;
    updatedAt: string;
}

export interface Medication {
    id: string;
    attendanceId: string;
    stockItemId?: string | null;
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    route?: string | null;
    instructions?: string | null;
    prescribedAt: string;
    dispensedAt?: string | null;
    administeredAt?: string | null;
    dispensedById?: string | null;
    administeredById?: string | null;
    prescribedById: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceRendered {
    id: string;
    attendanceId: string;
    serviceItemId: string;
    quantity: number;
    date: string;
    performedById: string;
    notes?: string | null;
    createdAt: string;
}

export interface Appointment {
    id: string;
    appointmentNumber: string;
    patientId: string;
    doctorId?: string | null;
    departmentId?: string | null;
    title: string;
    description?: string | null;
    appointmentDate: string;
    appointmentTime: string;
    duration: number;
    reminderSent: boolean;
    checkedIn: boolean;
    checkedInAt?: string | null;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    actionType?: string | null;
    actionId?: string | null;
    actionUrl?: string | null;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
    readAt?: string | null;
}

export interface Payment {
    id: string;
    billId: string;
    amount: number;
    reference?: string | null;
    transactionDate: string;
    receivedById: string;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}
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


