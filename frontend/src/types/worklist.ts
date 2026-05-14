export interface PatientBasic {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  age?: number;
  phone?: string;
}

export interface WorklistItem {
  id: string;
  patientId: string;
  patient: PatientBasic & { age: number };
  status: string;
  priority?: 'normal' | 'urgent' | 'critical';
  wardName?: string;
  admittedAt?: Date;
  lastVitals?: {
    bp?: string;
    hr?: number;
    temp?: number;
  };
  // Lab specific
  requestId?: string;
  tests?: string[];
  testCount?: number;
  requestedBy?: string;
  requestedAt?: Date;
  // Pharmacy specific
  prescriptionId?: string;
  items?: Array<{
    medicationName: string;
    dosage: string;
    frequency: string;
    inStock: boolean;
  }>;
  itemCount?: number;
  prescribedAt?: Date;
  // Scan specific
  scanType?: string;
  bodyPart?: string;
  clinicalNote?: string;
  // Theatre specific
  procedureName?: string;
  scheduledDate?: Date;
  surgeon?: string;
}

export interface WorklistResponse {
  success: boolean;
  data: WorklistItem[];
  count: number;
  timestamp: string;
}

export type DepartmentType = 
  | 'vitals' 
  | 'medical' 
  | 'lab' 
  | 'pharmacy' 
  | 'scans' 
  | 'theatre';

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
