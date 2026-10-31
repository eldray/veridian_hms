// src/seed/testSeed/maternity.ts
//
// The three rooms that run on their own record types: the antenatal clinic, the labour
// ward and the postnatal ward.
//
// These are the tables the rest of the system points *into* - the delivery report, the FP
// returns, the ANC register and the maternal mortality audit all read them - so every row
// here hangs off an encounter the encounter writer really created. An ANC review is the one
// exception: ANCVisit.attendanceId is unique, so each review is its own visit and needs its
// own attendance row. Those numbers continue the visit block the generator already used, the
// same way the live counter would, and stop before they collide with anything real.

import { Prisma } from '@prisma/client';
import { padNumber, VISIT_NUMBER_CEILING } from '../bulkGenerator.js';
import { ENUMS, type Lookups } from './lookups.js';
import { nhisCCCFor, type EncounterIndex } from './encounters.js';
import { corporateEnrolmentFor, type PatientRecords } from './patients.js';
import { addDays, chunk, hashOf, pickEnum, prisma, writeMany, type SeedStats } from './shared.js';

export interface GeneratedAntenatalBooking {
  bookingKey: string;
  attendanceKey: string;
  folderNumber: string;
  bookingDate: Date;
  lmp: Date;
  edd: Date;
  gravida: number;
  para: number;
  gestationalAgeWeeks: number;
  riskLevel: string;
  bloodGroup: string;
  hivStatus: string;
  hbLevel: number;
  isActive: boolean;
}

export interface GeneratedAncVisit {
  bookingKey: string;
  visitNumber: number;
  visitDate: Date;
  gestationalAgeWeeks: number;
  weight: number;
  bloodPressure: string;
  fundalHeight: number;
  fetalHeartRate: number;
  riskLevel: string;
}

export interface GeneratedDeliveryRecord {
  deliveryKey: string;
  attendanceKey: string;
  folderNumber: string;
  deliveryDate: Date;
  deliveryType: string;
  deliveryOutcome: string;
  placeOfDelivery: string;
  attendant: string;
  gestationWeeks: number;
  birthWeight: number;
  apgarScore1min: number;
  apgarScore5min: number;
  maternalOutcome: string;
  complications: string[];
  malePartnerPresentANC: boolean;
  malePartnerPresentDelivery: boolean;
  malePartnerPresentPNC: boolean;
  maternalDeathsAudited: boolean;
}

export interface GeneratedNewbornRecord {
  deliveryKey: string;
  order: number;
  birthWeight: number;
  gender: string;
  apgarScore1min: number;
  apgarScore5min: number;
  outcome: string;
  anomalies: string[];
  breastfeedingWithin30Min: boolean;
  eyeProphylaxisGiven: boolean;
  cordCareMethod: string;
}

export interface GeneratedPostnatalRecord {
  attendanceKey: string;
  folderNumber: string;
  examinationDate: Date;
  dayNumber: number;
  maternalCondition: string;
  maternalComplications: string[];
  maternalDangerSigns: string[];
  babyDangerSigns: string[];
  breastfeedingStatus: string;
  babyCondition: string;
  lochia: string;
  perinealCondition: string;
  latching: string;
  jaundice: boolean;
  cordCondition: string;
  bcgGiven: boolean;
  opv0Given: boolean;
  hepB0Given: boolean;
  familyPlanningDiscussed: boolean;
  malePartnerPresentPNC: boolean;
}

/** A booking, kept so the labour ward can attach the delivery it led to. */
export interface BookingRef {
  bookingId: string;
  patientId: string;
  attendanceId: string;
  edd: Date | null;
  /** Set once a delivery from this pregnancy is written. */
  deliveryId: string | null;
}

export interface AntenatalIndex {
  byKey: Map<string, BookingRef>;
  byPatient: Map<string, BookingRef[]>;
}

/**
 * The booking - the first antenatal contact, and the record every later ANC visit,
 * delivery and postnatal review is filed under.
 */
export const seedAntenatalBookings = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  bookings: GeneratedAntenatalBooking[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<AntenatalIndex> => {
  const rows: Prisma.AntenatalBookingCreateManyInput[] = [];
  /** The plan each row was written from, so the read-back can be re-keyed off real dates. */
  const rowPlans: GeneratedAntenatalBooking[] = [];

  for (const plan of bookings) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter || !encounter.patientId || encounter.plan.status === 'cancelled') continue;
    const midwifeId = lookups.actorId({ role: 'midwife', salt: hashOf(plan.bookingKey) });
    rowPlans.push(plan);
    rows.push({
      patientId: encounter.patientId,
      attendanceId: encounter.attendanceId,
      bookingDate: plan.bookingDate,
      lmp: plan.lmp,
      edd: plan.edd,
      gestationalAgeWeeks: plan.gestationalAgeWeeks,
      gestationalAgeAtBooking: plan.gestationalAgeWeeks,
      gravida: plan.gravida,
      para: plan.para,
      bloodGroup: plan.bloodGroup,
      hivStatus: plan.hivStatus,
      hivKnownPositive: plan.hivStatus === 'Positive',
      partnerHivStatus: 'Not tested',
      hbLevel: plan.hbLevel,
      hbBooking: plan.hbLevel,
      riskLevel: pickEnum(ENUMS.antenatalRisk, plan.riskLevel) ?? ENUMS.antenatalRisk.low,
      riskFactors: plan.riskLevel === 'high' ? ['High-risk pregnancy flagged at booking'] : [],
      iptpDoses: {},
      ttDoses: {},
      isActive: plan.isActive,
      isCompleted: !plan.isActive,
      createdById: midwifeId,
      createdAt: plan.bookingDate,
      updatedAt: plan.bookingDate,
    });
  }

  const written = await writeMany('antenatal bookings', (part) => prisma.antenatalBooking.createMany({ data: part }), rows, stats, planned);

  // createMany does not hand ids back, and the booking is the row the rest of maternity
  // points at, so each one is read back through the unique attendance it was made on.
  const attendanceIds = rows.map((row) => row.attendanceId);
  const idByAttendance = new Map<string, string>();
  for (const part of chunk(attendanceIds, 1000)) {
    const found = await prisma.antenatalBooking.findMany({
      where: { attendanceId: { in: part } },
      select: { id: true, attendanceId: true },
    });
    for (const entry of found) idByAttendance.set(entry.attendanceId, entry.id);
  }

  const index: AntenatalIndex = { byKey: new Map(), byPatient: new Map() };
  for (const [position, row] of rows.entries()) {
    const bookingId = idByAttendance.get(row.attendanceId);
    if (!bookingId) continue;
    const plan = rowPlans[position];
    const ref: BookingRef = {
      bookingId,
      patientId: row.patientId,
      attendanceId: row.attendanceId,
      edd: plan.edd,
      deliveryId: null,
    };
    index.byKey.set(plan.bookingKey, ref);
    const list = index.byPatient.get(row.patientId) ?? [];
    list.push(ref);
    index.byPatient.set(row.patientId, list);
  }
  console.log(`✅ ${written}/${bookings.length} antenatal bookings`);
  return index;
};

/**
 * The routine reviews that follow a booking.
 *
 * Each one mints its own attendance in the number block after the generator's, which is
 * what the live counter does when a visit is registered, and carries the payer the mother
 * was seen under so the visit reads the same way in the billing screens as any other.
 */
export const seedAncVisits = async (
  lookups: Lookups,
  patients: PatientRecords,
  encounters: Map<string, EncounterIndex>,
  antenatal: AntenatalIndex,
  visits: GeneratedAncVisit[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const bookingEncounter = new Map<string, EncounterIndex>();
  for (const encounter of encounters.values()) bookingEncounter.set(encounter.attendanceId, encounter);

  // A review is an encounter of its own, and attendanceNumber is unique, so the mint starts
  // above every number the generator can hand out rather than at the size of one loop.
  let attendanceCounter = VISIT_NUMBER_CEILING;
  const attachable = visits.filter((visit) => antenatal.byKey.has(visit.bookingKey));
  planned['anc visits'] = (planned['anc visits'] ?? 0) + attachable.length;

  const visitAttendances: Prisma.AttendanceCreateManyInput[] = [];
  const keyed: Array<{ visit: GeneratedAncVisit; ref: BookingRef; attendanceNumber: string }> = [];

  for (const visit of attachable) {
    const ref = antenatal.byKey.get(visit.bookingKey)!;
    const from = bookingEncounter.get(ref.attendanceId);
    if (!from) continue;
    const folderNumber = from.plan.folderNumber;
    const payerRow = folderNumber ? patients.rowByFolder.get(folderNumber) : undefined;
    const corporate = folderNumber && from.plan.paymentMode === 'corporate'
      ? corporateEnrolmentFor(lookups, folderNumber)
      : null;
    const attendanceNumber = padNumber(++attendanceCounter);
    keyed.push({ visit, ref, attendanceNumber });
    visitAttendances.push({
      attendanceNumber,
      patientId: ref.patientId,
      insuranceProviderId: payerRow?.insuranceProviderId ?? undefined,
      corporateAccountId: corporate?.accountId ?? undefined,
      corporateEmployeeId: corporate?.employeeId ?? undefined,
      attendanceType: ENUMS.attendanceType.antenatal,
      dateTime: visit.visitDate,
      paymentMode: from.plan.paymentMode,
      nhisCCC: from.plan.paymentMode === 'nhis' ? nhisCCCFor(attendanceNumber) : undefined,
      status: ENUMS.attendanceStatus.completed,
      encounterCategory: ENUMS.encounterCategory.opd,
      visitCategory: ENUMS.visitCategory.general,
      serviceCategory: ENUMS.serviceCategory.opd,
      complaints: `Routine antenatal review ${visit.visitNumber}.`,
      assessment: `Continuation of antenatal care at ${visit.gestationalAgeWeeks} weeks.`,
      clinicalOutcome: 'improved',
      createdById: lookups.actorId({ role: 'midwife', salt: visit.visitNumber }),
    });
  }

  const attendanceWritten = await writeMany(
    'anc visit encounters', (part) => prisma.attendance.createMany({ data: part }), visitAttendances, stats, planned,
  );

  const idByNumber = new Map<string, string>();
  for (const part of chunk(keyed.map((entry) => entry.attendanceNumber), 1000)) {
    const found = await prisma.attendance.findMany({
      where: { attendanceNumber: { in: part } },
      select: { id: true, attendanceNumber: true },
    });
    for (const entry of found) idByNumber.set(entry.attendanceNumber, entry.id);
  }

  const rows: Prisma.ANCVisitCreateManyInput[] = [];
  const latestVisit = new Map<string, { attendanceId: string; visitDate: Date }>();
  for (const entry of keyed) {
    const attendanceId = idByNumber.get(entry.attendanceNumber);
    if (!attendanceId) continue;
    rows.push({
      bookingId: entry.ref.bookingId,
      attendanceId,
      visitNumber: entry.visit.visitNumber,
      visitDate: entry.visit.visitDate,
      gestationalAgeWeeks: entry.visit.gestationalAgeWeeks,
      weight: entry.visit.weight,
      bloodPressure: entry.visit.bloodPressure,
      fundalHeight: entry.visit.fundalHeight,
      fetalHeartRate: entry.visit.fetalHeartRate,
      // Nothing in the plan reports a danger sign, so the list is empty rather than invented.
      dangerSignsList: [],
      nextVisitDate: addDays(entry.visit.visitDate, 28),
      returnInstructions: 'Return immediately for bleeding, severe headache, blurred vision, fever, swelling or reduced fetal movement.',
      recordedById: lookups.actorId({ role: 'midwife', salt: entry.visit.visitNumber }),
      createdAt: entry.visit.visitDate,
      updatedAt: entry.visit.visitDate,
    });
    const current = latestVisit.get(entry.ref.bookingId);
    if (!current || entry.visit.visitDate > current.visitDate) {
      latestVisit.set(entry.ref.bookingId, { attendanceId, visitDate: entry.visit.visitDate });
    }
  }

  const written = await writeMany('anc visits', (part) => prisma.aNCVisit.createMany({ data: part }), rows, stats, planned);

  // The register opens on the most recent review, so a booking that has been followed up
  // points at that visit rather than at the booking encounter it started from.
  let current = 0;
  for (const [bookingId, visitAttendance] of latestVisit) {
    await prisma.antenatalBooking.update({
      where: { id: bookingId },
      data: { currentAttendanceId: visitAttendance.attendanceId },
    }).then(() => { current++; }).catch(() => { /* a booking that no longer exists is not a failure */ });
  }

  console.log(`✅ ${written}/${attachable.length} ANC visits over ${attendanceWritten} review encounters, ${current} bookings on their latest visit`);
};

/** A delivery, kept so the postnatal ward can file the review against the birth. */
export interface DeliveryRef {
  deliveryId: string;
  patientId: string;
  attendanceId: string;
  deliveryDate: Date;
}

export interface DeliveryIndex {
  idsByKey: Map<string, string>;
  datesByKey: Map<string, Date>;
  byPatient: Map<string, DeliveryRef[]>;
}

/**
 * The labour ward record, and the link back to the pregnancy that produced it.
 *
 * A booking and a delivery are joined by the due date: the birth has to fall within two
 * months of it and a booking only carries one delivery. The register screen and the maternal
 * outcome counts both read that link, so a delivery that matched gets its booking marked
 * finished.
 */
export const seedDeliveries = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  deliveries: GeneratedDeliveryRecord[],
  antenatal: AntenatalIndex,
  stats: SeedStats,
  planned: SeedStats,
): Promise<DeliveryIndex> => {
  const rows: Prisma.DeliveryRecordCreateManyInput[] = [];
  const rowPlans: GeneratedDeliveryRecord[] = [];

  for (const plan of deliveries) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter || !encounter.patientId || encounter.plan.status === 'cancelled') continue;
    const midwifeId = lookups.actorId({ role: 'midwife', salt: hashOf(plan.deliveryKey) });
    const deliveryOutcome = pickEnum(ENUMS.deliveryOutcome, plan.deliveryOutcome) ?? ENUMS.deliveryOutcome.live_birth;
    rowPlans.push(plan);
    rows.push({
      patientId: encounter.patientId,
      attendanceId: encounter.attendanceId,
      deliveryDate: plan.deliveryDate,
      deliveryType: pickEnum(ENUMS.deliveryType, plan.deliveryType) ?? ENUMS.deliveryType.spontaneous_vertex,
      deliveryOutcome,
      placeOfDelivery: pickEnum(ENUMS.placeOfDelivery, plan.placeOfDelivery) ?? ENUMS.placeOfDelivery.private_hospital,
      attendant: plan.attendant,
      birthWeight: plan.birthWeight,
      gestationWeeks: plan.gestationWeeks,
      apgarScore1min: plan.apgarScore1min,
      apgarScore5min: plan.apgarScore5min,
      maternalOutcome: pickEnum(ENUMS.maternalOutcome, plan.maternalOutcome) ?? ENUMS.maternalOutcome.alive,
      complications: plan.complications,
      malePartnerPresentANC: plan.malePartnerPresentANC,
      malePartnerPresentDelivery: plan.malePartnerPresentDelivery,
      malePartnerPresentPNC: plan.malePartnerPresentPNC,
      maternalDeathsAudited: plan.maternalDeathsAudited,
      auditNotes: plan.maternalDeathsAudited
        ? 'Maternal death reviewed at the facility audit; case notes and outcome recorded for the district review.'
        : undefined,
      createdById: midwifeId,
      createdAt: plan.deliveryDate,
      updatedAt: plan.deliveryDate,
    });
  }

  const written = await writeMany('delivery records', (part) => prisma.deliveryRecord.createMany({ data: part }), rows, stats, planned);

  const attendanceIds = rows.map((row) => row.attendanceId);
  const idByAttendance = new Map<string, string>();
  for (const part of chunk(attendanceIds, 1000)) {
    const found = await prisma.deliveryRecord.findMany({
      where: { attendanceId: { in: part } },
      select: { id: true, attendanceId: true },
    });
    for (const entry of found) idByAttendance.set(entry.attendanceId, entry.id);
  }

  const index: DeliveryIndex = { idsByKey: new Map(), datesByKey: new Map(), byPatient: new Map() };
  const outcomeByAttendance = new Map<string, string>();
  for (const [position, row] of rows.entries()) {
    const deliveryId = idByAttendance.get(row.attendanceId);
    if (!deliveryId) continue;
    const plan = rowPlans[position];
    index.idsByKey.set(plan.deliveryKey, deliveryId);
    index.datesByKey.set(plan.deliveryKey, plan.deliveryDate);
    outcomeByAttendance.set(row.attendanceId, row.deliveryOutcome);
    const ref: DeliveryRef = {
      deliveryId,
      patientId: row.patientId,
      attendanceId: row.attendanceId,
      deliveryDate: plan.deliveryDate,
    };
    const list = index.byPatient.get(row.patientId) ?? [];
    list.push(ref);
    index.byPatient.set(row.patientId, list);
  }

  let linked = 0;
  for (const [patientId, bookings] of antenatal.byPatient) {
    const births = index.byPatient.get(patientId);
    if (!births) continue;
    for (const booking of bookings) {
      if (booking.deliveryId || !booking.edd) continue;
      const birth = births.find((candidate) => !bookings.some((other) => other.deliveryId === candidate.deliveryId)
        && Math.abs(candidate.deliveryDate.getTime() - booking.edd!.getTime()) < 60 * 86_400_000);
      if (!birth) continue;
      booking.deliveryId = birth.deliveryId;
      linked++;
      await prisma.deliveryRecord.update({ where: { id: birth.deliveryId }, data: { antenatalBookingId: booking.bookingId } });
      await prisma.antenatalBooking.update({
        where: { id: booking.bookingId },
        data: {
          deliveryRecordId: birth.deliveryId,
          deliveryDate: birth.deliveryDate,
          deliveryOutcome: outcomeByAttendance.get(birth.attendanceId),
          isActive: false,
          isCompleted: true,
        },
      });
    }
  }

  console.log(`✅ ${written}/${deliveries.length} deliveries, ${linked} attached to their booking`);
  return index;
};

/** The baby, one row per birth, including the twins the labour ward delivered together. */
export const seedNewborns = async (
  deliveries: DeliveryIndex,
  newborns: GeneratedNewbornRecord[],
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const rows: Prisma.NewbornRecordCreateManyInput[] = [];

  for (const plan of newborns) {
    const deliveryRecordId = deliveries.idsByKey.get(plan.deliveryKey);
    const deliveryDate = deliveries.datesByKey.get(plan.deliveryKey);
    if (!deliveryRecordId || !deliveryDate) continue;
    const gender = pickEnum(ENUMS.gender, plan.gender);
    if (!gender) continue;
    rows.push({
      deliveryRecordId,
      order: plan.order,
      birthWeight: plan.birthWeight,
      gender,
      apgarScore1min: plan.apgarScore1min,
      apgarScore5min: plan.apgarScore5min,
      outcome: pickEnum(ENUMS.newbornOutcome, plan.outcome) ?? ENUMS.newbornOutcome.alive,
      anomalies: plan.anomalies,
      breastfeedingWithin30Min: plan.breastfeedingWithin30Min,
      eyeProphylaxisGiven: plan.eyeProphylaxisGiven,
      cordCareMethod: pickEnum(ENUMS.cordCareMethod, plan.cordCareMethod) ?? ENUMS.cordCareMethod.dry_cord,
      createdAt: deliveryDate,
    });
  }

  await writeMany('newborn records', (part) => prisma.newbornRecord.createMany({ data: part, skipDuplicates: true }), rows, stats, planned);
};

/**
 * The postnatal ward review, filed against the birth it follows when the mother delivered
 * here - which is what the maternal and newborn outcome reports count on.
 */
export const seedPostnatalRecords = async (
  lookups: Lookups,
  encounters: Map<string, EncounterIndex>,
  records: GeneratedPostnatalRecord[],
  deliveries: DeliveryIndex,
  antenatal: AntenatalIndex,
  stats: SeedStats,
  planned: SeedStats,
): Promise<void> => {
  const bookingIdByDelivery = new Map<string, string>();
  for (const bookings of antenatal.byPatient.values()) {
    for (const booking of bookings) {
      if (booking.deliveryId) bookingIdByDelivery.set(booking.deliveryId, booking.bookingId);
    }
  }

  const rows: Prisma.PostnatalRecordCreateManyInput[] = [];

  for (const plan of records) {
    const encounter = encounters.get(plan.attendanceKey);
    if (!encounter || !encounter.patientId || encounter.plan.status === 'cancelled') continue;

    const birth = (deliveries.byPatient.get(encounter.patientId) ?? [])
      .filter((ref) => ref.deliveryDate <= plan.examinationDate
        && ref.deliveryDate.getTime() > plan.examinationDate.getTime() - 60 * 86_400_000)
      .sort((a, b) => b.deliveryDate.getTime() - a.deliveryDate.getTime())[0];
    // Only a birth this facility attended is linked; a mother who delivered elsewhere is
    // still reviewed here, but the record has no delivery row to point at.
    const daysSinceBirth = birth
      ? Math.floor((plan.examinationDate.getTime() - birth.deliveryDate.getTime()) / 86_400_000)
      : null;
    const linkedDelivery = daysSinceBirth !== null && daysSinceBirth <= 42 ? birth : undefined;
    const linkedBooking = linkedDelivery ? bookingIdByDelivery.get(linkedDelivery.deliveryId) : undefined;
    const midwifeId = lookups.actorId({ role: 'midwife', salt: hashOf(plan.attendanceKey) });
    // The register points this check at the birth it found, so the day it reports is the
    // distance from that birth. The generator's guess is only used when nothing links -
    // a mother who delivered at another facility has no row here to be measured against.
    const dayNumber = linkedDelivery && daysSinceBirth !== null ? Math.max(1, daysSinceBirth) : plan.dayNumber;

    rows.push({
      patientId: encounter.patientId,
      attendanceId: encounter.attendanceId,
      antenatalBookingId: linkedBooking,
      deliveryRecordId: linkedDelivery?.deliveryId,
      examinationDate: plan.examinationDate,
      dayNumber,
      maternalCondition: plan.maternalCondition,
      maternalComplications: plan.maternalComplications,
      maternalDangerSigns: plan.maternalDangerSigns,
      babyDangerSigns: plan.babyDangerSigns,
      breastfeedingStatus: plan.breastfeedingStatus,
      breastfeedingDifficulties: plan.breastfeedingStatus === 'exclusive' ? [] : ['Mixed feeding reported'],
      latching: plan.latching,
      babyCondition: plan.babyCondition,
      jaundice: plan.jaundice,
      jaundiceSeverity: plan.jaundice ? 'mild' : undefined,
      lochia: plan.lochia,
      perinealCondition: plan.perinealCondition,
      cordCondition: plan.cordCondition,
      bcgGiven: plan.bcgGiven,
      opv0Given: plan.opv0Given,
      hepB0Given: plan.hepB0Given,
      familyPlanningDiscussed: plan.familyPlanningDiscussed,
      malePartnerPresentPNC: plan.malePartnerPresentPNC,
      // The six-week visit closes the cycle; anything earlier is booked on towards it.
      nextVisitDate: dayNumber >= 42 ? undefined : addDays(plan.examinationDate, 42 - dayNumber),
      nextVisitType: dayNumber >= 42 ? undefined : 'postnatal',
      notes: `Postnatal day ${dayNumber}: mother ${plan.maternalCondition}, baby ${plan.babyCondition}, breastfeeding ${plan.breastfeedingStatus}.`,
      createdById: midwifeId,
      createdAt: plan.examinationDate,
      updatedAt: plan.examinationDate,
    });
  }

  await writeMany('postnatal records', (part) => prisma.postnatalRecord.createMany({ data: part }), rows, stats, planned);
};
