// src/seed/testSeed.ts
import {
  PrismaClient,
  UserRole,
  Seniority,
  Gender,
  PaymentMode,
  AdmissionType,
  AdmissionSource,
  EncounterCategory,
  DischargeStatus,
  VisitCategory,
  BillStatus,
  ClaimStatus,
  AttendanceStatus,
  LabTestStatus,
  ProcedureStatus,
  ScanStatus,
  MedicationStatus,
  AttendanceType,
  PresentOnAdmission,
  DiagnosisType,
  ServiceCategory,
  Priority,
  ScanPriority,
  AppointmentStatus,
  AppointmentType,
  ReferralType,
  ReferralStatus,
  ServiceType,
  EmploymentType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  COUNTS,
  setSeed,
  generateDepartments,
  generateUsers,
  generatePatients,
  generateAttendances,
  generateAppointments,
  generateFamilyPlanning,
  generateNotifications,
} from './bulkGenerator.js';

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// ═══════════════════════════════════════════════════════════
// Monotonic counters
// ═══════════════════════════════════════════════════════════
let extraAttendanceCounter = 90000;
const nextExtraAttendanceNumber = () => `${++extraAttendanceCounter}`;

// ═══════════════════════════════════════════════════════════
// NHIS CCC — 5-digit Claim Check Code, deterministic per attendance
// ═══════════════════════════════════════════════════════════
const nhisCCCFor = (attendanceNumber: string | number): string => {
  const digits = String(attendanceNumber).replace(/\D/g, '');
  const seed = digits ? parseInt(digits, 10) : 0;
  return String(10000 + (seed % 90000)).padStart(5, '0');
};

// ═══════════════════════════════════════════════════════════
// RBAC
// ═══════════════════════════════════════════════════════════
const PERMISSION_DEFINITIONS: Array<[string, string]> = [
  ['hr.view', 'View staff profiles and HR records'],
  ['hr.manage', 'Create and update staff profiles'],
  ['users.manage', 'Manage system users and roles'],
  ['reports.view', 'View operational reports'],
  ['clinical.nursing', 'Use nursing workflows'],
  ['clinical.antenatal', 'Use antenatal workflows'],
  ['inventory.manage', 'Manage inventory and stock'],
];

const ROLE_DEFINITIONS = [
  { name: 'super_admin', description: 'System owner; user and role administration' },
  { name: 'hr_officer', description: 'Human resources and staff administration' },
  { name: 'nurse', description: 'Nursing clinical workflows' },
  { name: 'doctor', description: 'Medical clinical workflows' },
] as const;

const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  super_admin: PERMISSION_DEFINITIONS.map(([n]) => n),
  hr_officer: ['hr.view', 'hr.manage', 'reports.view'],
  nurse: ['clinical.nursing', 'clinical.antenatal'],
  doctor: ['reports.view', 'clinical.antenatal'],
};

const seedTestRbac = async (usernameToRole: Record<string, string>) => {
  console.log('🔐 Seeding RBAC...');

  const permissionIds = new Map<string, string>();
  for (const [name, description] of PERMISSION_DEFINITIONS) {
    const p = await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    permissionIds.set(name, p.id);
  }

  const roleIds = new Map<string, string>();
  for (const r of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    roleIds.set(role.name, role.id);
  }

  for (const [roleName, permissionNames] of Object.entries(ROLE_PERMISSION_MAP)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;
    for (const permissionName of permissionNames) {
      const permissionId = permissionIds.get(permissionName);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  for (const [username, roleName] of Object.entries(usernameToRole)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;
    const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: { connect: { id: roleId } } },
    });
  }

  console.log('✅ RBAC seeded');
};

// ═══════════════════════════════════════════════════════════
// Numbering + date helpers
// ═══════════════════════════════════════════════════════════
const daysAgo = (days: number, base: Date = new Date()) => {
  const d = new Date(base); d.setDate(d.getDate() - days); return d;
};
const daysFromNow = (days: number, base: Date = new Date()) => {
  const d = new Date(base); d.setDate(d.getDate() + days); return d;
};
const intBetween = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

// ═══════════════════════════════════════════════════════════
// Test data detection
// ═══════════════════════════════════════════════════════════
const TEST_FOLDER_NUMBERS = Array.from({ length: COUNTS.patients }, (_, i) => `${1001 + i}`);

const hasRealData = async (): Promise<boolean> => {
  const real = await prisma.patient.count({
    where: { folderNumber: { notIn: TEST_FOLDER_NUMBERS } },
  });
  return real > 0;
};

const hasTestData = async (): Promise<boolean> => {
  const test = await prisma.patient.count({
    where: { folderNumber: { in: TEST_FOLDER_NUMBERS.slice(0, 10) } },
  });
  return test >= 10;
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
const seedTestUsers = async (deptMap: Map<string, string>) => {
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
      update: {
        role: u.role as UserRole,
        seniority: u.seniority as Seniority,
        departmentId,
        isActive: true,
      },
    });
  }

  await seedTestRbac(Object.fromEntries(generated.map(u => [u.username, u.roleName])));

  console.log('🧑‍💼 Creating staff profiles...');
  let created = 0, skipped = 0;
  for (const u of generated) {
    const user = await prisma.user.findUnique({
      where: { username: u.username },
      select: { id: true, departmentId: true },
    });
    if (!user) continue;

    const existing = await prisma.staffProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (existing) { skipped++; continue; }

    const grade = await prisma.jobGrade.findUnique({ where: { code: u.jobGradeCode } }).catch(() => null);
    const step = grade
      ? await prisma.salaryStep.findFirst({ where: { gradeId: grade.id, stepNumber: u.salaryStepNumber } })
      : null;

    const year = new Date().getFullYear();
    const prefix = `GHS-${year}-`;
    const last = await prisma.staffProfile.findFirst({
      where: { employeeId: { startsWith: prefix } },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });
    const lastNumber = last ? parseInt(last.employeeId.slice(prefix.length), 10) : 0;
    const nextNumber = (isNaN(lastNumber) ? 0 : lastNumber) + 1;
    const employeeId = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    await prisma.staffProfile.create({
      data: {
        userId: user.id,
        employeeId,
        dateJoined: daysAgo(365 * intBetween(1, 8)),
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
// ═══════════════════════════════════════════════════════════
export const deleteTestData = async (force: boolean = false) => {
  if (isProduction && !force) {
    return { success: false, message: 'Disabled in production', productionSafety: true };
  }
  console.log('🗑️  Deleting test data...');
  try {
    if (!force) {
      const realDataExists = await hasRealData();
      if (realDataExists) {
        return { success: false, message: 'Real data detected', realDataDetected: true };
      }
    }

    const testPatients = await prisma.patient.findMany({
      where: { folderNumber: { in: TEST_FOLDER_NUMBERS } },
      select: { id: true },
    });
    const testPatientIds = testPatients.map((p) => p.id);
    if (testPatientIds.length === 0) {
      console.log('   No test patients found');
      return { success: true, message: 'No test data to delete' };
    }

    const testAttendances = await prisma.attendance.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true, bedId: true, wardId: true },
    });
    const testAttendanceIds = testAttendances.map((a) => a.id);
    const testBedIds = [...new Set(testAttendances.map((a) => a.bedId).filter((id): id is string => Boolean(id)))];
    const testBeds = testBedIds.length
      ? await prisma.bed.findMany({
          where: { id: { in: testBedIds } },
          select: { id: true, wardId: true },
        })
      : [];
    const affectedWardIds = [...new Set([
      ...testAttendances.map((a) => a.wardId),
      ...testBeds.map((bed) => bed.wardId),
    ].filter((id): id is string => Boolean(id)))];

    const testBookings = await prisma.antenatalBooking.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true },
    });
    const testBookingIds = testBookings.map((b) => b.id);

    const testDeliveries = await prisma.deliveryRecord.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true },
    });
    const testDeliveryIds = testDeliveries.map((d) => d.id);

    // Maternity cleanup
    if (testDeliveryIds.length > 0) {
      await prisma.newbornRecord.deleteMany({ where: { deliveryRecordId: { in: testDeliveryIds } } });
      await prisma.postnatalRecord.deleteMany({ where: { deliveryRecordId: { in: testDeliveryIds } } });
      await prisma.deliveryRecord.deleteMany({ where: { id: { in: testDeliveryIds } } });
    }
    if (testBookingIds.length > 0) {
      await prisma.aNCVisit.deleteMany({ where: { bookingId: { in: testBookingIds } } });
      await prisma.postnatalRecord.deleteMany({ where: { antenatalBookingId: { in: testBookingIds } } });
      await prisma.antenatalBooking.deleteMany({ where: { id: { in: testBookingIds } } });
    }
    await prisma.postnatalRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.abortionRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.familyPlanningService.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // Nursing
    await prisma.medicationDose.deleteMany({ where: { medication: { attendanceId: { in: testAttendanceIds } } } });
    await prisma.nursingNote.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.nursingTask.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // Billing
    await prisma.wardChargeRecord.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.billLineItem.deleteMany({ where: { bill: { patientId: { in: testPatientIds } } } });
    await prisma.payment.deleteMany({ where: { Bill: { patientId: { in: testPatientIds } } } });
    await prisma.insuranceClaim.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.bill.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // Clinical
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

    // Proforma invoices
    await prisma.proformaInvoiceItem.deleteMany({
      where: { proformaInvoice: { patientId: { in: testPatientIds } } },
    });
    await prisma.proformaInvoice.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // Root
    await prisma.attendance.deleteMany({ where: { id: { in: testAttendanceIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });

    // Release test beds only when no other active encounter still references them.
    // This protects real patients if legacy data ever contains a shared bed assignment.
    for (const bed of testBeds) {
      const otherActiveAssignment = await prisma.attendance.findFirst({
        where: {
          id: { notIn: testAttendanceIds },
          bedId: bed.id,
          status: { in: [AttendanceStatus.pending, AttendanceStatus.admitted] },
        },
        select: { id: true },
      });
      if (!otherActiveAssignment) {
        await prisma.bed.updateMany({
          where: { id: bed.id },
          data: { isOccupied: false },
        });
      }
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
// ═══════════════════════════════════════════════════════════
export const seedTestData = async (force: boolean = false) => {
  if (!SEEDING_ENABLED) return { success: false, message: 'Seeding disabled', seedingDisabled: true };
  if (isProduction && !force) return { success: false, message: 'Disabled in production', productionSafety: true };

  console.log('🧪 Seeding test data...');
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

    setSeed(42);

    // ── Departments ────────────────────────────────────────
    const deptMap = await ensureDepartments();

    // ── Users ──────────────────────────────────────────────
    const users = await seedTestUsers(deptMap);
    const userByName = new Map<string, any>();
    for (const u of users) {
      const found = await prisma.user.findUnique({ where: { username: u.username } });
      if (found) userByName.set(u.username, found);
    }

    const admin = userByName.get('admin') ?? userByName.get('superadmin');
    const doctor = userByName.get('doctor1');
    const nurse = userByName.get('nurse1');
    const midwife = userByName.get('midwife1');
    const labTech = userByName.get('lab1');
    const accounts = userByName.get('accounts1');
    if (!admin || !doctor) throw new Error('Required users missing after seed');

    // Reference data
    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    const privateProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'private' } });
    const medDeptId = deptMap.get('Medical');
    if (!nhisProvider) throw new Error('NHIS provider missing. Run core seeding first.');

    // ═══════════════════════════════════════════════════════
    // Pre-load lookup maps (lab + scan templates → service catalog)
    // ═══════════════════════════════════════════════════════
    console.log('📚 Pre-loading lab & scan lookups...');

    const labTemplates = await prisma.labTestTemplate.findMany({
      select: { id: true, investigationCode: true },
    });
    const labServices = await prisma.serviceCatalog.findMany({
      where: { labTestTemplateId: { not: null } },
      select: { id: true, labTestTemplateId: true },
    });
    const labServiceByTemplate = new Map(labServices.map(s => [s.labTestTemplateId!, s.id]));
    const labLookup = new Map<string, { templateId: string; serviceCatalogId: string | null }>();
    for (const t of labTemplates) {
      labLookup.set(t.investigationCode, {
        templateId: t.id,
        serviceCatalogId: labServiceByTemplate.get(t.id) ?? null,
      });
    }

    const scanTemplates = await prisma.scanTemplate.findMany({
      select: { id: true, scanCode: true },
    });
    const scanServices = await prisma.serviceCatalog.findMany({
      where: { scanTemplateId: { not: null } },
      select: { id: true, scanTemplateId: true },
    });
    const scanServiceByTemplate = new Map(scanServices.map(s => [s.scanTemplateId!, s.id]));
    const scanLookup = new Map<string, { templateId: string; serviceCatalogId: string | null }>();
    for (const t of scanTemplates) {
      scanLookup.set(t.scanCode, {
        templateId: t.id,
        serviceCatalogId: scanServiceByTemplate.get(t.id) ?? null,
      });
    }

    const consultServices = await prisma.serviceCatalog.findMany({
      where: { code: { in: ['CONS-GEN', 'CONS-SPEC'] } },
      select: { id: true, code: true },
    });
    const consultByCode = new Map(consultServices.map(s => [s.code, s.id]));

    console.log(`   ✅ ${labLookup.size} labs, ${scanLookup.size} scans, ${consultByCode.size} consult services cached`);

    // ═══════════════════════════════════════════════════════
    // PATIENTS
    // ═══════════════════════════════════════════════════════
    console.log(`📋 Generating ${COUNTS.patients} patients...`);
    const patientsData = generatePatients();
    const patients: any[] = [];
    const patientById = new Map<string, any>();

    for (const p of patientsData) {
      const patient = await prisma.patient.upsert({
        where: { folderNumber: p.folderNumber },
        create: {
          folderNumber: p.folderNumber,
          surname: p.surname,
          otherNames: p.otherNames,
          gender: p.gender as Gender,
          dateOfBirth: p.dateOfBirth,
          contact: p.contact,
          address: p.address,
          paymentMode: p.paymentMode as PaymentMode,
          nhisNumber: p.nhisNumber,
          nhisActive: p.nhisActive,
          nhisExpiryDate: p.nhisExpiryDate,
          phoneNumber: p.phoneNumber,
          insuranceDetails: p.insuranceDetails,
          insuranceProviderId:
            p.paymentMode === 'nhis' ? nhisProvider.id :
            p.paymentMode === 'private_insurance' ? privateProvider?.id :
            undefined,
          registeredBy: admin.fullName,
          registeredAt: p.registeredAt,
        },
        update: { updatedAt: new Date() },
      });
      patients.push(patient);
      patientById.set(p.folderNumber, patient);
    }
    console.log(`✅ ${patients.length} patients created`);

    // ═══════════════════════════════════════════════════════
    // ATTENDANCES + SUB-ENTITIES
    // ═══════════════════════════════════════════════════════
    console.log(`📋 Generating ${COUNTS.attendances} attendances...`);
    const bundle = generateAttendances(patientsData);

    const attendanceMap = new Map<string, string>();
    let attDone = 0;
    for (const a of bundle.attendances) {
      const patient = patientById.get(a.patientFolderNumber);
      if (!patient) continue;
      const isNhisAttendance = a.paymentMode === 'nhis';
      const created = await prisma.attendance.create({
        data: {
          attendanceNumber: a.attendanceNumber,
          patientId: patient.id,
          insuranceProviderId: patient.insuranceProviderId ?? undefined,
          dateTime: a.dateTime,
          attendanceType: a.attendanceType as AttendanceType,
          paymentMode: a.paymentMode as PaymentMode,
          status: a.status as AttendanceStatus,
          encounterCategory: a.encounterCategory as EncounterCategory,
          visitCategory: a.visitCategory as VisitCategory,
          serviceCategory: a.serviceCategory as ServiceCategory,
          complaints: a.complaints,
          medicalNotes: a.medicalNotes,
          // Test encounters identify their responsible clinician and explicitly mark
          // allergy review as pending; an empty allergy list must never imply "none known".
          providerId: doctor.id,
          allergyReviewStatus: 'not_reviewed',
          // Other clinical assessment fields remain empty until a test workflow records them.
          // NHIS visits must carry a 5-digit Claim Check Code so claims can be generated.
          nhisCCC: isNhisAttendance ? nhisCCCFor(a.attendanceNumber) : null,
          createdById: doctor.id,
        },
      });
      attendanceMap.set(a.key, created.id);
      attDone++;
      if (attDone % 1000 === 0) console.log(`   ...${attDone}/${bundle.attendances.length}`);
    }
    console.log(`✅ ${attDone} attendances created`);

    // ── VITALS
    const vitalsRows = bundle.vitals.map(v => {
      const attId = attendanceMap.get(v.attendanceKey);
      const patient = patientById.get(v.patientFolderNumber);
      if (!attId || !patient) return null;
      return {
        attendanceId: attId,
        patientId: patient.id,
        temperature: v.temperature,
        pulse: v.pulse,
        respiration: v.respiration,
        spo2: v.spo2,
        weight: v.weight,
        height: v.height,
        bloodPressure: v.bloodPressure,
        recordedById: nurse?.id ?? doctor.id,
        recordedAt: v.recordedAt,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < vitalsRows.length; i += 2000) {
      await prisma.vitals.createMany({ data: vitalsRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${vitalsRows.length} vitals created`);

    // ── LABS (in-memory lookups)
    let labDone = 0, labSkipped = 0;
    for (const l of bundle.labs) {
      const attId = attendanceMap.get(l.attendanceKey);
      const meta = labLookup.get(l.testCode);
      if (!attId || !meta) { if (attId) labSkipped++; continue; }

      await prisma.labTest.create({
        data: {
          attendanceId: attId,
          templateId: meta.templateId,
          serviceCatalogId: meta.serviceCatalogId,
          status: l.status as LabTestStatus,
          result: l.result,
          requestedAt: l.requestedAt,
          completedAt: l.completedAt,
          createdById: doctor.id,
          performedById: labTech?.id,
          priority: l.priority as Priority,
        },
      });
      labDone++;
    }
    console.log(`✅ ${labDone} lab tests created${labSkipped ? ` (${labSkipped} skipped)` : ''}`);

    // ── SCANS (in-memory lookups)
    let scanDone = 0, scanSkipped = 0;
    for (const s of bundle.scans) {
      const attId = attendanceMap.get(s.attendanceKey);
      const meta = scanLookup.get(s.scanCode);
      if (!attId || !meta) { if (attId) scanSkipped++; continue; }

      await prisma.scan.create({
        data: {
          attendanceId: attId,
          templateId: meta.templateId,
          serviceCatalogId: meta.serviceCatalogId,
          scanType: s.scanCode,
          description: s.description,
          bodyPart: s.bodyPart,
          status: s.status as ScanStatus,
          requestedAt: s.requestedAt,
          completedAt: s.completedAt,
          createdById: doctor.id,
          priority: s.priority as ScanPriority,
          imageUrls: [],
        },
      });
      scanDone++;
    }
    console.log(`✅ ${scanDone} scans created${scanSkipped ? ` (${scanSkipped} skipped)` : ''}`);

    // ── MEDICATIONS
    const medRows = bundle.medications.map(m => {
      const attId = attendanceMap.get(m.attendanceKey);
      if (!attId) return null;
      return {
        attendanceId: attId,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        quantity: m.quantity,
        route: m.route,
        status: m.status as MedicationStatus,
        prescribedAt: m.prescribedAt,
        prescribedById: doctor.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < medRows.length; i += 2000) {
      await prisma.medication.createMany({ data: medRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${medRows.length} medications created`);

    // ── DIAGNOSES
    const allDiagnoses = await prisma.diagnosis.findMany({
      where: { icdCode: { in: [...new Set(bundle.diagnosesLinked.map(d => d.icdCode))] } },
    });
    const dxByIcd = new Map(allDiagnoses.map(d => [d.icdCode, d]));
    const dxRows = bundle.diagnosesLinked.map(d => {
      const attId = attendanceMap.get(d.attendanceKey);
      const dx = dxByIcd.get(d.icdCode);
      if (!attId || !dx) return null;
      return {
        attendanceId: attId,
        diagnosisId: dx.id,
        diagnosisType: d.diagnosisType as DiagnosisType,
        icdCode: dx.icdCode,
        presentOnAdmission: d.presentOnAdmission as PresentOnAdmission,
        date: d.date,
        createdById: doctor.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < dxRows.length; i += 2000) {
      await prisma.attendanceDiagnosis.createMany({ data: dxRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${dxRows.length} diagnoses linked`);

    // ── SERVICES RENDERED
    const svcRows = bundle.services.map(s => {
      const attId = attendanceMap.get(s.attendanceKey);
      const svcId = consultByCode.get(s.serviceCode);
      if (!attId || !svcId) return null;
      return {
        attendanceId: attId,
        serviceItemId: svcId,
        quantity: s.quantity,
        date: s.date,
        performedById: doctor.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < svcRows.length; i += 2000) {
      await prisma.serviceRendered.createMany({ data: svcRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${svcRows.length} services created`);

    // ── BILLS + LINE ITEMS
    console.log('💰 Creating bills...');
    const billMap = new Map<string, string>();
    for (const b of bundle.bills) {
      const attId = attendanceMap.get(b.attendanceKey);
      const patient = patientById.get(b.patientFolderNumber);
      if (!attId || !patient) continue;
      const bill = await prisma.bill.create({
        data: {
          billNumber: b.billNumber,
          patientId: patient.id,
          attendanceId: attId,
          subtotal: b.subtotal,
          discount: b.discount,
          waiverAmount: b.waiverAmount,
          taxAmount: b.taxAmount,
          totalAmount: b.totalAmount,
          insuranceCovered: b.insuranceCovered,
          patientPayable: b.patientPayable,
          paidAmount: b.paidAmount,
          balance: b.balance,
          status: b.status as BillStatus,
          paymentMode: b.paymentMode as PaymentMode,
          insuranceProviderId: patient.insuranceProviderId ?? undefined,
          billDate: b.billDate,
          createdById: accounts?.id ?? admin.id,
        },
      });
      billMap.set(b.billNumber, bill.id);

      const lineRows = b.lineItems.map((li: any) => ({
        billId: bill.id,
        description: li.description,
        serviceType: li.serviceType as ServiceType,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        pricingBasis: li.pricingBasis as PaymentMode,
        lineTotal: li.quantity * li.unitPrice,
        insuranceCoveredAmount: 0,
        patientPayableAmount: li.quantity * li.unitPrice,
        discount: 0,
      }));
      if (lineRows.length) await prisma.billLineItem.createMany({ data: lineRows });
    }
    console.log(`✅ ${billMap.size} bills created`);

    // ── PAYMENTS
    const payRows = bundle.payments.map(p => {
      const billId = billMap.get(p.billNumber);
      if (!billId) return null;
      return {
        billId,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        transactionDate: p.transactionDate,
        receivedById: accounts?.id ?? admin.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < payRows.length; i += 2000) {
      await prisma.payment.createMany({ data: payRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${payRows.length} payments created`);

    // ── CLAIMS
    let claimDone = 0;
    for (const c of bundle.claims) {
      const attId = attendanceMap.get(c.attendanceKey);
      const patient = patientById.get(c.patientFolderNumber);
      const billId = c.billNumber ? billMap.get(c.billNumber) : null;
      if (!attId || !patient || !patient.insuranceProviderId) continue;
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: c.claimNumber,
          billId: billId ?? undefined,
          patientId: patient.id,
          insuranceProviderId: patient.insuranceProviderId,
          attendanceId: attId,
          totalClaimAmount: c.totalClaimAmount,
          status: c.status as ClaimStatus,
          diagnosisCodes: c.diagnosisCodes,
          finalizedAt: c.submissionDate ? new Date(c.submissionDate) : undefined,
          createdById: accounts?.id ?? admin.id,
        },
      });
      claimDone++;
    }
    console.log(`✅ ${claimDone} claims created`);

    // ── REFERRALS
    const refRows = bundle.referrals.map(r => {
      const attId = attendanceMap.get(r.attendanceKey);
      const patient = patientById.get(r.patientFolderNumber);
      if (!attId || !patient) return null;
      return {
        referralNumber: r.referralNumber,
        patientId: patient.id,
        attendanceId: attId,
        referralType: r.referralType as ReferralType,
        referralReason: r.referralReason,
        urgency: r.urgency as Priority,
        referralDate: r.referralDate,
        status: r.status as ReferralStatus,
        createdById: doctor.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < refRows.length; i += 2000) {
      await prisma.referralRecord.createMany({ data: refRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${refRows.length} referrals created`);

    // ── ADMISSIONS
    // Seed a coherent IPD state: active admissions own a bed and have an admitted
    // attendance; discharged admissions have a closed attendance and no bed link.
    let admDone = 0;
    const availableBeds = await prisma.bed.findMany({
      where: { isOccupied: false, Ward: { isActive: true } },
      select: { id: true, wardId: true },
      orderBy: [{ wardId: 'asc' }, { bedNumber: 'asc' }],
    });
    const wardOccupancyAdded = new Set<string>();
    for (const a of bundle.admissions) {
      const attId = attendanceMap.get(a.attendanceKey);
      if (!attId) continue;

      const bed = a.dischargeStatus == null ? availableBeds.shift() : undefined;
      const isActiveAdmission = a.dischargeStatus == null && Boolean(bed);
      const dischargeStatus = isActiveAdmission ? null : (a.dischargeStatus ?? 'home');
      const dischargeDate = isActiveAdmission ? null : (a.dischargeDate ?? new Date());

      await prisma.$transaction(async (tx) => {
        await tx.admission.create({
          data: {
            attendanceId: attId,
            admissionNumber: a.admissionNumber,
            admissionType: a.admissionType as AdmissionType,
            admissionSource: a.admissionSource as AdmissionSource,
            admissionDate: a.admissionDate,
            dischargeDate,
            dischargeStatus: dischargeStatus as DischargeStatus | null,
          },
        });

        await tx.attendance.update({
          where: { id: attId },
          data: isActiveAdmission && bed
            ? {
                status: 'admitted',
                encounterCategory: 'ipd',
                serviceCategory: 'ipd',
                bedId: bed.id,
                wardId: bed.wardId,
              }
            : {
                status: 'discharged',
                encounterCategory: 'ipd',
                serviceCategory: 'ipd',
                bedId: null,
                wardId: null,
              },
        });

        if (isActiveAdmission && bed) {
          const reservation = await tx.bed.updateMany({
            where: { id: bed.id, isOccupied: false },
            data: { isOccupied: true },
          });
          if (reservation.count !== 1) {
            throw new Error(`Could not reserve seed bed ${bed.id}`);
          }
          await tx.ward.update({
            where: { id: bed.wardId },
            data: { occupiedBeds: { increment: 1 } },
          });
          wardOccupancyAdded.add(bed.wardId);
        }
      });
      admDone++;
    }
    console.log(`✅ ${admDone} admissions created (${wardOccupancyAdded.size} wards with seeded occupancy)`);

    // ── MATERNITY LINKED RECORDS
    console.log('🤰 Creating maternity links...');

    const bookingMap = new Map<string, string>();
    let bookingDone = 0;
    for (const bk of bundle.antenatalBookings) {
      const attId = attendanceMap.get(bk.attendanceKey);
      const patient = patientById.get(bk.patientFolderNumber);
      if (!attId || !patient) continue;
      const created = await prisma.antenatalBooking.create({
        data: {
          patientId: patient.id,
          attendanceId: attId,
          bookingDate: bk.bookingDate,
          lmp: bk.lmp,
          edd: bk.edd,
          gravida: bk.gravida,
          para: bk.para,
          gestationalAgeWeeks: bk.gestationalAgeWeeks,
          gestationalAgeAtBooking: bk.gestationalAgeWeeks,
          riskLevel: bk.riskLevel,
          bloodGroup: bk.bloodGroup,
          hivStatus: bk.hivStatus,
          hbLevel: bk.hbLevel,
          isActive: bk.isActive,
          isCompleted: !bk.isActive,
          createdById: midwife?.id ?? doctor.id,
          iptpDoses: {},
          ttDoses: {},
        },
      });
      bookingMap.set(bk.bookingKey, created.id);
      bookingDone++;
    }
    console.log(`✅ ${bookingDone} antenatal bookings`);

    let ancVisitDone = 0;
    for (const v of bundle.ancVisits) {
      const bookingId = bookingMap.get(v.bookingKey);
      if (!bookingId) continue;
      const bk = bundle.antenatalBookings.find(x => x.bookingKey === v.bookingKey);
      const patient = bk ? patientById.get(bk.patientFolderNumber) : null;
      if (!patient) continue;

      const visitAttNumber = nextExtraAttendanceNumber();
      const isNhisVisit = patient.paymentMode === 'nhis';
      const visitAtt = await prisma.attendance.create({
        data: {
          attendanceNumber: visitAttNumber,
          patientId: patient.id,
          dateTime: v.visitDate,
          attendanceType: 'antenatal' as AttendanceType,
          paymentMode: patient.paymentMode as PaymentMode,
          status: 'completed' as AttendanceStatus,
          encounterCategory: 'opd' as EncounterCategory,
          visitCategory: 'general' as VisitCategory,
          serviceCategory: 'opd' as ServiceCategory,
          complaints: `ANC visit ${v.visitNumber}`,
          nhisCCC: isNhisVisit ? nhisCCCFor(visitAttNumber) : null,
          createdById: midwife?.id ?? doctor.id,
        },
      });

      await prisma.aNCVisit.create({
        data: {
          bookingId,
          attendanceId: visitAtt.id,
          visitNumber: v.visitNumber,
          visitDate: v.visitDate,
          gestationalAgeWeeks: v.gestationalAgeWeeks,
          weight: v.weight,
          bloodPressure: v.bloodPressure,
          fundalHeight: v.fundalHeight,
          fetalHeartRate: v.fetalHeartRate,
          dangerSignsList: [],
          recordedById: midwife?.id ?? doctor.id,
        },
      });
      ancVisitDone++;
    }
    console.log(`✅ ${ancVisitDone} ANC visits`);

    const deliveryMap = new Map<string, string>();
    let delDone = 0;
    for (const d of bundle.deliveryRecords) {
      const attId = attendanceMap.get(d.attendanceKey);
      const patient = patientById.get(d.patientFolderNumber);
      if (!attId || !patient) continue;
      const created = await prisma.deliveryRecord.create({
        data: {
          patientId: patient.id,
          attendanceId: attId,
          deliveryDate: d.deliveryDate,
          deliveryType: d.deliveryType,
          deliveryOutcome: d.deliveryOutcome,
          placeOfDelivery: d.placeOfDelivery,
          attendant: d.attendant,
          gestationWeeks: d.gestationWeeks,
          birthWeight: d.birthWeight,
          apgarScore1min: d.apgarScore1min,
          apgarScore5min: d.apgarScore5min,
          maternalOutcome: d.maternalOutcome,
          complications: d.complications,
          createdById: midwife?.id ?? doctor.id,
          malePartnerPresentANC: d.malePartnerPresentANC,
          malePartnerPresentDelivery: d.malePartnerPresentDelivery,
          malePartnerPresentPNC: d.malePartnerPresentPNC,
          maternalDeathsAudited: d.maternalDeathsAudited,
        },
      });
      deliveryMap.set(d.deliveryKey, created.id);
      delDone++;
    }
    console.log(`✅ ${delDone} delivery records`);

    let nbDone = 0;
    for (const n of bundle.newbornRecords) {
      const deliveryId = deliveryMap.get(n.deliveryKey);
      if (!deliveryId) continue;
      await prisma.newbornRecord.create({
        data: {
          deliveryRecordId: deliveryId,
          order: n.order,
          birthWeight: n.birthWeight,
          gender: n.gender as Gender,
          apgarScore1min: n.apgarScore1min,
          apgarScore5min: n.apgarScore5min,
          resuscitation: false,
          outcome: n.outcome,
          anomalies: n.anomalies,
          breastfeedingWithin30Min: n.breastfeedingWithin30Min,
          eyeProphylaxisGiven: n.eyeProphylaxisGiven,
          cordCareMethod: n.cordCareMethod,
        },
      });
      nbDone++;
    }
    console.log(`✅ ${nbDone} newborn records`);

    let pncDone = 0;
    for (const p of bundle.postnatalRecords) {
      const attId = attendanceMap.get(p.attendanceKey);
      const patient = patientById.get(p.patientFolderNumber);
      if (!attId || !patient) continue;
      await prisma.postnatalRecord.create({
        data: {
          patientId: patient.id,
          attendanceId: attId,
          examinationDate: p.examinationDate,
          dayNumber: p.dayNumber,
          maternalCondition: p.maternalCondition,
          maternalComplications: p.maternalComplications,
          maternalDangerSigns: p.maternalDangerSigns,
          babyDangerSigns: p.babyDangerSigns,
          breastfeedingStatus: p.breastfeedingStatus,
          babyCondition: p.babyCondition,
          lochia: p.lochia,
          perinealCondition: p.perinealCondition,
          latching: p.latching,
          jaundice: p.jaundice,
          cordCondition: p.cordCondition,
          bcgGiven: p.bcgGiven,
          opv0Given: p.opv0Given,
          hepB0Given: p.hepB0Given,
          familyPlanningDiscussed: p.familyPlanningDiscussed,
          malePartnerPresentPNC: p.malePartnerPresentPNC,
          createdById: midwife?.id ?? doctor.id,
        },
      });
      pncDone++;
    }
    console.log(`✅ ${pncDone} postnatal records`);

    // ── APPOINTMENTS
    console.log('📅 Creating appointments...');
    const apptData = generateAppointments(patientsData);
    const apptRows = apptData.map(a => {
      const patient = patientById.get(a.patientFolderNumber);
      if (!patient) return null;
      return {
        appointmentNumber: a.appointmentNumber,
        patientId: patient.id,
        clinicianId: doctor.id,
        clinicianRole: doctor.role,
        departmentId: medDeptId,
        title: a.title,
        scheduledAt: a.scheduledAt,
        duration: a.duration,
        status: a.status as AppointmentStatus,
        type: a.type as AppointmentType,
        createdBy: admin.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < apptRows.length; i += 2000) {
      await prisma.appointment.createMany({ data: apptRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${apptRows.length} appointments created`);

    // ── FAMILY PLANNING
    const fpData = generateFamilyPlanning(patientsData);
    const fpRows = fpData.map(f => {
      const patient = patientById.get(f.patientFolderNumber);
      if (!patient) return null;
      return {
        patientId: patient.id,
        serviceDate: f.serviceDate,
        method: f.method,
        methodCategory: f.methodCategory,
        isNewAcceptor: f.isNewAcceptor,
        counsellingGiven: f.counsellingGiven,
        informedConsent: f.informedConsent,
        cypFactor: f.cypFactor,
        providedById: midwife?.id ?? admin.id,
      };
    }).filter(Boolean) as any[];
    for (let i = 0; i < fpRows.length; i += 2000) {
      await prisma.familyPlanningService.createMany({ data: fpRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${fpRows.length} family planning records created`);

    // ── NOTIFICATIONS
    const notifData = generateNotifications(users.map(u => u.username));
    const notifRows = notifData.map(n => {
      const target = userByName.get(n.targetUsername) ?? admin;
      return {
        userId: target.id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        isRead: n.isRead,
        createdAt: n.createdAt,
      };
    });
    for (let i = 0; i < notifRows.length; i += 2000) {
      await prisma.notification.createMany({ data: notifRows.slice(i, i + 2000) });
    }
    console.log(`✅ ${notifRows.length} notifications created`);

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    const [totalPatients, totalAttendances, totalBills] = await Promise.all([
      prisma.patient.count({ where: { folderNumber: { in: TEST_FOLDER_NUMBERS } } }),
      prisma.attendance.count({ where: { patientId: { in: patients.map(p => p.id) } } }),
      prisma.bill.count({ where: { patientId: { in: patients.map(p => p.id) } } }),
    ]);

    console.log('\n🎉 TEST DATA SEEDING COMPLETED!');
    console.log(`   Patients:     ${totalPatients}`);
    console.log(`   Attendances:  ${totalAttendances}`);
    console.log(`   Bills:        ${totalBills}`);
    console.log('\n👨‍⚕️  SAMPLE LOGINS:');
    console.log('   superadmin / superadmin123  (Super Admin)');
    console.log('   admin / admin123            (Admin)');
    console.log('   hr1 / hr123                 (HR)');
    console.log('   doctor1 / doctor123         (Doctor)');
    console.log('   nurse1 / nurse123           (Nurse)');
    console.log('   midwife1 / midwife123       (Midwife)');
    console.log('   lab1 / lab123               (Lab)');
    console.log('   sonographer1 / scan123      (Sonographer)');
    console.log('   pharma1 / pharma123         (Pharmacist)');
    console.log('   accounts1 / accounts123     (Accounts)');
    console.log('   records1 / records123       (Records)');

    return {
      success: true,
      message: 'Test data seeded',
      patients: totalPatients,
      attendances: totalAttendances,
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

    const realDataExists = await hasRealData();
    if (realDataExists) {
      console.log('🚨 Real data detected. Aborting test seed.');
      return { initialized: true, seeded: false, reason: 'real_data_detected' };
    }

    console.log('🔧 Seeding test data...');
    const result = await seedTestData(false);
    return {
      initialized: true,
      seeded: result.success,
      reason: result.success ? 'seeded' : 'seed_failed',
    };
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    return { initialized: false, seeded: false, error: error.message };
  }
};

export default { seedTestData, deleteTestData, initializeDatabase };