// backend/src/modules/worklist/WorklistTypes.ts

export interface WorklistItem {
  id: string;
  patientId: string;
  patient: {
    id: string;
    firstName?: string;
    lastName?: string;
    surname?: string;
    otherNames?: string;
    dateOfBirth?: Date;
    gender?: string;
    phone?: string;
    age?: number;
  };
  wardName?: string;
  departmentName?: string;
  admittedAt?: Date;
  appointmentDate?: Date;
  priority: 'low' | 'normal' | 'urgent' | 'stat';
  status: string;
  waitTimeMinutes?: number;
  attendanceId?: string;
  attendanceNumber?: string;
}

export interface WorklistResponse {
  success: boolean;
  data: WorklistItem[];
  count: number;
  timestamp: string;
}

export type WorklistType = 
  | 'vitals'
  | 'medical'
  | 'laboratory'
  | 'pharmacy'
  | 'radiology'
  | 'theatre'
  | 'procedures';
