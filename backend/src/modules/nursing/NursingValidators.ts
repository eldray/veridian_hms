import { z } from 'zod';

// Nursing writes are clinical records. Rejecting a bad enum or an over-long note at
// the edge keeps the request as a 400 instead of a Prisma failure deep inside a
// transaction, and stops free-text fields growing without bound.
const NOTE_TYPES = [
  'general', 'observation', 'shift_handover', 'escalation', 'medication',
  'procedure', 'patient_communication', 'family_communication',
] as const;

const SHIFTS = ['morning', 'afternoon', 'night', 'on_call'] as const;

const TASK_TYPES = [
  'vitals', 'medication', 'wound_care', 'iv_change', 'position_change', 'fluid_balance',
  'blood_glucose', 'catheter_care', 'general', 'other',
] as const;

const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const;

// 'administered' and 'scheduled' are not variances; the service guards those states
// against the dose row, so the schema only constrains the enum itself.
const DOSE_STATUSES = [
  'scheduled', 'due', 'administered', 'late', 'missed', 'refused', 'held', 'discontinued',
] as const;

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), { message: 'Date must be valid' });

const longText = (max: number) =>
  z.string().trim().max(max, `Text cannot exceed ${max} characters`);

export const CreateNursingNoteSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  attendanceId: z.string().min(1).nullish(),
  admissionId: z.string().min(1).nullish(),
  noteType: z.enum(NOTE_TYPES).optional(),
  shift: z.enum(SHIFTS).nullish(),
  content: z.string().trim().min(1, 'Note content is required').max(20_000),
  isFlagged: z.boolean().optional(),
});

export const UpdateNursingNoteSchema = z
  .object({
    content: z.string().trim().min(1).max(20_000).optional(),
    noteType: z.enum(NOTE_TYPES).optional(),
    shift: z.enum(SHIFTS).nullish(),
    isFlagged: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No editable note fields supplied',
  });

export const CreateNursingTaskSchema = z.object({
  patientId: z.string().min(1, 'patientId is required'),
  attendanceId: z.string().min(1, 'A task must be linked to an encounter'),
  admissionId: z.string().min(1).nullish(),
  title: z.string().trim().min(1, 'Task title is required').max(200),
  description: longText(2000).nullish(),
  taskType: z.enum(TASK_TYPES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  scheduledAt: isoDate.nullish(),
  notes: longText(2000).nullish(),
});

export const UpdateNursingTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: longText(2000).nullish(),
    taskType: z.enum(TASK_TYPES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    scheduledAt: isoDate.nullish(),
    notes: longText(2000).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No editable task fields supplied',
  });

export const AdministerDoseSchema = z.object({
  administeredAt: isoDate.optional(),
  site: longText(200).optional(),
  notes: longText(2000).optional(),
});

export const RecordDoseVarianceSchema = z.object({
  status: z.enum(DOSE_STATUSES),
  reason: longText(500).optional(),
  notes: longText(2000).optional(),
});
