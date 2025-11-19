import { PrismaClient, UserRole, Gender, PaymentMode, AdmissionType, AdmissionSource, EncounterCategory, VisitCategory, SpecimenType, ProcedureCategory, ScanCategory, BodyPart, BillStatus, ClaimStatus, AttendanceStatus, LabTestStatus, ProcedureStatus, MedicationStatus, AttendanceType, PresentOnAdmission, SecondaryDiagnosisType, DiagnosisType, NHISCoverageType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: hash password
const hashPassword = (password: string) => bcrypt.hashSync(password, 10);

// Helper: calculate age
const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

const generateBillNumber = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `BILL-${timestamp}-${random}`;
};

// Helper: Generate unique attendance number
const generateUniqueAttendanceNumber = async (): Promise<string> => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `ATT-${timestamp}-${random}`;
};

// ✅ NEW: Function to delete all test data
export const deleteTestData = async () => {
  console.log('🗑️ Deleting all test data...');
  
  try {
    // Delete in correct dependency order
    await prisma.notification.deleteMany({});
    await prisma.stockTransaction.deleteMany({});
    await prisma.admissionSecondaryDiagnosis.deleteMany({});
    await prisma.admission.deleteMany({});
    await prisma.procedure.deleteMany({});
    await prisma.scan.deleteMany({});
    await prisma.labTest.deleteMany({});
    await prisma.medication.deleteMany({});
    await prisma.vitals.deleteMany({});
    await prisma.attendanceDiagnosis.deleteMany({});
    await prisma.insuranceClaim.deleteMany({});
    await prisma.bill.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.appointment.deleteMany({});
    await prisma.patient.deleteMany({
      where: {
        OR: [
          { folderNumber: 'PAT-10000' },
          { folderNumber: 'PAT-10001' }
        ]
      }
    });
    
    // Delete test users (except admin)
    await prisma.user.deleteMany({
      where: {
        username: {
          in: ['doctor1', 'nurse1', 'midwife1', 'records1', 'lab1', 'sonographer1', 'pharma1', 'accounts1']
        }
      }
    });
    
    console.log('✅ All test data deleted successfully');
  } catch (error) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ✅ NEW: Helper to find or create fallback data with CORRECT CODES
const findOrCreateFallbackData = async () => {
  console.log('🔍 Setting up fallback test data with correct Ghana medical codes...');
  
  // Try to find existing data first
  let malariaDiag = await prisma.diagnosis.findFirst({ 
    where: { 
      OR: [
        { icdCode: 'B54' }, // ✅ CORRECT ICD-10 for Unspecified Malaria
        { name: { contains: 'malaria', mode: 'insensitive' } }
      ]
    } 
  });
  
  let generalConsult = await prisma.serviceCatalog.findFirst({ 
    where: { 
      OR: [
        { code: 'CONS-GEN' },
        { name: { contains: 'consultation', mode: 'insensitive' } }
      ]
    } 
  });

  let anemiaDiag = await prisma.diagnosis.findFirst({
    where: { 
      OR: [
        { icdCode: 'D64.9' }, // ✅ CORRECT ICD-10 for Anemia, unspecified
        { name: { contains: 'anemia', mode: 'insensitive' } }
      ]
    },
  });

  let hypertensionDiag = await prisma.diagnosis.findFirst({
    where: { 
      OR: [
        { icdCode: 'I10' }, // ✅ CORRECT ICD-10 for Essential hypertension
        { name: { contains: 'hypertension', mode: 'insensitive' } }
      ]
    },
  });

  // Create fallback data if not found with CORRECT CODES
  if (!malariaDiag) {
    console.log('⚠️ Creating fallback malaria diagnosis with correct ICD-10...');
    malariaDiag = await prisma.diagnosis.create({
      data: {
        name: 'Malaria, unspecified',
        icdCode: 'B54', // ✅ CORRECT ICD-10
        gdrgCode: 'GDRG-MAL-001',
        description: 'Malaria falciparum for testing purposes',
        isPending: false,
        requiresAuthorization: false,
        isChronic: false,
        isNHISCovered: true,
        category: 'medical',
      },
    });
  }

  if (!anemiaDiag) {
    console.log('⚠️ Creating fallback anemia diagnosis with correct ICD-10...');
    anemiaDiag = await prisma.diagnosis.create({
      data: {
        name: 'Anaemia, unspecified',
        icdCode: 'D64.9', // ✅ CORRECT ICD-10
        gdrgCode: 'GDRG-ANE-001',
        description: 'Anemia for testing purposes',
        isPending: false,
        requiresAuthorization: false,
        isChronic: true,
        isNHISCovered: true,
        category: 'medical',
      },
    });
  }

  if (!hypertensionDiag) {
    console.log('⚠️ Creating fallback hypertension diagnosis with correct ICD-10...');
    hypertensionDiag = await prisma.diagnosis.create({
      data: {
        name: 'Essential (primary) hypertension',
        icdCode: 'I10', // ✅ CORRECT ICD-10
        gdrgCode: 'GDRG-HTN-001',
        description: 'Hypertension for testing purposes',
        isPending: false,
        requiresAuthorization: false,
        isChronic: true,
        isNHISCovered: true,
        category: 'medical',
      },
    });
  }

  if (!generalConsult) {
    console.log('⚠️ Creating fallback consultation service...');
    generalConsult = await prisma.serviceCatalog.create({
      data: {
        name: 'General Consultation',
        code: 'CONS-GEN',
        description: 'General medical consultation',
        serviceType: 'consultation',
        serviceCategory: 'opd',
        cashPrice: 50, // ✅ Realistic Ghana pricing
        nhisPrice: 0,
        insurancePrice: 40,
        unit: 'Each',
        isPending: false,
        vatRate: 0,
        isTaxable: false,
        nhisServiceCode: 'OPD001', // ✅ NHIS service code
        isNHISCovered: true,
        nhisCoverageType: 'full',
        nhisRequiresAuth: false,
        privateInsRequiresAuth: false,
        isPrivateInsuranceExempted: false,
        requiresClinicalNotes: false,
      },
    });
  }

  return { malariaDiag, anemiaDiag, hypertensionDiag, generalConsult };
};

export const seedTestData = async () => {
  console.log('🧪 Seeding test data for endpoints...');

  try {
    // =============== 0. CLEAN UP EXISTING TEST DATA FIRST ===============
    await deleteTestData();
    
    // =============== 1. TEST USERS ===============
    const testUsers = [
      { username: 'doctor1', password: hashPassword('doctor123'), fullName: 'Dr. Kofi Mensah', role: 'doctor' as UserRole, email: 'doctor@hospital.com', phone: '+233244222222', licenseNumber: 'MD-12345', specialization: 'General Medicine', isActive: true },
      { username: 'nurse1', password: hashPassword('nurse123'), fullName: 'Nurse Akua Johnson', role: 'nurse' as UserRole, email: 'nurse@hospital.com', phone: '+233244333333', licenseNumber: 'RN-54321', isActive: true },
      { username: 'midwife1', password: hashPassword('midwife123'), fullName: 'Midwife Abena Serwaa', role: 'midwife' as UserRole, email: 'midwife@hospital.com', phone: '+233244444444', licenseNumber: 'MW-98765', isActive: true },
      { username: 'records1', password: hashPassword('records123'), fullName: 'Records Officer Kwame Osei', role: 'records' as UserRole, email: 'records@hospital.com', phone: '+233244555555', isActive: true },
      { username: 'lab1', password: hashPassword('lab123'), fullName: 'Lab Tech Yaw Asare', role: 'lab_tech' as UserRole, email: 'lab@hospital.com', phone: '+233244666666', licenseNumber: 'LT-11223', isActive: true },
      { username: 'sonographer1', password: hashPassword('scan123'), fullName: 'Sonographer Ama Boateng', role: 'sonographer' as UserRole, email: 'sonographer@hospital.com', phone: '+233244999999', licenseNumber: 'SN-11223', isActive: true },
      { username: 'pharma1', password: hashPassword('pharma123'), fullName: 'Pharmacist Nana Kwaku', role: 'pharmacist' as UserRole, email: 'pharma@hospital.com', phone: '+233244777777', licenseNumber: 'PH-44556', isActive: true },
      { username: 'accounts1', password: hashPassword('accounts123'), fullName: 'Accountant Esi Brown', role: 'accounts' as UserRole, email: 'accounts@hospital.com', phone: '+233244888888', isActive: true },
    ];

    for (const userData of testUsers) {
      await prisma.user.create({
        data: userData,
      });
    }
    console.log('✅ Test users seeded');

    // Fetch users for later use
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    const doctor = await prisma.user.findUnique({ where: { username: 'doctor1' } });
    const nurse = await prisma.user.findUnique({ where: { username: 'nurse1' } });
    const pharmacist = await prisma.user.findUnique({ where: { username: 'pharma1' } });
    const labTech = await prisma.user.findUnique({ where: { username: 'lab1' } });
    const sonographer = await prisma.user.findUnique({ where: { username: 'sonographer1' } });

    if (!admin) {
      throw new Error('Admin user not found. Please run core seeding first.');
    }

    // =============== 2. GET OR CREATE FALLBACK DATA WITH CORRECT CODES ===============
    const { malariaDiag, anemiaDiag, hypertensionDiag, generalConsult } = await findOrCreateFallbackData();

    // =============== 3. TEST PATIENTS ===============
    const patientsData = [
      {
        folderNumber: 'PAT-10000',
        surname: 'Mensah',
        otherNames: 'Kwame',
        gender: 'male' as Gender,
        dateOfBirth: new Date('1985-05-15'),
        contact: '+233244123456',
        address: '123 Main St, Accra, Ghana',
        paymentMode: 'cash' as PaymentMode,
      },
      {
        folderNumber: 'PAT-10001', 
        surname: 'Serwaa',
        otherNames: 'Ama',
        gender: 'female' as Gender,
        dateOfBirth: new Date('1990-08-22'),
        contact: '+233244234567',
        address: '456 Oak Ave, Kumasi, Ghana',
        paymentMode: 'nhis' as PaymentMode,
        insuranceDetails: {
          memberId: 'NHIS-24593',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          providerName: 'National Health Insurance Scheme'
        }
      }
    ];

    const patients = [];
    for (const p of patientsData) {
      const age = calculateAge(p.dateOfBirth);
      const patient = await prisma.patient.create({
        data: {
          folderNumber: p.folderNumber,
          surname: p.surname,
          otherNames: p.otherNames,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          age,
          contact: p.contact,
          address: p.address,
          paymentMode: p.paymentMode,
          insuranceDetails: p.insuranceDetails || {},
          registeredBy: admin.fullName,
          registeredAt: new Date(),
        },
      });
      patients.push(patient);
    }
    console.log('✅ Test patients seeded');

    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    if (!nhisProvider) {
      throw new Error('NHIS provider not found. Please run core seeding first.');
    }

    // =============== 4. DEPARTMENTS ===============
    const medDept = await prisma.department.upsert({
      where: { name: 'Internal Medicine' },
      update: { headId: doctor?.id || null },
      create: {
        name: 'Internal Medicine',
        description: 'General and specialist medical care',
        headId: doctor?.id || null,
        isActive: true,
      },
    });
    console.log('✅ Departments seeded');

    // =============== 5. ATTENDANCES, BILLS, CLAIMS ===============
    // Create NHIS patient attendance - MALARIA CASE
    const nhisAttendanceNumber = await generateUniqueAttendanceNumber();
    const nhisAttendance = await prisma.attendance.create({
      data: {
        attendanceNumber: nhisAttendanceNumber,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        dateTime: new Date(),
        attendanceType: 'general_consultation' as AttendanceType,
        paymentMode: 'nhis',
        nhisCCC: '24593',
        complaints: 'Fever, headache, and body pains for 3 days',
        createdById: admin.id,
        status: 'completed' as AttendanceStatus,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: 'opd' as EncounterCategory,
        visitCategory: 'general' as VisitCategory,
        diagnoses: {
          create: {
            diagnosisId: malariaDiag.id,
            primary: true,
            date: new Date(),
            createdById: doctor!.id,
            icdCode: malariaDiag.icdCode, // ✅ B54
            presentOnAdmission: 'Y' as PresentOnAdmission,
            diagnosisType: 'principal' as DiagnosisType,
          }
        },
        servicesRendered: {
          create: {
            serviceItemId: generalConsult.id,
            quantity: 1,
            performedById: doctor!.id,
          }
        }
      },
    });

    const nhisBill = await prisma.bill.create({
      data: {
        billNumber: generateBillNumber(), 
        patientId: patients[1].id,
        attendanceId: nhisAttendance.id,
        items: [{
          description: 'General Consultation',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          category: 'consultation'
        }],
        subtotal: 0,
        totalAmount: 0,
        insuranceCovered: 0,
        patientPayable: 0,
        paidAmount: 0,
        balance: 0,
        status: 'paid' as BillStatus,
        paymentMode: 'nhis',
        insuranceProviderId: nhisProvider.id,
        billDate: new Date(),
        createdById: admin.id,
        taxAmount: 0,
        discount: 0,
        claimStatus: 'not_required' as ClaimStatus,
      },
    });

    await prisma.insuranceClaim.create({
      data: {
        claimNumber: `CLAIM-${Date.now()}`,
        billId: nhisBill.id,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        attendanceId: nhisAttendance.id,
        totalClaimAmount: 45.50, // ✅ Realistic NHIS tariff for malaria
        status: 'submitted' as ClaimStatus,
        diagnosisCodes: [malariaDiag.icdCode], // ✅ [B54]
        procedureCodes: ['CONS-GEN'],
        createdById: admin.id,
        approvedAmount: 0,
        rejectedAmount: 0,
        paidAmount: 0,
      },
    });
    console.log('✅ NHIS attendance, bill and claim seeded');

    // Create Cash patient attendance - HYPERTENSION CASE
    const cashAttendanceNumber = await generateUniqueAttendanceNumber();
    const cashAttendance = await prisma.attendance.create({
      data: {
        attendanceNumber: cashAttendanceNumber,
        patientId: patients[0].id,
        dateTime: new Date(),
        attendanceType: 'chronic_followup' as AttendanceType,
        paymentMode: 'cash',
        complaints: 'Routine hypertension follow-up, BP monitoring',
        createdById: admin.id,
        status: 'completed' as AttendanceStatus,
        totalBill: 0,
        paidAmount: 0,
        outstandingBalance: 0,
        encounterCategory: 'opd' as EncounterCategory,
        visitCategory: 'general' as VisitCategory,
        diagnoses: {
          create: {
            diagnosisId: hypertensionDiag.id,
            primary: true,
            date: new Date(),
            createdById: doctor!.id,
            icdCode: hypertensionDiag.icdCode, // ✅ I10
            presentOnAdmission: 'Y' as PresentOnAdmission,
            diagnosisType: 'principal' as DiagnosisType,
          }
        }
      },
    });

    await prisma.bill.create({
      data: {
        billNumber: generateBillNumber(),
        patientId: patients[0].id,
        attendanceId: cashAttendance.id,
        items: [{
          description: 'Chronic Disease Follow-up',
          quantity: 1,
          unitPrice: 80, // ✅ Realistic Ghana pricing
          totalPrice: 80,
          category: 'consultation'
        }],
        subtotal: 80,
        totalAmount: 80,
        insuranceCovered: 0,
        patientPayable: 80,
        paidAmount: 80,
        balance: 0,
        status: 'paid' as BillStatus,
        paymentMode: 'cash',
        billDate: new Date(),
        createdById: admin.id,
        taxAmount: 0,
        discount: 0,
        claimStatus: 'not_required' as ClaimStatus,
      },
    });
    console.log('✅ Cash patient attendance and bill seeded');

    // =============== 6. APPOINTMENTS ===============
    await prisma.appointment.create({
      data: {
        patientId: patients[1].id,
        doctorId: doctor!.id,
        departmentId: medDept.id,
        title: 'Follow-up for Malaria Treatment',
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        appointmentTime: '10:00',
        duration: 30,
        status: 'confirmed',
        type: 'follow_up',
        isNHIS: true,
        nhisCCC: '24593',
        createdBy: admin.id,
      },
    });
    console.log('✅ Appointments seeded');

    // =============== 7. VITALS ===============
    await prisma.vitals.create({
      data: {
        attendanceId: nhisAttendance.id,
        patientId: patients[1].id,
        temperature: 38.2, // ✅ Fever for malaria case
        pulse: 92,
        respiration: 18,
        spo2: 97,
        weight: 65,
        height: 165,
        bmi: 23.9,
        bloodPressure: '130/85',
        recordedById: nurse?.id || doctor!.id,
      },
    });
    console.log('✅ Vitals seeded');

    // =============== 8. MEDICATION LIFECYCLE ===============
    const paracetamol = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Paracetamol', mode: 'insensitive' } },
    });
    
    const artesunate = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Artesunate', mode: 'insensitive' } },
    });
    
    if (!paracetamol || !artesunate) {
      console.warn('⚠️ Malaria medications not found, skipping medication lifecycle');
    } else {
      // Artesunate for malaria treatment
      const malariaMed = await prisma.medication.create({
        data: {
          attendanceId: nhisAttendance.id,
          stockItemId: artesunate.id,
          name: 'Artesunate 50mg',
          dosage: '2 tabs',
          frequency: 'Once daily',
          duration: '3 days',
          quantity: 6,
          route: 'oral',
          instructions: 'Take with food',
          status: 'prescribed' as MedicationStatus,
          prescribedById: doctor!.id,
        },
      });
      
      // Paracetamol for fever
      const feverMed = await prisma.medication.create({
        data: {
          attendanceId: nhisAttendance.id,
          stockItemId: paracetamol.id,
          name: 'Paracetamol 500mg',
          dosage: '1 tab',
          frequency: '8 hourly',
          duration: '3 days',
          quantity: 9,
          route: 'oral',
          instructions: 'Take for fever',
          status: 'prescribed' as MedicationStatus,
          prescribedById: doctor!.id,
        },
      });
      
      // Dispense medications
      await prisma.medication.update({
        where: { id: malariaMed.id },
        data: {
          status: 'dispensed' as MedicationStatus,
          dispensedAt: new Date(),
          dispensedById: pharmacist!.id,
        },
      });
      
      await prisma.medication.update({
        where: { id: feverMed.id },
        data: {
          status: 'dispensed' as MedicationStatus,
          dispensedAt: new Date(),
          dispensedById: pharmacist!.id,
        },
      });
      
      console.log('✅ Medication lifecycle seeded');
    }

    // =============== 9. LAB TEST LIFECYCLE ===============
    const malariaTest = await prisma.labTestTemplate.findFirst({
      where: { 
        OR: [
          { investigationCode: 'INVE06C' }, // ✅ Correct investigation code
          { name: { contains: 'Malaria', mode: 'insensitive' } }
        ]
      },
    });
    
    const fbcTest = await prisma.labTestTemplate.findFirst({
      where: { 
        OR: [
          { investigationCode: 'INVE01A' }, // ✅ Correct investigation code for FBC
          { name: { contains: 'Full Blood Count', mode: 'insensitive' } }
        ]
      },
    });
    
    if (!malariaTest) {
      console.warn('⚠️ Malaria test not found, skipping lab test lifecycle');
    } else {
      const malariaLab = await prisma.labTest.create({
        data: {
          attendanceId: nhisAttendance.id,
          templateId: malariaTest.id,
          status: 'requested' as LabTestStatus,
          createdById: doctor!.id,
          priority: 'routine',
        },
      });
      
      // Perform malaria test
      await prisma.labTest.update({
        where: { id: malariaLab.id },
        data: {
          status: 'completed' as LabTestStatus,
          result: {
            test: 'Malaria Parasite',
            result: 'Positive',
            species: 'Plasmodium falciparum',
            parasiteCount: '+++',
          },
          normalRange: 'Negative',
          units: 'Qualitative',
          performedById: labTech!.id,
          completedAt: new Date(),
        },
      });
      
      console.log('✅ Lab test lifecycle seeded');
    }

    // =============== 10. SCAN LIFECYCLE ===============
    const chestXray = await prisma.scanTemplate.findFirst({
      where: { 
        OR: [
          { investigationCode: 'RAD01A' }, // ✅ Correct investigation code
          { name: { contains: 'Chest X-Ray', mode: 'insensitive' } }
        ]
      },
    });
    
    if (!chestXray) {
      console.warn('⚠️ Chest X-Ray not found, skipping scan lifecycle');
    } else {
      const scan = await prisma.scan.create({
        data: {
          attendanceId: nhisAttendance.id,
          templateId: chestXray.id,
          scanType: 'Chest X-Ray',
          description: 'Chest X-ray to rule out pneumonia in malaria case',
          bodyPart: 'chest',
          status: 'requested' as ScanStatus,
          createdById: doctor!.id,
          priority: 'routine',
        },
      });
      
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'completed' as ScanStatus,
          findings: 'Clear lung fields, normal cardiac silhouette',
          impression: 'No active cardiopulmonary disease',
          performedById: sonographer!.id,
          completedAt: new Date(),
          imageUrls: ['/uploads/scans/chest-xray-malaria-001.jpg'],
        },
      });
      console.log('✅ Scan lifecycle seeded');
    }

    // =============== 11. ADMISSION WITH SECONDARY DIAGNOSIS ===============
    const generalWard = await prisma.ward.findFirst({ where: { wardName: 'General Ward A' } });
    
    if (!generalWard) {
      console.warn('⚠️ General ward not found, skipping admission');
    } else {
      const bed = await prisma.bed.findFirst({ 
        where: { wardId: generalWard.id, isOccupied: false } 
      });
      
      if (!bed) {
        console.warn('⚠️ No available beds, skipping admission');
      } else {
        const admission = await prisma.admission.create({
          data: {
            admissionNumber: `ADM-${Date.now()}`,
            patientId: patients[0].id, // Hypertension patient admitted for monitoring
            attendanceId: cashAttendance.id,
            wardId: generalWard.id,
            bedId: bed.id,
            admissionDate: new Date(),
            admissionTime: '14:30',
            admittingDoctor: doctor!.fullName,
            reasonForAdmission: 'Hypertensive urgency for monitoring',
            diagnosis: 'Essential hypertension with elevated BP',
            status: 'admitted',
            createdBy: doctor!.fullName,
            admissionType: 'elective' as AdmissionType,
            admissionSource: 'opd' as AdmissionSource,
            lengthOfStay: 1,
            principalDiagnosisId: hypertensionDiag.id,
            principalIcdCode: hypertensionDiag.icdCode, // ✅ I10
            principalPresentOnAdmission: 'Y' as PresentOnAdmission,
          },
        });

        // Add secondary diagnosis (anemia)
        await prisma.admissionSecondaryDiagnosis.create({
          data: {
            admissionId: admission.id,
            diagnosisId: anemiaDiag.id,
            icdCode: anemiaDiag.icdCode, // ✅ D64.9
            diagnosisType: 'comorbidity' as SecondaryDiagnosisType,
            presentOnAdmission: 'Y' as PresentOnAdmission,
          },
        });

        // Update bed
        await prisma.bed.update({ 
          where: { id: bed.id }, 
          data: { isOccupied: true, currentPatientId: patients[0].id } 
        });
        console.log('✅ Admission with secondary diagnosis seeded');
      }
    }

    // =============== 12. STOCK TRANSACTION ===============
    if (artesunate) {
      await prisma.stockTransaction.create({
        data: {
          stockItemId: artesunate.id,
          transactionType: 'dispense',
          quantity: -6, // 6 tablets dispensed
          balanceAfter: Math.max(0, (artesunate.currentStock || 200) - 6),
          reference: 'MED-MAL-001',
          notes: 'Dispensed for malaria treatment - Artesunate',
          performedBy: pharmacist!.fullName,
        },
      });
      console.log('✅ Stock transaction seeded');
    }

    // =============== 13. NOTIFICATIONS ===============
    await prisma.notification.create({
      data: {
        userId: doctor!.id,
        title: 'New Malaria Case',
        message: 'Malaria case registered for Ama Serwaa. Test results available.',
        type: 'clinical',
        priority: 'medium',
        actionType: 'lab_results',
        actionId: nhisAttendance.id,
        actionUrl: `/attendances/${nhisAttendance.id}`,
      },
    });
    console.log('✅ Notifications seeded');

    console.log('🎉 All test data seeding completed!');

    // Print summary for frontend testing
    console.log('\n📋 TEST DATA SUMMARY (Ghana Medical Context):');
    console.log('👥 Patients:');
    patients.forEach(p => {
      console.log(`   - ${p.surname} ${p.otherNames} (${p.folderNumber}) - ${p.paymentMode}`);
    });
    console.log('🏥 Medical Cases:');
    console.log('   - PAT-10001: Malaria (B54) with NHIS coverage');
    console.log('   - PAT-10000: Hypertension (I10) with cash payment');
    console.log('👨‍⚕️ Test Users: doctor1/doctor123, nurse1/nurse123, etc.');
    console.log('💊 Real Ghana medications: Artesunate, Paracetamol');
    console.log('🔬 Correct investigation codes: INVE06C (Malaria), INVE01A (FBC)');
    console.log('📄 Use these credentials to test the frontend');

  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    throw error;
  }
};