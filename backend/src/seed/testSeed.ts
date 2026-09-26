// src/seed/testSeed.ts - SCHEMA-ALIGNED VERSION
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

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// ─────────────────────────────────────────────────────────────
// RBAC seeding (single, non-recursive)
// ─────────────────────────────────────────────────────────────
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

/**
 * Ensures Permission, Role, RolePermission rows exist and assigns
 * each user their Role row (separate from the legacy User.role enum).
 */
const seedTestRbac = async (usernameToRole: Record<string, string>) => {
  console.log('🔐 Seeding RBAC (permissions, roles, role-permissions)...');

  // 1. Permissions
  const permissionIds = new Map<string, string>();
  for (const [name, description] of PERMISSION_DEFINITIONS) {
    const p = await prisma.permission.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    permissionIds.set(name, p.id);
  }

  // 2. Roles
  const roleIds = new Map<string, string>();
  for (const r of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleIds.set(role.name, role.id);
  }

  // 3. Role ↔ Permission
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

  // 4. Attach Role rows to users
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

// ─────────────────────────────────────────────────────────────
// Numbering
// ─────────────────────────────────────────────────────────────
let patientCounter = 1000;
let attendanceCounter = 1000;
let receiptCounter = 1000;
let referralCounter = 1000;
let appointmentCounter = 1000;

const generatePatientNumber = () => `${++patientCounter}`;
const generateAttendanceNumber = () => `${++attendanceCounter}`;
const generateReceiptNumber = () => `RCP-${++receiptCounter}`;
const generateReferralNumber = () => `REF-${++referralCounter}`;
const generateAppointmentNumber = () => `APT-${++appointmentCounter}`;

const getAdmissionNumber = (n: string) => n;
const getBillNumber = (n: string) => `BILL-${n}`;
const getClaimNumber = (n: string, mode: string) => {
  const prefix = mode === 'nhis' ? 'NHIS' : mode === 'private_insurance' ? 'PRV' : 'CORP';
  return `${prefix}-${n}`;
};

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────
const daysAgo = (days: number, base: Date = new Date()) => {
  const d = new Date(base); d.setDate(d.getDate() - days); return d;
};
const daysFromNow = (days: number, base: Date = new Date()) => {
  const d = new Date(base); d.setDate(d.getDate() + days); return d;
};
const todayAt = (h: number, m: number = 0, base: Date = new Date()) => {
  const d = new Date(base); d.setHours(h, m, 0, 0); return d;
};

// ─────────────────────────────────────────────────────────────
// Test data detection
// ─────────────────────────────────────────────────────────────
const TEST_FOLDER_NUMBERS = Array.from({ length: 30 }, (_, i) => `${1001 + i}`);

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

// ─────────────────────────────────────────────────────────────
// Test users (with department + seniority + job grade mapping)
// ─────────────────────────────────────────────────────────────
const TEST_USERS = [
  { username: 'superadmin',   password: 'superadmin123', fullName: 'Super Administrator',        role: UserRole.super_admin, email: 'superadmin@hospital.com',   phone: '+233244111110', roleName: 'super_admin' },
  { username: 'admin',        password: 'admin123',      fullName: 'System Administrator',       role: UserRole.admin,       email: 'admin@hospital.com',        phone: '+233244111111', roleName: 'super_admin' },
  { username: 'hr1',          password: 'hr123',         fullName: 'HR Officer Ama Mensah',      role: UserRole.hr_officer,  email: 'hr@hospital.com',           phone: '+233244111112', roleName: 'hr_officer' },
  { username: 'doctor1',      password: 'doctor123',     fullName: 'Dr. Kofi Mensah',            role: UserRole.doctor,      email: 'doctor@hospital.com',       phone: '+233244222222', licenseNumber: 'MD-12345', specialization: 'General Medicine', roleName: 'doctor' },
  { username: 'nurse1',       password: 'nurse123',      fullName: 'Nurse Akua Johnson',         role: UserRole.nurse,       email: 'nurse@hospital.com',        phone: '+233244333333', licenseNumber: 'RN-54321', roleName: 'nurse' },
  { username: 'midwife1',     password: 'midwife123',    fullName: 'Midwife Abena Serwaa',       role: UserRole.midwife,     email: 'midwife@hospital.com',      phone: '+233244444444', licenseNumber: 'MW-98765', roleName: 'nurse' },
  { username: 'lab1',         password: 'lab123',        fullName: 'Lab Tech Yaw Asare',         role: UserRole.lab_tech,    email: 'lab@hospital.com',          phone: '+233244666666', licenseNumber: 'LT-11223', roleName: 'nurse' },
  { username: 'sonographer1', password: 'scan123',       fullName: 'Sonographer Ama Boateng',    role: UserRole.sonographer, email: 'sonographer@hospital.com',  phone: '+233244999999', licenseNumber: 'SN-11223', roleName: 'nurse' },
  { username: 'pharma1',      password: 'pharma123',     fullName: 'Pharmacist Nana Kwaku',      role: UserRole.pharmacist,  email: 'pharma@hospital.com',       phone: '+233244777777', licenseNumber: 'PH-44556', roleName: 'nurse' },
  { username: 'accounts1',    password: 'accounts123',   fullName: 'Accountant Esi Brown',       role: UserRole.accounts,    email: 'accounts@hospital.com',     phone: '+233244888888', roleName: 'hr_officer' },
  { username: 'records1',     password: 'records123',    fullName: 'Records Officer Kwame Osei', role: UserRole.records,     email: 'records@hospital.com',      phone: '+233244555555', roleName: 'hr_officer' },
];

/**
 * Which department, seniority, job grade, and salary step each test user gets.
 * The grade+step determines the payslip base salary.
 */
const USER_PLACEMENT: Record<string, {
  departmentName: string | null;
  seniority: Seniority;
  jobGradeCode: string;
  salaryStepNumber: number;
}> = {
  superadmin:   { departmentName: null,                    seniority: Seniority.PRINCIPAL, jobGradeCode: 'AD-09', salaryStepNumber: 5 },
  admin:        { departmentName: null,                    seniority: Seniority.PRINCIPAL, jobGradeCode: 'AD-09', salaryStepNumber: 5 },
  hr1:          { departmentName: null,                    seniority: Seniority.SENIOR,    jobGradeCode: 'AD-09', salaryStepNumber: 3 },
  doctor1:      { departmentName: 'Medical',               seniority: Seniority.SENIOR,    jobGradeCode: 'MO-08', salaryStepNumber: 3 },
  nurse1:       { departmentName: 'Medical',               seniority: Seniority.JUNIOR,    jobGradeCode: 'NO-07', salaryStepNumber: 1 },
  midwife1:     { departmentName: 'Obstetrics & Gynecology', seniority: Seniority.SENIOR,  jobGradeCode: 'NO-07', salaryStepNumber: 3 },
  lab1:         { departmentName: 'Laboratory',            seniority: Seniority.JUNIOR,    jobGradeCode: 'NO-07', salaryStepNumber: 1 },
  sonographer1: { departmentName: 'Radiology',             seniority: Seniority.JUNIOR,    jobGradeCode: 'NO-07', salaryStepNumber: 1 },
  pharma1:      { departmentName: 'Pharmacy',              seniority: Seniority.SENIOR,    jobGradeCode: 'NO-07', salaryStepNumber: 3 },
  accounts1:    { departmentName: null,                    seniority: Seniority.SENIOR,    jobGradeCode: 'AD-09', salaryStepNumber: 3 },
  records1:     { departmentName: 'Main Store',            seniority: Seniority.SENIOR,    jobGradeCode: 'AD-09', salaryStepNumber: 3 },
};

/**
 * Create/verify all test users, then create a StaffProfile for each.
 */
const seedTestUsers = async () => {
  console.log('👥 Creating/verifying test users...');

  for (const u of TEST_USERS) {
    const placement = USER_PLACEMENT[u.username];

    // Department id
    const departmentId = placement.departmentName
      ? (await prisma.department.findFirst({ where: { name: placement.departmentName } }))?.id ?? null
      : null;

    await prisma.user.upsert({
      where: { username: u.username },
      create: {
        username: u.username,
        password: hashPassword(u.password),
        fullName: u.fullName,
        role: u.role,
        seniority: placement.seniority,
        email: u.email,
        phone: u.phone,
        licenseNumber: (u as any).licenseNumber ?? null,
        specialization: (u as any).specialization ?? null,
        departmentId,
        isActive: true,
      },
      update: {
        role: u.role,
        seniority: placement.seniority,
        departmentId,
        isActive: true,
      },
    });
  }

  // Attach Role rows
  await seedTestRbac(
    Object.fromEntries(TEST_USERS.map((u) => [u.username, u.roleName])),
  );

  // Create StaffProfile for each user with grade + step
  console.log('🧑‍💼 Creating staff profiles (job grade + salary step)...');
  let profilesCreated = 0;
  let profilesSkipped = 0;

  for (const u of TEST_USERS) {
    const user = await prisma.user.findUnique({ where: { username: u.username }, select: { id: true, departmentId: true } });
    if (!user) continue;

    const existing = await prisma.staffProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (existing) { profilesSkipped++; continue; }

    const placement = USER_PLACEMENT[u.username];
    const grade = await prisma.jobGrade.findUnique({ where: { code: placement.jobGradeCode } });
    const step = grade
      ? await prisma.salaryStep.findFirst({
          where: { gradeId: grade.id, stepNumber: placement.salaryStepNumber },
        })
      : null;

    // Employee ID: GHS-YYYY-NNNN
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
        dateJoined: daysAgo(365 * 3), // 3 years ago
        employmentType: EmploymentType.PERMANENT,
        departmentId: user.departmentId ?? null,
        jobGradeId: grade?.id ?? null,
        salaryStepId: step?.id ?? null,
        bio: null,
      },
    });
    profilesCreated++;
  }

  console.log(`✅ Staff profiles: ${profilesCreated} created, ${profilesSkipped} already existed`);
};

// ─────────────────────────────────────────────────────────────
// Delete test data
// ─────────────────────────────────────────────────────────────
export const deleteTestData = async (force: boolean = false) => {
  if (isProduction && !force) {
    return { success: false, message: 'Disabled in production', productionSafety: true };
  }
  console.log('🗑️ Deleting test data...');
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
      console.log('No test patients found');
      return { success: true, message: 'No test data to delete' };
    }

    const testAttendances = await prisma.attendance.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true },
    });
    const testAttendanceIds = testAttendances.map((a) => a.id);

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

    if (testDeliveryIds.length > 0) {
      await prisma.newbornRecord.deleteMany({ where: { deliveryRecordId: { in: testDeliveryIds } } });
      await prisma.deliveryRecord.deleteMany({ where: { id: { in: testDeliveryIds } } });
    }
    if (testBookingIds.length > 0) {
      await prisma.aNCVisit.deleteMany({ where: { bookingId: { in: testBookingIds } } });
    }
    await prisma.postnatalRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.abortionRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    if (testBookingIds.length > 0) {
      await prisma.antenatalBooking.deleteMany({ where: { id: { in: testBookingIds } } });
    }
    await prisma.familyPlanningService.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.wardChargeRecord.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.billLineItem.deleteMany({ where: { bill: { patientId: { in: testPatientIds } } } });
    await prisma.payment.deleteMany({ where: { Bill: { patientId: { in: testPatientIds } } } });
    await prisma.bill.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.insuranceClaim.deleteMany({ where: { patientId: { in: testPatientIds } } });
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
    await prisma.attendance.deleteMany({ where: { id: { in: testAttendanceIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
    await prisma.bed.updateMany({ data: { isOccupied: false } });

    console.log('✅ Test data deleted successfully');
    return { success: true, message: 'Test data deleted' };
  } catch (error: any) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Maternity data
// ─────────────────────────────────────────────────────────────
const createMaternityData = async (
  patients: any[],
  midwife: any,
  admin: any,
) => {
  console.log('👶 Creating maternity data (ANC, Delivery, Postnatal)...');

  const maternityConfigs: Record<string, any> = {
    '1006': { gravida: 1, para: 0, weeksAtBooking: 12, edd: new Date('2024-12-20'), deliveryWeeks: 40, deliveryDaysAgo: 5, scenario: 'delivered', riskLevel: 'low' },
    '1007': { gravida: 3, para: 2, weeksAtBooking: 16, edd: new Date('2025-02-15'), currentWeeks: 28, scenario: 'current', riskLevel: 'low' },
    '1008': { gravida: 2, para: 1, weeksAtBooking: 20, edd: new Date('2024-11-30'), deliveryWeeks: 38, deliveryDaysAgo: 15, scenario: 'delivered', riskLevel: 'high' },
    '1009': { gravida: 2, para: 1, weeksAtBooking: 14, edd: new Date('2024-10-25'), deliveryWeeks: 39, deliveryDaysAgo: 30, scenario: 'cs_delivery', riskLevel: 'low' },
    '1010': { gravida: 1, para: 0, weeksAtBooking: 10, edd: new Date('2024-11-10'), deliveryWeeks: 36, deliveryDaysAgo: 45, scenario: 'twins_delivered', riskLevel: 'low' },
  };

  for (const patient of patients.slice(5, 10)) {
    const config = maternityConfigs[patient.folderNumber];
    if (!config) continue;

    console.log(`  Processing maternity for: ${patient.surname} (${patient.folderNumber})`);

    const bookingDate =
      config.scenario === 'current'
        ? daysAgo(config.currentWeeks! * 7)
        : daysAgo(config.deliveryDaysAgo! + config.deliveryWeeks! * 7);

    const antenatalAttendance = await prisma.attendance.create({
      data: {
        attendanceNumber: generateAttendanceNumber(),
        patientId: patient.id,
        dateTime: bookingDate,
        attendanceType: AttendanceType.antenatal,
        paymentMode: patient.paymentMode,
        insuranceProviderId: patient.insuranceProviderId ?? undefined,
        complaints: 'Routine antenatal booking visit',
        medicalNotes: `G${config.gravida}P${config.para} booking at ${config.weeksAtBooking} weeks`,
        createdById: midwife?.id ?? admin.id,
        status: AttendanceStatus.completed,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
      },
    });

    const lmpDate = new Date(config.edd);
    lmpDate.setDate(lmpDate.getDate() - 280);

    const booking = await prisma.antenatalBooking.create({
      data: {
        patientId: patient.id,
        attendanceId: antenatalAttendance.id,
        gravida: config.gravida,
        para: config.para,
        lmp: lmpDate,
        edd: config.edd,
        bookingDate,
        gestationalAgeWeeks: config.weeksAtBooking,
        gestationalAgeAtBooking: config.weeksAtBooking,
        riskLevel: config.riskLevel as any,
        riskFactors: config.riskLevel === 'high' ? ['Previous complications'] : [],
        isActive: config.scenario === 'current',
        isCompleted: config.scenario !== 'current',
        createdById: midwife?.id ?? admin.id,
        bloodGroup: 'O+',
        hivStatus: 'Negative',
        hbLevel: 11.5,
        iptpDoses: {},
        ttDoses: {},
      },
    });

    const totalWeeks = config.scenario === 'current' ? config.currentWeeks! : config.deliveryWeeks!;
    const visitCount = Math.min(Math.floor(totalWeeks / 4), 8);

    for (let i = 1; i <= visitCount; i++) {
      const visitDate = new Date(bookingDate);
      visitDate.setDate(visitDate.getDate() + i * 28);

      const visitAttendance = await prisma.attendance.create({
        data: {
          attendanceNumber: generateAttendanceNumber(),
          patientId: patient.id,
          dateTime: visitDate,
          attendanceType: AttendanceType.antenatal,
          paymentMode: patient.paymentMode,
          insuranceProviderId: patient.insuranceProviderId ?? undefined,
          complaints: `ANC visit — ${config.weeksAtBooking + i * 4} weeks`,
          createdById: midwife?.id ?? admin.id,
          status: AttendanceStatus.completed,
          encounterCategory: EncounterCategory.opd,
          visitCategory: VisitCategory.general,
          serviceCategory: ServiceCategory.opd,
          totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        },
      });

      await prisma.aNCVisit.create({
        data: {
          bookingId: booking.id,
          attendanceId: visitAttendance.id,
          visitNumber: i,
          visitDate,
          gestationalAgeWeeks: config.weeksAtBooking + i * 4,
          weight: 65 + i * 0.5,
          bloodPressure: `${110 + i}/70`,
          fundalHeight: Math.round((config.weeksAtBooking + i * 4) * 0.9),
          fetalHeartRate: 145,
          // ✅ FIX: schema requires this array
          dangerSignsList: [],
          recordedById: midwife?.id ?? admin.id,
        },
      });
    }

    if (config.scenario !== 'current') {
      const deliveryDate = daysAgo(config.deliveryDaysAgo!);
      const twins = config.scenario === 'twins_delivered';
      const cs = config.scenario === 'cs_delivery';

      const deliveryAttendance = await prisma.attendance.create({
        data: {
          attendanceNumber: generateAttendanceNumber(),
          patientId: patient.id,
          dateTime: deliveryDate,
          attendanceType: AttendanceType.delivery,
          paymentMode: patient.paymentMode,
          insuranceProviderId: patient.insuranceProviderId ?? undefined,
          complaints: 'In labour / For delivery',
          medicalNotes: `G${config.gravida}P${config.para} delivery at ${config.deliveryWeeks} weeks`,
          createdById: midwife?.id ?? admin.id,
          status: AttendanceStatus.completed,
          encounterCategory: EncounterCategory.ipd,
          visitCategory: VisitCategory.general,
          serviceCategory: ServiceCategory.ipd,
          totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        },
      });

      const delivery = await prisma.deliveryRecord.create({
        data: {
          patientId: patient.id,
          attendanceId: deliveryAttendance.id,
          antenatalBookingId: booking.id,
          deliveryDate,
          deliveryType: cs ? 'caesarean_section' : twins ? 'multiple' : 'spontaneous_vertex',
          deliveryOutcome: 'live_birth',
          placeOfDelivery: 'private_hospital',
          attendant: midwife?.fullName ?? 'Midwife',
          gestationWeeks: config.deliveryWeeks!,
          birthWeight: twins ? 2400 : 3200,
          apgarScore1min: 8,
          apgarScore5min: 9,
          maternalOutcome: 'alive',
          complications: twins ? ['Preterm labour'] : [],
          createdById: midwife?.id ?? admin.id,
          malePartnerPresentANC: false,
          malePartnerPresentDelivery: false,
          malePartnerPresentPNC: false,
          maternalDeathsAudited: false,
        },
      });

      const babyWeights = twins ? [2400, 2300] : [3200];
      for (let b = 0; b < babyWeights.length; b++) {
        await prisma.newbornRecord.create({
          data: {
            deliveryRecordId: delivery.id,
            order: b + 1,
            birthWeight: babyWeights[b],
            gender: b % 2 === 0 ? Gender.male : Gender.female,
            apgarScore1min: 8,
            apgarScore5min: 9,
            outcome: 'alive',
            anomalies: [],
            breastfeedingWithin30Min: true,
            eyeProphylaxisGiven: true,
            cordCareMethod: 'dry_cord',
          },
        });
      }
      console.log(`    ✅ Delivery for ${patient.surname} — ${babyWeights.length} newborn(s)`);

      for (const dayOffset of [7, 14, 42]) {
        const postnatalDate = new Date(deliveryDate);
        postnatalDate.setDate(postnatalDate.getDate() + dayOffset);
        if (postnatalDate > new Date()) continue;

        const postnatalAttendance = await prisma.attendance.create({
          data: {
            attendanceNumber: generateAttendanceNumber(),
            patientId: patient.id,
            dateTime: postnatalDate,
            attendanceType: AttendanceType.postnatal,
            paymentMode: patient.paymentMode,
            insuranceProviderId: patient.insuranceProviderId ?? undefined,
            complaints: `Postnatal visit — Day ${dayOffset}`,
            medicalNotes: `Day ${dayOffset} postnatal check-up`,
            createdById: midwife?.id ?? admin.id,
            status: AttendanceStatus.completed,
            encounterCategory: EncounterCategory.opd,
            visitCategory: VisitCategory.general,
            serviceCategory: ServiceCategory.opd,
            totalBill: 0, paidAmount: 0, outstandingBalance: 0,
          },
        });

        await prisma.postnatalRecord.create({
          data: {
            patientId: patient.id,
            attendanceId: postnatalAttendance.id,
            antenatalBookingId: booking.id,
            deliveryRecordId: delivery.id,
            examinationDate: postnatalDate,
            dayNumber: dayOffset,
            maternalCondition: 'good',
            maternalComplications: [],
            maternalDangerSigns: [],
            babyDangerSigns: [],
            breastfeedingStatus: 'exclusive',
            babyCondition: 'good',
            lochia: 'normal',
            perinealCondition: 'intact',
            latching: 'good',
            jaundice: false,
            cordCondition: 'dry',
            bcgGiven: true,
            opv0Given: true,
            hepB0Given: true,
            familyPlanningDiscussed: dayOffset === 42,
            familyPlanningMethodAccepted: dayOffset === 42 ? 'lam' : undefined,
            malePartnerPresentPNC: true,
            createdById: midwife?.id ?? admin.id,
          },
        });
      }
    }
  }
  console.log('✅ Maternity data created');
};

// ─────────────────────────────────────────────────────────────
// Main test data seeding
// ─────────────────────────────────────────────────────────────
export const seedTestData = async (force: boolean = false) => {
  if (!SEEDING_ENABLED) return { success: false, message: 'Seeding disabled', seedingDisabled: true };
  if (isProduction && !force) return { success: false, message: 'Disabled in production', productionSafety: true };

  console.log('🧪 Seeding test data...');
  try {
    const testDataExists = await hasTestData();
    if (testDataExists && !force) {
      await seedTestUsers();
      console.log('✅ Test data already exists. Skipping seeding.');
      return { success: true, message: 'Test data exists', skipped: true };
    }
    if (testDataExists && force) {
      console.log('🗑️ Deleting existing test data (force mode)...');
      await deleteTestData(true);
    }

    // ── Users + RBAC + StaffProfiles ─────────────────────────
    await seedTestUsers();

    // ── Reference data ───────────────────────────────────────
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    const doctor = await prisma.user.findFirst({ where: { role: UserRole.doctor } });
    const nurse = await prisma.user.findFirst({ where: { role: UserRole.nurse } });
    const midwife = await prisma.user.findFirst({ where: { role: UserRole.midwife } });
    const labTech = await prisma.user.findFirst({ where: { role: UserRole.lab_tech } });
    const pharmacist = await prisma.user.findFirst({ where: { role: UserRole.pharmacist } });
    const accounts = await prisma.user.findFirst({ where: { role: UserRole.accounts } });

    if (!admin || !doctor) throw new Error('Required users not found. Run core seeding first.');

    const malariaDiag = await prisma.diagnosis.findFirst({
      where: { OR: [{ icdCode: 'B54' }, { name: { contains: 'malaria', mode: 'insensitive' } }] },
    });
    const hypertensionDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'I10' } });
    const herniaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'K40.90' } });
    const asthmaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'J45.909' } });

    const generalConsult = await prisma.serviceCatalog.findFirst({ where: { code: 'CONS-GEN' } });
    const specialistConsult = await prisma.serviceCatalog.findFirst({ where: { code: 'CONS-SPEC' } });

    const malariaLab = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'lab_test', name: { contains: 'malaria', mode: 'insensitive' } },
    });
    const fbcLab = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'lab_test', name: { contains: 'full blood', mode: 'insensitive' } },
    });
    const urinalysisLab = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'lab_test', name: { contains: 'urinalysis', mode: 'insensitive' } },
    });
    const rbsLab = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'lab_test', name: { contains: 'glucose', mode: 'insensitive' } },
    });
    const chestXray = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'scan', name: { contains: 'chest', mode: 'insensitive' } },
    });
    const ultrasound = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'scan', name: { contains: 'ultrasound', mode: 'insensitive' } },
    });
    const paracetamol = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'medication', name: { contains: 'paracetamol', mode: 'insensitive' } },
    });
    const artesunate = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'medication', name: { contains: 'artesunate', mode: 'insensitive' } },
    });
    const amlodipine = await prisma.serviceCatalog.findFirst({
      where: { serviceType: 'medication', name: { contains: 'amlodipine', mode: 'insensitive' } },
    });

    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    const privateProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'private' } });

    const medDept = await prisma.department.findFirst({ where: { name: 'Medical' } });
    const surgeryDept = await prisma.department.findFirst({ where: { name: 'Surgery' } });
    const obsGynDept = await prisma.department.findFirst({ where: { name: 'Obstetrics & Gynecology' } });
    const pediatricsDept = await prisma.department.findFirst({ where: { name: 'Pediatrics' } });
    const generalWard = await prisma.ward.findFirst({ where: { wardType: 'general' } });

    if (!generalConsult || !nhisProvider) throw new Error('Core data incomplete. Run core seeding first.');

    // ── Patients 1001–1010 ───────────────────────────────────
    const patientsData = [
      { folderNumber: generatePatientNumber(), surname: 'Mensah',   otherNames: 'Kwame',      gender: Gender.male,   dateOfBirth: new Date('1985-05-15'), contact: '+233244111111', address: '123 Liberation Road, Accra',       paymentMode: PaymentMode.cash,             registeredBy: admin.fullName, registeredAt: daysAgo(30), insuranceDetails: {} },
      { folderNumber: generatePatientNumber(), surname: 'Serwaa',   otherNames: 'Ama',        gender: Gender.female, dateOfBirth: new Date('1990-08-22'), contact: '+233244222222', address: '456 Independence Ave, Kumasi',     paymentMode: PaymentMode.nhis, insuranceProviderId: nhisProvider.id, registeredBy: admin.fullName, registeredAt: daysAgo(25), insuranceDetails: { memberId: 'NHIS-24593', startDate: '2024-01-01', endDate: '2024-12-31' } },
      { folderNumber: generatePatientNumber(), surname: 'Asante',   otherNames: 'Yaw',        gender: Gender.male,   dateOfBirth: new Date('1978-11-10'), contact: '+233244333333', address: '789 Hospital Road, Takoradi',      paymentMode: PaymentMode.private_insurance, insuranceProviderId: privateProvider?.id, registeredBy: admin.fullName, registeredAt: daysAgo(20), insuranceDetails: { policyNumber: 'PRV-87654', provider: privateProvider?.name ?? 'Acacia Health' } },
      { folderNumber: generatePatientNumber(), surname: 'Adjei',    otherNames: 'Esi',        gender: Gender.female, dateOfBirth: new Date('1995-03-18'), contact: '+233244444444', address: '321 Beach Drive, Cape Coast',      paymentMode: PaymentMode.nhis, insuranceProviderId: nhisProvider.id, registeredBy: admin.fullName, registeredAt: daysAgo(15), insuranceDetails: { memberId: 'NHIS-38762' } },
      { folderNumber: generatePatientNumber(), surname: 'Ofori',    otherNames: 'Kofi',       gender: Gender.male,   dateOfBirth: new Date('2018-12-01'), contact: '+233244555555', address: '555 Market Street, Tema',          paymentMode: PaymentMode.cash,             registeredBy: admin.fullName, registeredAt: daysAgo(10), insuranceDetails: {} },
      { folderNumber: generatePatientNumber(), surname: 'Mensah',   otherNames: 'Grace',      gender: Gender.female, dateOfBirth: new Date('1992-06-15'), contact: '+233244600001', address: '10 Maternity Lane, Accra',         paymentMode: PaymentMode.nhis, insuranceProviderId: nhisProvider?.id, registeredBy: admin.fullName, registeredAt: daysAgo(180), insuranceDetails: { memberId: 'NHIS-MAT-001' } },
      { folderNumber: generatePatientNumber(), surname: 'Amankwah', otherNames: 'Frederica',  gender: Gender.female, dateOfBirth: new Date('1988-03-22'), contact: '+233244600002', address: '25 Prenatal Street, Kumasi',       paymentMode: PaymentMode.nhis, insuranceProviderId: nhisProvider?.id, registeredBy: admin.fullName, registeredAt: daysAgo(150), insuranceDetails: { memberId: 'NHIS-MAT-002' } },
      { folderNumber: generatePatientNumber(), surname: 'Dapaah',   otherNames: 'Victoria',   gender: Gender.female, dateOfBirth: new Date('1995-11-08'), contact: '+233244600003', address: '18 ANC Road, Takoradi',            paymentMode: PaymentMode.cash,             registeredBy: admin.fullName, registeredAt: daysAgo(120), insuranceDetails: {} },
      { folderNumber: generatePatientNumber(), surname: 'Boateng',  otherNames: 'Christina',  gender: Gender.female, dateOfBirth: new Date('1990-07-30'), contact: '+233244600004', address: '42 Delivery Ave, Cape Coast',      paymentMode: PaymentMode.nhis, insuranceProviderId: nhisProvider?.id, registeredBy: admin.fullName, registeredAt: daysAgo(200), insuranceDetails: { memberId: 'NHIS-MAT-004' } },
      { folderNumber: generatePatientNumber(), surname: 'Nyarko',   otherNames: 'Benedicta',  gender: Gender.female, dateOfBirth: new Date('1993-09-12'), contact: '+233244600005', address: '8 Postnatal Circle, Tema',         paymentMode: PaymentMode.private_insurance, insuranceProviderId: privateProvider?.id, registeredBy: admin.fullName, registeredAt: daysAgo(160), insuranceDetails: { policyNumber: 'PRV-MAT-005' } },
    ];

    const patients: any[] = [];
    for (const p of patientsData) {
      const patient = await prisma.patient.upsert({
        where: { folderNumber: p.folderNumber },
        create: { ...p, createdAt: new Date(), updatedAt: new Date() },
        update: { ...p, updatedAt: new Date() },
      });
      patients.push(patient);
    }
    console.log(`✅ Created ${patients.length} test patients (${patients.map((p) => p.folderNumber).join(', ')})`);

    // ── Corporate patients 1011+ ─────────────────────────────
    console.log('🏢 Creating corporate patients...');
    const corporateProviders = await prisma.insuranceProvider.findMany({ where: { type: 'corporate' } });
    if (corporateProviders.length === 0) {
      console.log('⚠️  No corporate insurance providers found. Run core seeding first.');
    }
    const corporateEmployees = await prisma.corporateEmployee.findMany({ include: { account: true } });
    const createdCorporatePatients: any[] = [];
    let corporateCount = 0;

    for (const employee of corporateEmployees) {
      if (corporateCount >= 5) break;
      const corporateProvider = corporateProviders.find((p) => p.name === employee.account.companyName);
      const patient = await prisma.patient.create({
        data: {
          folderNumber: generatePatientNumber(),
          surname: employee.lastName,
          otherNames: employee.firstName,
          gender: employee.gender ?? Gender.male,
          dateOfBirth: employee.dateOfBirth ?? new Date('1990-01-01'),
          contact: employee.phone ?? '+233200000000',
          address: employee.account.address ?? `${employee.account.companyName} Staff Quarters`,
          paymentMode: PaymentMode.corporate,
          insuranceProviderId: corporateProvider?.id ?? undefined,
          insuranceDetails: { employeeId: employee.employeeId, company: employee.account.companyName, relationship: 'employee' },
          registeredBy: admin.fullName,
          registeredAt: daysAgo(30),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      createdCorporatePatients.push(patient);
      patients.push(patient);
      corporateCount++;
    }
    console.log(`✅ Created ${createdCorporatePatients.length} corporate patients (${createdCorporatePatients.map((p) => p.folderNumber).join(', ')})`);

    // ── Maternity ────────────────────────────────────────────
    await createMaternityData(patients, midwife, admin);

    // ── Regular attendances ──────────────────────────────────
    const attendances: any[] = [];

    const att1Number = generateAttendanceNumber();
    const att1 = await prisma.attendance.create({
      data: {
        attendanceNumber: att1Number,
        patientId: patients[0].id,
        dateTime: daysAgo(14),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.cash,
        complaints: 'High fever, severe headache, body aches for 3 days',
        medicalNotes: 'Patient presented with classic malaria symptoms. RDT positive. T 38.5°C, PR 98/min, RR 20/min, BP 130/85. No jaundice or pallor. Prescribed Artesunate 50mg BD x 3 days + Paracetamol 1g 8 hourly prn.',
        clinicalNotes: {
          historyPresentingComplaint: '3-day history of high-grade fever, generalised body pains, headache',
          physicalExamination: 'T 38.5°C, PR 98/min, RR 20/min, BP 130/85. No jaundice or pallor.',
          treatmentPlan: 'Artesunate 50mg BD x 3 days, Paracetamol 1g 8 hourly prn fever',
        },
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att1);

    const att2Number = generateAttendanceNumber();
    const att2 = await prisma.attendance.create({
      data: {
        attendanceNumber: att2Number,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: daysAgo(10),
        attendanceType: AttendanceType.chronic_followup,
        paymentMode: PaymentMode.nhis,
        nhisCCCCode: '24593',
        complaints: 'Routine hypertension follow-up, mild headache',
        medicalNotes: 'Patient stable on amlodipine. BP 135/85. Continue current medication. Review in 1 month.',
        clinicalNotes: {
          historyPresentingComplaint: 'Known hypertensive for 5 years. Follow-up visit.',
          physicalExamination: 'BP 135/85, PR 78/min, no pedal oedema. Cardiovascular exam normal.',
          treatmentPlan: 'Continue Amlodipine 5mg daily. Review in 1 month.',
        },
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.specialist,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att2);

    const att3Number = generateAttendanceNumber();

    let surgicalBed = generalWard
      ? await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } })
      : null;
    if (!surgicalBed && generalWard) {
      surgicalBed = await prisma.bed.create({
        data: {
          wardId: generalWard.id,
          bedNumber: `${generalWard.wardName.substring(0, 3).toUpperCase()}-SURG-01`,
          isOccupied: false,
        },
      });
    }

    const att3 = await prisma.attendance.create({
      data: {
        attendanceNumber: att3Number,
        patientId: patients[2].id,
        insuranceProviderId: privateProvider?.id,
        dateTime: daysAgo(7),
        attendanceType: AttendanceType.surgery,
        paymentMode: PaymentMode.private_insurance,
        complaints: 'Inguinal swelling that increases with coughing for 6 months',
        medicalNotes: 'Right inguinal hernia confirmed. Elective repair completed. Discharged day 1 post-op.',
        clinicalNotes: {
          historyPresentingComplaint: 'Right groin swelling, reducible, increases with standing/coughing',
          physicalExamination: 'Visible right inguinal swelling, reducible, cough impulse positive',
          treatmentPlan: 'Right inguinal hernia repair — completed. Discharged.',
        },
        createdById: doctor.id,
        status: AttendanceStatus.discharged,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        visitCategory: VisitCategory.specialist,
        serviceCategory: ServiceCategory.ipd,
        encounterCategory: EncounterCategory.ipd,
        bedId: surgicalBed?.id,
        wardId: generalWard?.id,
      },
    });
    attendances.push(att3);

    const att4Number = generateAttendanceNumber();
    const att4 = await prisma.attendance.create({
      data: {
        attendanceNumber: att4Number,
        patientId: patients[3].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: todayAt(8, 30),
        attendanceType: AttendanceType.antenatal,
        paymentMode: PaymentMode.nhis,
        nhisCCCCode: '38762',
        complaints: 'Routine antenatal check-up, 28 weeks pregnant',
        medicalNotes: 'G2P1 at 28 weeks. Checked in. Awaiting midwife review.',
        createdById: midwife?.id ?? doctor.id,
        status: AttendanceStatus.pending,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att4);

    const att5Number = generateAttendanceNumber();
    const att5 = await prisma.attendance.create({
      data: {
        attendanceNumber: att5Number,
        patientId: patients[4].id,
        dateTime: todayAt(10, 15),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.cash,
        complaints: 'Child with fever and cough for 1 day',
        medicalNotes: 'Vitals recorded at triage. Awaiting paediatric consultation. T 38.9°C.',
        createdById: doctor.id,
        status: AttendanceStatus.pending,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att5);

    const att6Number = generateAttendanceNumber();
    let ipdBed = generalWard
      ? await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } })
      : null;
    if (!ipdBed && generalWard) {
      ipdBed = await prisma.bed.create({
        data: { wardId: generalWard.id, bedNumber: `${generalWard.wardName.substring(0, 3).toUpperCase()}-IPD-01`, isOccupied: false },
      });
    }
    const att6 = await prisma.attendance.create({
      data: {
        attendanceNumber: att6Number,
        patientId: patients[0].id,
        dateTime: todayAt(7, 0),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.cash,
        complaints: 'Acute asthma exacerbation — wheezing and shortness of breath',
        medicalNotes: 'Admitted for nebulisation and observation. RR 24/min, SpO2 93%, bilateral wheeze. Plan: nebulised salbutamol, IV hydrocortisone.',
        clinicalNotes: {
          physicalExamination: 'RR 24/min, SpO2 93%, bilateral wheeze, no cyanosis',
          treatmentPlan: 'Nebulised salbutamol, IV hydrocortisone, ward admission',
        },
        createdById: doctor.id,
        status: AttendanceStatus.admitted,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.ipd,
        visitCategory: VisitCategory.emergency,
        serviceCategory: ServiceCategory.ipd,
        bedId: ipdBed?.id,
        wardId: generalWard?.id,
      },
    });
    attendances.push(att6);

    const att7Number = generateAttendanceNumber();
    let detentionBed = generalWard
      ? await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } })
      : null;
    if (!detentionBed && generalWard) {
      detentionBed = await prisma.bed.create({
        data: { wardId: generalWard.id, bedNumber: `${generalWard.wardName.substring(0, 3).toUpperCase()}-DET-01`, isOccupied: false },
      });
    }
    const att7 = await prisma.attendance.create({
      data: {
        attendanceNumber: att7Number,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: todayAt(9, 30),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.nhis,
        nhisCCCCode: '24594',
        complaints: 'Head injury after minor fall — under observation',
        medicalNotes: 'GCS 15. No focal neurology. Small scalp haematoma. 24-hour detention/observation. CT if symptoms worsen.',
        clinicalNotes: {
          physicalExamination: 'GCS 15, no focal neurology, small scalp haematoma',
          treatmentPlan: 'Observation, repeat GCS checks, CT if symptoms worsen',
        },
        createdById: doctor.id,
        status: AttendanceStatus.admitted,
        totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        encounterCategory: EncounterCategory.daycase,
        visitCategory: VisitCategory.emergency,
        serviceCategory: ServiceCategory.ipd,
        bedId: detentionBed?.id,
        wardId: generalWard?.id,
      },
    });
    attendances.push(att7);

    // ── Corporate attendances (one per corporate patient) ────
    for (const cp of createdCorporatePatients) {
      const emp = corporateEmployees.find((e) => `${e.firstName} ${e.lastName}` === `${cp.otherNames} ${cp.surname}`);
      const accountId = emp?.accountId ?? null;
      const empId = emp?.id ?? null;

      const att = await prisma.attendance.create({
        data: {
          attendanceNumber: generateAttendanceNumber(),
          patientId: cp.id,
          dateTime: daysAgo(3),
          attendanceType: AttendanceType.general_consultation,
          paymentMode: PaymentMode.corporate,
          corporateAccountId: accountId,
          corporateEmployeeId: empId,
          complaints: 'Routine staff medical check-up',
          medicalNotes: 'Annual staff wellness check. Vitals normal. Cleared for work.',
          createdById: doctor.id,
          status: AttendanceStatus.completed,
          encounterCategory: EncounterCategory.opd,
          visitCategory: VisitCategory.general,
          serviceCategory: ServiceCategory.opd,
          totalBill: 0, paidAmount: 0, outstandingBalance: 0,
        },
      });
      attendances.push(att);
    }
    console.log(`✅ Corporate attendances: ${createdCorporatePatients.length}`);

    console.log(`✅ Created ${attendances.length} attendances`);

    // ── Diagnoses ────────────────────────────────────────────
    if (malariaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: { attendanceId: att1.id, diagnosisId: malariaDiag.id, diagnosisType: DiagnosisType.primary, icdCode: malariaDiag.icdCode, presentOnAdmission: PresentOnAdmission.Y, createdById: doctor.id, date: daysAgo(14), notes: 'Confirmed via RDT' },
      });
    }
    if (hypertensionDiag) {
      await prisma.attendanceDiagnosis.create({
        data: { attendanceId: att2.id, diagnosisId: hypertensionDiag.id, diagnosisType: DiagnosisType.primary, icdCode: hypertensionDiag.icdCode, presentOnAdmission: PresentOnAdmission.Y, createdById: doctor.id, date: daysAgo(10), notes: 'Essential hypertension, stable' },
      });
    }
    if (herniaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: { attendanceId: att3.id, diagnosisId: herniaDiag.id, diagnosisType: DiagnosisType.primary, icdCode: herniaDiag.icdCode, presentOnAdmission: PresentOnAdmission.Y, createdById: doctor.id, date: daysAgo(7), notes: 'Right inguinal hernia' },
      });
    }
    if (asthmaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: { attendanceId: att6.id, diagnosisId: asthmaDiag.id, diagnosisType: DiagnosisType.primary, icdCode: asthmaDiag.icdCode, presentOnAdmission: PresentOnAdmission.Y, createdById: doctor.id, date: todayAt(7, 15), notes: 'Acute asthma exacerbation' },
      });
    }
    console.log('✅ Diagnoses added');

    // ── Vitals ───────────────────────────────────────────────
    const vitalsData = [
      { attendanceId: att1.id, patientId: att1.patientId, temperature: 38.5, pulse: 98, respiration: 20, spo2: 96, weight: 70, height: 170, bmi: 24.2, bloodPressure: '130/85', recordedById: nurse?.id ?? doctor.id, recordedAt: daysAgo(14) },
      { attendanceId: att2.id, patientId: att2.patientId, bloodPressure: '135/85', pulse: 78, respiration: 16, spo2: 98, weight: 65, height: 162, bmi: 24.8, recordedById: nurse?.id ?? doctor.id, recordedAt: daysAgo(10) },
      { attendanceId: att3.id, patientId: att3.patientId, bloodPressure: '125/80', pulse: 72, respiration: 14, spo2: 99, weight: 75, height: 175, bmi: 24.5, recordedById: nurse?.id ?? doctor.id, recordedAt: daysAgo(7) },
      { attendanceId: att4.id, patientId: att4.patientId, bloodPressure: '110/70', pulse: 82, respiration: 18, spo2: 99, weight: 68, height: 160, bmi: 26.6, recordedById: midwife?.id ?? nurse?.id ?? doctor.id, recordedAt: todayAt(8, 45) },
      { attendanceId: att5.id, patientId: att5.patientId, temperature: 38.9, pulse: 110, respiration: 28, spo2: 94, weight: 18, height: 105, bmi: 16.3, bloodPressure: '100/65', recordedById: nurse?.id ?? doctor.id, recordedAt: todayAt(10, 20) },
      { attendanceId: att6.id, patientId: att6.patientId, temperature: 36.8, pulse: 102, respiration: 24, spo2: 93, weight: 70, height: 170, bloodPressure: '130/80', recordedById: nurse?.id ?? doctor.id, recordedAt: todayAt(7, 10) },
      { attendanceId: att7.id, patientId: att7.patientId, bloodPressure: '125/78', pulse: 76, respiration: 16, spo2: 99, weight: 65, height: 162, recordedById: nurse?.id ?? doctor.id, recordedAt: todayAt(9, 45) },
    ];
    for (const v of vitalsData) await prisma.vitals.create({ data: v });
    console.log('✅ Vitals added');

    // ── Lab tests ────────────────────────────────────────────
    if (malariaLab?.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att1.id, templateId: malariaLab.labTestTemplateId,
          serviceCatalogId: malariaLab.id, status: LabTestStatus.completed,
          result: { test: 'Malaria RDT', result: 'Positive', species: 'P. falciparum' },
          normalRange: 'Negative', units: 'Qualitative',
          requestedAt: daysAgo(14), completedAt: daysAgo(14),
          createdById: doctor.id, performedById: labTech?.id,
          priority: Priority.urgent,
        },
      });
    }
    if (fbcLab?.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att1.id, templateId: fbcLab.labTestTemplateId,
          serviceCatalogId: fbcLab.id, status: LabTestStatus.completed,
          result: { wbc: 12.5, hb: 12.0, plt: 250 },
          normalRange: 'WBC 4-11, Hb 13-17, Plt 150-450', units: 'varies',
          requestedAt: daysAgo(14), completedAt: daysAgo(14),
          createdById: doctor.id, performedById: labTech?.id,
          priority: Priority.routine,
        },
      });
    }
    if (rbsLab?.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att2.id, templateId: rbsLab.labTestTemplateId,
          serviceCatalogId: rbsLab.id, status: LabTestStatus.completed,
          result: { glucose: 5.2 }, normalRange: '3.9-5.6', units: 'mmol/L',
          requestedAt: daysAgo(10), completedAt: daysAgo(10),
          createdById: doctor.id, performedById: labTech?.id,
          priority: Priority.routine,
        },
      });
    }
    if (urinalysisLab?.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att4.id, templateId: urinalysisLab.labTestTemplateId,
          serviceCatalogId: urinalysisLab.id, status: LabTestStatus.requested,
          requestedAt: todayAt(8, 35),
          createdById: midwife?.id ?? doctor.id, priority: Priority.routine,
        },
      });
    }
    console.log('✅ Lab tests added');

    // ── Scans ────────────────────────────────────────────────
    if (chestXray?.scanTemplateId) {
      await prisma.scan.create({
        data: {
          attendanceId: att5.id, templateId: chestXray.scanTemplateId,
          serviceCatalogId: chestXray.id, scanType: 'xray',
          description: 'Chest X-ray', bodyPart: 'chest',
          status: ScanStatus.requested, requestedAt: todayAt(10, 25),
          createdById: doctor.id, priority: ScanPriority.urgent, imageUrls: [],
        },
      });
    }
    if (ultrasound?.scanTemplateId) {
      await prisma.scan.create({
        data: {
          attendanceId: att4.id, templateId: ultrasound.scanTemplateId,
          serviceCatalogId: ultrasound.id, scanType: 'obstetric',
          description: 'Obstetric ultrasound scan', bodyPart: 'abdomen',
          status: ScanStatus.requested, requestedAt: todayAt(8, 40),
          createdById: midwife?.id ?? doctor.id, priority: ScanPriority.routine, imageUrls: [],
        },
      });
    }
    console.log('✅ Scans added');

    // ── Medications ──────────────────────────────────────────
    if (artesunate) {
      await prisma.medication.create({
        data: {
          attendanceId: att1.id, serviceCatalogId: artesunate.id,
          name: 'Artesunate 50mg', dosage: '2 tablets', frequency: 'Once daily',
          duration: '3 days', quantity: 6, route: 'oral', instructions: 'Take after meals',
          status: MedicationStatus.dispensed, prescribedAt: daysAgo(14), dispensedAt: daysAgo(14),
          prescribedById: doctor.id, dispensedById: pharmacist?.id,
        },
      });
    }
    if (paracetamol) {
      await prisma.medication.create({
        data: {
          attendanceId: att1.id, serviceCatalogId: paracetamol.id,
          name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '8 hourly',
          duration: '3 days', quantity: 9, route: 'oral', instructions: 'Take for fever',
          status: MedicationStatus.dispensed, prescribedAt: daysAgo(14), dispensedAt: daysAgo(14),
          prescribedById: doctor.id, dispensedById: pharmacist?.id,
        },
      });
    }
    if (amlodipine) {
      await prisma.medication.create({
        data: {
          attendanceId: att2.id, serviceCatalogId: amlodipine.id,
          name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily',
          duration: '30 days', quantity: 30, route: 'oral', instructions: 'Take in the morning',
          status: MedicationStatus.prescribed, prescribedAt: daysAgo(10),
          prescribedById: doctor.id,
        },
      });
    }
    console.log('✅ Medications added');

    // ── Services rendered ────────────────────────────────────
    if (generalConsult) {
      await prisma.serviceRendered.createMany({
        data: [
          { attendanceId: att1.id, serviceItemId: generalConsult.id, quantity: 1, performedById: doctor.id, date: daysAgo(14), notes: 'Emergency consultation for malaria' },
          { attendanceId: att3.id, serviceItemId: generalConsult.id, quantity: 1, performedById: doctor.id, date: daysAgo(7), notes: 'Pre-surgical consultation for hernia' },
          { attendanceId: att6.id, serviceItemId: generalConsult.id, quantity: 1, performedById: doctor.id, date: todayAt(7, 30), notes: 'Emergency admission for asthma' },
        ],
      });
    }
    if (specialistConsult) {
      await prisma.serviceRendered.create({
        data: { attendanceId: att2.id, serviceItemId: specialistConsult.id, quantity: 1, performedById: doctor.id, date: daysAgo(10), notes: 'Specialist follow-up for hypertension' },
      });
    }
    console.log('✅ Services rendered added');

    // ── Bills ────────────────────────────────────────────────
    const bill1Number = getBillNumber(att1Number);
    const bill1 = await prisma.bill.create({
      data: {
        billNumber: bill1Number, patientId: patients[0].id, attendanceId: att1.id,
        subtotal: 250.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 250.00,
        insuranceCovered: 0, patientPayable: 250.00, paidAmount: 250.00, balance: 0,
        status: BillStatus.paid, paymentMode: PaymentMode.cash,
        billDate: daysAgo(14), createdById: accounts?.id ?? admin.id,
        claimStatus: ClaimStatus.not_required,
      },
    });
    await prisma.billLineItem.createMany({
      data: [
        { billId: bill1.id, description: 'Emergency Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 100.00, pricingBasis: PaymentMode.cash, lineTotal: 100.00, insuranceCoveredAmount: 0, patientPayableAmount: 100.00, discount: 0 },
        { billId: bill1.id, description: 'Malaria RDT', serviceType: ServiceType.lab_test, quantity: 1, unitPrice: 50.00, pricingBasis: PaymentMode.cash, lineTotal: 50.00, insuranceCoveredAmount: 0, patientPayableAmount: 50.00, discount: 0 },
        { billId: bill1.id, description: 'Artesunate', serviceType: ServiceType.medication, quantity: 1, unitPrice: 60.00, pricingBasis: PaymentMode.cash, lineTotal: 60.00, insuranceCoveredAmount: 0, patientPayableAmount: 60.00, discount: 0 },
        { billId: bill1.id, description: 'Paracetamol', serviceType: ServiceType.medication, quantity: 1, unitPrice: 40.00, pricingBasis: PaymentMode.cash, lineTotal: 40.00, insuranceCoveredAmount: 0, patientPayableAmount: 40.00, discount: 0 },
      ],
    });
    await prisma.payment.create({
      data: { billId: bill1.id, amount: 250.00, paymentMethod: 'cash', reference: generateReceiptNumber(), transactionDate: daysAgo(14), receivedById: accounts?.id ?? admin.id, notes: 'Full payment' },
    });

    const bill2Number = getBillNumber(att2Number);
    const bill2 = await prisma.bill.create({
      data: {
        billNumber: bill2Number, patientId: patients[1].id, attendanceId: att2.id,
        subtotal: 180.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 180.00,
        insuranceCovered: 180.00, patientPayable: 0, paidAmount: 0, balance: 0,
        status: BillStatus.pending, paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id, billDate: daysAgo(10),
        createdById: accounts?.id ?? admin.id, claimStatus: ClaimStatus.pending,
      },
    });
    await prisma.billLineItem.createMany({
      data: [
        { billId: bill2.id, description: 'Specialist Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.nhis, lineTotal: 120.00, insuranceCoveredAmount: 120.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill2.id, description: 'Random Blood Sugar', serviceType: ServiceType.lab_test, quantity: 1, unitPrice: 30.00, pricingBasis: PaymentMode.nhis, lineTotal: 30.00, insuranceCoveredAmount: 30.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill2.id, description: 'Amlodipine', serviceType: ServiceType.medication, quantity: 1, unitPrice: 30.00, pricingBasis: PaymentMode.nhis, lineTotal: 30.00, insuranceCoveredAmount: 30.00, patientPayableAmount: 0, discount: 0 },
      ],
    });

    const bill3Number = getBillNumber(att3Number);
    const bill3 = await prisma.bill.create({
      data: {
        billNumber: bill3Number, patientId: patients[2].id, attendanceId: att3.id,
        subtotal: 1500.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 1500.00,
        insuranceCovered: 1200.00, patientPayable: 300.00, paidAmount: 300.00, balance: 0,
        status: BillStatus.paid, paymentMode: PaymentMode.private_insurance,
        insuranceProviderId: privateProvider?.id, billDate: daysAgo(7),
        createdById: accounts?.id ?? admin.id, claimStatus: ClaimStatus.submitted,
      },
    });
    await prisma.billLineItem.createMany({
      data: [
        { billId: bill3.id, description: 'Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 100.00, pricingBasis: PaymentMode.private_insurance, lineTotal: 100.00, insuranceCoveredAmount: 80.00, patientPayableAmount: 20.00, discount: 0 },
        { billId: bill3.id, description: 'Hernia Repair', serviceType: ServiceType.procedure, quantity: 1, unitPrice: 1200.00, pricingBasis: PaymentMode.private_insurance, lineTotal: 1200.00, insuranceCoveredAmount: 960.00, patientPayableAmount: 240.00, discount: 0 },
        { billId: bill3.id, description: 'Medications', serviceType: ServiceType.medication, quantity: 1, unitPrice: 200.00, pricingBasis: PaymentMode.cash, lineTotal: 200.00, insuranceCoveredAmount: 160.00, patientPayableAmount: 40.00, discount: 0 },
      ],
    });

    const bill4Number = getBillNumber(att4Number);
    const bill4 = await prisma.bill.create({
      data: {
        billNumber: bill4Number, patientId: patients[3].id, attendanceId: att4.id,
        subtotal: 250.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 250.00,
        insuranceCovered: 250.00, patientPayable: 0, paidAmount: 0, balance: 250.00,
        status: BillStatus.draft, paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id, billDate: todayAt(8, 30),
        createdById: accounts?.id ?? admin.id, claimStatus: ClaimStatus.draft,
      },
    });
    await prisma.billLineItem.createMany({
      data: [
        { billId: bill4.id, description: 'Antenatal Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 80.00, pricingBasis: PaymentMode.nhis, lineTotal: 80.00, insuranceCoveredAmount: 80.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill4.id, description: 'Obstetric Ultrasound', serviceType: ServiceType.scan, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.nhis, lineTotal: 120.00, insuranceCoveredAmount: 120.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill4.id, description: 'Urinalysis', serviceType: ServiceType.lab_test, quantity: 1, unitPrice: 50.00, pricingBasis: PaymentMode.nhis, lineTotal: 50.00, insuranceCoveredAmount: 50.00, patientPayableAmount: 0, discount: 0 },
      ],
    });

    const bill5Number = getBillNumber(att5Number);
    const bill5 = await prisma.bill.create({
      data: {
        billNumber: bill5Number, patientId: patients[4].id, attendanceId: att5.id,
        subtotal: 200.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 200.00,
        insuranceCovered: 0, patientPayable: 200.00, paidAmount: 0, balance: 200.00,
        status: BillStatus.draft, paymentMode: PaymentMode.cash,
        billDate: todayAt(10, 15), createdById: accounts?.id ?? admin.id,
        claimStatus: ClaimStatus.not_required,
      },
    });
    await prisma.billLineItem.createMany({
      data: [
        { billId: bill5.id, description: 'Paediatric Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 80.00, pricingBasis: PaymentMode.cash, lineTotal: 80.00, insuranceCoveredAmount: 0, patientPayableAmount: 80.00, discount: 0 },
        { billId: bill5.id, description: 'Chest X-ray', serviceType: ServiceType.scan, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.cash, lineTotal: 120.00, insuranceCoveredAmount: 0, patientPayableAmount: 120.00, discount: 0 },
      ],
    });

    const bill6Number = getBillNumber(att6Number);
    await prisma.bill.create({
      data: {
        billNumber: bill6Number, patientId: patients[0].id, attendanceId: att6.id,
        subtotal: 450.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 450.00,
        insuranceCovered: 0, patientPayable: 450.00, paidAmount: 0, balance: 450.00,
        status: BillStatus.pending, paymentMode: PaymentMode.cash,
        billDate: todayAt(7, 0), createdById: accounts?.id ?? admin.id,
        claimStatus: ClaimStatus.not_required,
      },
    });

    const bill7Number = getBillNumber(att7Number);
    await prisma.bill.create({
      data: {
        billNumber: bill7Number, patientId: patients[1].id, attendanceId: att7.id,
        subtotal: 180.00, discount: 0, waiverAmount: 0, taxAmount: 0, totalAmount: 180.00,
        insuranceCovered: 180.00, patientPayable: 0, paidAmount: 0, balance: 180.00,
        status: BillStatus.pending, paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id, billDate: todayAt(9, 30),
        createdById: accounts?.id ?? admin.id, claimStatus: ClaimStatus.draft,
      },
    });

    console.log(`✅ Bills created: ${[bill1Number, bill2Number, bill3Number, bill4Number, bill5Number, bill6Number, bill7Number].join(', ')}`);

    // ── Insurance claims ─────────────────────────────────────
    const createdClaims: string[] = [];
    if (nhisProvider) {
      const claim2Number = getClaimNumber(att2Number, 'nhis');
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: claim2Number, billId: bill2.id, patientId: patients[1].id,
          insuranceProviderId: nhisProvider.id, attendanceId: att2.id,
          totalClaimAmount: 180.00, status: ClaimStatus.submitted,
          diagnosisCodes: [hypertensionDiag?.icdCode ?? 'I10'],
          procedureCodes: [], labTestCodes: ['RBS'],
          serviceCodes: [specialistConsult?.code ?? 'CONS-SPEC'],
          scanCodes: [], gdrgCodes: ['MEDI32A'], nhisServiceCodes: ['OPDC06A'],
          submissionDate: daysAgo(8), createdById: accounts?.id ?? admin.id,
        },
      });
      createdClaims.push(claim2Number);
    }
    if (privateProvider) {
      const claim3Number = getClaimNumber(att3Number, 'private_insurance');
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: claim3Number, billId: bill3.id, patientId: patients[2].id,
          insuranceProviderId: privateProvider.id, attendanceId: att3.id,
          totalClaimAmount: 1500.00, status: ClaimStatus.approved,
          diagnosisCodes: [herniaDiag?.icdCode ?? 'K40.90'],
          procedureCodes: ['ASUR20A'], labTestCodes: [],
          serviceCodes: [generalConsult?.code ?? 'CONS-GEN'],
          scanCodes: [], gdrgCodes: ['ASUR20A'], nhisServiceCodes: [],
          submissionDate: daysAgo(6), approvalDate: daysAgo(5), approvedAmount: 1200.00,
          createdById: accounts?.id ?? admin.id,
        },
      });
      createdClaims.push(claim3Number);
    }
    if (nhisProvider) {
      const claim4Number = getClaimNumber(att4Number, 'nhis');
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: claim4Number, billId: bill4.id, patientId: patients[3].id,
          insuranceProviderId: nhisProvider.id, attendanceId: att4.id,
          totalClaimAmount: 250.00, status: ClaimStatus.draft,
          diagnosisCodes: ['Z34.00'], procedureCodes: [],
          labTestCodes: ['Urinalysis'],
          serviceCodes: [generalConsult?.code ?? 'CONS-GEN'],
          scanCodes: ['Obstetric Ultrasound'],
          gdrgCodes: ['OPDC02A'], nhisServiceCodes: ['OPDC02A'],
          createdById: accounts?.id ?? admin.id,
        },
      });
      createdClaims.push(claim4Number);
    }
    if (createdClaims.length > 0) console.log(`✅ Insurance claims created: ${createdClaims.join(', ')}`);

    // ── Referrals ────────────────────────────────────────────
    await prisma.referralRecord.create({
      data: {
        referralNumber: generateReferralNumber(),
        patientId: patients[4].id, attendanceId: att5.id,
        referralType: ReferralType.outgoing,
        referralReason: 'Paediatric fever — pending specialist review if needed',
        referralNotes: 'Child awaiting initial consultation. Referral prepared if required.',
        urgency: Priority.routine,
        referredToDepartment: pediatricsDept?.name,
        referredToDoctor: doctor.fullName,
        referralDate: todayAt(10, 15),
        status: ReferralStatus.pending,
        createdById: doctor.id,
      },
    });
    await prisma.referralRecord.create({
      data: {
        referralNumber: generateReferralNumber(),
        patientId: patients[2].id, attendanceId: att3.id,
        referralType: ReferralType.outgoing,
        referralReason: 'Right inguinal hernia requiring surgical repair',
        referralNotes: 'Reducible hernia. Refer for elective repair.',
        urgency: Priority.routine,
        referredToDepartment: surgeryDept?.name,
        referredToDoctor: doctor.fullName,
        referralDate: daysAgo(10),
        status: ReferralStatus.completed,
        outcomeNotes: 'Surgery scheduled and performed.',
        completedAt: daysAgo(7),
        createdById: doctor.id,
      },
    });
    console.log('✅ Referrals created');

    // ── Admissions ───────────────────────────────────────────
    await prisma.admission.create({
      data: {
        attendanceId: att3.id,
        admissionNumber: getAdmissionNumber(att3Number),
        admissionType: AdmissionType.elective,
        admissionSource: AdmissionSource.opd,
        dischargeStatus: DischargeStatus.home,
        admissionDate: daysAgo(7),
        dischargeDate: daysAgo(6),
      },
    });
    if (surgicalBed) await prisma.bed.update({ where: { id: surgicalBed.id }, data: { isOccupied: false } });

    await prisma.admission.create({
      data: {
        attendanceId: att6.id,
        admissionNumber: getAdmissionNumber(att6Number),
        admissionType: AdmissionType.emergency,
        admissionSource: AdmissionSource.emergency,
        admissionDate: todayAt(7, 0),
      },
    });
    if (ipdBed) await prisma.bed.update({ where: { id: ipdBed.id }, data: { isOccupied: true } });

    await prisma.admission.create({
      data: {
        attendanceId: att7.id,
        admissionNumber: getAdmissionNumber(att7Number),
        admissionType: AdmissionType.detention_observation,
        admissionSource: AdmissionSource.emergency,
        admissionDate: todayAt(9, 30),
      },
    });
    if (detentionBed) await prisma.bed.update({ where: { id: detentionBed.id }, data: { isOccupied: true } });

    console.log('✅ Admissions created');

    // ── Appointments ─────────────────────────────────────────
    await prisma.appointment.createMany({
      data: [
        { appointmentNumber: generateAppointmentNumber(), patientId: patients[0].id, clinicianId: doctor.id, clinicianRole: doctor.role, departmentId: medDept?.id, title: 'Malaria Follow-up', description: 'Post-treatment review for malaria', scheduledAt: new Date(new Date(daysAgo(7)).setHours(9, 0, 0, 0)), duration: 30, status: AppointmentStatus.completed, type: AppointmentType.follow_up, createdBy: admin.id },
        { appointmentNumber: generateAppointmentNumber(), patientId: patients[1].id, clinicianId: doctor.id, clinicianRole: doctor.role, departmentId: medDept?.id, title: 'Hypertension Review', description: 'Monthly BP check and medication review', scheduledAt: new Date(new Date(daysAgo(3)).setHours(11, 30, 0, 0)), duration: 20, status: AppointmentStatus.checked_in, type: AppointmentType.follow_up, checkedIn: true, checkedInAt: new Date(new Date(daysAgo(3)).setHours(11, 25, 0, 0)), createdBy: admin.id },
        { appointmentNumber: generateAppointmentNumber(), patientId: patients[2].id, clinicianId: nurse?.id, clinicianRole: nurse?.role ?? null, departmentId: surgeryDept?.id, title: 'Post-operative Review', description: 'Follow-up after hernia repair', scheduledAt: new Date(new Date(daysFromNow(7)).setHours(14, 0, 0, 0)), duration: 30, status: AppointmentStatus.scheduled, type: AppointmentType.follow_up, createdBy: doctor.id },
        { appointmentNumber: generateAppointmentNumber(), patientId: patients[3].id, clinicianId: midwife?.id, clinicianRole: midwife?.role ?? null, departmentId: obsGynDept?.id, title: 'Antenatal Visit', description: 'Routine ANC at 32 weeks', scheduledAt: new Date(new Date(daysFromNow(25)).setHours(9, 30, 0, 0)), duration: 45, status: AppointmentStatus.scheduled, type: AppointmentType.antenatal, createdBy: midwife?.id ?? admin.id },
        { appointmentNumber: generateAppointmentNumber(), patientId: patients[4].id, clinicianId: nurse?.id, clinicianRole: nurse?.role ?? null, departmentId: pediatricsDept?.id, title: 'Vaccination Appointment', description: 'Routine childhood vaccination', scheduledAt: new Date(new Date(daysAgo(2)).setHours(10, 0, 0, 0)), duration: 20, status: AppointmentStatus.completed, type: AppointmentType.vaccination, createdBy: admin.id },
      ],
    });
    console.log('✅ Appointments created');

    // ── Family planning services ─────────────────────────────
    const fpAcceptor = patients.find((p) => p.folderNumber === '1004');
    if (fpAcceptor) {
      await prisma.familyPlanningService.create({
        data: {
          patientId: fpAcceptor.id,
          attendanceId: att4.id,
          serviceDate: todayAt(8, 50),
          method: 'implant_implanon',
          methodCategory: 'modern_long_acting',
          isNewAcceptor: true,
          counsellingGiven: true,
          informedConsent: true,
          nextFollowUpDate: daysFromNow(90),
          isPostpartum: false,
          isPostAbortion: false,
          cypFactor: 2.5,
          providedById: midwife?.id ?? admin.id,
          notes: 'New acceptor — Implanon inserted',
        },
      });
      console.log('✅ Family planning service recorded');
    }

    // ── Notifications ────────────────────────────────────────
    await prisma.notification.createMany({
      data: [
        { userId: doctor.id, title: 'Lab Results Available', message: 'Malaria test results are ready for Kwame Mensah', type: 'clinical', priority: 'medium', actionType: 'lab_results', actionId: att1.id, actionUrl: `/attendances/${att1.id}`, createdAt: daysAgo(14) },
        { userId: accounts?.id ?? admin.id, title: 'Claim Ready for Submission', message: 'NHIS claim for Ama Serwaa is ready for submission', type: 'billing', priority: 'medium', actionType: 'claim', actionId: bill2.id, actionUrl: `/claims/${bill2.id}`, createdAt: daysAgo(10) },
        { userId: pharmacist?.id ?? admin.id, title: 'Medication Dispensed', message: 'Medications have been dispensed for Kofi Ofori', type: 'success', priority: 'low', actionType: 'medication', actionId: att5.id, actionUrl: `/attendances/${att5.id}/medications`, createdAt: daysAgo(3) },
        { userId: admin.id, title: '👋 Welcome Admin', message: 'You are logged in as System Administrator.', type: 'success', priority: 'medium', isRead: false, createdAt: new Date() },
        { userId: admin.id, title: '✅ System Ready', message: 'All modules are operational. Test data seeded successfully.', type: 'info', priority: 'low', isRead: false, createdAt: new Date() },
      ],
    });
    console.log('✅ Notifications created');

    // ── Summary — computed from DB ───────────────────────────
    const [
      totalPatients, totalAttendances, totalBills, totalClaims, totalReferrals,
      totalAdmissions, totalAppointments, totalNotifications,
      totalStaffProfiles, totalJobGrades,
    ] = await Promise.all([
      prisma.patient.count({ where: { folderNumber: { in: TEST_FOLDER_NUMBERS } } }),
      prisma.attendance.count({ where: { patientId: { in: patients.map((p) => p.id) } } }),
      prisma.bill.count({ where: { patientId: { in: patients.map((p) => p.id) } } }),
      prisma.insuranceClaim.count({ where: { patientId: { in: patients.map((p) => p.id) } } }),
      prisma.referralRecord.count({ where: { patientId: { in: patients.map((p) => p.id) } } }),
      prisma.admission.count(),
      prisma.appointment.count(),
      prisma.notification.count(),
      prisma.staffProfile.count(),
      prisma.jobGrade.count(),
    ]);

    console.log('\n🎉 TEST DATA SEEDING COMPLETED!');
    console.log('\n📋 SUMMARY (computed from DB):');
    console.log(`   Patients (test):       ${totalPatients}`);
    console.log(`   Attendances:           ${totalAttendances}`);
    console.log(`   Bills:                 ${totalBills}`);
    console.log(`   Insurance Claims:      ${totalClaims}  (${createdClaims.join(', ') || '—'})`);
    console.log(`   Referrals:             ${totalReferrals}`);
    console.log(`   Admissions:            ${totalAdmissions}`);
    console.log(`   Appointments:          ${totalAppointments}`);
    console.log(`   Notifications:         ${totalNotifications}`);
    console.log(`   Staff Profiles:        ${totalStaffProfiles}`);
    console.log(`   Job Grades:            ${totalJobGrades}`);

    console.log('\n👨‍⚕️ TEST LOGINS:');
    const logins: Array<[string, string, string]> = [
      ['superadmin',   'superadmin123', 'Super Admin'],
      ['admin',        'admin123',      'Admin'],
      ['hr1',          'hr123',         'HR Officer'],
      ['doctor1',      'doctor123',     'Doctor'],
      ['nurse1',       'nurse123',      'Nurse'],
      ['midwife1',     'midwife123',    'Midwife'],
      ['accounts1',    'accounts123',   'Accounts'],
      ['lab1',         'lab123',        'Lab Tech'],
      ['sonographer1', 'scan123',       'Sonographer'],
      ['pharma1',      'pharma123',     'Pharmacist'],
      ['records1',     'records123',    'Records'],
    ];
    for (const [u, p, r] of logins) console.log(`   ${u}/${p} (${r})`);

    return {
      success: true,
      message: 'Test data seeded successfully',
      patients: totalPatients,
      attendances: totalAttendances,
      corporatePatients: createdCorporatePatients.length,
    };
  } catch (error: any) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────
// Database initialization
// ─────────────────────────────────────────────────────────────
export const initializeDatabase = async () => {
  console.log('🚀 Initializing database...');
  console.log(`📝 Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`🌱 Seeding enabled: ${SEEDING_ENABLED}`);

  try {
    if (isProduction && process.env.RUN_SEED !== 'true') {
      console.log('🏭 Production: Skipping auto-seeding');
      return { initialized: true, seeded: false, reason: 'production' };
    }

    const testDataExists = await hasTestData();
    if (testDataExists) {
      console.log('✅ Test data already exists. Skipping seeding.');
      return { initialized: true, seeded: false, reason: 'already_exists' };
    }

    const realDataExists = await hasRealData();
    if (realDataExists) {
      console.log('🚨 Real data detected in database. Test seeding aborted.');
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