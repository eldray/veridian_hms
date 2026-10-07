// src/modules/nursing/NursingRepository.ts
import { PrismaClient, DoseStatus, NursingTaskStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  MarFilters,
  NursingNoteFilters,
  NursingTaskFilters,
} from './NursingTypes';

export class NursingRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'medicationDose');
  }

  // ═══════════════════════════════════════════════════════════
  // DOSES (MAR)
  // ═══════════════════════════════════════════════════════════

  private doseInclude() {
    return {
      administeredBy: { select: { id: true, fullName: true } },
      medication: {
        select: {
          id: true,
          name: true,
          dosage: true,
          frequency: true,
          instructions: true,
          attendanceId: true,
          status: true,
        },
      },
    };
  }

  async findDoses(filters: MarFilters) {
    const { attendanceId, patientId, medicationId, status, fromDate, toDate, page = 1, limit = 500 } = filters;
    const where: any = {};

    if (medicationId) where.medicationId = medicationId;
    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (fromDate || toDate) {
      where.scheduledAt = {};
      if (fromDate) where.scheduledAt.gte = fromDate;
      if (toDate) where.scheduledAt.lte = toDate;
    }
    where.medication = {
      status: { not: 'cancelled' },
      ...(attendanceId ? { attendanceId } : {}),
      ...(patientId ? { Attendance: { patientId } } : {}),
    };

    const result = await this.findManyWithPagination({
      where,
      page,
      limit: Math.min(limit, 500),
      orderBy: [{ scheduledAt: 'asc' }, { doseNumber: 'asc' }],
      include: this.doseInclude(),
    });

    return { doses: result.data, total: result.total, page: result.page, limit: result.limit };
  }

  async findDoseById(id: string) {
    return this.prisma.medicationDose.findUnique({
      where: { id },
      include: this.doseInclude(),
    });
  }

  async findDosesByMedication(medicationId: string) {
    return this.prisma.medicationDose.findMany({
      where: { medicationId, medication: { status: { not: 'cancelled' } } },
      orderBy: { doseNumber: 'asc' },
      include: this.doseInclude(),
    });
  }

  async bulkCreateDoses(
    medicationId: string,
    rows: Array<{
      doseNumber: number;
      scheduledAt: Date;
      status?: DoseStatus;
      dose?: string | null;
      route?: string | null;
    }>,
  ) {
    if (rows.length === 0) return { count: 0 };
    return this.prisma.medicationDose.createMany({
      data: rows.map((r) => ({
        medicationId,
        doseNumber: r.doseNumber,
        scheduledAt: r.scheduledAt,
        status: r.status ?? 'scheduled',
        dose: r.dose ?? null,
        route: r.route ?? null,
      })),
      skipDuplicates: true,
    });
  }

  async administerDose(
    doseId: string,
    userId: string,
    data: { administeredAt?: Date; site?: string; notes?: string },
  ) {
    return this.prisma.medicationDose.update({
      where: { id: doseId },
      data: {
        status: 'administered',
        administeredAt: data.administeredAt ?? new Date(),
        administeredById: userId,
        site: data.site ?? undefined,
        notes: data.notes ?? undefined,
      },
      include: this.doseInclude(),
    });
  }

  async recordDoseVariance(
    doseId: string,
    userId: string,
    data: { status: DoseStatus; reason?: string; notes?: string },
  ) {
    return this.prisma.medicationDose.update({
      where: { id: doseId },
      data: {
        status: data.status,
        varianceReason: data.reason ?? null,
        notes: data.notes ?? undefined,
        administeredById: userId,
      },
      include: this.doseInclude(),
    });
  }

  async markOverdueAsDue(now: Date = new Date()) {
    return this.prisma.medicationDose.updateMany({
      where: { status: 'scheduled', scheduledAt: { lte: now } },
      data: { status: 'due' },
    });
  }

  async discontinueRemainingDoses(medicationId: string) {
    return this.prisma.medicationDose.updateMany({
      where: { medicationId, status: { in: ['scheduled', 'due', 'late'] } },
      data: { status: 'discontinued' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // NURSING NOTES
  // ═══════════════════════════════════════════════════════════

  private noteInclude() {
    return {
      createdBy: { select: { id: true, fullName: true, role: true } },
      attendance: { select: { id: true, attendanceNumber: true } },
      admission: { select: { id: true, admissionNumber: true } },
    };
  }

// src/modules/nursing/NursingRepository.ts
async findNotes(filters: NursingNoteFilters) {
  const {
    patientId, attendanceId, admissionId,
    shift, noteType, isFlagged, fromDate, toDate, search,
    page = 1, limit = 100,
  } = filters;

  const where: any = {};
  if (patientId) where.patientId = patientId;
  if (attendanceId) where.attendanceId = attendanceId;
  if (admissionId) where.admissionId = admissionId;
  if (shift) where.shift = shift;
  if (noteType) where.noteType = noteType;
  if (isFlagged !== undefined) where.isFlagged = isFlagged;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }
  if (search) where.content = { contains: search, mode: 'insensitive' };

  const safeLimit = Math.min(limit, 200);
  const skip = (page - 1) * safeLimit;

  const [notes, total] = await Promise.all([
    this.prisma.nursingNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.noteInclude(),
      skip,
      take: safeLimit,
    }),
    this.prisma.nursingNote.count({ where }),
  ]);

  return { notes, total, page, limit: safeLimit };
}

  async findNoteById(id: string) {
    return this.prisma.nursingNote.findUnique({
      where: { id },
      include: this.noteInclude(),
    });
  }

  async createNote(data: any) {
    return this.prisma.nursingNote.create({
      data,
      include: this.noteInclude(),
    });
  }

  async updateNote(id: string, data: any) {
    return this.prisma.nursingNote.update({
      where: { id },
      data: { ...data, editedAt: new Date() },
      include: this.noteInclude(),
    });
  }

  async deleteNote(id: string) {
    return this.prisma.nursingNote.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════
  // NURSING TASKS
  // ═══════════════════════════════════════════════════════════

  private taskInclude() {
    return {
      createdBy: { select: { id: true, fullName: true } },
      completedBy: { select: { id: true, fullName: true } },
    };
  }

// src/modules/nursing/NursingRepository.ts
async findTasks(filters: NursingTaskFilters) {
  const {
    patientId, attendanceId, admissionId,
    status, priority, taskType, fromDate, toDate,
    page = 1, limit = 200,
  } = filters;

  const where: any = {};
  if (patientId) where.patientId = patientId;
  if (attendanceId) where.attendanceId = attendanceId;
  if (admissionId) where.admissionId = admissionId;
  if (status) where.status = Array.isArray(status) ? { in: status } : status;
  if (priority) where.priority = priority;
  if (taskType) where.taskType = taskType;
  if (fromDate || toDate) {
    where.scheduledAt = {};
    if (fromDate) where.scheduledAt.gte = fromDate;
    if (toDate) where.scheduledAt.lte = toDate;
  }

  const safeLimit = Math.min(limit, 200);
  const skip = (page - 1) * safeLimit;

  const [tasks, total] = await Promise.all([
    this.prisma.nursingTask.findMany({
      where,
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { scheduledAt: 'asc' }, { createdAt: 'desc' }],
      include: this.taskInclude(),
      skip,
      take: safeLimit,
    }),
    this.prisma.nursingTask.count({ where }),
  ]);

  return { tasks, total, page, limit: safeLimit };
}

  async findTaskById(id: string) {
    return this.prisma.nursingTask.findUnique({
      where: { id },
      include: this.taskInclude(),
    });
  }

  async createTask(data: any) {
    return this.prisma.nursingTask.create({
      data,
      include: this.taskInclude(),
    });
  }

  async updateTask(id: string, data: any) {
    return this.prisma.nursingTask.update({
      where: { id },
      data,
      include: this.taskInclude(),
    });
  }

  async deleteTask(id: string) {
    return this.prisma.nursingTask.delete({ where: { id } });
  }
}