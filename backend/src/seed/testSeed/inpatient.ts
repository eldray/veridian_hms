// src/seed/testSeed/inpatient.ts
//
// The ward: admissions onto real beds, the bed-day charges that follow them and the
// nursing documentation an inpatient stay produces.
//
// Ward charges are left unbilled on purpose. The billing step runs the application's own
// BillRepository afterwards, which picks these rows up, prices them and writes back the
// billLineItemId - so the ward ledger and the invoice can never disagree.
import { Prisma, ShiftType } from '@prisma/client';
import { NURSING_NOTE_TEMPLATES, NURSING_TASK_TEMPLATES, OBSERVATION_PHRASES } from '../clinicalContent.js';
import type { GeneratedAdmission, GeneratedNursingNote, GeneratedNursingTask, GeneratedWardCharge } from '../bulkGenerator.js';
import { ENUMS, type Lookups, type WardRow } from './lookups.js';
import type { EncounterIndex } from './encounters.js';
import { corporateEnrolmentFor } from './patients.js';
import { asCalendarDay, hashOf, money, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

let admissionCounter = 0;
const nextAdmissionId = () => `seedadm-${(++admissionCounter).toString().padStart(6, '0')}`;
let wardChargeCounter = 0;
const nextWardChargeId = () => `seedward-${(++wardChargeCounter).toString().padStart(8, '0')}`;
let noteCounter = 0;
const nextNoteId = () => `seednote-${(++noteCounter).toString().padStart(7, '0')}`;
let taskCounter = 0;
const nextTaskId = () => `seedtask-${(++taskCounter).toString().padStart(7, '0')}`;

const shiftForHour = (hour: number): ShiftType =>
  hour < 14 ? ShiftType.morning : hour < 22 ? ShiftType.afternoon : ShiftType.night;

const wardFor = (lookups: Lookups, hint: string): WardRow | null => {
  const pool = lookups.wardsByType.get(String(hint).toLowerCase()) ?? [];
  if (pool.length) return pool[hashOf(hint) % pool.length];
  const anyWard = [...lookups.wardById.values()];
  return anyWard.length ? anyWard[0] : null;
};

const groupByAttendance = <T extends { attendanceKey: string }>(rows: T[]): Map<string, T[]> => {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const list = out.get(row.attendanceKey) ?? [];
    list.push(row);
    out.set(row.attendanceKey, list);
  }
  return out;
};

export const seedAdmissions = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  admissions: GeneratedAdmission[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<Map<string, string>> => {
  const admissionIdByKey = new Map<string, string>();
  const rows: Prisma.AdmissionCreateManyInput[] = [];
  const bedAssignment: Array<{ attendanceId: string; wardId: string; bedId: string }> = [];
  const occupiedBedIds = new Set<string>();

  for (const plan of admissions) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter) continue;
    const ward = wardFor(lookups, plan.wardHint);
    if (!ward) continue;

    // A live stay needs a bed nobody else is in; a finished one can share the bed it
    // occupied in the past, so only active admissions consume the free-bed pool.
    let bed = null;
    if (plan.isActive && !plan.cancelled) {
      const pool = lookups.freeBedsByWard.get(ward.id) ?? [];
      bed = pool.find((candidate) => !occupiedBedIds.has(candidate.id)) ?? null;
      if (!bed) continue;
      occupiedBedIds.add(bed.id);
    } else {
      const pool = lookups.allBedsByWard.get(ward.id) ?? [];
      if (!pool.length) continue;
      bed = pool[hashOf(plan.admissionNumber) % pool.length];
    }

    const id = nextAdmissionId();
    rows.push({
      id,
      attendanceId: encounter.attendanceId,
      admissionNumber: plan.admissionNumber,
      admissionType: plan.admissionType,
      admissionSource: plan.admissionSource,
      status: plan.cancelled ? 'cancelled' : 'active',
      cancelledAt: plan.cancelled ? plan.admissionDate : undefined,
      cancelledById: plan.cancelled ? lookups.actorId({ role: 'doctor', salt: hashOf(id) % 97 }) : undefined,
      cancellationReason: plan.cancelled ? 'Admission cancelled before the bed was taken up.' : undefined,
      admissionDate: plan.admissionDate,
      dischargeDate: plan.dischargeDate ?? undefined,
      dischargeStatus: plan.dischargeStatus ?? undefined,
    });
    admissionIdByKey.set(plan.key, id);
    encounter.admissionId = id;
    encounter.wardId = ward.id;
    encounter.bedId = bed.id;
    bedAssignment.push({ attendanceId: encounter.attendanceId, wardId: ward.id, bedId: bed.id });
  }

  await writeMany('admissions', (part) => prisma.admission.createMany({ data: part }), rows, stats, planned);

  const wardIds = [...new Set(bedAssignment.map((b) => b.wardId))];
  for (const assignment of bedAssignment) {
    await prisma.attendance.update({
      where: { id: assignment.attendanceId },
      data: { wardId: assignment.wardId, bedId: assignment.bedId },
    });
  }

  for (const bedId of occupiedBedIds) {
    await prisma.bed.update({ where: { id: bedId }, data: { isOccupied: true } });
  }
  for (const wardId of wardIds) {
    const occupied = await prisma.bed.count({ where: { wardId, isOccupied: true } });
    await prisma.ward.update({ where: { id: wardId }, data: { occupiedBeds: occupied } });
  }

  console.log(`✅ ${admissionIdByKey.size} admissions, ${occupiedBedIds.size} beds occupied`);
  return admissionIdByKey;
};

export const seedWardCharges = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  charges: GeneratedWardCharge[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const byAttendance = groupByAttendance(charges);
  const rows: Prisma.WardChargeRecordCreateManyInput[] = [];

  for (const encounter of encounters.values()) {
    if (!encounter.wardId || !encounter.bedId || !encounter.patientId) continue;
    const ward = lookups.wardById.get(encounter.wardId);
    if (!ward) continue;
    const paymentMode = encounter.plan.paymentMode;
    const discount = paymentMode === 'corporate' && encounter.plan.folderNumber
      ? corporateEnrolmentFor(lookups, encounter.plan.folderNumber)?.discountPercentage ?? 0
      : 0;

    for (const charge of byAttendance.get(encounter.plan.key) ?? []) {
      const id = nextWardChargeId();
      rows.push({
        id,
        attendanceId: encounter.attendanceId,
        admissionId: encounter.admissionId ?? undefined,
        wardId: ward.id,
        bedId: encounter.bedId,
        chargeDate: asCalendarDay(charge.chargeDate),
        dailyRate: money(lookups.wardDailyRate(ward, paymentMode, discount)),
        paymentMode,
        // Every tariff is stored so the ward ledger shows what each payer would owe.
        cashPrice: money(lookups.wardDailyRate(ward, 'cash')),
        nhisPrice: money(lookups.wardDailyRate(ward, 'nhis')),
        insurancePrice: money(lookups.wardDailyRate(ward, 'private_insurance')),
        corporatePrice: money(lookups.wardDailyRate(ward, 'corporate', discount)),
        isBilled: false,
      });
      encounter.wardChargeIds.push(id);
    }
  }

  await writeMany('ward charges', (part) => prisma.wardChargeRecord.createMany({ data: part }), rows, stats, planned);
};

export const seedNursingDocumentation = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  notes: GeneratedNursingNote[],
  tasks: GeneratedNursingTask[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const notesByAttendance = groupByAttendance(notes);
  const tasksByAttendance = groupByAttendance(tasks);
  const noteRows: Prisma.NursingNoteCreateManyInput[] = [];
  const taskRows: Prisma.NursingTaskCreateManyInput[] = [];

  for (const encounter of encounters.values()) {
    if (!encounter.admissionId || !encounter.patientId) continue;
    const bedNumber = encounter.bedId ? `Bed ${(hashOf(encounter.bedId) % 24) + 1}` : 'the ward bay';
    const chartedDrug = encounter.medPlans.find((m) => m.status !== 'cancelled')?.dosage ?? 'regular medication';

    for (const plan of notesByAttendance.get(encounter.plan.key) ?? []) {
      const template = NURSING_NOTE_TEMPLATES[plan.templateIndex % NURSING_NOTE_TEMPLATES.length];
      const noteType = pickEnum(ENUMS.nursingNoteType, template.type) ?? ENUMS.nursingNoteType.general;
      const shift = pickEnum(ENUMS.shiftType, plan.shift) ?? shiftForHour(plan.at.getHours());
      noteRows.push({
        id: nextNoteId(),
        patientId: encounter.patientId,
        attendanceId: encounter.attendanceId,
        admissionId: encounter.admissionId,
        noteType,
        shift,
        content: template.content({
          bed: bedNumber,
          drug: chartedDrug,
          observation: OBSERVATION_PHRASES[hashOf(`${plan.attendanceKey}obs`) % OBSERVATION_PHRASES.length],
        }),
        isFlagged: plan.isFlagged || template.flagged,
        createdById: lookups.actorId(plan.author),
        createdAt: plan.at,
      });
    }

    for (const plan of tasksByAttendance.get(encounter.plan.key) ?? []) {
      const template = NURSING_TASK_TEMPLATES[plan.templateIndex % NURSING_TASK_TEMPLATES.length];
      taskRows.push({
        id: nextTaskId(),
        patientId: encounter.patientId,
        attendanceId: encounter.attendanceId,
        admissionId: encounter.admissionId,
        title: template.title,
        description: template.description,
        taskType: pickEnum(ENUMS.nursingTaskType, template.taskType) ?? ENUMS.nursingTaskType.general,
        priority: pickEnum(ENUMS.taskPriority, template.priority) ?? ENUMS.taskPriority.medium,
        status: plan.status,
        scheduledAt: plan.scheduledAt,
        completedAt: plan.completedAt ?? undefined,
        completedById: plan.completedAt ? lookups.actorId(plan.completer ?? plan.author) : undefined,
        notes: plan.notes ?? undefined,
        createdById: lookups.actorId(plan.author),
        createdAt: plan.scheduledAt,
      });
    }
  }

  await writeMany('nursing notes', (part) => prisma.nursingNote.createMany({ data: part }), noteRows, stats, planned);
  await writeMany('nursing tasks', (part) => prisma.nursingTask.createMany({ data: part }), taskRows, stats, planned);
};
