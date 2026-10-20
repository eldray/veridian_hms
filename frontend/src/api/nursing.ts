// src/api/nursing.ts
import api from './api';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

export type DoseStatus =
  | 'scheduled' | 'due' | 'administered' | 'late'
  | 'missed' | 'refused' | 'held' | 'discontinued';

export interface MarDose {
  id: string;
  doseNumber: number;
  scheduledAt: string;
  administeredAt: string | null;
  status: DoseStatus;
  dose: string | null;
  route: string | null;
  site: string | null;
  notes: string | null;
  varianceReason: string | null;
  administeredBy: { id: string; fullName: string } | null;
  medication: {
    id: string;
    name: string;
    dosage: string | null;
    frequency: string | null;
    instructions: string | null;
    attendanceId: string;
    status: string;
  };
}

export interface ParsedSchedule {
  intervalHours: number;
  requiredDoses: number;
  firstDoseAt: string;
}

export type NursingNoteType =
  | 'general' | 'observation' | 'shift_handover' | 'escalation'
  | 'medication' | 'procedure' | 'patient_communication' | 'family_communication';

export interface NursingNote {
  id: string;
  patientId: string;
  attendanceId: string | null;
  admissionId: string | null;
  noteType: NursingNoteType;
  shift: 'morning' | 'afternoon' | 'night' | null;
  content: string;
  isFlagged: boolean;
  createdById: string;
  createdBy: { id: string; fullName: string; role: string };
  attendance: { id: string; attendanceNumber: string } | null;
  admission: { id: string; admissionNumber: string } | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
}

export type NursingTaskType =
  | 'vitals' | 'medication' | 'wound_care' | 'iv_change' | 'position_change'
  | 'fluid_balance' | 'blood_glucose' | 'catheter_care' | 'general' | 'other';

export type TaskPriority = 'low' | 'medium' | 'high';
export type NursingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface NursingTask {
  id: string;
  patientId: string;
  attendanceId: string;
  admissionId: string | null;
  title: string;
  description: string | null;
  taskType: NursingTaskType;
  priority: TaskPriority;
  status: NursingTaskStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  completedById: string | null;
  notes: string | null;
  createdById: string;
  createdBy: { id: string; fullName: string };
  completedBy: { id: string; fullName: string } | null;
  createdAt: string;
  updatedAt: string;
}

// ═══════════════════════════════════════════════════════════
// MAR — DOSES
// ═══════════════════════════════════════════════════════════

export const getMarDoses = (filters?: {
  attendanceId?: string;
  patientId?: string;
  medicationId?: string;
  status?: string | string[];
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) =>
  api.get('/nursing/doses', { params: filters }).then((r) => {
    const body = r.data;
    if (body?.success && Array.isArray(body.data)) {
      return { doses: body.data as MarDose[], pagination: body.pagination ?? null };
    }
    if (Array.isArray(body)) return { doses: body as MarDose[], pagination: null };
    return { doses: [] as MarDose[], pagination: null };
  });

export const getMarDose = (doseId: string) =>
  api.get(`/nursing/doses/${doseId}`).then((r) => r.data?.data ?? r.data);

export const getMarDosesByMedication = (medicationId: string) =>
  api.get(`/nursing/medications/${medicationId}/doses`).then((r) => r.data?.data ?? r.data);

export const getShiftMar = (
  attendanceId: string,
  date: string,
  shift: 'morning' | 'afternoon' | 'night',
) =>
  api
    .get(`/nursing/attendance/${attendanceId}/shift`, { params: { date, shift } })
    .then((r) => r.data?.data ?? r.data);

export const previewMarSchedule = (data: {
  frequency: string;
  duration: string;
  prescribedAt?: string;
}) => api.post('/nursing/doses/preview-schedule', data).then((r) => r.data?.data ?? r.data);

export const administerMarDose = (
  doseId: string,
  data?: { administeredAt?: string; site?: string; notes?: string },
) => api.post(`/nursing/doses/${doseId}/administer`, data ?? {}).then((r) => r.data?.data ?? r.data);

export const recordMarVariance = (
  doseId: string,
  data: { status: Exclude<DoseStatus, 'administered' | 'scheduled' | 'due' | 'discontinued'>; reason?: string; notes?: string },
) => api.post(`/nursing/doses/${doseId}/variance`, data).then((r) => r.data?.data ?? r.data);

// ═══════════════════════════════════════════════════════════
// NOTES
// ═══════════════════════════════════════════════════════════

export const getNursingNotes = (filters?: {
  patientId?: string;
  attendanceId?: string;
  admissionId?: string;
  shift?: string;
  noteType?: string;
  isFlagged?: boolean;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) =>
  api.get('/nursing/notes', { params: filters }).then((r) => {
    const body = r.data;
    if (body?.success && Array.isArray(body.data)) {
      return { notes: body.data as NursingNote[], pagination: body.pagination ?? null };
    }
    return { notes: [] as NursingNote[], pagination: null };
  });

export const getNursingNote = (id: string) =>
  api.get(`/nursing/notes/${id}`).then((r) => r.data?.data ?? r.data);

export const createNursingNote = (data: {
  patientId: string;
  attendanceId?: string | null;
  admissionId?: string | null;
  noteType?: NursingNoteType;
  shift?: string | null;
  content: string;
  isFlagged?: boolean;
}) => api.post('/nursing/notes', data).then((r) => r.data?.data ?? r.data);

export const updateNursingNote = (
  id: string,
  data: Partial<{
    content: string;
    noteType: NursingNoteType;
    shift: string | null;
    isFlagged: boolean;
  }>,
) => api.patch(`/nursing/notes/${id}`, data).then((r) => r.data?.data ?? r.data);

export const deleteNursingNote = (id: string) =>
  api.delete(`/nursing/notes/${id}`).then((r) => r.data);

// ═══════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════

export const getNursingTasks = (filters?: {
  patientId?: string;
  attendanceId?: string;
  admissionId?: string;
  status?: string | string[];
  priority?: string;
  taskType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) =>
  api.get('/nursing/tasks', { params: filters }).then((r) => {
    const body = r.data;
    if (body?.success && Array.isArray(body.data)) {
      return { tasks: body.data as NursingTask[], pagination: body.pagination ?? null };
    }
    return { tasks: [] as NursingTask[], pagination: null };
  });

export const getNursingTask = (id: string) =>
  api.get(`/nursing/tasks/${id}`).then((r) => r.data?.data ?? r.data);

export const createNursingTask = (data: {
  patientId: string;
  attendanceId: string;
  admissionId?: string | null;
  title: string;
  description?: string | null;
  taskType?: NursingTaskType;
  priority?: TaskPriority;
  scheduledAt?: string | null;
  notes?: string | null;
}) => api.post('/nursing/tasks', data).then((r) => r.data?.data ?? r.data);

export const updateNursingTask = (
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    taskType: NursingTaskType;
    priority: TaskPriority;
    status: NursingTaskStatus;
    scheduledAt: string | null;
    notes: string | null;
  }>,
) => api.patch(`/nursing/tasks/${id}`, data).then((r) => r.data?.data ?? r.data);

export const deleteNursingTask = (id: string) =>
  api.delete(`/nursing/tasks/${id}`).then((r) => r.data);