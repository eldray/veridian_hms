// src/modules/nursing/NursingTypes.ts
import { DoseStatus, NursingNoteType, NursingTaskType, TaskPriority, NursingTaskStatus, ShiftType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════
// MAR — Medication Administration Record
// ═══════════════════════════════════════════════════════════

export interface ScheduleDosesInput {
  medicationId: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  prescribedAt: Date;
}

export interface ParsedSchedule {
  intervalHours: number;
  requiredDoses: number;
  firstDoseAt: Date;
}

export interface MarFilters {
  attendanceId?: string;
  patientId?: string;
  medicationId?: string;
  status?: DoseStatus | DoseStatus[];
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

export interface AdministerDoseDTO {
  administeredAt?: string;
  site?: string;
  notes?: string;
}

export interface VarianceDoseDTO {
  status: DoseStatus;
  reason?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════
// NURSING NOTES
// ═══════════════════════════════════════════════════════════

export interface CreateNursingNoteDTO {
  patientId: string;
  attendanceId?: string | null;
  admissionId?: string | null;
  noteType?: NursingNoteType;
  shift?: ShiftType | null;
  content: string;
  isFlagged?: boolean;
}

export interface UpdateNursingNoteDTO {
  content?: string;
  noteType?: NursingNoteType;
  shift?: ShiftType | null;
  isFlagged?: boolean;
}

export interface NursingNoteFilters {
  patientId?: string;
  attendanceId?: string;
  admissionId?: string;
  shift?: ShiftType;
  noteType?: NursingNoteType;
  isFlagged?: boolean;
  fromDate?: Date;
  toDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════
// NURSING TASKS
// ═══════════════════════════════════════════════════════════

export interface CreateNursingTaskDTO {
  patientId: string;
  attendanceId: string;
  admissionId?: string | null;
  title: string;
  description?: string | null;
  taskType?: NursingTaskType;
  priority?: TaskPriority;
  scheduledAt?: string | null;
  notes?: string | null;
}

export interface UpdateNursingTaskDTO {
  title?: string;
  description?: string | null;
  taskType?: NursingTaskType;
  priority?: TaskPriority;
  status?: NursingTaskStatus;
  scheduledAt?: string | null;
  notes?: string | null;
}

export interface NursingTaskFilters {
  patientId?: string;
  attendanceId?: string;
  admissionId?: string;
  status?: NursingTaskStatus | NursingTaskStatus[];
  priority?: TaskPriority;
  taskType?: NursingTaskType;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}