// src/seed/testSeed.ts
//
// The demo dataset. This file only decides the order the tables are written in; every
// stage lives in ./testSeed/<area>.ts, resolves the codes, usernames and slots the
// generator named against the rows coreSeed actually installed, and drops a reference it
// cannot resolve instead of inventing an id.
//
// Two ordering rules are load-bearing:
//   - clinical sub-events hang off the encounter ids, so encounters are written first and
//     every later writer is handed the same index;
//   - stock is one run. Dispensing takes units out and a receipt puts them back, so every
//     document that moves stock shares one in-memory ledger, and the ledger reaches the
//     database once, at the end, through flushStockLedger.
import { AttendanceStatus, EmploymentType, Seniority, UserRole } from '@prisma/client';
import {
  COUNTS,
  FOLDER_NUMBER_BLOCK,
  generateAppointments,
  generateAttendances,
  generateAuditLogs,
  generateCommunicationLogs,
  generateDepartments,
  generateFamilyPlanning,
  generateGhsSubmissions,
  generateLeaveRequests,
  generateMalariaStock,
  generateNotifications,
  generatePatients,
  generatePayroll,
  generatePurchaseInvoices,
  generateRequisitions,
  generateStaffDocuments,
  generateStockTransfers,
  generateShifts,
  generateUsers,
  padNumber,
  setSeed,
  type GeneratedBundle,
  type GeneratedUser,
} from './bulkGenerator.js';
import { upsertRbac } from './rbac.js';
import { backfillHistoricalPricing, seedBills } from './testSeed/billing.js';
import { seedClaims, seedEligibilityChecks, seedPreAuthorisations } from './testSeed/claims.js';
import { seedLabs, seedScans } from './testSeed/diagnostics.js';
import { seedCounterClients, seedEncounters, seedReferrals } from './testSeed/encounters.js';
import { seedEstimates, seedPurchaseInvoices } from './testSeed/finance.js';
import { seedAdmissions, seedNursingDocumentation, seedWardCharges } from './testSeed/inpatient.js';
import { flushStockLedger, seedRequisitions, seedStockTransfers } from './testSeed/inventory.js';
import { buildLookups, type Lookups } from './testSeed/lookups.js';
import {
  seedAncVisits, seedAntenatalBookings, seedDeliveries, seedNewborns, seedPostnatalRecords,
  type GeneratedAntenatalBooking, type GeneratedAncVisit, type GeneratedDeliveryRecord,
  type GeneratedNewbornRecord, type GeneratedPostnatalRecord,
} from './testSeed/maternity.js';
import { seedMedications } from './testSeed/medications.js';
import {
  auditEntityCounts, seedAppointments, seedAuditLogs, seedCommunications, seedFamilyPlanning,
  seedGhsSubmissions, seedMalariaStock, seedNotifications,
  type GeneratedAppointmentPlan, type GeneratedFamilyPlan,
} from './testSeed/operations.js';
import { seedPatients, type PatientRecords } from './testSeed/patients.js';
import { seedLeaveRequests, seedPayroll, seedShifts, seedStaffDocuments } from './testSeed/people.js';
import { seedProcedures } from './testSeed/procedures.js';
import { StockLedger } from './testSeed/stockLedger.js';
import { addDays, chunk, hashPassword, prisma, reportCounts, type SeedStats } from './testSeed/shared.js';

const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

const intBetween = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

// ═══════════════════════════════════════════════════════════
// Which rows belong to the demo
//
// The demo owns the folder numbers the generator was told to use, and every patient it writes
// carries a seedpat- id, so the dataset is reachable both ways. The marker is the one that cannot
// be confused: a real patient whose folder number the live counter happened to hand out first
// sits in the band but is not the demo's. Everything else this run writes is found either through
// those patients, through an id the run minted itself (seedmed-, seedreq-, seedbatch: and
// the rest) or through the users it created.
// ═══════════════════════════════════════════════════════════
const TEST_FOLDER_NUMBERS = Array.from({ length: COUNTS.patients }, (_, i) => padNumber(FOLDER_NUMBER_BLOCK + 1 + i));

const hasRealData = async (): Promise<boolean> => {
  const real = await prisma.patient.count({ where: { folderNumber: { notIn: TEST_FOLDER_NUMBERS } } });
  return real > 0;
};

/**
 * True when the database holds patients that are not this dataset's. The seed entrypoint asks
 * the same question, so a database containing nothing but demo patients is allowed to be
 * rewritten instead of being treated as a live facility.
 */
export const hasNonDemoPatients = hasRealData;

const hasTestData = async (): Promise<boolean> => {
  const test = await prisma.patient.count({ where: { folderNumber: { in: TEST_FOLDER_NUMBERS.slice(0, 10) } } });
  return test >= 10;
};

/** The users this seed creates, read back by username; the cleanup finds its own rows with them. */
const seedUserIds = async (): Promise<string[]> => {
  const usernames = generateUsers().map((u) => u.username);
  const found = await prisma.user.findMany({ where: { username: { in: usernames } }, select: { id: true } });
  return found.map((u) => u.id);
};

// ═══════════════════════════════════════════════════════════
// RBAC — the role/permission matrix lives in ./rbac so the installed
// (coreSeed) and demo (this file) databases can never disagree about it.
// ═══════════════════════════════════════════════════════════
const seedTestRbac = async (usernameToRole: Record<string, string>) => {
  console.log('🔐 Seeding RBAC...');
  await upsertRbac(prisma, usernameToRole);
  console.log('✅ RBAC seeded');
};

// ═══════════════════════════════════════════════════════════
// Departments
// ═══════════════════════════════════════════════════════════
const ensureDepartments = async (): Promise<Map<string, string>> => {
  console.log('🏢 Ensuring departments...');
  const defs = generateDepartments();
  const map = new Map<string, string>();
  for (const d of defs) {
    const dept = await prisma.department.upsert({
      where: { name: d.name },
      update: { description: d.description, color: d.color, icon: d.icon, isStore: d.isStore },
      create: { name: d.name, description: d.description, color: d.color, icon: d.icon, isStore: d.isStore },
    });
    map.set(d.name, dept.id);
  }
  console.log(`✅ ${map.size} departments ready`);
  return map;
};

// ═══════════════════════════════════════════════════════════
// Users + StaffProfiles
// ═══════════════════════════════════════════════════════════
const seedTestUsers = async (deptMap: Map<string, string>): Promise<GeneratedUser[]> => {
  console.log('👥 Creating users...');
  const generated = generateUsers();

  for (const u of generated) {
    const departmentId = u.departmentName ? deptMap.get(u.departmentName) ?? null : null;
    await prisma.user.upsert({
      where: { username: u.username },
      create: {
        username: u.username,
        password: hashPassword(u.password),
        fullName: u.fullName,
        role: u.role as UserRole,
        seniority: u.seniority as Seniority,
        email: u.email,
        phone: u.phone,
        licenseNumber: u.licenseNumber,
        specialization: u.specialization,
        departmentId,
        isActive: true,
      },
      update: { role: u.role as UserRole, seniority: u.seniority as Seniority, departmentId, isActive: true },
    });
  }

  await seedTestRbac(Object.fromEntries(generated.map((u) => [u.username, u.roleName])));

  console.log('🧑‍💼 Creating staff profiles...');
  let created = 0;
  let skipped = 0;
  for (const u of generated) {
    const user = await prisma.user.findUnique({ where: { username: u.username }, select: { id: true, departmentId: true } });
    if (!user) continue;
    if (await prisma.staffProfile.findUnique({ where: { userId: user.id }, select: { id: true } })) {
      skipped++;
      continue;
    }

    const grade = await prisma.jobGrade.findUnique({ where: { code: u.jobGradeCode } }).catch(() => null);
    const step = grade ? await prisma.salaryStep.findFirst({ where: { gradeId: grade.id, stepNumber: u.salaryStepNumber } }) : null;

    const year = new Date().getFullYear();
    const prefix = `GHS-${year}-`;
    const last = await prisma.staffProfile.findFirst({
      where: { employeeId: { startsWith: prefix } },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });
    const lastNumber = last ? parseInt(last.employeeId.slice(prefix.length), 10) : 0;
    const employeeId = `${prefix}${String((isNaN(lastNumber) ? 0 : lastNumber) + 1).padStart(4, '0')}`;

    await prisma.staffProfile.create({
      data: {
        userId: user.id,
        employeeId,
        dateJoined: addDays(new Date(), -365 * intBetween(1, 8)),
        employmentType: EmploymentType.PERMANENT,
        departmentId: user.departmentId ?? null,
        jobGradeId: grade?.id ?? null,
        salaryStepId: step?.id ?? null,
      },
    });
    created++;
  }
  console.log(`✅ Staff profiles: ${created} created, ${skipped} existed`);
  return generated;
};

// ═══════════════════════════════════════════════════════════
// Delete test data
//
// Reaching every demo row from the folder numbers is what makes this safe on a mixed
// database. Nothing is wiped by table except the location balances, which neither coreSeed
// nor the live app had written before this dataset existed.
// ═══════════════════════════════════════════════════════════
export const deleteTestData = async (force: boolean = false) => {
  if (isProduction && !force) {
    return { success: false, message: 'Disabled in production', productionSafety: true };
  }
  console.log('🗑️  Deleting test data...');
  try {
    if (!force) {
      if (await hasRealData()) {
        return { success: false, message: 'Real data detected', realDataDetected: true };
      }
    }

    const testPatientIds = (await prisma.patient.findMany({
      where: { OR: [{ folderNumber: { in: TEST_FOLDER_NUMBERS } }, { id: { startsWith: 'seedpat-' } }] },
      select: { id: true },
    })).map((p) => p.id);
    // A walk-in ticket has no folder number, so it is found by the seed marker in its id. Its
    // encounters come from the same visit-number stream as the registered patients', which means
    // they have to leave with this dataset: the rows still holding those numbers would otherwise
    // block every encounter the next forced re-seed mints.
    const seededCounterClientIds = (await prisma.counterClient.findMany({
      where: { id: { startsWith: 'seedcc-' } }, select: { id: true },
    })).map((c) => c.id);
    if (testPatientIds.length === 0 && seededCounterClientIds.length === 0) {
      console.log('   No test data found');
      return { success: true, message: 'No test data to delete' };
    }

    const testAttendances = await prisma.attendance.findMany({
      where: {
        OR: [
          { patientId: { in: testPatientIds } },
          ...(seededCounterClientIds.length ? [{ counterClientId: { in: seededCounterClientIds } }] : []),
        ],
      },
      select: { id: true, bedId: true, wardId: true, counterClientId: true },
    });
    const testAttendanceIds = testAttendances.map((a) => a.id);
    const testCounterClientIds = [...new Set([
      ...testAttendances.map((a) => a.counterClientId),
      ...seededCounterClientIds,
    ].filter((id): id is string => Boolean(id)))];
    const testBedIds = [...new Set(testAttendances.map((a) => a.bedId).filter((id): id is string => Boolean(id)))];
    const testBeds = testBedIds.length
      ? await prisma.bed.findMany({ where: { id: { in: testBedIds } }, select: { id: true, wardId: true } })
      : [];
    const affectedWardIds = [...new Set([
      ...testAttendances.map((a) => a.wardId),
      ...testBeds.map((bed) => bed.wardId),
    ].filter((id): id is string => Boolean(id)))];

    const testBookingIds = (await prisma.antenatalBooking.findMany({ where: { patientId: { in: testPatientIds } }, select: { id: true } })).map((b) => b.id);
    const testDeliveryIds = (await prisma.deliveryRecord.findMany({ where: { patientId: { in: testPatientIds } }, select: { id: true } })).map((d) => d.id);
    const testClaimIds = (await prisma.insuranceClaim.findMany({ where: { patientId: { in: testPatientIds } }, select: { id: true } })).map((c) => c.id);
    const testRequisitionIds = (await prisma.requisition.findMany({ where: { id: { startsWith: 'seedreq-' } }, select: { id: true } })).map((r) => r.id);
    const testInvoiceIds = (await prisma.invoice.findMany({ where: { id: { startsWith: 'seedpinv-' } }, select: { id: true } })).map((i) => i.id);
    const testTransferNumbers = (await prisma.stockTransfer.findMany({
      where: { id: { startsWith: 'seedtr-' } }, select: { transferNumber: true },
    })).map((t) => t.transferNumber);
    const userIds = await seedUserIds();
    const staffIds = (await prisma.staffProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } })).map((s) => s.id);

    // ── Maternity ─────────────────────────────────────────
    // An ANC review is an attendance of its own and a booking points at its latest one, so
    // the bookings and deliveries leave before the visits that reference them.
    if (testDeliveryIds.length) {
      await prisma.newbornRecord.deleteMany({ where: { deliveryRecordId: { in: testDeliveryIds } } });
      await prisma.postnatalRecord.deleteMany({ where: { deliveryRecordId: { in: testDeliveryIds } } });
    }
    if (testBookingIds.length) {
      await prisma.aNCVisit.deleteMany({ where: { bookingId: { in: testBookingIds } } });
      await prisma.postnatalRecord.deleteMany({ where: { antenatalBookingId: { in: testBookingIds } } });
      await prisma.deliveryRecord.deleteMany({ where: { antenatalBookingId: { in: testBookingIds } } });
    }
    await prisma.antenatalBooking.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.deliveryRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.postnatalRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.abortionRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.familyPlanningService.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // ── Nursing and the medication administration chart ───
    await prisma.medicationDose.deleteMany({ where: { medication: { attendanceId: { in: testAttendanceIds } } } });
    await prisma.nursingNote.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.nursingTask.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // ── Money ─────────────────────────────────────────────
    await prisma.wardChargeRecord.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.patientWaiver.deleteMany({ where: { patientId: { in: testPatientIds } } });
    // A bill is scoped by its encounter, not its folder: a counter ticket has no folder, so
    // following the attendance is the only way to reach both kinds of bill.
    await prisma.billLineItem.deleteMany({ where: { bill: { attendanceId: { in: testAttendanceIds } } } });
    await prisma.payment.deleteMany({ where: { Bill: { attendanceId: { in: testAttendanceIds } } } });
    if (testClaimIds.length) {
      await prisma.insuranceClaimTrackingEvent.deleteMany({ where: { claimId: { in: testClaimIds } } });
      await prisma.insuranceClaimItem.deleteMany({ where: { claimId: { in: testClaimIds } } });
    }
    await prisma.insuranceClaim.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.claimBatch.deleteMany({ where: { id: { startsWith: 'seedcb-' } } });
    await prisma.preAuthorisationRequest.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.nHISEligibilityCheck.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.bill.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.proformaInvoiceItem.deleteMany({ where: { proformaInvoice: { patientId: { in: testPatientIds } } } });
    await prisma.proformaInvoice.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // ── Clinical ──────────────────────────────────────────
    await prisma.referralRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.admission.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.appointment.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.labTest.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.scan.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.procedure.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.medication.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.vitals.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.serviceRendered.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.attendanceDiagnosis.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });

    // ── The tabs filled at registration ───────────────────
    await prisma.patientAllergy.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.patientMedicalHistory.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.patientSurgicalHistory.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.patientFamilyHistory.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.patientConsent.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // ── Stock ─────────────────────────────────────────────
    // The movements go before the documents they name. A dispensing row is found through
    // the encounter it was issued against, a receipt or issue through its document id.
    const dispensingReferences = testAttendanceIds.map((id) => `Encounter ${id}`);
    for (const part of chunk(dispensingReferences, 500)) {
      await prisma.stockTransaction.deleteMany({ where: { reference: { in: part } } });
    }
    await prisma.stockTransaction.deleteMany({
      where: {
        OR: [
          { requisitionId: { in: testRequisitionIds } },
          { invoiceId: { in: testInvoiceIds } },
          ...(testTransferNumbers.length ? [{ reference: { in: testTransferNumbers } }] : []),
        ],
      },
    });
    await prisma.requisitionItem.deleteMany({ where: { requisitionId: { in: testRequisitionIds } } });
    await prisma.requisition.deleteMany({ where: { id: { startsWith: 'seedreq-' } } });
    await prisma.stockTransferItem.deleteMany({ where: { transfer: { id: { startsWith: 'seedtr-' } } } });
    await prisma.stockTransfer.deleteMany({ where: { id: { startsWith: 'seedtr-' } } });
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: testInvoiceIds } } });
    await prisma.invoice.deleteMany({ where: { id: { startsWith: 'seedpinv-' } } });
    await prisma.stockBatch.deleteMany({ where: { id: { startsWith: 'seedbatch:' } } });
    // coreSeed creates no balance rows, so every location row here is this dataset's. The
    // next run rebuilds them, and the opening lots and item totals come back from the data
    // files - which is why the balances are cleared rather than left to drift.
    await prisma.stockItemDepartmentBalance.deleteMany({});
    await prisma.servicePricing.deleteMany({ where: { id: { startsWith: 'seedprice-' } } });

    // ── People ────────────────────────────────────────────
    await prisma.payslipLineItem.deleteMany({ where: { payrollRecord: { staffId: { in: staffIds } } } });
    await prisma.payrollRecord.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.document.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.shift.deleteMany({ where: { staffId: { in: staffIds } } });
    await prisma.leaveRequest.deleteMany({ where: { staffId: { in: staffIds } } });

    // ── Operations ────────────────────────────────────────
    // Precise even on a database with other operators: a trail row, an inbox row or a
    // submitted return is only the demo's when a demo user wrote it.
    if (userIds.length) {
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { performedById: { in: userIds } } });
      await prisma.gHSReportSubmission.deleteMany({ where: { createdById: { in: userIds } } });
    }
    const channelIds = (await prisma.communicationChannel.findMany({
      where: { name: { in: ['SMS Gateway', 'WhatsApp Business', 'Email SMTP'] } },
      select: { id: true },
    })).map((c) => c.id);
    if (channelIds.length) {
      await prisma.communicationLog.deleteMany({ where: { channelId: { in: channelIds } } });
      await prisma.communicationTemplate.deleteMany({ where: { channelId: { in: channelIds } } });
      await prisma.communicationChannel.deleteMany({ where: { id: { in: channelIds } } });
    }
    const facility = await prisma.hospital.findFirst({ select: { id: true } });
    if (facility) await prisma.malariaCommodityStock.deleteMany({ where: { facilityId: facility.id } });

    // ── Root ──────────────────────────────────────────────
    await prisma.attendance.deleteMany({ where: { id: { in: testAttendanceIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
    if (testCounterClientIds.length) {
      await prisma.counterClient.deleteMany({ where: { id: { in: testCounterClientIds } } });
    }

    // Release test beds only when no other active encounter still references them.
    // This protects real patients if legacy data ever contains a shared bed assignment.
    for (const bed of testBeds) {
      const otherActive = await prisma.attendance.findFirst({
        where: { id: { notIn: testAttendanceIds }, bedId: bed.id, status: { in: [AttendanceStatus.pending, AttendanceStatus.admitted] } },
        select: { id: true },
      });
      if (!otherActive) await prisma.bed.updateMany({ where: { id: bed.id }, data: { isOccupied: false } });
    }
    // Recalculate from actual bed records instead of trusting a possibly stale counter.
    for (const wardId of affectedWardIds) {
      const occupiedBeds = await prisma.bed.count({ where: { wardId, isOccupied: true } });
      await prisma.ward.update({ where: { id: wardId }, data: { occupiedBeds } });
    }

    console.log('✅ Test data deleted');
    return { success: true, message: 'Test data deleted' };
  } catch (error: any) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════
// MAIN SEED
//
// The order below is the dependency graph, not a stylistic choice:
//   patients -> encounters -> everything that hangs off an encounter id -> the money that
//   prices those encounters -> the stock those encounters consumed -> the reports that
//   summarise all of it.
// The people and operations stages only need users and encounters, so they run last.
// ═══════════════════════════════════════════════════════════
export const seedTestData = async (force: boolean = false) => {
  if (!SEEDING_ENABLED) return { success: false, message: 'Seeding disabled', seedingDisabled: true };
  if (isProduction && !force) return { success: false, message: 'Disabled in production', productionSafety: true };

  console.log('🧪 Seeding test data...');
  const startedAt = Date.now();
  const stats: SeedStats = {};
  const planned: SeedStats = {};

  try {
    const testDataExists = await hasTestData();
    if (testDataExists && !force) {
      console.log('✅ Test data already exists. Skipping.');
      return { success: true, message: 'Test data exists', skipped: true };
    }
    if (testDataExists && force) {
      console.log('🗑️  Wiping existing test data...');
      await deleteTestData(true);
    }

    // One fixed stream, so the same demo is produced from the same code every run.
    setSeed(42);

    // ── Who the demo talks to ─────────────────────────────
    const deptMap = await ensureDepartments();
    const users = await seedTestUsers(deptMap);
    const lookups = await buildLookups();

    // Prices that were in force before this run, so a dated bill can be repriced.
    await backfillHistoricalPricing(stats, planned);

    // ── Patients ──────────────────────────────────────────
    const patientPlans = generatePatients();
    const patients = await seedPatients(lookups, patientPlans, stats, planned);

    // ── Encounters, and the clinical narrative inside them ─
    const bundle: GeneratedBundle = generateAttendances(patientPlans);
    const counterClientIds = await seedCounterClients(bundle.counterClients, stats, planned);
    const { byKey: encounters } = await seedEncounters(lookups, bundle, patients, counterClientIds, stats, planned);

    await seedLabs(lookups, encounters, stats, planned);
    await seedScans(lookups, encounters, stats, planned);
    await seedProcedures(lookups, encounters, stats, planned);
    await seedReferrals(lookups, encounters, bundle.referrals, stats, planned);

    // ── Everything that consumes or moves stock shares one ledger ─
    const stockCount = lookups.medicationStock.length + lookups.consumableStock.length;
    const ledger = new StockLedger(
      [...lookups.batchesByStockItem.values()].flat(),
      lookups.balances,
      [...lookups.medicationStock, ...lookups.consumableStock],
    );

    await seedMedications(lookups, ledger, encounters, stats, planned);
    await seedAdmissions(lookups, encounters, bundle.admissions, stats, planned);
    await seedWardCharges(lookups, encounters, bundle.wardCharges, stats, planned);
    await seedNursingDocumentation(lookups, encounters, bundle.nursingNotes, bundle.nursingTasks, stats, planned);

    // ── Maternity: a booking, its reviews, the birth, the newborn, the follow-up ──
    const antenatal = await seedAntenatalBookings(
      lookups, encounters, bundle.antenatalBookings as GeneratedAntenatalBooking[], stats, planned,
    );
    await seedAncVisits(
      lookups, patients, encounters, antenatal, bundle.ancVisits as GeneratedAncVisit[], stats, planned,
    );
    const deliveries = await seedDeliveries(
      lookups, encounters, bundle.deliveryRecords as GeneratedDeliveryRecord[], antenatal, stats, planned,
    );
    await seedNewborns(deliveries, bundle.newbornRecords as GeneratedNewbornRecord[], stats, planned);
    await seedPostnatalRecords(
      lookups, encounters, bundle.postnatalRecords as GeneratedPostnatalRecord[], deliveries, antenatal, stats, planned,
    );

    // ── Money: what was authorised, what it cost, what was paid, what was claimed ──
    await seedPreAuthorisations(lookups, encounters, bundle.preAuthorisations, stats, planned);
    await seedBills(lookups, encounters, bundle.bills, bundle.waivers, stats, planned);
    await seedClaims(lookups, encounters, bundle.claims, bundle.claimBatches, stats, planned);
    await seedEligibilityChecks(lookups, encounters, patients, bundle.eligibilityChecks, stats, planned);
    await seedEstimates(lookups, encounters, bundle.estimates, stats, planned);

    // ── Stock documents, then the one write-back the whole run has been accumulating ──
    await seedPurchaseInvoices(lookups, ledger, generatePurchaseInvoices(stockCount), stats, planned);
    await seedRequisitions(lookups, ledger, generateRequisitions(stockCount), stats, planned);
    await seedStockTransfers(lookups, ledger, generateStockTransfers(stockCount), stats, planned);
    await flushStockLedger(ledger, stats, planned);

    // ── Staff: rota, leave, pay and the documents in their file ──
    await seedShifts(lookups, generateShifts(users), stats, planned);
    await seedLeaveRequests(lookups, generateLeaveRequests(users), stats, planned);
    await seedPayroll(generatePayroll(users), stats, planned);
    await seedStaffDocuments(lookups, generateStaffDocuments(users), stats, planned);

    // ── Operations ──
    await seedAppointments(lookups, patients, encounters, generateAppointments(patientPlans, bundle), stats, planned);
    await seedFamilyPlanning(lookups, patients, encounters, generateFamilyPlanning(patientPlans) as GeneratedFamilyPlan[], stats, planned);
    await seedNotifications(lookups, generateNotifications(), stats, planned);
    await seedCommunications(generateCommunicationLogs(), stats, planned);
    await seedMalariaStock(lookups, generateMalariaStock(), stats, planned);
    // The trail is appended one row at a time through the application's chain writer, and it
    // names rows by id, so it goes last: only now is every table it points at full.
    await seedAuditLogs(lookups, generateAuditLogs(await auditEntityCounts()), stats, planned);
    // The returns summarise the encounters, claims and malaria card above them.
    await seedGhsSubmissions(lookups, generateGhsSubmissions(), stats, planned);

    reportCounts(stats, planned);

    const testPatientIds = [...patients.idByFolder.values()];
    const [totalPatients, totalAttendances, totalBills] = await Promise.all([
      prisma.patient.count({ where: { folderNumber: { in: TEST_FOLDER_NUMBERS } } }),
      prisma.attendance.count({ where: { patientId: { in: testPatientIds } } }),
      prisma.bill.count({ where: { patientId: { in: testPatientIds } } }),
    ]);

    console.log(`\n🎉 Test data seeded in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
    console.log(`   Patients:    ${totalPatients}`);
    console.log(`   Encounters:  ${totalAttendances}`);
    console.log(`   Bills:       ${totalBills}`);

    const logins = ['superadmin', 'admin', 'hr1', 'doctor1', 'nurse1', 'midwife1', 'lab1', 'sonographer1', 'pharma1', 'accounts1', 'records1'];
    console.log('\n👨‍⚕️  SAMPLE LOGINS (from the users this run created):');
    for (const username of logins) {
      const account = users.find((u) => u.username === username);
      console.log(account
        ? `   ${account.username} / ${account.password}  (${account.roleName})`
        : `   ${username} - not seeded by generateUsers()`);
    }

    return {
      success: true,
      message: 'Test data seeded',
      patients: totalPatients,
      attendances: totalAttendances,
      rowsWritten: Object.values(stats).reduce((sum, value) => sum + value, 0),
    };
  } catch (error: any) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════
// initializeDatabase
// ═══════════════════════════════════════════════════════════
export const initializeDatabase = async () => {
  console.log('🚀 Initializing database...');
  console.log(`📝 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`🌱 Seeding enabled: ${SEEDING_ENABLED}`);

  try {
    if (isProduction && process.env.RUN_SEED !== 'true') {
      console.log('🏭 Production: skipping auto-seed');
      return { initialized: true, seeded: false, reason: 'production' };
    }

    const testDataExists = await hasTestData();
    if (testDataExists) {
      console.log('✅ Test data already exists. Skipping seeding.');
      return { initialized: true, seeded: false, reason: 'already_exists' };
    }

    if (await hasRealData()) {
      console.log('🚨 Real data detected. Aborting test seed.');
      return { initialized: true, seeded: false, reason: 'real_data_detected' };
    }

    console.log('🔧 Seeding test data...');
    const result = await seedTestData(false);
    return { initialized: true, seeded: result.success, reason: result.success ? 'seeded' : 'seed_failed' };
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    return { initialized: false, seeded: false, error: error.message };
  }
};

export default { seedTestData, deleteTestData, initializeDatabase };
