import { PrismaClient, UserRole, Gender, PaymentMode, AdmissionType, AdmissionSource, EncounterCategory, VisitCategory, SpecimenType, ProcedureCategory, ScanCategory, BodyPart, BillStatus, ClaimStatus, AttendanceStatus, LabTestStatus, ProcedureStatus, MedicationStatus, AttendanceType, PresentOnAdmission, SecondaryDiagnosisType, DiagnosisType, NHISCoverageType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ✅ SIMPLIFIED: Environment-based control
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const SEEDING_ENABLED = process.env.ENABLE_SEEDING !== 'false';

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

// ✅ SIMPLIFIED: Real data detection
const hasRealData = async (): Promise<boolean> => {
  console.log('🔍 Checking for real data in database...');
  
  try {
    // Simple check: look for any patients that aren't our test patients
    const realPatientCount = await prisma.patient.count({
      where: {
        folderNumber: { 
          not: { in: ['PAT-10000', 'PAT-10001'] } 
        }
      }
    });

    const hasRealData = realPatientCount > 0;

    console.log('📊 Real data check:', {
      realPatientCount,
      hasRealData
    });

    return hasRealData;
  } catch (error) {
    console.error('❌ Error checking for real data:', error);
    return false;
  }
};

// ✅ SIMPLIFIED: Test data check
const hasTestData = async (): Promise<boolean> => {
  console.log('🔍 Checking if test data exists...');
  
  try {
    const testPatientCount = await prisma.patient.count({
      where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } }
    });

    const hasData = testPatientCount > 0;

    console.log('📊 Test data check:', {
      testPatientCount,
      hasData
    });

    return hasData;
  } catch (error) {
    console.error('❌ Error checking test data:', error);
    return false;
  }
};

// ✅ UPDATED: Function to delete only test data with safety check
export const deleteTestData = async (force: boolean = false) => {
  // Safety: Never delete data in production unless explicitly forced
  if (isProduction && !force) {
    console.log('🚨 PRODUCTION SAFETY: Test data deletion disabled in production');
    return {
      success: false,
      message: 'Test data deletion is disabled in production for safety.',
      productionSafety: true
    };
  }

  console.log('🗑️ Preparing to delete test data...');
  
  try {
    // Safety check: Don't delete if there's real data unless forced
    if (!force) {
      const realDataExists = await hasRealData();
      if (realDataExists) {
        console.log('🚨 SAFETY STOP: Real data detected in database. Test data deletion aborted.');
        console.log('💡 Use force=true parameter to override this safety check.');
        return {
          success: false,
          message: 'Real data detected in database. Test data deletion aborted for safety.',
          realDataDetected: true
        };
      }
    }

    console.log('✅ Safety check passed. Proceeding with test data deletion...');
    
    let deletedCounts = {
      notifications: 0,
      stockTransactions: 0,
      invoiceItems: 0,
      requisitionItems: 0,
      invoices: 0,
      requisitions: 0,
      admissionSecondaryDiagnoses: 0,
      procedures: 0,
      scans: 0,
      labTests: 0,
      medications: 0,
      vitals: 0,
      attendanceDiagnoses: 0,
      insuranceClaims: 0,
      bills: 0,
      attendances: 0,
      appointments: 0,
      admissions: 0,
      patients: 0,
      users: 0
    };

    // Delete in correct dependency order (most dependent first)
    
    // Notifications for test data
    deletedCounts.notifications = await prisma.notification.deleteMany({
      where: {
        OR: [
          { title: { contains: 'Malaria', mode: 'insensitive' } },
          { title: { contains: 'Test', mode: 'insensitive' } }
        ]
      }
    }).then(result => result.count);
    
    // Stock transactions with test references
    deletedCounts.stockTransactions = await prisma.stockTransaction.deleteMany({
      where: {
        OR: [
          { reference: { contains: 'MED-MAL', mode: 'insensitive' } },
          { reference: { contains: 'MED-PAIN', mode: 'insensitive' } },
          { reference: { contains: 'ADJ-001', mode: 'insensitive' } },
          { notes: { contains: 'test', mode: 'insensitive' } }
        ]
      }
    }).then(result => result.count);
    
    // Invoice items for test invoices
    deletedCounts.invoiceItems = await prisma.invoiceItem.deleteMany({
      where: {
        invoice: {
          invoiceNumber: {
            in: ['INV-2024-001', 'INV-2024-002']
          }
        }
      }
    }).then(result => result.count);
    
    // Requisition items for test requisitions  
    deletedCounts.requisitionItems = await prisma.requisitionItem.deleteMany({
      where: {
        requisition: {
          requisitionNumber: 'REQ-2024-001'
        }
      }
    }).then(result => result.count);
    
    // Test invoices
    deletedCounts.invoices = await prisma.invoice.deleteMany({
      where: {
        invoiceNumber: {
          in: ['INV-2024-001', 'INV-2024-002']
        }
      }
    }).then(result => result.count);
    
    // Test requisitions
    deletedCounts.requisitions = await prisma.requisition.deleteMany({
      where: {
        requisitionNumber: 'REQ-2024-001'
      }
    }).then(result => result.count);
    
    // Admission secondary diagnoses for test admissions
    deletedCounts.admissionSecondaryDiagnoses = await prisma.admissionSecondaryDiagnosis.deleteMany({
      where: {
        admission: {
          admissionNumber: { startsWith: 'ADM-' }
        }
      }
    }).then(result => result.count);
    
    // Procedures, scans, lab tests, medications, vitals for test attendances
    deletedCounts.procedures = await prisma.procedure.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    deletedCounts.scans = await prisma.scan.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    deletedCounts.labTests = await prisma.labTest.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    deletedCounts.medications = await prisma.medication.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    deletedCounts.vitals = await prisma.vitals.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    // Attendance diagnoses for test attendances
    deletedCounts.attendanceDiagnoses = await prisma.attendanceDiagnosis.deleteMany({
      where: {
        attendance: {
          attendanceNumber: { startsWith: 'ATT-' }
        }
      }
    }).then(result => result.count);
    
    // Insurance claims for test bills
    deletedCounts.insuranceClaims = await prisma.insuranceClaim.deleteMany({
      where: {
        claimNumber: { startsWith: 'CLAIM-' }
      }
    }).then(result => result.count);
    
    // Bills for test attendances
    deletedCounts.bills = await prisma.bill.deleteMany({
      where: {
        billNumber: { startsWith: 'BILL-' }
      }
    }).then(result => result.count);
    
    // Test attendances
    deletedCounts.attendances = await prisma.attendance.deleteMany({
      where: {
        attendanceNumber: { startsWith: 'ATT-' }
      }
    }).then(result => result.count);
    
    // Test appointments
    deletedCounts.appointments = await prisma.appointment.deleteMany({
      where: {
        title: { contains: 'Follow-up for Malaria', mode: 'insensitive' }
      }
    }).then(result => result.count);
    
    // Test admissions
    deletedCounts.admissions = await prisma.admission.deleteMany({
      where: {
        admissionNumber: { startsWith: 'ADM-' }
      }
    }).then(result => result.count);
    
    // Reset beds occupancy for test patients
    await prisma.bed.updateMany({
      where: {
        currentPatientId: {
          in: await prisma.patient.findMany({
            where: { folderNumber: { in: ['PAT-10000', 'PAT-10001'] } },
            select: { id: true }
          }).then(patients => patients.map(p => p.id))
        }
      },
      data: {
        isOccupied: false,
        currentPatientId: null
      }
    });
    
    // Delete test patients
    deletedCounts.patients = await prisma.patient.deleteMany({
      where: {
        folderNumber: {
          in: ['PAT-10000', 'PAT-10001']
        }
      }
    }).then(result => result.count);
    
    // Delete test users (except admin)
    deletedCounts.users = await prisma.user.deleteMany({
      where: {
        username: {
          in: ['doctor1', 'nurse1', 'midwife1', 'records1', 'lab1', 'sonographer1', 'pharma1', 'accounts1']
        }
      }
    }).then(result => result.count);
    
    console.log('✅ Test data deletion completed successfully');
    console.log('📊 Deletion summary:', deletedCounts);
    
    return {
      success: true,
      message: 'Test data deleted successfully',
      deletedCounts,
      realDataDetected: false
    };
  } catch (error) {
    console.error('❌ Error deleting test data:', error);
    throw error;
  }
};

// ✅ SIMPLIFIED: Function to safely seed test data
export const seedTestData = async (force: boolean = false) => {
  // Safety: Control seeding with environment variable
  if (!SEEDING_ENABLED) {
    console.log('🔒 Seeding disabled via environment variable');
    return {
      success: false,
      message: 'Seeding is disabled via ENABLE_SEEDING environment variable',
      seedingDisabled: true
    };
  }

  // Safety: Be very careful in production
  if (isProduction && !force) {
    console.log('🚨 PRODUCTION SAFETY: Seeding disabled in production');
    return {
      success: false,
      message: 'Seeding is disabled in production for safety. Use force=true to override.',
      productionSafety: true
    };
  }

  console.log('🧪 Preparing to seed test data...');

  try {
    // ✅ SIMPLIFIED: Check if test data already exists
    const testDataExists = await hasTestData();
    
    if (testDataExists && !force) {
      console.log('✅ Test data already exists. Skipping seeding.');
      return {
        success: true,
        message: 'Test data already exists. No seeding needed.',
        existingTestData: true,
        skipped: true
      };
    }

    // If force is true and test data exists, delete it first
    if (testDataExists && force) {
      console.log('🔄 Force reseed requested, deleting existing test data...');
      await deleteTestData(true);
    }

    // Check for real data (safety)
    if (!force) {
      const realDataExists = await hasRealData();
      if (realDataExists) {
        console.log('🚨 SAFETY STOP: Real data detected in database. Seeding aborted.');
        return {
          success: false, 
          message: 'Real data detected in database. Seeding aborted for safety. Use force=true to override.',
          realDataDetected: true
        };
      }
    }

    console.log('✅ Safety checks passed. Proceeding with test data seeding...');

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
      await prisma.user.upsert({
        where: { username: userData.username },
        create: userData,
        update: userData,
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
      const patient = await prisma.patient.upsert({
        where: { folderNumber: p.folderNumber },
        create: {
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
        update: {
          surname: p.surname,
          otherNames: p.otherNames,
          gender: p.gender,
          dateOfBirth: p.dateOfBirth,
          age,
          contact: p.contact,
          address: p.address,
          paymentMode: p.paymentMode,
          insuranceDetails: p.insuranceDetails || {},
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
            icdCode: malariaDiag.icdCode,
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
        claimStatus: 'draft' as ClaimStatus,
      },
    });

    await prisma.insuranceClaim.create({
      data: {
        claimNumber: `CLAIM-${Date.now()}`,
        billId: nhisBill.id,
        patientId: patients[1].id,
        insuranceProviderId: nhisProvider.id,
        attendanceId: nhisAttendance.id,
        totalClaimAmount: 45.50,
        status: 'submitted' as ClaimStatus,
        diagnosisCodes: [malariaDiag.icdCode],
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
            icdCode: hypertensionDiag.icdCode,
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
          unitPrice: 80,
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
        temperature: 38.2,
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
          { investigationCode: 'INVE06C' },
          { name: { contains: 'Malaria', mode: 'insensitive' } }
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
          { investigationCode: 'RAD01A' },
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
          status: 'requested' as any,
          createdById: doctor!.id,
          priority: 'routine',
        },
      });
      
      await prisma.scan.update({
        where: { id: scan.id },
        data: {
          status: 'completed' as any,
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
            patientId: patients[0].id,
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
            principalIcdCode: hypertensionDiag.icdCode,
            principalPresentOnAdmission: 'Y' as PresentOnAdmission,
          },
        });

        // Add secondary diagnosis (anemia)
        await prisma.admissionSecondaryDiagnosis.create({
          data: {
            admissionId: admission.id,
            diagnosisId: anemiaDiag.id,
            icdCode: anemiaDiag.icdCode,
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

    // =============== 12. STOCK TRANSACTIONS ===============
    console.log('📦 Seeding stock transactions...');

    // Get or create departments for requisitions
    let opdDept = await prisma.department.findFirst({ 
      where: { name: { contains: 'OPD', mode: 'insensitive' } } 
    });

    if (!opdDept) {
      opdDept = await prisma.department.create({
        data: {
          name: 'Outpatient Department (OPD)',
          description: 'Outpatient services and consultations',
          isActive: true,
        },
      });
      console.log('✅ Created OPD department for requisitions');
    }

    // Create some invoices first for purchase transactions
    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-001',
        supplierName: 'MediSupplies Ltd',
        invoiceDate: new Date('2024-01-15'),
        totalAmount: 2500.00,
        notes: 'Initial stock purchase',
        createdById: pharmacist!.id,
      },
    });

    const invoice2 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-2024-002',
        supplierName: 'PharmaDistributors Inc',
        invoiceDate: new Date('2024-01-20'),
        totalAmount: 1800.00,
        notes: 'Additional medication stock',
        createdById: pharmacist!.id,
      },
    });

    // Create requisitions for requisition transactions
    const requisition1 = await prisma.requisition.create({
      data: {
        requisitionNumber: 'REQ-2024-001',
        requestingDepartmentId: opdDept.id,
        requestedById: doctor!.id,
        urgency: 'routine',
        requiredDate: new Date('2024-01-25'),
        purpose: 'OPD medication stock',
        status: 'approved',
        approvedById: admin!.id,
        approvedAt: new Date('2024-01-22'),
      },
    });

    // Find additional medications if needed
    const amoxicillin = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Amoxicillin', mode: 'insensitive' } },
    });

    const insulin = await prisma.stockItem.findFirst({
      where: { name: { contains: 'Insulin', mode: 'insensitive' } },
    });

    // Stock Transactions
    if (artesunate) {
      // Purchase transaction (stock IN)
      await prisma.stockTransaction.create({
        data: {
          stockItemId: artesunate.id,
          transactionType: 'purchase',
          quantity: 200,
          balanceAfter: 200,
          reference: invoice1.invoiceNumber,
          notes: 'Initial stock purchase - Artesunate',
          performedBy: pharmacist!.fullName,
          invoiceId: invoice1.id,
        },
      });

      // Sale transaction (stock OUT to patients)
      await prisma.stockTransaction.create({
        data: {
          stockItemId: artesunate.id,
          transactionType: 'sale',
          quantity: -6,
          balanceAfter: 194,
          reference: 'MED-MAL-001',
          notes: 'Dispensed for malaria treatment - Artesunate',
          performedBy: pharmacist!.fullName,
        },
      });
    }

    if (amoxicillin) {
      // Purchase transaction
      await prisma.stockTransaction.create({
        data: {
          stockItemId: amoxicillin.id,
          transactionType: 'purchase',
          quantity: 150,
          balanceAfter: 150,
          reference: invoice1.invoiceNumber,
          notes: 'Initial stock purchase - Amoxicillin',
          performedBy: pharmacist!.fullName,
          invoiceId: invoice1.id,
        },
      });

      // Requisition transaction (stock OUT to departments)
      await prisma.stockTransaction.create({
        data: {
          stockItemId: amoxicillin.id,
          transactionType: 'requisition',
          quantity: -20,
          balanceAfter: 130,
          reference: requisition1.requisitionNumber,
          notes: 'Requisition for OPD department - Amoxicillin',
          performedBy: pharmacist!.fullName,
          requisitionId: requisition1.id,
        },
      });
    }

    if (paracetamol) {
      // Purchase transaction
      await prisma.stockTransaction.create({
        data: {
          stockItemId: paracetamol.id,
          transactionType: 'purchase',
          quantity: 300,
          balanceAfter: 300,
          reference: invoice2.invoiceNumber,
          notes: 'Initial stock purchase - Paracetamol',
          performedBy: pharmacist!.fullName,
          invoiceId: invoice2.id,
        },
      });

      // Sale transaction
      await prisma.stockTransaction.create({
        data: {
          stockItemId: paracetamol.id,
          transactionType: 'sale',
          quantity: -10,
          balanceAfter: 290,
          reference: 'MED-PAIN-001',
          notes: 'Dispensed for pain relief - Paracetamol',
          performedBy: pharmacist!.fullName,
        },
      });
    }

    if (insulin) {
      // Purchase transaction
      await prisma.stockTransaction.create({
        data: {
          stockItemId: insulin.id,
          transactionType: 'purchase',
          quantity: 50,
          balanceAfter: 50,
          reference: invoice2.invoiceNumber,
          notes: 'Initial stock purchase - Insulin',
          performedBy: pharmacist!.fullName,
          invoiceId: invoice2.id,
        },
      });

      // Adjustment transaction (manual correction)
      await prisma.stockTransaction.create({
        data: {
          stockItemId: insulin.id,
          transactionType: 'adjustment',
          quantity: 5,
          balanceAfter: 55,
          reference: 'ADJ-001',
          notes: 'Stock adjustment - found extra vials',
          performedBy: pharmacist!.fullName,
        },
      });
    }

    console.log('✅ Stock transactions seeded');

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
    console.log('\n📋 TEST DATA SUMMARY:');
    console.log('👥 Patients:');
    patients.forEach(p => {
      console.log(`   - ${p.surname} ${p.otherNames} (${p.folderNumber}) - ${p.paymentMode}`);
    });
    console.log('🏥 Medical Cases:');
    console.log('   - PAT-10001: Malaria with NHIS coverage');
    console.log('   - PAT-10000: Hypertension with cash payment');
    console.log('👨‍⚕️ Test Users: doctor1/doctor123, nurse1/nurse123, etc.');
    console.log('📄 Use these credentials to test the frontend');

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

// ✅ SIMPLIFIED: Main initialization function
export const initializeDatabase = async () => {
  console.log('🚀 Initializing database...');
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌱 Seeding enabled: ${SEEDING_ENABLED}`);

  try {
    // In production, never auto-seed unless explicitly enabled
    if (isProduction && process.env.RUN_SEED !== 'true') {
      console.log('🏭 Production: Skipping auto-seeding');
      return {
        initialized: true,
        seeded: false,
        reason: 'production'
      };
    }

    // Check if test data already exists
    const testDataExists = await hasTestData();
    
    if (testDataExists) {
      console.log('✅ Test data already exists. Skipping seeding.');
      return {
        initialized: true,
        seeded: false,
        reason: 'already_exists'
      };
    }

    // Check for real data (safety)
    const realDataExists = await hasRealData();
    if (realDataExists) {
      console.log('🚨 Real data detected in database. Seeding aborted.');
      return {
        initialized: true,
        seeded: false,
        reason: 'real_data_detected'
      };
    }

    // If we get here, it's safe to seed
    console.log('🔧 Seeding test data...');
    const result = await seedTestData(false);
    
    return {
      initialized: true,
      seeded: result.success,
      reason: result.success ? 'seeded' : 'seed_failed'
    };

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return {
      initialized: false,
      seeded: false,
      error: error.message
    };
  }
};

// ✅ SIMPLIFIED: Function to check database status
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
      totals: {
        patients: totalPatients,
        users: totalUsers,
        bills: totalBills
      },
      testData: {
        testPatients,
        testUsers,
        hasTestData: testDataExists
      },
      safety: {
        hasRealData: realDataExists,
        safeToDelete: !realDataExists,
        safeToSeed: !realDataExists
      },
      seeding: {
        enabled: SEEDING_ENABLED,
        recommended: !realDataExists && !testDataExists
      }
    };
  } catch (error) {
    console.error('❌ Error checking database status:', error);
    return {
      databaseStatus: 'error',
      error: error.message
    };
  }
};

// Helper function to find or create fallback data
const findOrCreateFallbackData = async () => {
  console.log('🔍 Setting up fallback test data...');
  
  // Try to find existing data first
  let malariaDiag = await prisma.diagnosis.findFirst({ 
    where: { 
      OR: [
        { icdCode: 'B54' },
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
        { icdCode: 'D64.9' },
        { name: { contains: 'anemia', mode: 'insensitive' } }
      ]
    },
  });

  let hypertensionDiag = await prisma.diagnosis.findFirst({
    where: { 
      OR: [
        { icdCode: 'I10' },
        { name: { contains: 'hypertension', mode: 'insensitive' } }
      ]
    },
  });

  // Create fallback data if not found
  if (!malariaDiag) {
    console.log('⚠️ Creating fallback malaria diagnosis...');
    malariaDiag = await prisma.diagnosis.create({
      data: {
        name: 'Malaria, unspecified',
        icdCode: 'B54',
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
    console.log('⚠️ Creating fallback anemia diagnosis...');
    anemiaDiag = await prisma.diagnosis.create({
      data: {
        name: 'Anaemia, unspecified',
        icdCode: 'D64.9',
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
    console.log('⚠️ Creating fallback hypertension diagnosis...');
    hypertensionDiag = await prisma.diagnosis.create({
      data: {
        name: 'Essential (primary) hypertension',
        icdCode: 'I10',
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
        cashPrice: 50,
        nhisPrice: 0,
        insurancePrice: 40,
        unit: 'Each',
        isPending: false,
        vatRate: 0,
        isTaxable: false,
        nhisServiceCode: 'OPD001',
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

// Export functions
export default {
  seedTestData,
  deleteTestData, 
  checkDatabaseStatus,
  initializeDatabase 
};