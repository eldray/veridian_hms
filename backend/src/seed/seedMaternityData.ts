// src/seed/seedMaternityData.ts
import { PrismaClient, Gender, PaymentMode, AttendanceType, AttendanceStatus, EncounterCategory, VisitCategory, ServiceCategory, RiskLevel, DeliveryMode, DeliveryOutcome, PostnatalComplications, FeedingMethod } from '@prisma/client';

const prisma = new PrismaClient();

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

const generateAttendanceNumber = () => `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

export const seedMaternityData = async (force: boolean = false) => {
  console.log('🤰 Seeding maternity data (Antenatal, Delivery, Postnatal)...');
  
  try {
    // Check if maternity test data already exists
    const existingPatients = await prisma.patient.count({
      where: { folderNumber: { in: ['MAT-TEST-001', 'MAT-TEST-002', 'MAT-TEST-003', 'MAT-TEST-004', 'MAT-TEST-005'] } }
    });
    
    if (existingPatients >= 5 && !force) {
      console.log('✅ Maternity test data already exists');
      return { success: true, message: 'Maternity data exists', skipped: true };
    }
    
    if (force && existingPatients > 0) {
      console.log('🗑️ Deleting existing maternity test data...');
      const testPatients = await prisma.patient.findMany({
        where: { folderNumber: { in: ['MAT-TEST-001', 'MAT-TEST-002', 'MAT-TEST-003', 'MAT-TEST-004', 'MAT-TEST-005'] } },
        select: { id: true }
      });
      const testPatientIds = testPatients.map(p => p.id);
      
      // Delete related data
      await prisma.postnatalVisit.deleteMany({ where: { attendance: { patientId: { in: testPatientIds } } } });
      await prisma.deliveryRecord.deleteMany({ where: { patientId: { in: testPatientIds } } });
      await prisma.aNCVisit.deleteMany({ where: { booking: { patientId: { in: testPatientIds } } } });
      await prisma.antenatalBooking.deleteMany({ where: { patientId: { in: testPatientIds } } });
      await prisma.attendance.deleteMany({ where: { patientId: { in: testPatientIds } } });
      await prisma.patient.deleteMany({ where: { id: { in: testPatientIds } } });
    }
    
    // Get required references
    const nhisProvider = await prisma.insuranceProvider.findFirst({ where: { type: 'nhis' } });
    const obsGynDept = await prisma.department.findFirst({ where: { name: 'Obstetrics & Gynecology' } });
    const maternityWard = await prisma.ward.findFirst({ where: { wardType: 'maternity' } });
    
    // Get or create a midwife user
    let midwife = await prisma.user.findFirst({ where: { role: 'midwife' } });
    if (!midwife) {
      const bcrypt = await import('bcryptjs');
      midwife = await prisma.user.create({
        data: {
          username: 'midwife_seed',
          password: await bcrypt.hash('midwife123', 10),
          fullName: 'Midwife Abena Mensah',
          role: 'midwife',
          email: 'midwife.seed@hospital.com',
          phone: '+233244000001',
          licenseNumber: 'MW-00001'
        }
      });
    }
    
    // Create 5 maternity patients with different scenarios
    const patientsData = [
      {
        folderNumber: 'MAT-TEST-001',
        surname: 'Osei',
        otherNames: 'Akosua',
        gender: Gender.female,
        dateOfBirth: new Date('1992-06-15'),
        contact: '+233244500001',
        address: '10 Maternity Lane, Accra',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-001', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'primigravida_delivered', // First pregnancy, delivered
        gravida: 1,
        para: 0,
        weeksAtBooking: 12,
        edd: new Date('2024-12-20'),
        deliveryWeeks: 40,
        deliveryDaysAgo: 5,
        postnatalVisits: 2
      },
      {
        folderNumber: 'MAT-TEST-002',
        surname: 'Amankwah',
        otherNames: 'Frederica',
        gender: Gender.female,
        dateOfBirth: new Date('1988-03-22'),
        contact: '+233244500002',
        address: '25 Prenatal Street, Kumasi',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-002', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'multigravida_current', // Multiple pregnancies, currently pregnant
        gravida: 3,
        para: 2,
        weeksAtBooking: 16,
        edd: new Date('2025-02-15'),
        currentWeeks: 28,
        postnatalVisits: 0
      },
      {
        folderNumber: 'MAT-TEST-003',
        surname: 'Dapaah',
        otherNames: 'Victoria',
        gender: Gender.female,
        dateOfBirth: new Date('1995-11-08'),
        contact: '+233244500003',
        address: '18 ANC Road, Takoradi',
        paymentMode: PaymentMode.cash,
        insuranceDetails: {},
        scenario: 'high_risk_delivered', // High risk pregnancy, delivered
        gravida: 2,
        para: 1,
        weeksAtBooking: 20,
        edd: new Date('2024-11-30'),
        riskLevel: 'high',
        deliveryWeeks: 38,
        deliveryDaysAgo: 15,
        postnatalVisits: 3
      },
      {
        folderNumber: 'MAT-TEST-004',
        surname: 'Boateng',
        otherNames: 'Christina',
        gender: Gender.female,
        dateOfBirth: new Date('1990-07-30'),
        contact: '+233244500004',
        address: '42 Delivery Ave, Cape Coast',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-004', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'cs_delivery', // Cesarean section
        gravida: 2,
        para: 1,
        weeksAtBooking: 14,
        edd: new Date('2024-10-25'),
        deliveryWeeks: 39,
        deliveryDaysAgo: 30,
        postnatalVisits: 4
      },
      {
        folderNumber: 'MAT-TEST-005',
        surname: 'Nyarko',
        otherNames: 'Benedicta',
        gender: Gender.female,
        dateOfBirth: new Date('1993-09-12'),
        contact: '+233244500005',
        address: '8 Postnatal Circle, Tema',
        paymentMode: PaymentMode.private_insurance,
        insuranceDetails: { policyNumber: 'PRV-MAT-005', provider: 'Acacia Health' },
        scenario: 'twins_delivered', // Twin delivery
        gravida: 1,
        para: 0,
        weeksAtBooking: 10,
        edd: new Date('2024-11-10'),
        deliveryWeeks: 36,
        deliveryDaysAgo: 45,
        postnatalVisits: 5
      }
    ];
    
    const patients: any[] = [];
    const bookings: any[] = [];
    const deliveries: any[] = [];
    
    for (const pData of patientsData) {
      console.log(`\n📋 Creating patient: ${pData.surname} (${pData.folderNumber})`);
      
      // Create Patient
      const patient = await prisma.patient.create({
        data: {
          folderNumber: pData.folderNumber,
          surname: pData.surname,
          otherNames: pData.otherNames,
          gender: pData.gender,
          dateOfBirth: pData.dateOfBirth,
          contact: pData.contact,
          address: pData.address,
          paymentMode: pData.paymentMode,
          insuranceProviderId: pData.insuranceProviderId,
          insuranceDetails: pData.insuranceDetails,
          registeredBy: 'System Seed',
          registeredAt: daysAgo(180),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      patients.push(patient);
      
      // Create Antenatal Booking Attendance
      const bookingAttendanceDate = daysAgo(pData.scenario.includes('current') ? pData.currentWeeks! * 7 : (pData.deliveryDaysAgo! + (pData.deliveryWeeks! * 7)));
      const bookingAttendance = await prisma.attendance.create({
        data: {
          attendanceNumber: generateAttendanceNumber(),
          patientId: patient.id,
          dateTime: bookingAttendanceDate,
          attendanceType: AttendanceType.antepartum,
          paymentMode: pData.paymentMode,
          insuranceProviderId: pData.insuranceProviderId,
          complaints: 'Routine antenatal booking visit',
          medicalNotes: `G${pData.gravida}P${pData.para} booking visit at ${pData.weeksAtBooking} weeks`,
          historyPresentingComplaint: `Patient presents for antenatal booking. Gravida ${pData.gravida}, Para ${pData.para}. LMP calculated EDD: ${pData.edd.toISOString().split('T')[0]}`,
          physicalExamination: 'General condition good. BP 120/80, PR 78/min, Temp 36.5°C. Fundal height corresponds to dates.',
          treatmentPlan: 'Routine antenatal care. Start folic acid and iron supplements. Schedule monthly visits.',
          createdById: midwife!.id,
          status: AttendanceStatus.completed,
          encounterCategory: EncounterCategory.opd,
          visitCategory: VisitCategory.antenatal,
          serviceCategory: ServiceCategory.opd,
          departmentId: obsGynDept?.id,
          totalBill: 0,
          paidAmount: 0,
          outstandingBalance: 0
        }
      });
      
      // Create Antenatal Booking
      const booking = await prisma.antenatalBooking.create({
        data: {
          patientId: patient.id,
          attendanceId: bookingAttendance.id,
          gravida: pData.gravida,
          para: pData.para,
          abortions: 0,
          lmp: new Date(pData.edd.getTime() - (280 * 24 * 60 * 60 * 1000)), // 280 days before EDD
          edd: pData.edd,
          bookingDate: bookingAttendanceDate,
          gestationalAgeAtBooking: pData.weeksAtBooking,
          riskLevel: (pData.riskLevel as RiskLevel) || RiskLevel.low,
          riskFactors: pData.riskLevel === 'high' ? ['Advanced maternal age', 'Previous CS'] : [],
          bloodGroup: 'O+',
          hivStatus: 'Negative',
          hbLevel: 11.5,
          vdrl: 'Non-reactive',
          isActive: pData.scenario.includes('current'),
          isCompleted: pData.scenario.includes('delivered') || pData.scenario.includes('cs') || pData.scenario.includes('twins'),
          createdBy: midwife!.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      bookings.push(booking);
      
      // Create ANC Visits (simulate monthly visits)
      const visitCount = pData.scenario.includes('current') ? Math.floor(pData.currentWeeks! / 4) : Math.floor(pData.deliveryWeeks! / 4);
      for (let i = 1; i <= Math.min(visitCount, 8); i++) {
        const visitDate = new Date(bookingAttendanceDate);
        visitDate.setDate(visitDate.getDate() + (i * 28)); // Every 4 weeks
        
        const visit = await prisma.aNCVisit.create({
          data: {
            bookingId: booking.id,
            visitNumber: i,
            visitDate: visitDate,
            gestationalAgeWeeks: pData.weeksAtBooking + i * 4,
            weight: 65 + (i * 0.5), // Gradual weight gain
            bloodPressure: `${110 + i}/70`,
            fundalHeight: (pData.weeksAtBooking + i * 4) * 0.9, // Approximate
            fetalHeartRate: 140 + (i % 5),
            fetalPosition: i > 5 ? 'Cephalic' : 'Variable',
            iptpGiven: i >= 2,
            iptpDoseNumber: i >= 2 ? Math.min(i - 1, 3) : 0,
            ttGiven: i >= 3,
            ttDoseNumber: i >= 3 ? Math.min(i - 2, 2) : 0,
            dangerSignsPresent: false,
            referralMade: false,
            findings: 'Fetal movements felt. No complications.',
            advice: 'Continue ANC supplements. Next visit in 4 weeks.',
            recordedById: midwife!.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      
      // Create Delivery Record if not currently pregnant
      if (pData.scenario !== 'multigravida_current') {
        const deliveryDate = daysAgo(pData.deliveryDaysAgo!);
        const deliveryAttendance = await prisma.attendance.create({
          data: {
            attendanceNumber: generateAttendanceNumber(),
            patientId: patient.id,
            dateTime: deliveryDate,
            attendanceType: AttendanceType.intrapartum,
            paymentMode: pData.paymentMode,
            insuranceProviderId: pData.insuranceProviderId,
            complaints: 'In labour / For delivery',
            medicalNotes: `Term pregnancy, G${pData.gravida}P${pData.para}, admitted for delivery`,
            historyPresentingComplaint: 'Patient presented in active labour with regular contractions.',
            physicalExamination: 'On admission: Cervix 4cm dilated, membranes intact. Contractions every 3 minutes.',
            treatmentPlan: 'Monitor labour progress. Provide analgesia as needed.',
            createdById: midwife!.id,
            status: AttendanceStatus.completed,
            encounterCategory: EncounterCategory.inpatient,
            visitCategory: VisitCategory.labor_and_delivery,
            serviceCategory: ServiceCategory.inpatient,
            departmentId: obsGynDept?.id,
            wardId: maternityWard?.id,
            totalBill: 0,
            paidAmount: 0,
            outstandingBalance: 0
          }
        });
        
        const twins = pData.scenario === 'twins_delivered';
        const cs = pData.scenario === 'cs_delivery';
        
        const delivery = await prisma.deliveryRecord.create({
          data: {
            patientId: patient.id,
            attendanceId: deliveryAttendance.id,
            antenatalBookingId: booking.id,
            deliveryDate: deliveryDate,
            gestationalAgeAtDelivery: pData.deliveryWeeks!,
            deliveryMode: cs ? DeliveryMode.cs : (twins ? DeliveryMode.svd : DeliveryMode.svd),
            deliveryOutcome: DeliveryOutcome.live_birth,
            deliveryPlace: 'Hospital',
            deliveryPosition: 'Lithotomy',
            perinealStatus: cs ? 'Intact (CS)' : 'Intact',
            bloodLoss: cs ? 500 : 250,
            durationOfLabour: cs ? 0 : 8,
            oxytocinGiven: true,
            complications: twins ? 'Preterm labour' : null,
            birthAttendant: midwife!.fullName,
            anaesthesia: cs ? 'Spinal' : 'None',
            indicationForCs: cs ? 'Previous CS' : null,
            createdById: midwife!.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        deliveries.push(delivery);
        
        // Create Newborn(s)
        const babyWeight = twins ? [2.4, 2.3] : [3.2];
        for (let b = 0; b < babyWeight.length; b++) {
          await prisma.newborn.create({
            data: {
              deliveryRecordId: delivery.id,
              babyNumber: b + 1,
              sex: b % 2 === 0 ? 'Male' : 'Female',
              weight: babyWeight[b],
              apgarScore1min: 8,
              apgarScore5min: 9,
              gestationalAge: pData.deliveryWeeks!,
              headCircumference: 34,
              length: 50,
              feedingMethod: FeedingMethod.breastfeeding,
              immunizationGiven: true,
              vitaminKGiven: true,
              eyeProphylaxisGiven: true,
              congenitalAnomalies: null,
              resuscitationNeeded: false,
              newbornCondition: 'Good',
              dischargeDate: twins ? deliveryDate.getDate() + 5 : deliveryDate.getDate() + 2,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
        
        // Create Postnatal Visits
        for (let v = 1; v <= pData.postnatalVisits!; v++) {
          const pnvDate = new Date(deliveryDate);
          pnvDate.setDate(pnvDate.getDate() + (v === 1 ? 1 : (v === 2 ? 7 : (v === 3 ? 14 : (v === 4 ? 28 : 42)))));
          
          const pnvAttendance = await prisma.attendance.create({
            data: {
              attendanceNumber: generateAttendanceNumber(),
              patientId: patient.id,
              dateTime: pnvDate,
              attendanceType: AttendanceType.postpartum,
              paymentMode: pData.paymentMode,
              insuranceProviderId: pData.insuranceProviderId,
              complaints: v === 1 ? 'Postnatal check - Day 1' : 'Routine postnatal follow-up',
              medicalNotes: `Postnatal day ${v === 1 ? 1 : (v === 2 ? 7 : (v === 3 ? 14 : (v === 4 ? 28 : 42)))} visit`,
              historyPresentingComplaint: 'Mother and baby doing well. Breastfeeding established.',
              physicalExamination: 'BP stable, uterus involuting well, lochia normal, breasts soft, episiotomy/CS wound healing well.',
              treatmentPlan: 'Continue breastfeeding. Family planning counseling. Next visit scheduled.',
              createdById: midwife!.id,
              status: AttendanceStatus.completed,
              encounterCategory: EncounterCategory.opd,
              visitCategory: VisitCategory.postnatal,
              serviceCategory: ServiceCategory.opd,
              departmentId: obsGynDept?.id,
              totalBill: 0,
              paidAmount: 0,
              outstandingBalance: 0
            }
          });
          
          await prisma.postnatalVisit.create({
            data: {
              attendanceId: pnvAttendance.id,
              patientId: patient.id,
              deliveryRecordId: delivery.id,
              visitNumber: v,
              visitDate: pnvDate,
              maternalCondition: 'Good',
              bpReading: '120/80',
              temperature: 36.5,
              pulseRate: 72,
              uterineInvolution: 'Normal',
              lochiaCharacter: 'Normal',
              breastCondition: 'Normal',
              woundHealing: 'Well healed',
              moodAssessment: 'Stable',
              familyPlanningCounseled: v >= 2,
              familyPlanningMethod: v >= 3 ? 'Implants' : null,
              exclusiveBreastfeeding: true,
              babyCondition: 'Good',
              babyWeight: babyWeight[0] + (v * 0.1),
              complications: null,
              referralMade: false,
              advice: 'Continue exclusive breastfeeding. Attend immunization clinic.',
              recordedById: midwife!.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        }
      }
      
      console.log(`✅ Created: ${pData.scenario.includes('current') ? 'ANC booking + visits' : 'ANC + Delivery + Postnatal visits'}`);
    }
    
    console.log('\n==================================================');
    console.log('✅ MATERNITY DATA SEEDING COMPLETED');
    console.log('==================================================');
    console.log(`Created: ${patients.length} patients`);
    console.log(`Created: ${bookings.length} antenatal bookings`);
    console.log(`Created: ${deliveries.length} delivery records`);
    console.log('Created: Multiple ANC visits and postnatal visits');
    
    return {
      success: true,
      patients: patients.length,
      bookings: bookings.length,
      deliveries: deliveries.length
    };
    
  } catch (error: any) {
    console.error('❌ Error seeding maternity data:', error);
    throw error;
  }
};

export default seedMaternityData;
