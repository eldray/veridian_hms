// types/worklist.ts - UPDATED

export interface PatientBasic {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  age?: number;
  phone?: string;
}

// Base interface for common worklist item fields
export interface BaseWorklistItem {
  id: string;
  patientId: string;
  attendanceId: string;
  patient: {
    name: string;
    age: number;
    gender: string;
    folderNumber: string;
  };
  location?: {
    ward?: string;
    bed?: string;
  };
  waitTime: number;
  priority: 'routine' | 'urgent' | 'stat';
  status: string;
  encounterCategory: string;
}

// Vitals Worklist Item
export interface VitalsWorklistItem extends BaseWorklistItem {
  hasVitalsToday: boolean;
  vitalsRecordedAt?: string;
  lastVitals?: {
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
    respiration?: number;
    spo2?: number;
    recordedAt?: string;
  } | null;
  isAntenatal?: boolean;
  hasAbnormal?: boolean;
}

// Medical Worklist Item
export interface MedicalWorklistItem extends BaseWorklistItem {
  hasMedicalNotesToday: boolean;
  hasDiagnosis?: boolean;
  vitals?: any;
  reviewedAt?: string;
  reviewedBy?: string;
  complaints?: string;
}

// Lab Worklist Item (Grouped by Patient)
export interface LabWorklistItem extends BaseWorklistItem {
  testCount: number;
  requestedCount: number;
  inProgressCount: number;
  completedCount: number;
  hasPendingTests: boolean;
  hasResults: boolean;
  oldestRequestedAt: Date;
  testTypes?: string;
  nextTest?: {
    id: string;
    name: string;
    requestedAt: Date;
  } | null;
  completedTests?: Array<{
    id: string;
    name: string;
    completedAt: Date;
  }>;
}

// Pharmacy Worklist Item (Grouped by Patient)
export interface PharmacyWorklistItem extends BaseWorklistItem {
  prescriptionCount: number;
  prescribedCount: number;
  dispensedCount: number;
  hasPendingPrescriptions: boolean;
  hasBeenDispensed: boolean;
  oldestPrescribedAt: Date;
  nextMedication?: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  } | null;
  medications?: Array<{
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    status: string;
    prescribedAt: Date;
    dispensedAt?: Date;
  }>;
}

// Scans Worklist Item (Grouped by Patient)
export interface ScansWorklistItem extends BaseWorklistItem {
  scanCount: number;
  requestedCount: number;
  inProgressCount: number;
  completedCount: number;
  hasPendingScans: boolean;
  hasResults: boolean;
  oldestRequestedAt: Date;
  scanTypes: string;
  nextScan?: {
    id: string;
    name: string;
    bodyPart?: string;
    requestedAt: Date;
  } | null;
}

// Theatre Worklist Item (Grouped by Patient)
export interface TheatreWorklistItem extends BaseWorklistItem {
  procedureCount: number;
  scheduledCount: number;
  inProgressCount: number;
  completedCount: number;
  hasPendingProcedures: boolean;
  hasBeenPerformed: boolean;
  earliestScheduledDate: Date | null;
  procedureNames: string;
  nextProcedure?: {
    id: string;
    name: string;
    scheduledDate?: Date;
    status: string;
  } | null;
}

// Maternal Worklist Item
export interface MaternalWorklistItem extends BaseWorklistItem {
  visitType: 'antenatal' | 'delivery' | 'postnatal';
  hasBeenAttended: boolean;
  completedAt?: string;
  completedBy?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  // Antenatal specific
  gestationalAge?: number;
  edd?: string;
  // Delivery specific
  deliveryDate?: string;
  deliveryType?: string;
  // Postnatal specific
  postnatalDay?: number;
  complaints?: string;
  latestVitals?: {
    bloodPressure?: string;
    temperature?: number;
    pulse?: number;
    fetalHeartRate?: number;
    fundalHeight?: number;
  };
}

// Union type for all worklist items
export type WorklistItem = 
  | VitalsWorklistItem 
  | MedicalWorklistItem 
  | LabWorklistItem 
  | PharmacyWorklistItem 
  | ScansWorklistItem 
  | TheatreWorklistItem 
  | MaternalWorklistItem;

// Department types - ADD 'maternal'
export type DepartmentType = 
  | 'vitals' 
  | 'medical' 
  | 'lab' 
  | 'pharmacy' 
  | 'scans' 
  | 'theatre'
  | 'maternal';

export interface WorklistResponse {
  success: boolean;
  data: WorklistItem[];
  count: number;
  timestamp: string;
}

// Response structures for each worklist type
export interface VitalsWorklistResponse {
  total: number;
  pending: number;
  recent: number;
  data: VitalsWorklistItem[];
}

export interface MedicalWorklistResponse {
  total: number;
  pending: number;
  reviewed: number;
  data: MedicalWorklistItem[];
}

export interface LabWorklistResponse {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  data: LabWorklistItem[];
}

export interface PharmacyWorklistResponse {
  total: number;
  pending: number;
  dispensed: number;
  data: PharmacyWorklistItem[];
}

export interface ScansWorklistResponse {
  total: number;
  pending: number;
  completed: number;
  inProgress: number;
  data: ScansWorklistItem[];
}

export interface TheatreWorklistResponse {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  data: TheatreWorklistItem[];
}

export interface MaternalWorklistResponse {
  total: number;
  pending: number;
  recent: number;
  data: MaternalWorklistItem[];
}

export interface WorklistState {
  currentDepartment: DepartmentType | null;
  worklistItems: WorklistItem[];
  selectedItem: WorklistItem | null;
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    urgent: number;
    critical: number;
  };
}