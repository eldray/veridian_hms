// src/modules/nursing/NursingRepository.ts
import { Prisma, PrismaClient, DoseStatus, NursingTaskStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { appendAuditLogWithinTransaction } from '../../services/auditChain';
import {
  MarFilters,
  NursingNoteFilters,
  NursingTaskFilters,
} from './NursingTypes';

/** One id, or several as "id1,id2,id3": lets a screen load many patients in ONE request instead of one each. */
const idFilter = (value: string): string | { in: string[] } => {
  const ids = String(value).split(',').map((v) => v.trim()).filter(Boolean);
  return ids.length > 1 ? { in: ids.slice(0, 200) } : ids[0] ?? value;
};

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
      ...(attendanceId ? { attendanceId: idFilter(attendanceId) } : {}),
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
    data: { administeredAt?: Date; site?: string; notes?: string; administrationReason?: string; doseAmount?: Prisma.Decimal; doseUnit?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "MedicationDose" WHERE "id" = ${doseId} FOR UPDATE`;
      }
      const current = await tx.medicationDose.findUnique({
        where: { id: doseId },
        select: { id: true, status: true },
      });
      if (!current) throw new NotFoundError('Medication dose', doseId);

      const result = await tx.medicationDose.updateMany({
        where: {
          id: doseId,
          status: { in: ['scheduled', 'due', 'late'] },
          medication: {
            is: {
              status: { not: 'cancelled' },
              Attendance: { is: { status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] } } },
            },
          },
        },
        data: {
          status: 'administered',
          administeredAt: data.administeredAt ?? new Date(),
          administeredById: userId,
          site: data.site ?? undefined,
          notes: data.notes ?? undefined,
          administrationReason: data.administrationReason ?? undefined,
          doseAmount: data.doseAmount ?? undefined,
          doseUnit: data.doseUnit ?? undefined,
          recordedAt: new Date(),
        },
      });
      if (result.count !== 1) {
        throw new ConflictError('This dose is no longer awaiting administration or its encounter/prescription is closed');
      }
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'MedicationDose',
        entityId: doseId,
        action: 'update',
        performedById: userId,
        previousState: { status: current.status },
        newState: { status: 'administered' },
        metadata: {
          operation: 'mar_dose_administered',
          fromStatus: current.status,
          toStatus: 'administered',
          siteRecorded: Boolean(data.site),
          notesRecorded: Boolean(data.notes),
          clinicalContentOmitted: true,
        },
      });
      return tx.medicationDose.findUniqueOrThrow({
        where: { id: doseId },
        include: this.doseInclude(),
      });
    }, { timeout: 15000, maxWait: 5000 });
  }

  async administerPrnMedication(
    medicationId: string,
    userId: string,
    data: { doseAmount: number; doseUnit: string; reason: string; administeredAt?: Date },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Medication" WHERE "id" = ${medicationId} FOR UPDATE`;
      const medication = await tx.medication.findUnique({
        where: { id: medicationId },
        select: {
          id: true, name: true, status: true, attendanceId: true, frequencyCode: true,
          prnIndication: true, prnMaxDosesPerDay: true, prnMinimumIntervalHours: true,
          route: true, doseAmount: true, doseUnit: true,
          Attendance: { select: { status: true } },
        },
      });
      if (!medication) throw new NotFoundError('Medication', medicationId);
      if (medication.frequencyCode !== 'PRN') throw new ConflictError('Only a PRN prescription can use as-needed administration');
      if (!['dispensed', 'administered'].includes(medication.status)) {
        throw new ConflictError('PRN medication must be dispensed before it can be administered');
      }
      if (['discharged', 'referred', 'absconded', 'completed', 'cancelled'].includes(medication.Attendance.status)) {
        throw new ConflictError('Medication administration is not allowed for a closed encounter');
      }
      if (!Number.isFinite(data.doseAmount) || data.doseAmount <= 0 || !data.doseUnit.trim()) {
        throw new ValidationError('Enter a valid administered dose and unit');
      }
      if (medication.doseAmount != null) {
        const prescribedAmount = Number(medication.doseAmount);
        const prescribedUnit = String(medication.doseUnit ?? '').trim().toLowerCase();
        if (Math.abs(prescribedAmount - data.doseAmount) > 0.0001 ||
            (prescribedUnit && prescribedUnit !== data.doseUnit.trim().toLowerCase())) {
          throw new ValidationError('The administered PRN dose must match the prescribed amount and unit. A dose change requires a documented prescriber correction.');
        }
      }
      const administeredAt = data.administeredAt ?? new Date();
      const dayStart = new Date(administeredAt);
      dayStart.setHours(0, 0, 0, 0);
      const todayCount = await tx.medicationDose.count({
        where: { medicationId, status: 'administered', administeredAt: { gte: dayStart, lte: administeredAt } },
      });
      if (medication.prnMaxDosesPerDay != null && todayCount >= medication.prnMaxDosesPerDay) {
        throw new ConflictError(`The prescribed maximum of ${medication.prnMaxDosesPerDay} PRN doses for today has been reached`);
      }
      if (medication.prnMinimumIntervalHours != null) {
        const latest = await tx.medicationDose.findFirst({
          where: { medicationId, status: 'administered', administeredAt: { not: null } },
          orderBy: { administeredAt: 'desc' },
          select: { administeredAt: true },
        });
        if (latest?.administeredAt) {
          const elapsed = administeredAt.getTime() - latest.administeredAt.getTime();
          if (elapsed < medication.prnMinimumIntervalHours * 3_600_000) {
            throw new ConflictError(`Wait at least ${medication.prnMinimumIntervalHours} hours between PRN doses`);
          }
        }
      }
      const last = await tx.medicationDose.findFirst({
        where: { medicationId },
        orderBy: { doseNumber: 'desc' },
        select: { doseNumber: true },
      });
      const created = await tx.medicationDose.create({
        data: {
          medicationId,
          doseNumber: (last?.doseNumber ?? 0) + 1,
          scheduledAt: administeredAt,
          administeredAt,
          administeredById: userId,
          status: 'administered',
          dose: `${data.doseAmount} ${data.doseUnit}`,
          doseAmount: new Prisma.Decimal(data.doseAmount),
          doseUnit: data.doseUnit.trim(),
          route: medication.route,
          administrationReason: data.reason.trim(),
          recordedAt: new Date(),
        },
        include: this.doseInclude(),
      });
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'MedicationDose',
        entityId: created.id,
        action: 'create',
        performedById: userId,
        newState: { medicationId, status: 'administered', administeredAt },
        metadata: { operation: 'prn_medication_administered', reasonRecorded: true, clinicalContentOmitted: true },
      });
      return created;
    }, { timeout: 15000, maxWait: 5000 });
  }

  async recordDoseVariance(
    doseId: string,
    userId: string,
    data: { status: DoseStatus; reason?: string; notes?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (typeof tx.$queryRaw === 'function') {
        await tx.$queryRaw`SELECT "id" FROM "MedicationDose" WHERE "id" = ${doseId} FOR UPDATE`;
      }
      const current = await tx.medicationDose.findUnique({
        where: { id: doseId },
        select: { id: true, status: true },
      });
      if (!current) throw new NotFoundError('Medication dose', doseId);

      const result = await tx.medicationDose.updateMany({
        where: {
          id: doseId,
          status: { in: ['scheduled', 'due', 'late', 'missed', 'refused', 'held'] },
          medication: {
            is: {
              status: { not: 'cancelled' },
              Attendance: { is: { status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] } } },
            },
          },
        },
        data: {
          status: data.status,
          varianceReason: data.reason ?? null,
          notes: data.notes ?? undefined,
          administeredById: userId,
        },
      });
      if (result.count !== 1) {
        throw new ConflictError('This dose is no longer eligible for a variance or its encounter/prescription is closed');
      }
      await appendAuditLogWithinTransaction(tx, {
        entityType: 'MedicationDose',
        entityId: doseId,
        action: 'update',
        performedById: userId,
        previousState: { status: current.status },
        newState: { status: data.status },
        metadata: {
          operation: 'mar_dose_variance_recorded',
          fromStatus: current.status,
          toStatus: data.status,
          reasonProvided: Boolean(data.reason),
          notesProvided: Boolean(data.notes),
          clinicalContentOmitted: true,
        },
      });
      return tx.medicationDose.findUniqueOrThrow({
        where: { id: doseId },
        include: this.doseInclude(),
      });
    }, { timeout: 15000, maxWait: 5000 });
  }

  async markOverdueAsDue(now: Date = new Date()) {
    // Do not keep advancing the MAR for prescriptions or encounters that have closed.
    return this.prisma.medicationDose.updateMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: now },
        medication: {
          is: {
            status: { not: 'cancelled' },
            Attendance: { is: { status: { notIn: ['discharged', 'referred', 'absconded', 'completed', 'cancelled'] } } },
          },
        },
      },
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
  if (attendanceId) where.attendanceId = idFilter(attendanceId);
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
  if (attendanceId) where.attendanceId = idFilter(attendanceId);
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