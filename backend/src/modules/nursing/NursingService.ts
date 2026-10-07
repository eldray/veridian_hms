// src/modules/nursing/NursingService.ts
import { PrismaClient, DoseStatus, NursingTaskStatus } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { NursingRepository } from './NursingRepository';
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

    const firstDoseAt = new Date(prescribedAt);
    firstDoseAt.setMinutes(0, 0, 0);
    firstDoseAt.setHours(firstDoseAt.getHours() + 1);

    return { intervalHours, requiredDoses, firstDoseAt };
  }

  private parseFrequency(freq: string | null): { intervalHours: number; dosesPerDay: number } {
    if (!freq) return { intervalHours: 24, dosesPerDay: 1 };
    const f = String(freq).toLowerCase().trim();

    if (['stat', 'once', 'single dose', 'single'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };

    let m = f.match(/every\s+(\d+)\s*h/);
    if (m) { const h = parseInt(m[1], 10); return { intervalHours: h, dosesPerDay: Math.max(1, Math.floor(24 / h)) }; }
    m = f.match(/(\d+)\s*hourly/);
    if (m) { const h = parseInt(m[1], 10); return { intervalHours: h, dosesPerDay: Math.max(1, Math.floor(24 / h)) }; }

    if (['od', 'once daily', 'daily', 'nocte', 'mane', 'om', 'on'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };
    if (['bd', 'bid', 'twice daily', 'twice a day', 'b.i.d'].includes(f)) return { intervalHours: 12, dosesPerDay: 2 };
    if (['tds', 'tid', 'thrice daily', 'three times a day', 't.i.d'].includes(f)) return { intervalHours: 8, dosesPerDay: 3 };
    if (['qds', 'qid', 'four times daily', 'four times a day', 'q.i.d'].includes(f)) return { intervalHours: 6, dosesPerDay: 4 };
    if (['prn', 'as needed', 'sos'].includes(f)) return { intervalHours: 24, dosesPerDay: 1 };

    return { intervalHours: 24, dosesPerDay: 1 };
  }

  private parseDurationDays(duration: string | null): number {
    if (!duration) return 1;
    const d = String(duration).toLowerCase().trim();
    const numMatch = d.match(/(\d+)/);
    if (!numMatch) {
      if (d.includes('week')) return 7;
      if (d.includes('month')) return 30;
      return 1;
    }
    const n = parseInt(numMatch[1], 10);
    if (d.includes('week')) return n * 7;
    if (d.includes('month')) return n * 30;
    return n;
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

  async administerDose(doseId: string, userId: string, data: AdministerDoseDTO) {
    const existing = await this.repository.findDoseById(doseId);
    if (!existing) throw new Error('Dose not found');
    if (existing.medication.status === 'cancelled') throw new Error('This prescription was cancelled');
    if (existing.status === 'administered') throw new Error('This dose has already been administered');
    if (existing.status === 'discontinued') throw new Error('This dose was discontinued');

    return this.repository.administerDose(doseId, userId, {
      administeredAt: data.administeredAt ? new Date(data.administeredAt) : undefined,
      site: data.site,
      notes: data.notes,
    });
  }

  async recordVariance(doseId: string, userId: string, data: VarianceDoseDTO) {
    const existing = await this.repository.findDoseById(doseId);
    if (!existing) throw new Error('Dose not found');
    if (existing.medication.status === 'cancelled') throw new Error('This prescription was cancelled');
    if (existing.status === 'administered') throw new Error('Cannot record a variance for an administered dose');

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

  async createNote(dto: CreateNursingNoteDTO, userId: string) {
    if (!dto.content?.trim()) throw new Error('Note content is required');

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
    if (!dto.title?.trim()) throw new Error('Task title is required');
    if (!dto.attendanceId) throw new Error('Task must be linked to an attendance');

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

  async deleteTask(id: string) {
    const existing = await this.repository.findTaskById(id);
    if (!existing) throw new Error('Task not found');
    await this.repository.deleteTask(id);
  }
}

/**
 * Backwards-compatible alias so EncounterRepository's existing
 * import of { MarService } keeps working.
 */
export { NursingService as MarService };