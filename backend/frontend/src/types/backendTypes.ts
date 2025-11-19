// AUTO-GENERATED from Prisma schema
// DO NOT EDIT MANUALLY
// Generated on: 2025-11-18T18:14:22.311Z
export interface User {
    username: string;
    password: string;
    role: UserRole;
    email?: string | null;
    phone?: string | null;
    specialization?: string | null;
    department?: Department | null;
    createdAt: string;
    updatedAt: string;
}

export interface Admission {
    diagnosis: string;
    status: string;
    attendance?: Attendance | null;
    bed: Bed;
    patient: Patient;
    ward: Ward;
    createdAt: string;
    updatedAt: string;
}

export interface AdmissionSecondaryDiagnosis {
    admission: Admission;
    diagnosis: Diagnosis;
    createdAt: string;
}

export interface Attendance {
    complaints: string;
    status: AttendanceStatus;
    patient: Patient;
    bed?: Bed | null;
    ward?: Ward | null;
    bill?: Bill | null;
    admission?: Admission | null;
    createdAt: string;
    updatedAt: string;
}

export interface Bed {
    ward: Ward;
    createdAt: string;
    updatedAt: string;
}

export interface Bill {
    items: any;
    subtotal: number;
    discount: number;
    balance: number;
    status: BillStatus;
    admission?: Admission | null;
    attendance: Attendance;
    patient: Patient;
    createdAt: string;
    updatedAt: string;
}

export interface ConsultationType {
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
}

export interface Department {
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    head?: User | null;
    createdAt: string;
    updatedAt: string;
}

export interface Diagnosis {
    name: string;
    variant?: DiagnosisVariant | null;
    description?: string | null;
    category: DiagnosisCategory;
    createdAt: string;
    updatedAt: string;
}

export interface GDRGTariff {
    description: string;
    diagnosis: Diagnosis;
    createdAt: string;
    updatedAt: string;
}

export interface Hospital {
    name: string;
    address: string;
    phone: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface InsuranceClaim {
    status: ClaimStatus;
    notes?: string | null;
    attendance: Attendance;
    bill: Bill;
    patient: Patient;
    createdAt: string;
    updatedAt: string;
}

export interface InsuranceProvider {
    name: string;
    type: InsuranceType;
    createdAt: string;
    updatedAt: string;
}

export interface LabTestTemplate {
    name: string;
    category: LabCategory;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Patient {
    surname: string;
    gender: Gender;
    age: number;
    contact: string;
    address: string;
    employer?: any | null;
    createdAt: string;
    updatedAt: string;
}

export interface ProcedureTemplate {
    name: string;
    description?: string | null;
    category: ProcedureCategory;
    department: string;
    duration: number;
    createdAt: string;
    updatedAt: string;
}

export interface ScanTemplate {
    name: string;
    description: string;
    category: ScanCategory;
    duration: number;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceCatalog {
    name: string;
    code: string;
    description?: string | null;
    unit: string;
    diagnosis?: Diagnosis | null;
    ward?: Ward | null;
    createdAt: string;
    updatedAt: string;
}

export interface StockItem {
    name: string;
    category: string;
    description?: string | null;
    strength: string;
    supplier?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StockTransaction {
    quantity: number;
    reference?: string | null;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Vitals {
    temperature?: number | null;
    pulse?: number | null;
    respiration?: number | null;
    spo2?: number | null;
    weight?: number | null;
    height?: number | null;
    bmi?: number | null;
    notes?: string | null;
    attendance: Attendance;
    patient: Patient;
    createdAt: string;
    updatedAt: string;
}

export interface Ward {
    createdAt: string;
    updatedAt: string;
}

export interface AttendanceDiagnosis {
    primary: boolean;
    notes?: string | null;
    date: string;
    attendance: Attendance;
    diagnosis: Diagnosis;
    createdAt: string;
}

export interface LabTest {
    status: LabTestStatus;
    result?: any | null;
    units?: string | null;
    notes?: string | null;
    priority: Priority;
    attendance: Attendance;
    template: LabTestTemplate;
    createdAt: string;
    updatedAt: string;
}

export interface Procedure {
    status: ProcedureStatus;
    notes?: string | null;
    complications?: string | null;
    outcome?: string | null;
    cost?: number | null;
    duration?: number | null;
    assistant?: User | null;
    attendance: Attendance;
    template: ProcedureTemplate;
    createdAt: string;
    updatedAt: string;
}

export interface Scan {
    description: string;
    status: ScanStatus;
    result?: string | null;
    findings?: string | null;
    impression?: string | null;
    priority: ScanPriority;
    attendance: Attendance;
    template: ScanTemplate;
    createdAt: string;
    updatedAt: string;
}

export interface Medication {
    name: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    quantity: number;
    route?: string | null;
    instructions?: string | null;
    status: MedicationStatus;
    notes?: string | null;
    attendance: Attendance;
    createdAt: string;
    updatedAt: string;
}

export interface ServiceRendered {
    quantity: number;
    date: string;
    notes?: string | null;
    attendance: Attendance;
    createdAt: string;
}

export interface Appointment {
    title: string;
    description?: string | null;
    duration: number;
    status: AppointmentStatus;
    type: AppointmentType;
    department?: Department | null;
    doctor?: User | null;
    patient: Patient;
    createdAt: string;
    updatedAt: string;
}

export interface Notification {
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    user: User;
    createdAt: string;
}

export interface Payment {
    amount: number;
    reference?: string | null;
    notes?: string | null;
    bill: Bill;
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


