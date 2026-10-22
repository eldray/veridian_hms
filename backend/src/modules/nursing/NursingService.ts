// src/modules/nursing/NursingService.ts
import { PrismaClient, DoseStatus, NursingTaskStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { NursingRepository } from './NursingRepository';
import { ValidationError } from '../../utils/errors';
import {
  MarFilters,
  ScheduleDosesInput,
  ParsedSchedule,
  AdministerDoseDTO,
  VarianceDoseDTO,
  NursingNoteFilters,
  NursingTaskFilters,
  CreateNursingNoteDTO,
  UpdateNursingNoteDTO,
  CreateNursingTaskDTO,
  UpdateNursingTaskDTO,
} from './NursingTypes';

export class NursingService extends BaseService {
  private repository: NursingRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('NursingService');
    this.prisma = prisma;
    this.repository = new NursingRepository(prisma);
  }

  // ═══════════════════════════════════════════════════════════
  // MAR — schedule parsing
  // ═══════════════════════════════════════════════════════════

  parseSchedule(
    frequency: string | null,
    duration: string | null,
    prescribedAt: Date,
  ): ParsedSchedule {
    const { intervalHours, dosesPerDay } = this.parseFrequency(frequency);
    const days = this.parseDurationDays(duration);
    const requiredDoses = Math.max(1, dosesPerDay * days);
    if (requiredDoses > 10000) {
      throw new ValidationError('This prescription would create more than 10,000 scheduled doses; verify the frequency and duration');
    }

    const firstDoseAt = new Date(prescribedAt);
    if (Number.isNaN(firstDoseAt.getTime())) {
      throw new ValidationError('Prescription date must be valid before scheduling medication doses');
    }

    // Do not invent a one-hour delay for the first dose. The first dose is due
    // from the recorded prescription time; the prescriber/nurse determines timing
    // clinically, especially for urgent and stat medication.
    return { intervalHours, requiredDoses, firstDoseAt };
  }

  private parseFrequency(freq: string | null): { intervalHours: number; dosesPerDay: number } {
    if (!freq) return { intervalHours: 24, dosesPerDay: 1 };
    const f = String(freq).toLowerCase().trim();

    if (['stat', 'once', 'single dose', 'single'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };

    let m = f.match(/^(?:every\s+)?(\d+)\s*(?:hours?|h)(?:\s+apart)?$/);
    if (!m) m = f.match(/^q\s*(\d+)\s*h(?:ours?)?$/);
    if (!m) m = f.match(/^(\d+)\s*hourly$/);
    if (m) {
      const h = Number(m[1]);
      if (!Number.isInteger(h) || h < 1 || h > 24) {
        throw new ValidationError('Medication frequency interval must be between 1 and 24 hours');
      }
      return { intervalHours: h, dosesPerDay: Math.max(1, Math.floor(24 / h)) };
    }

    if (['od', 'once daily', 'daily', 'nocte', 'mane', 'om', 'on'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };
    if (['bd', 'bid', 'twice daily', 'twice a day', 'b.i.d'].includes(f)) return { intervalHours: 12, dosesPerDay: 2 };
    if (['tds', 'tid', 'thrice daily', 'three times a day', 't.i.d'].includes(f)) return { intervalHours: 8, dosesPerDay: 3 };
    if (['qds', 'qid', 'four times daily', 'four times a day', 'q.i.d'].includes(f)) return { intervalHours: 6, dosesPerDay: 4 };
    if (['prn', 'as needed', 'sos'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };

    throw new ValidationError('Unsupported medication frequency. Use a recognized schedule such as stat, OD, BD, TDS, QDS or every 8 hours');
  }

  private parseDurationDays(duration: string | null): number {
    if (!duration) return 1;
    const d = String(duration).toLowerCase().trim();
    const numMatch = d.match(/(\d+)/);
    if (!numMatch) {
      const wordNumber: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      const word = Object.keys(wordNumber).find((candidate) => new RegExp('\\b' + candidate + '\\b').test(d));
      if (!word) throw new ValidationError('Medication duration must specify a number of days, weeks or months');
      const n = wordNumber[word];
      const days = d.includes('week') ? n * 7 : d.includes('month') ? n * 30 : n;
      if (days < 1 || days > 365) throw new ValidationError('Medication duration must be between 1 and 365 days');
      return days;
    }
    const n = Number(numMatch[1]);
    const days = d.includes('week') ? n * 7 : d.includes('month') ? n * 30 : n;
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new ValidationError('Medication duration must be between 1 and 365 days');
    }
    return days;
  }

  // ═══════════════════════════════════════════════════════════
  // MAR — materialization
  // ═══════════════════════════════════════════════════════════

  async scheduleDosesForMedication(input: ScheduleDosesInput) {
    const schedule = this.parseSchedule(input.frequency, input.duration, input.prescribedAt);

    const rows = Array.from({ length: schedule.requiredDoses }, (_, i) => {
      const doseNumber = i + 1;
      const scheduledAt = new Date(schedule.firstDoseAt.getTime() + i * schedule.intervalHours * 3600_000);
      return {
        doseNumber,
        scheduledAt,
        status: 'scheduled' as DoseStatus,
        dose: input.dose,
        route: input.route,
      };
    });

    const result = await this.repository.bulkCreateDoses(input.medicationId, rows);

    this.logInfo('Materialized medication doses', {
      medicationId: input.medicationId,
      created: result.count,
      intervalHours: schedule.intervalHours,
      requiredDoses: schedule.requiredDoses,
    });

    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // MAR — reads
  // ═══════════════════════════════════════════════════════════

  async getDoses(filters: MarFilters) {
    await this.repository.markOverdueAsDue();
    return this.repository.findDoses(filters);
  }

  async getDoseById(id: string) {
    const dose = await this.repository.findDoseById(id);
    if (!dose) throw new Error('Dose not found');
    return dose;
  }

  async getDosesByMedication(medicationId: string) {
    return this.repository.findDosesByMedication(medicationId);
  }

  async getShiftMar(attendanceId: string, date: string, shift: 'morning' | 'afternoon' | 'night') {
    const base = new Date(date);
    base.setHours(0, 0, 0, 0);

    let startHour: number, endHour: number;
    switch (shift) {
      case 'morning':   startHour = 6;  endHour = 14; break;
      case 'afternoon': startHour = 14; endHour = 22; break;
      case 'night':     startHour = 22; endHour = 30; break; // 6am next day
    }

    const start = new Date(base);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(base);
    end.setHours(endHour, 0, 0, 0);

    return this.repository.findDoses({
      attendanceId,
      fromDate: start,
      toDate: end,
      limit: 500,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // MAR — writes
  // ═══════════════════════════════════════════════════════════

  private async ensureEncounterOpenForDose(attendanceId?: string | null) {
    if (!attendanceId) throw new ValidationError('This medication dose is not linked to an attendance/encounter');
    const attendance = await this.prisma.attendance.findUnique({ where: { id: attendanceId }, select: { id: true, status: true } });
    if (!attendance) throw new ValidationError('The medication dose encounter was not found');
    if (['discharged', 'referred', 'absconded', 'completed', 'cancelled'].includes(attendance.status)) {
      throw new ValidationError('Medication administration is not allowed for a closed encounter');
    }
  }

  async administerDose(doseId: string, userId: string, data: AdministerDoseDTO) {
    const existing = await this.repository.findDoseById(doseId);
    if (!existing) throw new Error('Dose not found');
    if (existing.medication.status === 'cancelled') throw new ValidationError('This prescription was cancelled');
    if (existing.status === 'administered') throw new ValidationError('This dose has already been administered');
    if (existing.status === 'discontinued') throw new ValidationError('This dose was discontinued');
    await this.ensureEncounterOpenForDose(existing.medication.attendanceId);

    return this.repository.administerDose(doseId, userId, {
      administeredAt: data.administeredAt ? new Date(data.administeredAt) : undefined,
      site: data.site,
      notes: data.notes,
    });
  }

  async recordVariance(doseId: string, userId: string, data: VarianceDoseDTO) {
    const existing = await this.repository.findDoseById(doseId);
    if (!existing) throw new Error('Dose not found');
    if (existing.medication.status === 'cancelled') throw new ValidationError('This prescription was cancelled');
    if (existing.status === 'administered') throw new ValidationError('Cannot record a variance for an administered dose');
    await this.ensureEncounterOpenForDose(existing.medication.attendanceId);

    return this.repository.recordDoseVariance(doseId, userId, data);
  }

  async discontinueRemainingDoses(medicationId: string) {
    return this.repository.discontinueRemainingDoses(medicationId);
  }

  // ═══════════════════════════════════════════════════════════
  // NURSING NOTES
  // ═══════════════════════════════════════════════════════════

  async getNotes(filters: NursingNoteFilters) {
    return this.repository.findNotes(filters);
  }

  async getNoteById(id: string) {
    const note = await this.repository.findNoteById(id);
    if (!note) throw new Error('Note not found');
    return note;
  }

  /**
   * Keep nursing documentation attached to one coherent patient encounter.
   * These are separate foreign keys in the schema, so Prisma alone cannot ensure
   * that patientId, attendanceId and admissionId all refer to the same patient/stay.
   */
  private async validateClinicalLinks(patientId: string, attendanceId?: string | null, admissionId?: string | null) {
    if (!patientId?.trim()) throw new ValidationError('Patient is required for nursing documentation');

    let linkedAttendanceId = attendanceId ?? null;
    if (linkedAttendanceId) {
      const attendance = await this.prisma.attendance.findUnique({
        where: { id: linkedAttendanceId },
        select: { id: true, patientId: true },
      });
      if (!attendance) throw new ValidationError('The selected attendance/encounter was not found');
      if (attendance.patientId !== patientId) {
        throw new ValidationError('The selected attendance belongs to a different patient');
      }
    }

    if (admissionId) {
      const admission = await this.prisma.admission.findUnique({
        where: { id: admissionId },
        select: { id: true, attendanceId: true, attendance: { select: { patientId: true } } },
      });
      if (!admission) throw new ValidationError('The selected admission was not found');
      if (admission.attendance.patientId !== patientId) {
        throw new ValidationError('The selected admission belongs to a different patient');
      }
      if (linkedAttendanceId && admission.attendanceId !== linkedAttendanceId) {
        throw new ValidationError('The selected admission does not belong to the selected attendance');
      }
    }
  }

  async createNote(dto: CreateNursingNoteDTO, userId: string) {
    if (!dto.content?.trim()) throw new ValidationError('Note content is required');
    await this.validateClinicalLinks(dto.patientId, dto.attendanceId, dto.admissionId);

    const data = {
      patientId: dto.patientId,
      attendanceId: dto.attendanceId ?? null,
      admissionId: dto.admissionId ?? null,
      noteType: dto.noteType ?? 'general',
      shift: dto.shift ?? null,
      content: dto.content.trim(),
      isFlagged: dto.isFlagged ?? false,
      createdById: userId,
    };

    return this.repository.createNote(data);
  }

  async updateNote(id: string, dto: UpdateNursingNoteDTO, actor: { userId: string; role: string }) {
    const existing = await this.repository.findNoteById(id);
    if (!existing) throw new Error('Note not found');

    const isAdminLike = ['super_admin', 'admin'].includes(actor.role);
    if (existing.createdById !== actor.userId && !isAdminLike) {
      throw new Error('Only the author or an admin can edit this note');
    }

    const data: any = {};
    if (dto.content !== undefined) data.content = dto.content.trim();
    if (dto.noteType !== undefined) data.noteType = dto.noteType;
    if (dto.shift !== undefined) data.shift = dto.shift;
    if (dto.isFlagged !== undefined) data.isFlagged = dto.isFlagged;

    return this.repository.updateNote(id, data);
  }

  async deleteNote(id: string, actor: { userId: string; role: string }) {
    const existing = await this.repository.findNoteById(id);
    if (!existing) throw new Error('Note not found');

    const isAdminLike = ['super_admin', 'admin'].includes(actor.role);
    if (existing.createdById !== actor.userId && !isAdminLike) {
      throw new Error('Only the author or an admin can delete this note');
    }

    await this.repository.deleteNote(id);
  }

  // ═══════════════════════════════════════════════════════════
  // NURSING TASKS
  // ═══════════════════════════════════════════════════════════

  async getTasks(filters: NursingTaskFilters) {
    return this.repository.findTasks(filters);
  }

  async getTaskById(id: string) {
    const task = await this.repository.findTaskById(id);
    if (!task) throw new Error('Task not found');
    return task;
  }

  async createTask(dto: CreateNursingTaskDTO, userId: string) {
    if (!dto.title?.trim()) throw new ValidationError('Task title is required');
    if (!dto.attendanceId) throw new ValidationError('Task must be linked to an attendance');
    await this.validateClinicalLinks(dto.patientId, dto.attendanceId, dto.admissionId);

    const data = {
      patientId: dto.patientId,
      attendanceId: dto.attendanceId,
      admissionId: dto.admissionId ?? null,
      title: dto.title.trim(),
      description: dto.description ?? null,
      taskType: dto.taskType ?? 'general',
      priority: dto.priority ?? 'medium',
      status: 'pending' as NursingTaskStatus,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      notes: dto.notes ?? null,
      createdById: userId,
    };

    return this.repository.createTask(data);
  }

  async updateTask(id: string, dto: UpdateNursingTaskDTO, userId: string) {
    const existing = await this.repository.findTaskById(id);
    if (!existing) throw new Error('Task not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.taskType !== undefined) data.taskType = dto.taskType;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.scheduledAt !== undefined) data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'completed') {
        data.completedAt = new Date();
        data.completedById = userId;
      } else if (existing.status === 'completed') {
        data.completedAt = null;
        data.completedById = null;
      }
    }

    return this.repository.updateTask(id, data);
  }

  async deleteTask(id: string, actor: { userId: string; role: string }) {
    const existing = await this.repository.findTaskById(id);
    if (!existing) throw new NotFoundError('Nursing task', id);
    const isAdminLike = ['super_admin', 'admin'].includes(actor.role);
    if (existing.createdById !== actor.userId && !isAdminLike) {
      throw new ValidationError('Only the task creator or an admin can delete this task');
    }
    await this.repository.deleteTask(id);
  }
}

/**
 * Backwards-compatible alias so EncounterRepository's existing
 * import of { MarService } keeps working.
 */
export { NursingService as MarService };