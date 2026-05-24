// src/seed/testSeed.ts - UPDATED with new schema and numbering strategy
import { PrismaClient, UserRole, Gender, PaymentMode, AdmissionType, AdmissionSource, EncounterCategory, VisitCategory, BillStatus, ClaimStatus, AttendanceStatus, LabTestStatus, ProcedureStatus, ScanStatus, MedicationStatus, AttendanceType, PresentOnAdmission, DiagnosisType, ServiceCategory, Priority, ScanPriority, AppointmentStatus, AppointmentType, ReferralType, ReferralStatus, ServiceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// ============================================
// NUMBERING STRATEGY (Matches the schema)
// ============================================
// - Patient numbers: sequential (1001, 1002, 1003...)
// - Attendance numbers: sequential master sequence (1001, 1002, 1003...)
// - Admission numbers: SAME as attendance number (no separate counter)
// - Bill numbers: BILL-{attendanceNumber}
// - Claim numbers: {PREFIX}-{attendanceNumber} (NHIS-, PRV-, CORP-)
// - Receipt numbers: sequential (RCP-1001, RCP-1002...)
// - Referral numbers: sequential (REF-1001, REF-1002...)
// - Appointment numbers: sequential (APT-1001, APT-1002...)

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

// Derived numbers (based on attendance number)
const getAdmissionNumber = (attendanceNumber: string) => attendanceNumber;
const getBillNumber = (attendanceNumber: string) => `BILL-${attendanceNumber}`;
const getClaimNumber = (attendanceNumber: string, paymentMode: string) => {
  const prefix = paymentMode === 'nhis' ? 'NHIS' : paymentMode === 'private_insurance' ? 'PRV' : 'CORP';
  return `${prefix}-${attendanceNumber}`;
};

// Date helpers
const daysAgo = (days: number, baseDate: Date = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d;
};

const hoursAgo = (hours: number, baseDate: Date = new Date()) => {
  const d = new Date(baseDate);
  d.setHours(d.getHours() - hours);
  return d;
};

const daysFromNow = (days: number, baseDate: Date = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
};

// ============================================
// SAFETY CHECKS
// ============================================

const hasRealData = async (): Promise<boolean> => {
  const realPatientCount = await prisma.patient.count({
    where: { folderNumber: { not: { in: ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'] } } }
  });
  return realPatientCount > 0;
};

const hasTestData = async (): Promise<boolean> => {
  const testPatientCount = await prisma.patient.count({
    where: { folderNumber: { in: ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'] } }
  });
  return testPatientCount >= 10;
};

// ============================================
// DELETE TEST DATA
// ============================================

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
      where: { folderNumber: { in: ['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008', '1009', '1010'] } },
      select: { id: true }
    });
    const testPatientIds = testPatients.map(p => p.id);

    if (testPatientIds.length === 0) {
      console.log('No test patients found');
      return { success: true, message: 'No test data to delete' };
    }

    const testAttendances = await prisma.attendance.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true }
    });
    const testAttendanceIds = testAttendances.map(a => a.id);

    // Delete in correct order
    await prisma.billLineItem.deleteMany({ where: { bill: { patientId: { in: testPatientIds } } } });
    await prisma.payment.deleteMany({ where: { bill: { patientId: { in: testPatientIds } } } });
    await prisma.bill.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.insuranceClaim.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.referralRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.admission.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.appointment.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: testPatientIds } } });
    
    await prisma.labTest.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.scan.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.procedure.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.medication.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.vitals.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.serviceRendered.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.attendanceDiagnosis.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    await prisma.attendance.deleteMany({ where: { id: { in: testAttendanceIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
    
    await prisma.bed.updateMany({ data: { isOccupied: false, currentPatientId: null } });
    
    console.log('✅ Test data deleted');
    return { success: true, message: 'Test data deleted' };
  } catch (error: any) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ============================================
// MAIN TEST DATA SEEDING
// ============================================

export const seedTestData = async (force: boolean = false) => {
  if (!SEEDING_ENABLED) {
    return { success: false, message: 'Seeding disabled', seedingDisabled: true };
  }

  if (isProduction && !force) {
    return { success: false, message: 'Disabled in production', productionSafety: true };
  }

  console.log('🧪 Seeding test data...');

  try {
    const testDataExists = await hasTestData();
    if (testDataExists && !force) {
      console.log('✅ Test data already exists');
      return { success: true, message: 'Test data exists', skipped: true };
    }

    if (testDataExists && force) {
      await deleteTestData(true);
    }

    if (!force) {
      const realDataExists = await hasRealData();
      if (realDataExists) {
        return { success: false, message: 'Real data detected', realDataDetected: true };
      }
    }

    // =============== CREATE TEST USERS ===============
    console.log('👥 Creating/verifying test users...');
    const testUsersData = [
      { username: 'doctor1', password: hashPassword('doctor123'), fullName: 'Dr. Kofi Mensah', role: UserRole.doctor, email: 'doctor@hospital.com', phone: '+233244222222', licenseNumber: 'MD-12345', specialization: 'General Medicine' },
      { username: 'nurse1', password: hashPassword('nurse123'), fullName: 'Nurse Akua Johnson', role: UserRole.nurse, email: 'nurse@hospital.com', phone: '+233244333333', licenseNumber: 'RN-54321' },
      { username: 'midwife1', password: hashPassword('midwife123'), fullName: 'Midwife Abena Serwaa', role: UserRole.midwife, email: 'midwife@hospital.com', phone: '+233244444444', licenseNumber: 'MW-98765' },
      { username: 'lab1', password: hashPassword('lab123'), fullName: 'Lab Tech Yaw Asare', role: UserRole.lab_tech, email: 'lab@hospital.com', phone: '+233244666666', licenseNumber: 'LT-11223' },
      { username: 'sonographer1', password: hashPassword('scan123'), fullName: 'Sonographer Ama Boateng', role: UserRole.sonographer, email: 'sonographer@hospital.com', phone: '+233244999999', licenseNumber: 'SN-11223' },
      { username: 'pharma1', password: hashPassword('pharma123'), fullName: 'Pharmacist Nana Kwaku', role: UserRole.pharmacist, email: 'pharma@hospital.com', phone: '+233244777777', licenseNumber: 'PH-44556' },
      { username: 'accounts1', password: hashPassword('accounts123'), fullName: 'Accountant Esi Brown', role: UserRole.accounts, email: 'accounts@hospital.com', phone: '+233244888888' },
      { username: 'records1', password: hashPassword('records123'), fullName: 'Records Officer Kwame Osei', role: UserRole.records, email: 'records@hospital.com', phone: '+233244555555' },
    ];

    for (const userData of testUsersData) {
      await prisma.user.upsert({
        where: { username: userData.username },
        create: { ...userData, isActive: true },
        update: {},
      });
    }
    console.log('✅ Test users created/verified');

    // =============== GET CORE DATA REFERENCES ===============
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    const doctor = await prisma.user.findFirst({ where: { role: UserRole.doctor } });
    const nurse = await prisma.user.findFirst({ where: { role: UserRole.nurse } });
    const midwife = await prisma.user.findFirst({ where: { role: UserRole.midwife } });
    const labTech = await prisma.user.findFirst({ where: { role: UserRole.lab_tech } });
    const sonographer = await prisma.user.findFirst({ where: { role: UserRole.sonographer } });
    const pharmacist = await prisma.user.findFirst({ where: { role: UserRole.pharmacist } });
    const accounts = await prisma.user.findFirst({ where: { role: UserRole.accounts } });

    if (!admin || !doctor) {
      throw new Error('Required users not found. Run core seeding first.');
    }

    // Get diagnoses
    const malariaDiag = await prisma.diagnosis.findFirst({ where: { OR: [{ icdCode: 'B54' }, { name: { contains: 'malaria', mode: 'insensitive' } }] } });
    const hypertensionDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'I10' } });
    const diabetesDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'E11.9' } });
    const pneumoniaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'J18.9' } });
    const anaemiaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'D50.9' } });
    const herniaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'K40.90' } });
    const antenatalDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'Z34.00' } });
    const utiDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'N39.0' } });
    const asthmaDiag = await prisma.diagnosis.findFirst({ where: { icdCode: 'J45.909' } });

    // Get services
    const generalConsult = await prisma.serviceCatalog.findFirst({ where: { code: 'CONS-GEN' } });
    const specialistConsult = await prisma.serviceCatalog.findFirst({ where: { code: 'CONS-SPEC' } });
    const emergencyConsult = await prisma.serviceCatalog.findFirst({ where: { code: 'CONS-EMERG' } });
    
    const malariaLab = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'lab_test', name: { contains: 'malaria', mode: 'insensitive' } } });
    const fbcLab = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'lab_test', name: { contains: 'full blood', mode: 'insensitive' } } });
    const urinalysisLab = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'lab_test', name: { contains: 'urinalysis', mode: 'insensitive' } } });
    const rbsLab = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'lab_test', name: { contains: 'glucose', mode: 'insensitive' } } });
    
    const chestXray = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'scan', name: { contains: 'chest', mode: 'insensitive' } } });
    const ultrasound = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'scan', name: { contains: 'ultrasound', mode: 'insensitive' } } });
    
    const paracetamol = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'paracetamol', mode: 'insensitive' } } });
    const artesunate = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'artesunate', mode: 'insensitive' } } });
    const amoxicillin = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'amoxicillin', mode: 'insensitive' } } });
    const amlodipine = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'amlodipine', mode: 'insensitive' } } });
    const metformin = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'metformin', mode: 'insensitive' } } });
    const salbutamol = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'salbutamol', mode: 'insensitive' } } });
    const ibuprofen = await prisma.serviceCatalog.findFirst({ where: { serviceType: 'medication', name: { contains: 'ibuprofen', mode: 'insensitive' } } });

    // Get insurance providers
    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    const privateProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'private' } });

    // Get departments
    const medDept = await prisma.department.findFirst({ where: { name: 'Medical' } });
    const surgeryDept = await prisma.department.findFirst({ where: { name: 'Surgery' } });
    const obsGynDept = await prisma.department.findFirst({ where: { name: 'Obstetrics & Gynecology' } });
    const emergencyDept = await prisma.department.findFirst({ where: { name: 'Emergency' } });
    const pediatricsDept = await prisma.department.findFirst({ where: { name: 'Pediatrics' } });

    // Get wards
    const generalWard = await prisma.ward.findFirst({ where: { wardType: 'general' } });
    const maternityWard = await prisma.ward.findFirst({ where: { wardType: 'maternity' } });
    const pediatricWard = await prisma.ward.findFirst({ where: { wardType: 'pediatric' } });

    if (!generalConsult || !nhisProvider) {
      throw new Error('Core data incomplete. Run core seeding first.');
    }

    // =============== CREATE 10 TEST PATIENTS ===============
    const now = new Date();
    
    const patientsData = [
      {
        folderNumber: generatePatientNumber(), // 1001
        surname: 'Mensah',
        otherNames: 'Kwame',
        gender: Gender.male,
        dateOfBirth: new Date('1985-05-15'),
        contact: '+233244111111',
        address: '123 Liberation Road, Accra',
        paymentMode: PaymentMode.cash,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(30),
        insuranceDetails: {},
      },
      {
        folderNumber: generatePatientNumber(), // 1002
        surname: 'Serwaa',
        otherNames: 'Ama',
        gender: Gender.female,
        dateOfBirth: new Date('1990-08-22'),
        contact: '+233244222222',
        address: '456 Independence Ave, Kumasi',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(25),
        insuranceDetails: { memberId: 'NHIS-24593', startDate: '2024-01-01', endDate: '2024-12-31' },
      },
      {
        folderNumber: generatePatientNumber(), // 1003
        surname: 'Asante',
        otherNames: 'Yaw',
        gender: Gender.male,
        dateOfBirth: new Date('1978-11-10'),
        contact: '+233244333333',
        address: '789 Hospital Road, Takoradi',
        paymentMode: PaymentMode.private_insurance,
        insuranceProviderId: privateProvider?.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(20),
        insuranceDetails: { policyNumber: 'PRV-87654', provider: privateProvider?.name || 'Acacia Health' },
      },
      {
        folderNumber: generatePatientNumber(), // 1004
        surname: 'Adjei',
        otherNames: 'Esi',
        gender: Gender.female,
        dateOfBirth: new Date('1995-03-18'),
        contact: '+233244444444',
        address: '321 Beach Drive, Cape Coast',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(15),
        insuranceDetails: { memberId: 'NHIS-38762' },
      },
      {
        folderNumber: generatePatientNumber(), // 1005
        surname: 'Ofori',
        otherNames: 'Kofi',
        gender: Gender.male,
        dateOfBirth: new Date('2018-12-01'),
        contact: '+233244555555',
        address: '555 Market Street, Tema',
        paymentMode: PaymentMode.cash,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(10),
        insuranceDetails: {},
      },
      // Maternity patients
      {
        folderNumber: generatePatientNumber(), // 1006
        surname: 'Mensah',
        otherNames: 'Grace',
        gender: Gender.female,
        dateOfBirth: new Date('1992-06-15'),
        contact: '+233244600001',
        address: '10 Maternity Lane, Accra',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(180),
        insuranceDetails: { memberId: 'NHIS-MAT-001' },
      },
      {
        folderNumber: generatePatientNumber(), // 1007
        surname: 'Amankwah',
        otherNames: 'Frederica',
        gender: Gender.female,
        dateOfBirth: new Date('1988-03-22'),
        contact: '+233244600002',
        address: '25 Prenatal Street, Kumasi',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(150),
        insuranceDetails: { memberId: 'NHIS-MAT-002' },
      },
      {
        folderNumber: generatePatientNumber(), // 1008
        surname: 'Dapaah',
        otherNames: 'Victoria',
        gender: Gender.female,
        dateOfBirth: new Date('1995-11-08'),
        contact: '+233244600003',
        address: '18 ANC Road, Takoradi',
        paymentMode: PaymentMode.cash,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(120),
        insuranceDetails: {},
      },
      {
        folderNumber: generatePatientNumber(), // 1009
        surname: 'Boateng',
        otherNames: 'Christina',
        gender: Gender.female,
        dateOfBirth: new Date('1990-07-30'),
        contact: '+233244600004',
        address: '42 Delivery Ave, Cape Coast',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(200),
        insuranceDetails: { memberId: 'NHIS-MAT-004' },
      },
      {
        folderNumber: generatePatientNumber(), // 1010
        surname: 'Nyarko',
        otherNames: 'Benedicta',
        gender: Gender.female,
        dateOfBirth: new Date('1993-09-12'),
        contact: '+233244600005',
        address: '8 Postnatal Circle, Tema',
        paymentMode: PaymentMode.private_insurance,
        insuranceProviderId: privateProvider?.id,
        registeredBy: admin.fullName,
        registeredAt: daysAgo(160),
        insuranceDetails: { policyNumber: 'PRV-MAT-005' },
      },
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
    console.log(`✅ Created ${patients.length} test patients (Numbers: ${patients.map(p => p.folderNumber).join(', ')})`);

    // =============== CREATE ATTENDANCES ===============
    const attendances: any[] = [];

    // ATTENDANCE 1001: Cash - Emergency Malaria (Patient 1001)
    const att1Number = generateAttendanceNumber(); // 1001
    const att1 = await prisma.attendance.create({
      data: {
        attendanceNumber: att1Number,
        patientId: patients[0].id,
        dateTime: daysAgo(14),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.cash,
        complaints: 'High fever, severe headache, body aches for 3 days',
        medicalNotes: 'Patient presented with classic malaria symptoms. RDT positive.',
        historyPresentingComplaint: '3-day history of high-grade fever, generalized body pains, headache',
        physicalExamination: 'T 38.5°C, PR 98/min, RR 20/min, BP 130/85. No jaundice or pallor.',
        treatmentPlan: 'Artesunate 50mg BD x 3 days, Paracetamol 1g 8 hourly prn fever',
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att1);

    // ATTENDANCE 1002: NHIS - Chronic Hypertension (Patient 1002)
    const att2Number = generateAttendanceNumber(); // 1002
    const att2 = await prisma.attendance.create({
      data: {
        attendanceNumber: att2Number,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: daysAgo(10),
        attendanceType: AttendanceType.chronic_followup,
        paymentMode: PaymentMode.nhis,
        nhisCCC: '24593',
        complaints: 'Routine hypertension follow-up, mild headache',
        medicalNotes: 'Patient stable on amlodipine. BP 135/85. Continue current medication.',
        historyPresentingComplaint: 'Known hypertensive for 5 years. Follow-up visit.',
        physicalExamination: 'BP 135/85, PR 78/min, no pedal edema. Cardiovascular exam normal.',
        treatmentPlan: 'Continue Amlodipine 5mg daily. Review in 1 month.',
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.specialist,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att2);

    // ATTENDANCE 1003: Private Insurance - Surgical Hernia (Patient 1003)
    const att3Number = generateAttendanceNumber(); // 1003
    const att3 = await prisma.attendance.create({
      data: {
        attendanceNumber: att3Number,
        patientId: patients[2].id,
        insuranceProviderId: privateProvider?.id,
        dateTime: daysAgo(7),
        attendanceType: AttendanceType.surgery,
        paymentMode: PaymentMode.private_insurance,
        complaints: 'Inguinal swelling that increases with coughing for 6 months',
        medicalNotes: 'Diagnosed with right inguinal hernia. Elective repair scheduled.',
        historyPresentingComplaint: 'Right groin swelling, reducible, increases with standing/coughing',
        physicalExamination: 'Visible right inguinal swelling, reducible, cough impulse positive',
        treatmentPlan: 'Right inguinal hernia repair',
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        visitCategory: VisitCategory.specialist,
        serviceCategory: ServiceCategory.ipd,
        encounterCategory: EncounterCategory.ipd,  // ✅ IPD for formal admission
        bedId: bed.id,        // ✅ Assign bed
        wardId: generalWard.id,  // ✅ Assign ward
        status: AttendanceStatus.admitted,  // ✅ Status 'admitted'
      },
    });
    attendances.push(att3);

    // ATTENDANCE 1004: NHIS - Antenatal Visit (Patient 1004)
    const att4Number = generateAttendanceNumber(); // 1004
    const att4 = await prisma.attendance.create({
      data: {
        attendanceNumber: att4Number,
        patientId: patients[3].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: daysAgo(5),
        attendanceType: AttendanceType.antenatal,
        paymentMode: PaymentMode.nhis,
        nhisCCC: '38762',
        complaints: 'Routine antenatal check-up, 28 weeks pregnant',
        medicalNotes: 'Normal pregnancy progression. Fetal heart rate 140bpm. Fundal height 28cm.',
        historyPresentingComplaint: 'G2P1 at 28 weeks, routine ANC visit',
        physicalExamination: 'BP 110/70, FH 28cm, FHR 140bpm, cephalic presentation',
        treatmentPlan: 'Continue iron and folate supplements. Return in 4 weeks.',
        createdById: midwife?.id || doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att4);

    // ATTENDANCE 1005: Cash - Paediatric Pneumonia (Patient 1005)
    const att5Number = generateAttendanceNumber(); // 1005
    const att5 = await prisma.attendance.create({
      data: {
        attendanceNumber: att5Number,
        patientId: patients[4].id,
        dateTime: daysAgo(3),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.cash,
        complaints: 'Child with high fever, cough, and difficulty breathing for 2 days',
        medicalNotes: 'Pediatric patient diagnosed with pneumonia. Started on antibiotics.',
        historyPresentingComplaint: '2-day history of fever, productive cough, tachypnea',
        physicalExamination: 'T 38.9°C, RR 28/min, SpO2 94%, crackles in right lower lung',
        treatmentPlan: 'Amoxicillin 125mg/5ml TID x 7 days, Paracetamol for fever',
        createdById: doctor.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });
    attendances.push(att5);
    console.log(`✅ Created ${attendances.length} attendances (Numbers: ${attendances.map(a => a.attendanceNumber).join(', ')})`);

    // =============== ADD DIAGNOSES ===============
    if (malariaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: att1.id,
          diagnosisId: malariaDiag.id,
          diagnosisType: DiagnosisType.primary,
          icdCode: malariaDiag.icdCode,
          presentOnAdmission: PresentOnAdmission.Y,
          createdById: doctor.id,
          date: daysAgo(14),
          notes: 'Confirmed via RDT',
        },
      });
    }

    if (hypertensionDiag) {
      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: att2.id,
          diagnosisId: hypertensionDiag.id,
          diagnosisType: DiagnosisType.primary,
          icdCode: hypertensionDiag.icdCode,
          presentOnAdmission: PresentOnAdmission.Y,
          createdById: doctor.id,
          date: daysAgo(10),
          notes: 'Essential hypertension, stable',
        },
      });
    }

    if (herniaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: att3.id,
          diagnosisId: herniaDiag.id,
          diagnosisType: DiagnosisType.primary,
          icdCode: herniaDiag.icdCode,
          presentOnAdmission: PresentOnAdmission.Y,
          createdById: doctor.id,
          date: daysAgo(7),
          notes: 'Right inguinal hernia',
        },
      });
    }

    if (antenatalDiag) {
      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: att4.id,
          diagnosisId: antenatalDiag.id,
          diagnosisType: DiagnosisType.primary,
          icdCode: antenatalDiag.icdCode,
          presentOnAdmission: PresentOnAdmission.Y,
          createdById: midwife?.id || doctor.id,
          date: daysAgo(5),
          notes: 'Routine antenatal care',
        },
      });
    }

    if (pneumoniaDiag) {
      await prisma.attendanceDiagnosis.create({
        data: {
          attendanceId: att5.id,
          diagnosisId: pneumoniaDiag.id,
          diagnosisType: DiagnosisType.primary,
          icdCode: pneumoniaDiag.icdCode,
          presentOnAdmission: PresentOnAdmission.Y,
          createdById: doctor.id,
          date: daysAgo(3),
          notes: 'Community-acquired pneumonia',
        },
      });
    }
    console.log('✅ Diagnoses added');

    // =============== ADD VITALS ===============
    await prisma.vitals.create({
      data: {
        attendanceId: att1.id,
        patientId: att1.patientId,
        temperature: 38.5,
        pulse: 98,
        respiration: 20,
        spo2: 96,
        weight: 70,
        height: 170,
        bmi: 24.2,
        bloodPressure: '130/85',
        recordedById: nurse?.id || doctor.id,
        recordedAt: daysAgo(14),
      },
    });

    await prisma.vitals.create({
      data: {
        attendanceId: att2.id,
        patientId: att2.patientId,
        bloodPressure: '135/85',
        pulse: 78,
        respiration: 16,
        spo2: 98,
        weight: 65,
        height: 162,
        bmi: 24.8,
        recordedById: nurse?.id || doctor.id,
        recordedAt: daysAgo(10),
      },
    });

    await prisma.vitals.create({
      data: {
        attendanceId: att3.id,
        patientId: att3.patientId,
        bloodPressure: '125/80',
        pulse: 72,
        respiration: 14,
        spo2: 99,
        weight: 75,
        height: 175,
        bmi: 24.5,
        recordedById: nurse?.id || doctor.id,
        recordedAt: daysAgo(7),
      },
    });

    await prisma.vitals.create({
      data: {
        attendanceId: att4.id,
        patientId: att4.patientId,
        bloodPressure: '110/70',
        pulse: 82,
        respiration: 18,
        spo2: 99,
        weight: 68,
        height: 160,
        bmi: 26.6,
        recordedById: midwife?.id || nurse?.id || doctor.id,
        recordedAt: daysAgo(5),
      },
    });

    await prisma.vitals.create({
      data: {
        attendanceId: att5.id,
        patientId: att5.patientId,
        temperature: 38.9,
        pulse: 110,
        respiration: 28,
        spo2: 94,
        weight: 18,
        height: 105,
        bmi: 16.3,
        bloodPressure: '100/65',
        recordedById: nurse?.id || doctor.id,
        recordedAt: daysAgo(3),
      },
    });
    console.log('✅ Vitals added');

    // =============== ADD LAB TESTS ===============
    if (malariaLab && malariaLab.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att1.id,
          templateId: malariaLab.labTestTemplateId,
          serviceCatalogId: malariaLab.id,
          status: LabTestStatus.completed,
          result: { test: 'Malaria RDT', result: 'Positive', species: 'P. falciparum' },
          normalRange: 'Negative',
          units: 'Qualitative',
          requestedAt: daysAgo(14),
          completedAt: daysAgo(14),
          createdById: doctor.id,
          performedById: labTech?.id,
          priority: Priority.urgent,
        },
      });
    }

    if (fbcLab && fbcLab.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att1.id,
          templateId: fbcLab.labTestTemplateId,
          serviceCatalogId: fbcLab.id,
          status: LabTestStatus.completed,
          result: { wbc: 12.5, hb: 12.0, plt: 250 },
          normalRange: 'WBC 4-11, Hb 13-17, Plt 150-450',
          units: 'varies',
          requestedAt: daysAgo(14),
          completedAt: daysAgo(14),
          createdById: doctor.id,
          performedById: labTech?.id,
          priority: Priority.routine,
        },
      });
    }

    if (rbsLab && rbsLab.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att2.id,
          templateId: rbsLab.labTestTemplateId,
          serviceCatalogId: rbsLab.id,
          status: LabTestStatus.completed,
          result: { glucose: 5.2 },
          normalRange: '3.9-5.6',
          units: 'mmol/L',
          requestedAt: daysAgo(10),
          completedAt: daysAgo(10),
          createdById: doctor.id,
          performedById: labTech?.id,
          priority: Priority.routine,
        },
      });
    }

    if (urinalysisLab && urinalysisLab.labTestTemplateId) {
      await prisma.labTest.create({
        data: {
          attendanceId: att4.id,
          templateId: urinalysisLab.labTestTemplateId,
          serviceCatalogId: urinalysisLab.id,
          status: LabTestStatus.completed,
          result: { protein: 'Negative', glucose: 'Negative', leukocytes: 'Negative' },
          normalRange: 'All negative',
          units: 'Qualitative',
          requestedAt: daysAgo(5),
          completedAt: daysAgo(5),
          createdById: midwife?.id || doctor.id,
          performedById: labTech?.id,
          priority: Priority.routine,
        },
      });
    }
    console.log('✅ Lab tests added');

    // =============== ADD SCANS ===============
    if (chestXray && chestXray.scanTemplateId) {
      await prisma.scan.create({
        data: {
          attendanceId: att5.id,
          templateId: chestXray.scanTemplateId,
          serviceCatalogId: chestXray.id,
          scanType: 'xray',
          description: 'Chest X-ray',
          bodyPart: 'chest',
          status: ScanStatus.completed,
          result: 'Chest X-ray shows right lower lobe infiltrates',
          findings: 'Consolidation in right lower lung field',
          impression: 'Consistent with pneumonia',
          requestedAt: daysAgo(3),
          completedAt: daysAgo(3),
          createdById: doctor.id,
          performedById: sonographer?.id,
          priority: ScanPriority.urgent,
          imageUrls: [],
        },
      });
    }

    if (ultrasound && ultrasound.scanTemplateId) {
      await prisma.scan.create({
        data: {
          attendanceId: att4.id,
          templateId: ultrasound.scanTemplateId,
          serviceCatalogId: ultrasound.id,
          scanType: 'obstetric',
          description: 'Obstetric ultrasound scan',
          bodyPart: 'abdomen',
          status: ScanStatus.completed,
          result: 'Normal pregnancy, singleton, fetal heart rate 140bpm',
          findings: 'Fetal biometry consistent with 28 weeks',
          impression: 'Normal obstetric scan',
          requestedAt: daysAgo(5),
          completedAt: daysAgo(5),
          createdById: midwife?.id || doctor.id,
          performedById: sonographer?.id,
          priority: ScanPriority.routine,
          imageUrls: [],
        },
      });
    }
    console.log('✅ Scans added');

    // =============== ADD MEDICATIONS ===============
    if (artesunate) {
      await prisma.medication.create({
        data: {
          attendanceId: att1.id,
          serviceCatalogId: artesunate.id,
          name: 'Artesunate 50mg',
          dosage: '2 tablets',
          frequency: 'Once daily',
          duration: '3 days',
          quantity: 6,
          route: 'oral',
          instructions: 'Take after meals',
          status: MedicationStatus.dispensed,
          prescribedAt: daysAgo(14),
          dispensedAt: daysAgo(14),
          prescribedById: doctor.id,
          dispensedById: pharmacist?.id,
        },
      });
    }

    if (paracetamol) {
      await prisma.medication.create({
        data: {
          attendanceId: att1.id,
          serviceCatalogId: paracetamol.id,
          name: 'Paracetamol 500mg',
          dosage: '1 tablet',
          frequency: '8 hourly',
          duration: '3 days',
          quantity: 9,
          route: 'oral',
          instructions: 'Take for fever',
          status: MedicationStatus.dispensed,
          prescribedAt: daysAgo(14),
          dispensedAt: daysAgo(14),
          prescribedById: doctor.id,
          dispensedById: pharmacist?.id,
        },
      });
    }

    if (amlodipine) {
      await prisma.medication.create({
        data: {
          attendanceId: att2.id,
          serviceCatalogId: amlodipine.id,
          name: 'Amlodipine 5mg',
          dosage: '1 tablet',
          frequency: 'Once daily',
          duration: '30 days',
          quantity: 30,
          route: 'oral',
          instructions: 'Take in the morning',
          status: MedicationStatus.prescribed,
          prescribedAt: daysAgo(10),
          prescribedById: doctor.id,
        },
      });
    }

    if (amoxicillin) {
      await prisma.medication.create({
        data: {
          attendanceId: att5.id,
          serviceCatalogId: amoxicillin.id,
          name: 'Amoxicillin 250mg/5ml',
          dosage: '5ml',
          frequency: '8 hourly',
          duration: '7 days',
          quantity: 105,
          route: 'oral',
          instructions: 'Shake well before use',
          status: MedicationStatus.dispensed,
          prescribedAt: daysAgo(3),
          dispensedAt: daysAgo(3),
          prescribedById: doctor.id,
          dispensedById: pharmacist?.id,
        },
      });
    }

    if (paracetamol) {
      await prisma.medication.create({
        data: {
          attendanceId: att5.id,
          serviceCatalogId: paracetamol.id,
          name: 'Paracetamol 120mg/5ml',
          dosage: '5ml',
          frequency: '6 hourly',
          duration: '3 days',
          quantity: 60,
          route: 'oral',
          instructions: 'For fever',
          status: MedicationStatus.dispensed,
          prescribedAt: daysAgo(3),
          dispensedAt: daysAgo(3),
          prescribedById: doctor.id,
          dispensedById: pharmacist?.id,
        },
      });
    }
    console.log('✅ Medications added');

    // =============== ADD SERVICE RENDERED ===============
    if (generalConsult) {
      await prisma.serviceRendered.create({
        data: {
          attendanceId: att1.id,
          serviceItemId: generalConsult.id,
          quantity: 1,
          performedById: doctor.id,
          date: daysAgo(14),
          notes: 'Emergency consultation for malaria',
        },
      });
    }

    if (specialistConsult) {
      await prisma.serviceRendered.create({
        data: {
          attendanceId: att2.id,
          serviceItemId: specialistConsult.id,
          quantity: 1,
          performedById: doctor.id,
          date: daysAgo(10),
          notes: 'Specialist follow-up for hypertension',
        },
      });
    }

    if (generalConsult) {
      await prisma.serviceRendered.create({
        data: {
          attendanceId: att3.id,
          serviceItemId: generalConsult.id,
          quantity: 1,
          performedById: doctor.id,
          date: daysAgo(7),
          notes: 'Pre-surgical consultation for hernia',
        },
      });
    }

    if (generalConsult) {
      await prisma.serviceRendered.create({
        data: {
          attendanceId: att4.id,
          serviceItemId: generalConsult.id,
          quantity: 1,
          performedById: midwife?.id || doctor.id,
          date: daysAgo(5),
          notes: 'Antenatal consultation',
        },
      });
    }

    if (generalConsult) {
      await prisma.serviceRendered.create({
        data: {
          attendanceId: att5.id,
          serviceItemId: generalConsult.id,
          quantity: 1,
          performedById: doctor.id,
          date: daysAgo(3),
          notes: 'Paediatric consultation',
        },
      });
    }
    console.log('✅ Services rendered added');

    // =============== CREATE BILLS (Using bill numbers based on attendance) ===============
    
    // Bill 1001: Cash patient (Malaria) - attendance 1001
    const bill1Number = getBillNumber(att1Number); // BILL-1001
    const bill1 = await prisma.bill.create({
      data: {
        billNumber: bill1Number,
        patientId: patients[0].id,
        attendanceId: att1.id,
        subtotal: 250.00,
        discount: 0,
        waiverAmount: 0,
        taxAmount: 0,
        totalAmount: 250.00,
        insuranceCovered: 0,
        patientPayable: 250.00,
        paidAmount: 250.00,
        balance: 0,
        status: BillStatus.paid,
        paymentMode: PaymentMode.cash,
        billDate: daysAgo(14),
        createdById: accounts?.id || admin.id,
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

    // Add payment receipt for bill 1001
    await prisma.payment.create({
      data: {
        billId: bill1.id,
        amount: 250.00,
        paymentMethod: 'cash',
        reference: generateReceiptNumber(), // RCP-1001
        transactionDate: daysAgo(14),
        receivedById: accounts?.id || admin.id,
        notes: 'Full payment',
      },
    });

    // Bill 1002: NHIS patient (Hypertension) - attendance 1002
    const bill2Number = getBillNumber(att2Number); // BILL-1002
    const bill2 = await prisma.bill.create({
      data: {
        billNumber: bill2Number,
        patientId: patients[1].id,
        attendanceId: att2.id,
        subtotal: 180.00,
        discount: 0,
        waiverAmount: 0,
        taxAmount: 0,
        totalAmount: 180.00,
        insuranceCovered: 180.00,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0,
        status: BillStatus.pending,
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        billDate: daysAgo(10),
        createdById: accounts?.id || admin.id,
        claimStatus: ClaimStatus.pending,
      },
    });

    await prisma.billLineItem.createMany({
      data: [
        { billId: bill2.id, description: 'Specialist Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.nhis, lineTotal: 120.00, insuranceCoveredAmount: 120.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill2.id, description: 'Random Blood Sugar', serviceType: ServiceType.lab_test, quantity: 1, unitPrice: 30.00, pricingBasis: PaymentMode.nhis, lineTotal: 30.00, insuranceCoveredAmount: 30.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill2.id, description: 'Amlodipine', serviceType: ServiceType.medication, quantity: 1, unitPrice: 30.00, pricingBasis: PaymentMode.nhis, lineTotal: 30.00, insuranceCoveredAmount: 30.00, patientPayableAmount: 0, discount: 0 },
      ],
    });

    // Bill 1003: Private Insurance patient (Hernia) - attendance 1003
    const bill3Number = getBillNumber(att3Number); // BILL-1003
    const bill3 = await prisma.bill.create({
      data: {
        billNumber: bill3Number,
        patientId: patients[2].id,
        attendanceId: att3.id,
        subtotal: 1500.00,
        discount: 0,
        waiverAmount: 0,
        taxAmount: 0,
        totalAmount: 1500.00,
        insuranceCovered: 1200.00,
        patientPayable: 300.00,
        paidAmount: 300.00,
        balance: 0,
        status: BillStatus.paid,
        paymentMode: PaymentMode.private_insurance,
        insuranceProviderId: privateProvider?.id,
        billDate: daysAgo(7),
        createdById: accounts?.id || admin.id,
        claimStatus: ClaimStatus.submitted,
      },
    });

    await prisma.billLineItem.createMany({
      data: [
        { billId: bill3.id, description: 'Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 100.00, pricingBasis: PaymentMode.private_insurance, lineTotal: 100.00, insuranceCoveredAmount: 80.00, patientPayableAmount: 20.00, discount: 0 },
        { billId: bill3.id, description: 'Hernia Repair', serviceType: ServiceType.procedure, quantity: 1, unitPrice: 1200.00, pricingBasis: PaymentMode.private_insurance, lineTotal: 1200.00, insuranceCoveredAmount: 960.00, patientPayableAmount: 240.00, discount: 0 },
        { billId: bill3.id, description: 'Medications', serviceType: ServiceType.medication, quantity: 1, unitPrice: 200.00, pricingBasis: PaymentMode.cash, lineTotal: 200.00, insuranceCoveredAmount: 160.00, patientPayableAmount: 40.00, discount: 0 },
      ],
    });

    // Bill 1004: NHIS Antenatal - attendance 1004
    const bill4Number = getBillNumber(att4Number); // BILL-1004
    const bill4 = await prisma.bill.create({
      data: {
        billNumber: bill4Number,
        patientId: patients[3].id,
        attendanceId: att4.id,
        subtotal: 250.00,
        discount: 0,
        waiverAmount: 0,
        taxAmount: 0,
        totalAmount: 250.00,
        insuranceCovered: 250.00,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0,
        status: BillStatus.pending,
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        billDate: daysAgo(5),
        createdById: accounts?.id || admin.id,
        claimStatus: ClaimStatus.draft,
      },
    });

    await prisma.billLineItem.createMany({
      data: [
        { billId: bill4.id, description: 'Antenatal Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 80.00, pricingBasis: PaymentMode.nhis, lineTotal: 80.00, insuranceCoveredAmount: 80.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill4.id, description: 'Obstetric Ultrasound', serviceType: ServiceType.scan, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.nhis, lineTotal: 120.00, insuranceCoveredAmount: 120.00, patientPayableAmount: 0, discount: 0 },
        { billId: bill4.id, description: 'Urinalysis', serviceType: ServiceType.lab_test, quantity: 1, unitPrice: 50.00, pricingBasis: PaymentMode.nhis, lineTotal: 50.00, insuranceCoveredAmount: 50.00, patientPayableAmount: 0, discount: 0 },
      ],
    });

    // Bill 1005: Cash Paediatric - attendance 1005
    const bill5Number = getBillNumber(att5Number); // BILL-1005
    const bill5 = await prisma.bill.create({
      data: {
        billNumber: bill5Number,
        patientId: patients[4].id,
        attendanceId: att5.id,
        subtotal: 350.00,
        discount: 0,
        waiverAmount: 0,
        taxAmount: 0,
        totalAmount: 350.00,
        insuranceCovered: 0,
        patientPayable: 350.00,
        paidAmount: 200.00,
        balance: 150.00,
        status: BillStatus.partial,
        paymentMode: PaymentMode.cash,
        billDate: daysAgo(3),
        createdById: accounts?.id || admin.id,
        claimStatus: ClaimStatus.not_required,
      },
    });

    await prisma.billLineItem.createMany({
      data: [
        { billId: bill5.id, description: 'Paediatric Consultation', serviceType: ServiceType.consultation, quantity: 1, unitPrice: 80.00, pricingBasis: PaymentMode.cash, lineTotal: 80.00, insuranceCoveredAmount: 0, patientPayableAmount: 80.00, discount: 0 },
        { billId: bill5.id, description: 'Chest X-ray', serviceType: ServiceType.scan, quantity: 1, unitPrice: 120.00, pricingBasis: PaymentMode.cash, lineTotal: 120.00, insuranceCoveredAmount: 0, patientPayableAmount: 120.00, discount: 0 },
        { billId: bill5.id, description: 'Amoxicillin', serviceType: ServiceType.medication, quantity: 1, unitPrice: 80.00, pricingBasis: PaymentMode.cash, lineTotal: 80.00, insuranceCoveredAmount: 0, patientPayableAmount: 80.00, discount: 0 },
        { billId: bill5.id, description: 'Paracetamol', serviceType: ServiceType.medication, quantity: 1, unitPrice: 70.00, pricingBasis: PaymentMode.cash, lineTotal: 70.00, insuranceCoveredAmount: 0, patientPayableAmount: 70.00, discount: 0 },
      ],
    });

    // Add partial payment for bill5
    await prisma.payment.create({
      data: {
        billId: bill5.id,
        amount: 200.00,
        paymentMethod: 'cash',
        reference: generateReceiptNumber(), // RCP-1002
        transactionDate: daysAgo(3),
        receivedById: accounts?.id || admin.id,
        notes: 'Partial payment',
      },
    });
    console.log(`✅ Bills created: ${bill1Number}, ${bill2Number}, ${bill3Number}, ${bill4Number}, ${bill5Number}`);

    // =============== CREATE INSURANCE CLAIMS (Using claim numbers based on attendance) ===============
    
    // NHIS Claim for attendance 1002 (Patient 1002)
    const claim2Number = getClaimNumber(att2Number, 'nhis'); // NHIS-1002
    await prisma.insuranceClaim.create({
      data: {
        claimNumber: claim2Number,
        billId: bill2.id,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        attendanceId: att2.id,
        totalClaimAmount: 180.00,
        status: ClaimStatus.submitted,
        diagnosisCodes: [hypertensionDiag?.icdCode || 'I10'],
        procedureCodes: [],
        labTestCodes: ['RBS'],
        serviceCodes: [specialistConsult?.code || 'CONS-SPEC'],
        scanCodes: [],
        gdrgCodes: ['MEDI32A'],
        nhisServiceCodes: ['OPDC06A'],
        submissionDate: daysAgo(8),
        createdById: accounts?.id || admin.id,
      },
    });

    // Private Claim for attendance 1003 (Patient 1003)
    if (privateProvider) {
      const claim3Number = getClaimNumber(att3Number, 'private_insurance'); // PRV-1003
      await prisma.insuranceClaim.create({
        data: {
          claimNumber: claim3Number,
          billId: bill3.id,
          patientId: patients[2].id,
          insuranceProviderId: privateProvider.id,
          attendanceId: att3.id,
          totalClaimAmount: 1500.00,
          status: ClaimStatus.approved,
          diagnosisCodes: [herniaDiag?.icdCode || 'K40.90'],
          procedureCodes: ['ASUR20A'],
          labTestCodes: [],
          serviceCodes: [generalConsult?.code || 'CONS-GEN'],
          scanCodes: [],
          gdrgCodes: ['ASUR20A'],
          nhisServiceCodes: [],
          submissionDate: daysAgo(6),
          approvalDate: daysAgo(5),
          approvedAmount: 1200.00,
          createdById: accounts?.id || admin.id,
        },
      });
    }

    // NHIS Claim for attendance 1004 (Patient 1004)
    const claim4Number = getClaimNumber(att4Number, 'nhis'); // NHIS-1004
    await prisma.insuranceClaim.create({
      data: {
        claimNumber: claim4Number,
        billId: bill4.id,
        patientId: patients[3].id,
        insuranceProviderId: nhisProvider.id,
        attendanceId: att4.id,
        totalClaimAmount: 250.00,
        status: ClaimStatus.draft,
        diagnosisCodes: ['Z34.00'],
        procedureCodes: [],
        labTestCodes: ['Urinalysis'],
        serviceCodes: [generalConsult?.code || 'CONS-GEN'],
        scanCodes: ['Obstetric Ultrasound'],
        gdrgCodes: ['OPDC02A'],
        nhisServiceCodes: ['OPDC02A'],
        createdById: accounts?.id || admin.id,
      },
    });
    console.log(`✅ Insurance claims created: ${claim2Number}, ${claim3Number}, ${claim4Number}`);

    // =============== CREATE REFERRALS ===============
    await prisma.referralRecord.create({
      data: {
        referralNumber: generateReferralNumber(), // REF-1001
        patientId: patients[4].id,
        attendanceId: att5.id,
        referralType: ReferralType.outgoing,
        referralReason: 'Paediatric pneumonia requiring specialist care',
        referralNotes: 'Child with confirmed pneumonia. Refer to paediatrician for management.',
        urgency: Priority.urgent,
        referredToDepartment: pediatricsDept?.name,
        referredToDoctor: doctor.fullName,
        referralDate: daysAgo(3),
        status: ReferralStatus.accepted,
        outcomeNotes: 'Accepted. Patient seen and treatment initiated.',
        completedAt: daysAgo(2),
        createdById: doctor.id,
      },
    });

    await prisma.referralRecord.create({
      data: {
        referralNumber: generateReferralNumber(), // REF-1002
        patientId: patients[2].id,
        attendanceId: att3.id,
        referralType: ReferralType.outgoing,
        referralReason: 'Right inguinal hernia requiring surgical repair',
        referralNotes: 'Patient with reducible hernia. Refer for elective repair.',
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

// =============== CREATE ADMISSIONS (UPDATED for lightweight Admission model) ===============

// Admission for attendance 1003 (Hernia patient - Patient 1003) - already discharged
if (generalWard) {
  let bed = await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } });
  
  if (!bed && generalWard) {
    bed = await prisma.bed.create({
      data: {
        wardId: generalWard.id,
        bedNumber: `${generalWard.wardName.substring(0, 3).toUpperCase()}-001`,
        isOccupied: false,
      },
    });
  }

  if (bed && att3) {
    // Get the attendance number (not a new generated number)
    const attendanceNumber = att3.attendanceNumber; // This is "1003"
    
    await prisma.admission.create({
      data: {
        attendanceId: att3.id,
        admissionNumber: attendanceNumber,  // ✅ Same as attendance number
        admissionType: AdmissionType.elective,
        admissionSource: AdmissionSource.opd,
        dischargeStatus: DischargeStatus.home,
        admissionDate: daysAgo(7),
        dischargeDate: daysAgo(6),
      },
    });

    // Mark bed as occupied (patient was admitted)
    await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true, currentPatientId: patients[2].id } });
  }
}

// Admission for attendance 1005 (Paediatric pneumonia - Patient 1005) - still active
if (pediatricWard) {
  let bed = await prisma.bed.findFirst({ where: { wardId: pediatricWard.id, isOccupied: false } });
  
  if (!bed && pediatricWard) {
    bed = await prisma.bed.create({
      data: {
        wardId: pediatricWard.id,
        bedNumber: `${pediatricWard.wardName.substring(0, 3).toUpperCase()}-001`,
        isOccupied: false,
      },
    });
  }

  if (bed && att5) {
    const attendanceNumber = att5.attendanceNumber; // This is "1005"
    
    await prisma.admission.create({
      data: {
        attendanceId: att5.id,
        admissionNumber: attendanceNumber,  // ✅ Same as attendance number
        admissionType: AdmissionType.emergency,
        admissionSource: AdmissionSource.emergency,
        admissionDate: daysAgo(3),
        // No dischargeDate - still active
      },
    });

    await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true, currentPatientId: patients[4].id } });
  }
}

// Add more admissions for other patients

// Admission for NHIS patient (Patient 1002 - Ama Serwaa) - active
if (generalWard && att2) {
  let bed = await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } });
  
  if (!bed) {
    bed = await prisma.bed.create({
      data: {
        wardId: generalWard.id,
        bedNumber: `${generalWard.wardName.substring(0, 3).toUpperCase()}-NHIS-01`,
        isOccupied: false,
      },
    });
  }

  if (bed) {
    const attendanceNumber = att2.attendanceNumber; // "1002"
    
    await prisma.admission.create({
      data: {
        attendanceId: att2.id,
        admissionNumber: attendanceNumber,
        admissionType: AdmissionType.emergency,
        admissionSource: AdmissionSource.opd,
        admissionDate: daysAgo(5),
        // Active admission - no discharge date
      },
    });

    await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true, currentPatientId: patients[1].id } });
  }
}

// Admission for Private Insurance patient (Patient 1003 already done above)

// Admission for Antenatal patient (Patient 1004) - daycase (observation)
if (maternityWard && att4) {
  let bed = await prisma.bed.findFirst({ where: { wardId: maternityWard.id, isOccupied: false } });
  
  if (!bed) {
    bed = await prisma.bed.create({
      data: {
        wardId: maternityWard.id,
        bedNumber: `${maternityWard.wardName.substring(0, 3).toUpperCase()}-OBS-01`,
        isOccupied: false,
      },
    });
  }

  if (bed) {
    const attendanceNumber = att4.attendanceNumber; // "1004"
    
    // For daycase, update the attendance encounterCategory to 'daycase' first
    await prisma.attendance.update({
      where: { id: att4.id },
      data: { encounterCategory: EncounterCategory.daycase }
    });
    
    // Daycase patients don't have a formal admission record
    // They are just marked as 'daycase' in attendance
    // But we still assign a bed
    await prisma.bed.update({ where: { id: bed.id }, data: { isOccupied: true, currentPatientId: patients[3].id } });
  }
}

console.log('✅ Admissions created');


    // =============== CREATE APPOINTMENTS ===============
    await prisma.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(), // APT-1001
        patientId: patients[0].id,
        clinicianId: doctor.id,
        clinicianRole: doctor.role,
        departmentId: medDept?.id,
        title: 'Malaria Follow-up',
        description: 'Post-treatment review for malaria',
        appointmentDate: daysAgo(7),
        appointmentTime: '09:00',
        duration: 30,
        status: AppointmentStatus.completed,
        type: AppointmentType.follow_up,
        createdBy: admin.id,
      },
    });

    await prisma.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(), // APT-1002
        patientId: patients[1].id,
        clinicianId: doctor.id,
        clinicianRole: doctor.role,
        departmentId: medDept?.id,
        title: 'Hypertension Review',
        description: 'Monthly BP check and medication review',
        appointmentDate: daysAgo(3),
        appointmentTime: '11:30',
        duration: 20,
        status: AppointmentStatus.checked_in,
        type: AppointmentType.follow_up,
        checkedIn: true,
        checkedInAt: daysAgo(3),
        createdBy: admin.id,
      },
    });

    await prisma.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(), // APT-1003
        patientId: patients[2].id,
        clinicianId: nurse.id,
        clinicianRole: nurse.role,
        departmentId: surgeryDept?.id,
        title: 'Post-operative Review',
        description: 'Follow-up after hernia repair',
        appointmentDate: daysFromNow(7),
        appointmentTime: '14:00',
        duration: 30,
        status: AppointmentStatus.scheduled,
        type: AppointmentType.follow_up,
        createdBy: doctor.id,
      },
    });

    await prisma.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(), // APT-1004
        patientId: patients[3].id,
        clinicianId: midwife.id,
        clinicianRole: midwife.role,
        departmentId: obsGynDept?.id,
        title: 'Antenatal Visit',
        description: 'Routine ANC at 32 weeks',
        appointmentDate: daysAgo(25),
        appointmentTime: '09:30',
        duration: 45,
        status: AppointmentStatus.scheduled,
        type: AppointmentType.antenatal,
        createdBy: midwife?.id || admin.id,
      },
    });

    await prisma.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(), // APT-1005
        patientId: patients[4].id,
        clinicianId: nurse.id,
        clinicianRole: nurse.role,
        departmentId: pediatricsDept?.id,
        title: 'Vaccination Appointment',
        description: 'Routine childhood vaccination',
        appointmentDate: daysAgo(2),
        appointmentTime: '10:00',
        duration: 20,
        status: AppointmentStatus.completed,
        type: AppointmentType.vaccination,
        createdBy: admin.id,
      },
    });
    console.log('✅ Appointments created');

    // =============== CREATE NOTIFICATIONS ===============
    await prisma.notification.create({
      data: {
        userId: doctor.id,
        title: 'Lab Results Available',
        message: 'Malaria test results are ready for Kwame Mensah',
        type: 'clinical',
        priority: 'medium',
        actionType: 'lab_results',
        actionId: att1.id,
        actionUrl: `/attendances/${att1.id}`,
        createdAt: daysAgo(14),
      },
    });

    await prisma.notification.create({
      data: {
        userId: accounts?.id || admin.id,
        title: 'Claim Ready for Submission',
        message: 'NHIS claim for Ama Serwaa is ready for submission',
        type: 'billing',
        priority: 'medium',
        actionType: 'claim',
        actionId: bill2.id,
        actionUrl: `/claims/${bill2.id}`,
        createdAt: daysAgo(10),
      },
    });

    await prisma.notification.create({
      data: {
        userId: pharmacist?.id || admin.id,
        title: 'Medication Dispensed',
        message: 'Medications have been dispensed for Kofi Ofori',
        type: 'success',
        priority: 'low',
        actionType: 'medication',
        actionId: att5.id,
        actionUrl: `/attendances/${att5.id}/medications`,
        createdAt: daysAgo(3),
      },
    });

    // Admin notifications
    if (admin) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: '👋 Welcome Admin',
          message: 'You are logged in as System Administrator.',
          type: 'success',
          priority: 'medium',
          isRead: false,
          createdAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: '✅ System Ready',
          message: 'All modules are operational. Test data has been seeded successfully.',
          type: 'info',
          priority: 'low',
          isRead: false,
          createdAt: new Date(),
        },
      });
    }
    console.log('✅ Notifications created');

    // =============== SUMMARY ===============
    console.log('\n🎉 TEST DATA SEEDING COMPLETED!');
    console.log('\n📋 SUMMARY:');
    console.log(`   - Patients: 10 (Numbers: 1001-1010)`);
    console.log(`   - Attendances: 5 (Numbers: 1001-1005)`);
    console.log(`   - Bills: 5 (Numbers: BILL-1001 to BILL-1005)`);
    console.log(`   - Receipts: 2 (RCP-1001, RCP-1002)`);
    console.log(`   - Insurance Claims: 3 (NHIS-1002, PRV-1003, NHIS-1004)`);
    console.log(`   - Referrals: 2 (REF-1001, REF-1002)`);
    console.log(`   - Admissions: 2 (1003, 1005 - same as attendance numbers)`);
    console.log(`   - Appointments: 5 (APT-1001 to APT-1005)`);
    console.log(`   - Notifications: 5+`);

    console.log('\n👨‍⚕️ TEST LOGINS:');
    console.log(`   - admin/admin123 (Admin)`);
    console.log(`   - doctor1/doctor123 (Doctor)`);
    console.log(`   - nurse1/nurse123 (Nurse)`);
    console.log(`   - midwife1/midwife123 (Midwife)`);
    console.log(`   - accounts1/accounts123 (Accounts)`);
    console.log(`   - lab1/lab123 (Lab Tech)`);
    console.log(`   - sonographer1/scan123 (Sonographer)`);
    console.log(`   - pharma1/pharma123 (Pharmacist)`);

    return {
      success: true,
      message: 'Test data seeded successfully',
      patients: patients.length,
      attendances: attendances.length,
    };
  } catch (error: any) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
};

// ============================================
// DATABASE INITIALIZATION
// ============================================

export const initializeDatabase = async () => {
  console.log('🚀 Initializing database...');
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
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

export default {
  seedTestData,
  deleteTestData,
  initializeDatabase,
};