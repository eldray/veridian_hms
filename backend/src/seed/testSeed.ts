// src/seed/testSeed.ts - UPDATED VERSION (No gdrgGroupCode or gdrgCode)

import { PrismaClient, UserRole, Gender, PaymentMode, AdmissionType, AdmissionSource, EncounterCategory, VisitCategory, BillStatus, ClaimStatus, AttendanceStatus, LabTestStatus, ProcedureStatus, ScanStatus, MedicationStatus, AttendanceType, PresentOnAdmission, SecondaryDiagnosisType, DiagnosisType, ServiceCategory, Priority, ScanPriority, AppointmentStatus, AppointmentType, MorbidityGroup } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

const generateBillNumber = () => `BILL-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateAttendanceNumber = () => `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

// Helper to get morbidity group value
const getMorbidityGroup = (diagName: string): MorbidityGroup => {
  const name = diagName.toLowerCase();
  if (name.includes('malaria')) return 'uncomplicated_malaria_suspected';
  if (name.includes('hypertension')) return 'hypertension';
  if (name.includes('diabetes')) return 'diabetes_mellitus';
  if (name.includes('anemia')) return 'anaemia';
  if (name.includes('pneumonia')) return 'pneumonia';
  return 'all_other_diseases';
};

// ✅ Check for real data
const hasRealData = async (): Promise<boolean> => {
  try {
    const realPatientCount = await prisma.patient.count({
      where: { folderNumber: { not: { in: ['PAT-10000', 'PAT-10001'] } } }
    });
    return realPatientCount > 0;
  } catch (error) {
    return false;
  }
};

// ✅ Check for test data
const hasTestData = async (): Promise<boolean> => {
  try {
    const testPatientCount = await prisma.patient.count({
      where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } }
    });
    return testPatientCount > 0;
  } catch (error) {
    return false;
  }
};

// ✅ Delete test data
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

    // Delete in dependency order
    await prisma.notification.deleteMany({ where: { title: { contains: 'Malaria', mode: 'insensitive' } } });
    await prisma.stockTransaction.deleteMany({ where: { reference: { contains: 'MED-', mode: 'insensitive' } } });
    
    // Get test patient IDs
    const testPatients = await prisma.patient.findMany({
      where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } },
      select: { id: true }
    });
    const testPatientIds = testPatients.map(p => p.id);

    // Delete bill line items first (due to foreign keys)
    const testBills = await prisma.bill.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true }
    });
    for (const bill of testBills) {
      await prisma.billLineItem.deleteMany({ where: { billId: bill.id } });
    }

    // Delete attendance-related records
    const testAttendances = await prisma.attendance.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true }
    });
    const testAttendanceIds = testAttendances.map(a => a.id);

    if (testAttendanceIds.length > 0) {
      await prisma.procedure.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.scan.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.labTest.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.medication.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.vitals.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.attendanceDiagnosis.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.serviceRendered.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.insuranceClaim.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
      await prisma.bill.deleteMany({ where: { attendanceId: { in: testAttendanceIds } } });
    }

    // Delete admissions
    const testAdmissions = await prisma.admission.findMany({
      where: { patientId: { in: testPatientIds } },
      select: { id: true }
    });
    for (const adm of testAdmissions) {
      await prisma.admissionSecondaryDiagnosis.deleteMany({ where: { admissionId: adm.id } });
    }
    await prisma.admission.deleteMany({ where: { patientId: { in: testPatientIds } } });

    // Reset beds
    await prisma.bed.updateMany({
      where: { currentPatientId: { in: testPatientIds } },
      data: { isOccupied: false, currentPatientId: null }
    });

    await prisma.appointment.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.attendance.deleteMany({ where: { patientId: { in: testPatientIds } } });
    await prisma.patient.deleteMany({ where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } } });

    // Delete test users
    await prisma.user.deleteMany({
      where: { username: { in: ['doctor1', 'nurse1', 'midwife1', 'records1', 'lab1', 'sonographer1', 'pharma1', 'accounts1'] } }
    });

    console.log('✅ Test data deleted');
    return { success: true, message: 'Test data deleted' };
  } catch (error: any) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ✅ Seed test data
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

    // =============== 1. TEST USERS ===============
    const testUsers = [
      { username: 'doctor1', password: hashPassword('doctor123'), fullName: 'Dr. Kofi Mensah', role: UserRole.doctor, email: 'doctor@hospital.com', phone: '+233244222222', licenseNumber: 'MD-12345', specialization: 'General Medicine' },
      { username: 'nurse1', password: hashPassword('nurse123'), fullName: 'Nurse Akua Johnson', role: UserRole.nurse, email: 'nurse@hospital.com', phone: '+233244333333', licenseNumber: 'RN-54321' },
      { username: 'midwife1', password: hashPassword('midwife123'), fullName: 'Midwife Abena Serwaa', role: UserRole.midwife, email: 'midwife@hospital.com', phone: '+233244444444', licenseNumber: 'MW-98765' },
      { username: 'records1', password: hashPassword('records123'), fullName: 'Records Officer Kwame Osei', role: UserRole.records, email: 'records@hospital.com', phone: '+233244555555' },
      { username: 'lab1', password: hashPassword('lab123'), fullName: 'Lab Tech Yaw Asare', role: UserRole.lab_tech, email: 'lab@hospital.com', phone: '+233244666666', licenseNumber: 'LT-11223' },
      { username: 'sonographer1', password: hashPassword('scan123'), fullName: 'Sonographer Ama Boateng', role: UserRole.sonographer, email: 'sonographer@hospital.com', phone: '+233244999999', licenseNumber: 'SN-11223' },
      { username: 'pharma1', password: hashPassword('pharma123'), fullName: 'Pharmacist Nana Kwaku', role: UserRole.pharmacist, email: 'pharma@hospital.com', phone: '+233244777777', licenseNumber: 'PH-44556' },
      { username: 'accounts1', password: hashPassword('accounts123'), fullName: 'Accountant Esi Brown', role: UserRole.accounts, email: 'accounts@hospital.com', phone: '+233244888888' },
    ];

    for (const userData of testUsers) {
      await prisma.user.upsert({
        where: { username: userData.username },
        create: { ...userData, isActive: true },
        update: userData,
      });
    }
    console.log('✅ Test users seeded');

    // Fetch users
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    const doctor = await prisma.user.findUnique({ where: { username: 'doctor1' } });
    const nurse = await prisma.user.findUnique({ where: { username: 'nurse1' } });
    const pharmacist = await prisma.user.findUnique({ where: { username: 'pharma1' } });
    const labTech = await prisma.user.findUnique({ where: { username: 'lab1' } });
    const sonographer = await prisma.user.findUnique({ where: { username: 'sonographer1' } });

    if (!admin || !doctor) {
      throw new Error('Admin/Doctor user not found. Run core seeding first.');
    }

    // =============== 2. FIND CORE DATA ===============
    const malariaDiag = await prisma.diagnosis.findFirst({ 
      where: { OR: [{ icdCode: 'B54' }, { name: { contains: 'malaria', mode: 'insensitive' } }] } 
    });
    const anemiaDiag = await prisma.diagnosis.findFirst({
      where: { OR: [{ icdCode: 'D64.9' }, { name: { contains: 'anemia', mode: 'insensitive' } }] },
    });
    const hypertensionDiag = await prisma.diagnosis.findFirst({
      where: { OR: [{ icdCode: 'I10' }, { name: { contains: 'hypertension', mode: 'insensitive' } }] },
    });

    if (!malariaDiag || !anemiaDiag || !hypertensionDiag) {
      console.log('⚠️ Some diagnoses not found, creating fallback diagnoses...');
      
      if (!malariaDiag) {
        await prisma.diagnosis.upsert({
          where: { icdCode: 'B54' },
          create: {
            name: 'Malaria, unspecified',
            icdCode: 'B54',
            morbidityGroup: 'uncomplicated_malaria_suspected',
            isActive: true,
            requiresAuthorization: false,
            isChronic: false,
            isNHISCovered: true,
          },
          update: {},
        });
      }
      
      if (!hypertensionDiag) {
        await prisma.diagnosis.upsert({
          where: { icdCode: 'I10' },
          create: {
            name: 'Essential hypertension',
            icdCode: 'I10',
            morbidityGroup: 'hypertension',
            isActive: true,
            requiresAuthorization: false,
            isChronic: true,
            isNHISCovered: true,
          },
          update: {},
        });
      }
    }

    // Find services
    const generalConsult = await prisma.serviceCatalog.findFirst({ 
      where: { OR: [{ code: 'CONS-GEN' }, { serviceType: 'consultation' }] },
    });

    const malariaLabService = await prisma.serviceCatalog.findFirst({
      where: { OR: [{ code: { contains: 'LAB-' } }, { serviceType: 'lab_test' }] },
    });

    const chestScanService = await prisma.serviceCatalog.findFirst({
      where: { OR: [{ code: { contains: 'SCAN-' } }, { serviceType: 'scan' }] },
    });

    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    const medDept = await prisma.department.findFirst({ where: { name: 'Medical' } });

    if (!generalConsult || !nhisProvider || !medDept) {
      throw new Error('Core data incomplete. Run core seeding first.');
    }

    // =============== 3. TEST PATIENTS ===============
    const patientsData = [
      {
        folderNumber: 'PAT-10000',
        surname: 'Mensah',
        otherNames: 'Kwame',
        gender: Gender.male,
        dateOfBirth: new Date('1985-05-15'),
        contact: '+233244123456',
        address: '123 Main St, Accra, Ghana',
        paymentMode: PaymentMode.cash,
        registeredBy: admin.fullName,
        registeredAt: new Date(),
      },
      {
        folderNumber: 'PAT-10001', 
        surname: 'Serwaa',
        otherNames: 'Ama',
        gender: Gender.female,
        dateOfBirth: new Date('1990-08-22'),
        contact: '+233244234567',
        address: '456 Oak Ave, Kumasi, Ghana',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        insuranceDetails: {
          memberId: 'NHIS-24593',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          providerName: 'National Health Insurance Scheme'
        },
        registeredBy: admin.fullName,
        registeredAt: new Date(),
      }
    ];

    const patients: any[] = [];
    for (const p of patientsData) {
      const patient = await prisma.patient.upsert({
        where: { folderNumber: p.folderNumber },
        create: {
          ...p,
          createdAt: new Date(),
          updatedAt: new Date(),
          insuranceDetails: p.insuranceDetails || {},
        },
        update: { 
          ...p,
          updatedAt: new Date(),
          insuranceDetails: p.insuranceDetails || {},
        },
      });
      patients.push(patient);
    }
    console.log('✅ Test patients seeded');

    // =============== 4. NHIS ATTENDANCE (Malaria Case) ===============
    const nhisAttendance = await prisma.attendance.create({
      data: {
        attendanceNumber: generateAttendanceNumber(),
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: new Date(),
        attendanceType: AttendanceType.emergency_acute,
        paymentMode: PaymentMode.nhis,
        nhisCCC: '24593',
        complaints: 'Fever, headache, and body pains for 3 days',
        medicalNotes: 'Patient presents with classic malaria symptoms.',
        createdById: admin.id,
        status: AttendanceStatus.completed,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });

    // Add diagnosis - ✅ NO gdrgCode field
    const finalMalariaDiag = malariaDiag || await prisma.diagnosis.findFirst({ where: { icdCode: 'B54' } });
    await prisma.attendanceDiagnosis.create({
      data: {
        attendanceId: nhisAttendance.id,
        diagnosisId: finalMalariaDiag!.id,
        primary: true,
        date: new Date(),
        createdById: doctor.id,
        icdCode: 'B54',
        presentOnAdmission: PresentOnAdmission.Y,
        diagnosisType: DiagnosisType.principal,
      }
    });

    // Add service rendered
    await prisma.serviceRendered.create({
      data: {
        attendanceId: nhisAttendance.id,
        serviceItemId: generalConsult.id,
        quantity: 1,
        performedById: doctor.id,
        notes: 'Initial consultation for malaria symptoms',
      }
    });

    // Create bill
    const nhisBill = await prisma.bill.create({
      data: {
        billNumber: generateBillNumber(), 
        patientId: patients[1].id,
        attendanceId: nhisAttendance.id,
        subtotal: 45.50,
        totalAmount: 45.50,
        insuranceCovered: 45.50,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0,
        status: BillStatus.pending,
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider.id,
        billDate: new Date(),
        createdById: admin.id,
        taxAmount: 0,
        discount: 0,
        waiverAmount: 0,
        claimStatus: ClaimStatus.pending,
      },
    });

    // Add BillLineItem
    await prisma.billLineItem.create({
      data: {
        billId: nhisBill.id,
        serviceCatalogId: generalConsult.id,
        description: generalConsult.name,
        serviceType: generalConsult.serviceType,
        quantity: 1,
        unitPrice: 45.50,
        pricingBasis: PaymentMode.nhis,
        lineTotal: 45.50,
        insuranceCoveredAmount: 45.50,
        patientPayableAmount: 0,
        discount: 0,
      },
    });

    // Create insurance claim - ✅ Added gdrgCodes and nhisServiceCodes
    await prisma.insuranceClaim.create({
      data: {
        claimNumber: `CLAIM-${Date.now()}`,
        billId: nhisBill.id,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        attendanceId: nhisAttendance.id,
        totalClaimAmount: 45.50,
        status: ClaimStatus.submitted,
        diagnosisCodes: ['B54'],
        procedureCodes: [],
        labTestCodes: [],
        serviceCodes: [generalConsult.code],
        scanCodes: [],
        gdrgCodes: ['OPDC06A'], // ✅ ADDED: Context-based GDRG for OPD
        nhisServiceCodes: ['OPDC06A'], // ✅ ADDED: NHIS service code
        submissionDate: new Date(),
        preAuthNumber: 'PA-2024-001',
        notes: 'Malaria treatment claim',
        createdById: admin.id,
      },
    });
    console.log('✅ NHIS attendance, bill and claim seeded');

    // =============== 5. CASH ATTENDANCE (Hypertension Case) ===============
    const cashAttendance = await prisma.attendance.create({
      data: {
        attendanceNumber: generateAttendanceNumber(),
        patientId: patients[0].id,
        dateTime: new Date(),
        attendanceType: AttendanceType.chronic_followup,
        paymentMode: PaymentMode.cash,
        complaints: 'Routine hypertension follow-up',
        medicalNotes: 'Patient stable on current medication.',
        createdById: admin.id,
        status: AttendanceStatus.completed,
        totalBill: 80,
        paidAmount: 80,
        outstandingBalance: 0,
        encounterCategory: EncounterCategory.opd,
        visitCategory: VisitCategory.general,
        serviceCategory: ServiceCategory.opd,
      },
    });

    const finalHypertensionDiag = hypertensionDiag || await prisma.diagnosis.findFirst({ where: { icdCode: 'I10' } });
    await prisma.attendanceDiagnosis.create({
      data: {
        attendanceId: cashAttendance.id,
        diagnosisId: finalHypertensionDiag!.id,
        primary: true,
        date: new Date(),
        createdById: doctor.id,
        icdCode: 'I10',
        presentOnAdmission: PresentOnAdmission.Y,
        diagnosisType: DiagnosisType.principal,
      }
    });

    // Create cash bill
    const cashBill = await prisma.bill.create({
      data: {
        billNumber: generateBillNumber(),
        patientId: patients[0].id,
        attendanceId: cashAttendance.id,
        subtotal: 80,
        totalAmount: 80,
        insuranceCovered: 0,
        patientPayable: 80,
        paidAmount: 80,
        balance: 0,
        status: BillStatus.paid,
        paymentMode: PaymentMode.cash,
        billDate: new Date(),
        createdById: admin.id,
        taxAmount: 0,
        discount: 0,
        waiverAmount: 0,
        claimStatus: ClaimStatus.not_required,
      },
    });

    await prisma.billLineItem.create({
      data: {
        billId: cashBill.id,
        serviceCatalogId: generalConsult.id,
        description: 'Chronic Disease Follow-up',
        serviceType: 'consultation',
        quantity: 1,
        unitPrice: 80,
        pricingBasis: PaymentMode.cash,
        lineTotal: 80,
        insuranceCoveredAmount: 0,
        patientPayableAmount: 80,
        discount: 0,
      },
    });
    console.log('✅ Cash attendance and bill seeded');

    // =============== 6. VITALS ===============
    await prisma.vitals.create({
      data: {
        attendanceId: nhisAttendance.id,
        patientId: patients[1].id,
        temperature: 38.2,
        pulse: 92,
        respiration: 18,
        spo2: 97,
        weight: 65,
        height: 165,
        bmi: 23.9,
        bloodPressure: '130/85',
        recordedById: nurse?.id || doctor.id,
        recordedAt: new Date(),
      },
    });
    console.log('✅ Vitals seeded');

    // =============== 7. LAB TEST ===============
    if (malariaLabService && malariaLabService.labTestTemplateId) {
      const malariaLab = await prisma.labTest.create({
        data: {
          attendanceId: nhisAttendance.id,
          templateId: malariaLabService.labTestTemplateId,
          serviceCatalogId: malariaLabService.id,
          status: LabTestStatus.requested,
          createdById: doctor.id,
          priority: Priority.routine,
        }
      });
      
      await prisma.labTest.update({
        where: { id: malariaLab.id },
        data: {
          status: LabTestStatus.completed,
          result: { test: 'Malaria Parasite', result: 'Positive', species: 'P. falciparum', parasiteCount: '+++' },
          normalRange: 'Negative',
          units: 'Qualitative',
          performedById: labTech?.id,
          completedAt: new Date(),
        },
      });
      console.log('✅ Lab test seeded');
    } else {
      console.log('⚠️ No lab service found, skipping lab test');
    }

    // =============== 8. SCAN ===============
    if (chestScanService && chestScanService.scanTemplateId) {
      const scan = await prisma.scan.create({
        data: {
          attendanceId: nhisAttendance.id,
          templateId: chestScanService.scanTemplateId,
          serviceCatalogId: chestScanService.id,
          scanType: 'xray',
          description: 'Chest imaging study',
          bodyPart: 'chest',
          status: ScanStatus.requested,
          createdById: doctor.id,
          priority: ScanPriority.routine,
          imageUrls: [],
        }
      });
      
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: ScanStatus.completed,
          result: 'Normal chest X-ray',
          findings: 'Clear lung fields, normal cardiac silhouette',
          impression: 'No active cardiopulmonary disease',
          performedById: sonographer?.id,
          completedAt: new Date(),
          imageUrls: ['/uploads/scans/chest-xray-001.jpg'],
        },
      });
      console.log('✅ Scan seeded');
    } else {
      console.log('⚠️ No scan service found, skipping scan');
    }

    // =============== 9. MEDICATIONS ===============
    const paracetamol = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Paracetamol', mode: 'insensitive' } },
    });
    const artesunate = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Artesunate', mode: 'insensitive' } },
    });

    if (paracetamol && artesunate) {
      const paracetamolService = await prisma.serviceCatalog.findFirst({
        where: { stockItemId: paracetamol.id }
      });
      const artesunateService = await prisma.serviceCatalog.findFirst({
        where: { stockItemId: artesunate.id }
      });

      const malariaMed = await prisma.medication.create({
        data: {
          attendanceId: nhisAttendance.id,
          stockItemId: artesunate.id,
          serviceCatalogId: artesunateService?.id,
          name: 'Artesunate 50mg',
          dosage: '2 tabs',
          frequency: 'Once daily',
          duration: '3 days',
          quantity: 6,
          route: 'oral',
          instructions: 'Take with food',
          status: MedicationStatus.prescribed,
          prescribedById: doctor.id,
        }
      });

      const feverMed = await prisma.medication.create({
        data: {
          attendanceId: nhisAttendance.id,
          stockItemId: paracetamol.id,
          serviceCatalogId: paracetamolService?.id,
          name: 'Paracetamol 500mg',
          dosage: '1 tab',
          frequency: '8 hourly',
          duration: '3 days',
          quantity: 9,
          route: 'oral',
          instructions: 'Take for fever',
          status: MedicationStatus.prescribed,
          prescribedById: doctor.id,
        }
      });

      if (pharmacist) {
        await prisma.medication.update({
          where: { id: malariaMed.id },
          data: { status: MedicationStatus.dispensed, dispensedAt: new Date(), dispensedById: pharmacist.id },
        });
        await prisma.medication.update({
          where: { id: feverMed.id },
          data: { status: MedicationStatus.dispensed, dispensedAt: new Date(), dispensedById: pharmacist.id },
        });
      }
      console.log('✅ Medications seeded');
    } else {
      console.log('⚠️ Medications not found, skipping');
    }

    // =============== 10. APPOINTMENT ===============
    await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-${Date.now()}`,
        patientId: patients[1].id,
        doctorId: doctor.id,
        departmentId: medDept.id,
        title: 'Follow-up for Malaria Treatment',
        description: 'Follow-up appointment to monitor malaria treatment progress',
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        appointmentTime: '10:00',
        duration: 30,
        status: AppointmentStatus.scheduled,
        type: AppointmentType.follow_up,
        createdBy: admin.id,
      },
    });
    console.log('✅ Appointment seeded');

    // =============== 11. ADMISSION ===============
    const generalWard = await prisma.ward.findFirst({ where: { wardType: 'general' } });
    if (generalWard) {
      const bed = await prisma.bed.findFirst({ where: { wardId: generalWard.id, isOccupied: false } });
      
      if (bed) {
        const admission = await prisma.admission.create({
          data: {
            admissionNumber: `ADM-${Date.now()}`,
            patientId: patients[0].id,
            attendanceId: cashAttendance.id,
            wardId: generalWard.id,
            bedId: bed.id,
            admissionDate: new Date(),
            admissionTime: '14:30',
            admittingDoctor: doctor.fullName,
            reasonForAdmission: 'Hypertensive urgency for monitoring',
            diagnosis: 'Essential hypertension with elevated BP',
            status: 'admitted',
            createdBy: doctor.fullName,
            admissionType: AdmissionType.elective,
            admissionSource: AdmissionSource.opd,
            lengthOfStay: 1,
            principalDiagnosisId: finalHypertensionDiag!.id,
            principalIcdCode: 'I10',
            principalPresentOnAdmission: PresentOnAdmission.Y,
          },
        });

        if (anemiaDiag) {
          await prisma.admissionSecondaryDiagnosis.create({
            data: {
              admissionId: admission.id,
              diagnosisId: anemiaDiag.id,
              icdCode: anemiaDiag.icdCode,
              diagnosisType: SecondaryDiagnosisType.comorbidity,
              presentOnAdmission: PresentOnAdmission.Y,
            },
          });
        }

        await prisma.bed.update({ 
          where: { id: bed.id }, 
          data: { isOccupied: true, currentPatientId: patients[0].id } 
        });
        console.log('✅ Admission seeded');
      }
    }

    // =============== 12. NOTIFICATION ===============
    await prisma.notification.create({
      data: {
        userId: doctor.id,
        title: 'New Malaria Case',
        message: 'Malaria case registered for Ama Serwaa. Test results available.',
        type: 'clinical',
        priority: 'medium',
        actionType: 'lab_results',
        actionId: nhisAttendance.id,
        actionUrl: `/attendances/${nhisAttendance.id}`,
      },
    });
    console.log('✅ Notification seeded');
    console.log('🎉 All test data seeding completed!');

    console.log('\n📋 TEST DATA SUMMARY:');
    patients.forEach(p => {
      console.log(`   - ${p.surname} ${p.otherNames} (${p.folderNumber}) - ${p.paymentMode}`);
    });
    console.log('🏥 Medical Cases:');
    console.log('   - PAT-10001: Malaria with NHIS coverage');
    console.log('   - PAT-10000: Hypertension with cash payment');
    console.log('👨‍⚕️ Test Users: doctor1/doctor123, nurse1/nurse123, etc.');

    return {
      success: true,
      message: 'Test data seeded successfully',
      realDataDetected: false,
      existingTestData: false
    };

  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
};

// ✅ Main initialization function
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
      console.log('🚨 Real data detected in database. Seeding aborted.');
      return { initialized: true, seeded: false, reason: 'real_data_detected' };
    }

    console.log('🔧 Seeding test data...');
    const result = await seedTestData(false);
    
    return {
      initialized: true,
      seeded: result.success,
      reason: result.success ? 'seeded' : 'seed_failed'
    };

  } catch (error: any) {
    console.error('❌ Database initialization failed:', error);
    return { initialized: false, seeded: false, error: error.message };
  }
};

// ✅ Function to check database status
export const checkDatabaseStatus = async () => {
  console.log('🔍 Checking database status...');
  
  try {
    const [totalPatients, totalUsers, totalBills, realDataExists, testDataExists] = await Promise.all([
      prisma.patient.count(),
      prisma.user.count(),
      prisma.bill.count(),
      hasRealData(),
      hasTestData()
    ]);

    const testPatients = await prisma.patient.count({
      where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } }
    });

    const testUsers = await prisma.user.count({
      where: { 
        username: { 
          in: ['doctor1', 'nurse1', 'midwife1', 'records1', 'lab1', 'sonographer1', 'pharma1', 'accounts1'] 
        } 
      }
    });

    return {
      databaseStatus: 'connected',
      environment: process.env.NODE_ENV || 'development',
      totals: { patients: totalPatients, users: totalUsers, bills: totalBills },
      testData: { testPatients, testUsers, hasTestData: testDataExists },
      safety: { hasRealData: realDataExists, safeToDelete: !realDataExists, safeToSeed: !realDataExists },
      seeding: { enabled: SEEDING_ENABLED, recommended: !realDataExists && !testDataExists }
    };
  } catch (error: any) {
    console.error('❌ Error checking database status:', error);
    return { databaseStatus: 'error', error: error.message };
  }
};

export default {
  seedTestData,
  deleteTestData, 
  checkDatabaseStatus,
  initializeDatabase 
};