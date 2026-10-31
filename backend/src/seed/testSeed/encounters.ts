// src/seed/testSeed/encounters.ts
//
// The encounter itself: the counter ticket or the patient visit, the full clinical
// narrative a clinician would have typed, the vitals, the diagnosis list and the
// consultation that gets billed. Sub-event writers (labs, scans, medications,
// procedures, admissions) hang off the ids created here.
import type { AttendanceType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  GeneratedAttendance, GeneratedBundle, GeneratedCounterClient, GeneratedDiagnosisLink,
  GeneratedLab, GeneratedMedication, GeneratedProcedure, GeneratedReferral, GeneratedScan,
} from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import type { PatientRecords } from './patients.js';
import { corporateEnrolmentFor } from './patients.js';
import { addDays, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

/** One encounter plus the rows created for it, in the order the generator counted them. */
export interface EncounterIndex {
  plan: GeneratedAttendance;
  attendanceId: string;
  patientId: string | null;
  /** The consultation this encounter bills through, when it has one. */
  consultationServiceId: string | null;
  consultationCode: string | null;
  /** Set by the admissions writer once a bed is occupied. */
  wardId: string | null;
  bedId: string | null;
  admissionId: string | null;
  labPlans: GeneratedLab[];
  scanPlans: GeneratedScan[];
  medPlans: GeneratedMedication[];
  procPlans: GeneratedProcedure[];
  diagnosisPlans: GeneratedDiagnosisLink[];
  labIds: string[];
  scanIds: string[];
  medIds: string[];
  procIds: string[];
  wardChargeIds: string[];
  /** Set by the billing writer: the one bill the application generated for this visit. */
  billId: string | null;
  billNumber: string | null;
}

/** NHIS Claim Check Code: a 5-digit code derived from the visit number. */
export const nhisCCCFor = (attendanceNumber: string | number): string => {
  const digits = String(attendanceNumber).replace(/\D/g, '');
  const seed = digits ? parseInt(digits, 10) : 0;
  return String(10000 + (seed % 90000)).padStart(5, '0');
};

const groupBy = <T extends { attendanceKey: string }>(rows: T[]): Map<string, T[]> => {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const list = out.get(row.attendanceKey) ?? [];
    list.push(row);
    out.set(row.attendanceKey, list);
  }
  return out;
};

const CONSULT_FOR_VISIT: Record<string, string> = {
  emergency: 'CONS-EMERG',
  specialist: 'CONS-SPEC',
  general: 'CONS-GEN',
  inpatient: 'CONS-GEN',
};

export const seedCounterClients = async (
  counterClients: GeneratedCounterClient[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<Map<string, string>> => {
  const idByKey = new Map<string, string>();
  for (const client of counterClients) {
    try {
      // The id carries the seed marker because a counter ticket has no folder number: without
      // it the next forced re-seed could not find these rows, and the encounters still holding
      // their visit numbers would block the ones this run mints.
      const created = await prisma.counterClient.create({
        data: { id: `seedcc-${client.key}`, name: client.name, ageYears: client.ageYears, phone: client.phone, createdAt: client.createdAt },
        select: { id: true },
      });
      idByKey.set(client.key, created.id);
    } catch {
      /* a single rejected ticket must not stop the run */
    }
  }
  planned.counterClients = (planned.counterClients ?? 0) + counterClients.length;
  stats.counterClients = (stats.counterClients ?? 0) + idByKey.size;
  console.log(`✅ ${idByKey.size}/${counterClients.length} counter clients`);
  return idByKey;
};

export const seedEncounters = async (
  lookups: Lookups,
  bundle: GeneratedBundle,
  patients: PatientRecords,
  counterClientIds: Map<string, string>,
  stats: SeedStats,
  planned: SeedStats,
): Promise<{ byKey: Map<string, EncounterIndex> }> => {
  const labsByKey = groupBy(bundle.labs);
  const scansByKey = groupBy(bundle.scans);
  const medsByKey = groupBy(bundle.medications);
  const procsByKey = groupBy(bundle.procedures);
  const diagnosesByKey = groupBy(bundle.diagnoses);

  const rows: Prisma.AttendanceCreateManyInput[] = [];
  const rowContext: Array<{ att: GeneratedAttendance; patientId: string | null; consultationCode: string | null }> = [];

  for (const att of bundle.attendances) {
    const patientId = att.folderNumber ? patients.idByFolder.get(att.folderNumber) ?? null : null;
    const counterClientId = att.counterClientKey ? counterClientIds.get(att.counterClientKey) ?? null : null;
    // A ticket carries a counter client or a patient, never both and never neither.
    if (!patientId && !counterClientId) continue;

    const providerId = lookups.actorId(att.provider);
    const finalizerId = att.finalizedAt ? lookups.actorId(att.finalizer ?? att.provider) : null;
    const allergyReviewerId = att.allergyReviewedAt ? lookups.actorId(att.allergyReviewer ?? att.provider) : null;
    const corporate = patientId && att.folderNumber && att.paymentMode === 'corporate'
      ? corporateEnrolmentFor(lookups, att.folderNumber)
      : null;
    const insuranceProviderId = patientId
      ? patients.rowByFolder.get(att.folderNumber!)?.insuranceProviderId ?? null
      : null;
    const consultationCode = att.status === 'cancelled'
      ? null
      : CONSULT_FOR_VISIT[att.visitCategory] ?? lookups.consultationCodes.general;

    rows.push({
      attendanceNumber: att.attendanceNumber,
      patientId: patientId ?? undefined,
      counterClientId: counterClientId ?? undefined,
      insuranceProviderId: insuranceProviderId ?? undefined,
      corporateAccountId: corporate?.accountId ?? undefined,
      corporateEmployeeId: corporate?.employeeId ?? undefined,
      attendanceType: att.attendanceType as AttendanceType,
      dateTime: att.dateTime,
      paymentMode: att.paymentMode,
      // A claim is only generated from a covered visit, so the CCC has to be there.
      nhisCCC: att.paymentMode === 'nhis' ? nhisCCCFor(att.attendanceNumber) : undefined,
      status: att.status,
      encounterCategory: att.encounterCategory,
      visitCategory: att.visitCategory,
      serviceCategory: att.serviceCategory,
      patientClassification: att.patientClassification,
      diagnosisClassification: att.diagnosisClassification,
      complaints: att.complaints,
      historyPresentingComplaint: att.historyPresentingComplaint,
      reviewOfSystems: att.reviewOfSystems as Prisma.InputJsonValue,
      physicalExamination: att.physicalExamination,
      physicalExamStructured: att.physicalExamStructured as Prisma.InputJsonValue,
      assessment: att.assessment,
      treatmentPlan: att.treatmentPlan,
      clinicalOutcome: att.clinicalOutcome,
      medicalNotes: att.medicalNotes,
      clinicalNotes: att.clinicalNotes as Prisma.InputJsonValue,
      allergyReviewStatus: att.allergyReviewStatus,
      allergyReviewNotes: att.allergyReviewNotes ?? undefined,
      allergyReviewedAt: att.allergyReviewedAt ?? undefined,
      allergyReviewedById: allergyReviewerId ?? undefined,
      providerId,
      finalizedAt: att.finalizedAt ?? undefined,
      finalizedById: finalizerId ?? undefined,
      followUpDate: att.followUpDate ?? undefined,
      createdById: providerId,
    });
    rowContext.push({ att, patientId, consultationCode });
  }

  await writeMany('attendances', (part) => prisma.attendance.createMany({ data: part }), rows, stats, planned);

  // createMany does not return ids, so every encounter is read back by its unique number.
  const numbers = rowContext.map((c) => c.att.attendanceNumber);
  const readBack = new Map<string, string>();
  for (let i = 0; i < numbers.length; i += 2000) {
    const found = await prisma.attendance.findMany({
      where: { attendanceNumber: { in: numbers.slice(i, i + 2000) } },
      select: { id: true, attendanceNumber: true },
    });
    for (const entry of found) readBack.set(entry.attendanceNumber, entry.id);
  }

  const byKey = new Map<string, EncounterIndex>();
  for (const { att, patientId, consultationCode } of rowContext) {
    const attendanceId = readBack.get(att.attendanceNumber);
    if (!attendanceId) continue;
    byKey.set(att.key, {
      plan: att,
      attendanceId,
      patientId,
      consultationCode,
      consultationServiceId: consultationCode ? lookups.serviceByCode.get(consultationCode)?.id ?? null : null,
      wardId: null,
      bedId: null,
      admissionId: null,
      labPlans: labsByKey.get(att.key) ?? [],
      scanPlans: scansByKey.get(att.key) ?? [],
      medPlans: medsByKey.get(att.key) ?? [],
      procPlans: procsByKey.get(att.key) ?? [],
      diagnosisPlans: diagnosesByKey.get(att.key) ?? [],
      labIds: [], scanIds: [], medIds: [], procIds: [], wardChargeIds: [],
      billId: null, billNumber: null,
    });
  }
  console.log(`✅ ${byKey.size}/${bundle.attendances.length} encounters`);

  // ── Vitals ──────────────────────────────────────────────
  const vitalsRows: Prisma.VitalsCreateManyInput[] = [];
  for (const v of bundle.vitals) {
    const encounter = byKey.get(v.attendanceKey);
    if (!encounter) continue;
    const patientId = patients.idByFolder.get(v.folderNumber) ?? encounter.patientId;
    if (!patientId) continue;
    vitalsRows.push({
      attendanceId: encounter.attendanceId,
      patientId,
      bloodPressure: `${v.systolic}/${v.diastolic}`,
      temperature: v.temperature,
      pulse: v.pulse,
      respiration: v.respiration,
      spo2: v.spo2,
      weight: v.weight,
      height: v.height,
      bmi: v.bmi ?? undefined,
      muac: v.muac ?? undefined,
      // There is no pain column on Vitals; the score travels with the observation note.
      notes: `${v.notes} Pain score ${v.painScore}/10.`,
      recordedById: lookups.actorId(v.recorder),
      recordedAt: v.recordedAt,
    });
  }
  await writeMany('vitals', (part) => prisma.vitals.createMany({ data: part }), vitalsRows, stats, planned);

  // ── Diagnoses ───────────────────────────────────────────
  const dxRows: Prisma.AttendanceDiagnosisCreateManyInput[] = [];
  for (const encounter of byKey.values()) {
    for (const link of encounter.diagnosisPlans) {
      const diagnosis = lookups.diagnosisByIcd.get(link.icdCode);
      if (!diagnosis) continue;
      dxRows.push({
        attendanceId: encounter.attendanceId,
        diagnosisId: diagnosis.id,
        diagnosisType: link.diagnosisType,
        icdCode: link.icdCode,
        presentOnAdmission: link.presentOnAdmission,
        date: link.date,
        createdById: lookups.actorId(encounter.plan.provider),
      });
    }
  }
  await writeMany('diagnoses', (part) => prisma.attendanceDiagnosis.createMany({ data: part }), dxRows, stats, planned);

  // ── The consultation the encounter is billed for ────────
  const serviceRows: Prisma.ServiceRenderedCreateManyInput[] = [];
  for (const encounter of byKey.values()) {
    if (!encounter.consultationServiceId) continue;
    serviceRows.push({
      attendanceId: encounter.attendanceId,
      serviceItemId: encounter.consultationServiceId,
      quantity: 1,
      date: encounter.plan.dateTime,
      performedById: lookups.actorId(encounter.plan.provider),
      notes: `Consultation recorded during visit ${encounter.plan.attendanceNumber}.`,
    });
  }
  await writeMany('consultations', (part) => prisma.serviceRendered.createMany({ data: part }), serviceRows, stats, planned);

  return { byKey };
};

/**
 * The referral letter attached to an encounter.
 *
 * ReferralRecord.attendanceId is unique, so an encounter backs one letter; the app refuses a
 * second referral on a visit that already has one, and the seed follows that rule.
 * completedAt only ever exists on a letter that was closed, and it is dated after the
 * referral itself - the generator leaves it null, so it is filled from the status here.
 */
export const seedReferrals = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  referrals: GeneratedReferral[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.ReferralRecordCreateManyInput[] = [];
  const claimed = new Set<string>();

  for (const plan of referrals) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter || !encounter.patientId || encounter.plan.status === 'cancelled') continue;
    if (claimed.has(encounter.attendanceId)) continue;
    claimed.add(encounter.attendanceId);

    const status = pickEnum(ENUMS.referralStatus, plan.status) ?? ENUMS.referralStatus.pending;
    const closed = status === ENUMS.referralStatus.completed || status === ENUMS.referralStatus.cancelled;
    rows.push({
      referralNumber: plan.referralNumber,
      patientId: encounter.patientId,
      attendanceId: encounter.attendanceId,
      referralType: pickEnum(ENUMS.referralType, plan.referralType) ?? ENUMS.referralType.outgoing,
      referralReason: plan.referralReason,
      referralNotes: plan.referralNotes ?? undefined,
      urgency: pickEnum(ENUMS.priority, plan.urgency) ?? ENUMS.priority.routine,
      referredToFacility: plan.referredToFacility ?? undefined,
      referredToDoctor: plan.referredToDoctor ?? undefined,
      referredToDepartment: plan.referredToDepartment ?? undefined,
      referredFromFacility: plan.referredFromFacility ?? undefined,
      referredFromDoctor: plan.referredFromDoctor ?? undefined,
      referralDate: plan.referralDate,
      status,
      // A closed letter is answered a few days after it was written, never on the spot.
      outcomeNotes: closed ? plan.outcomeNotes ?? undefined : undefined,
      completedAt: closed ? addDays(plan.referralDate, 3) : undefined,
      structuredForm: plan.structuredForm as Prisma.InputJsonValue,
      createdById: lookups.actorId(plan.createdBy),
      createdAt: plan.referralDate,
    });
  }

  await writeMany('referrals', (part) => prisma.referralRecord.createMany({ data: part }), rows, stats, planned);
};
