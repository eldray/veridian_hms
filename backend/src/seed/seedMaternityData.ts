// src/seed/seedMaternityData.ts - FIXED VERSION
import { PrismaClient, Gender, PaymentMode, AttendanceType, AttendanceStatus, EncounterCategory, VisitCategory, ServiceCategory, RiskLevel, DeliveryOutcome } from '@prisma/client';

const prisma = new PrismaClient();

type DeliveryMode = 'spontaneous_vertex' | 'assisted_breech' | 'vacuum' | 'forceps' | 'caesarean_section' | 'multiple';

const daysAgo = (days: number, baseDate: Date = new Date()) => {
  const d = new Date(baseDate);
  d.setDate(d.getDate() - days);
  return d;
};

let attendanceCounter = 2000;
const generateAttendanceNumber = () => `ATT-${++attendanceCounter}`;

// Check if maternity test data already exists
const hasMaternityData = async (): Promise<boolean> => {
  const count = await prisma.antenatalBooking.count({
    where: {
      patient: {
        folderNumber: { in: ['PAT-TEST-006', 'PAT-TEST-007', 'PAT-TEST-008', 'PAT-TEST-009', 'PAT-TEST-010'] }
      }
    }
  });
  return count >= 5;
};

export const seedMaternityData = async (force: boolean = false) => {
  console.log('🤰 Seeding maternity data (Antenatal, Delivery, Postnatal)...');
  
  try {
    const maternityExists = await hasMaternityData();
    if (maternityExists && !force) {
      console.log('✅ Maternity test data already exists');
      return { success: true, message: 'Maternity data exists', skipped: true };
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
    
    // Get admin user for createdBy
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    
    // Use PAT-TEST-006 to 010 (same format as testSeed.ts)
    const maternityPatientsData = [
      {
        folderNumber: 'PAT-TEST-006',
        surname: 'Mensah',
        otherNames: 'Grace',
        gender: Gender.female,
        dateOfBirth: new Date('1992-06-15'),
        contact: '+233244600001',
        address: '10 Maternity Lane, Accra',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-001', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'primigravida_delivered',
        gravida: 1,
        para: 0,
        weeksAtBooking: 12,
        edd: new Date('2024-12-20'),
        deliveryWeeks: 40,
        deliveryDaysAgo: 5,
        postnatalVisits: 2
      },
      {
        folderNumber: 'PAT-TEST-007',
        surname: 'Amankwah',
        otherNames: 'Frederica',
        gender: Gender.female,
        dateOfBirth: new Date('1988-03-22'),
        contact: '+233244600002',
        address: '25 Prenatal Street, Kumasi',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-002', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'multigravida_current',
        gravida: 3,
        para: 2,
        weeksAtBooking: 16,
        edd: new Date('2025-02-15'),
        currentWeeks: 28,
        postnatalVisits: 0
      },
      {
        folderNumber: 'PAT-TEST-008',
        surname: 'Dapaah',
        otherNames: 'Victoria',
        gender: Gender.female,
        dateOfBirth: new Date('1995-11-08'),
        contact: '+233244600003',
        address: '18 ANC Road, Takoradi',
        paymentMode: PaymentMode.cash,
        insuranceDetails: {},
        scenario: 'high_risk_delivered',
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
        folderNumber: 'PAT-TEST-009',
        surname: 'Boateng',
        otherNames: 'Christina',
        gender: Gender.female,
        dateOfBirth: new Date('1990-07-30'),
        contact: '+233244600004',
        address: '42 Delivery Ave, Cape Coast',
        paymentMode: PaymentMode.nhis,
        insuranceProviderId: nhisProvider?.id,
        insuranceDetails: { memberId: 'NHIS-MAT-004', startDate: '2024-01-01', endDate: '2024-12-31' },
        scenario: 'cs_delivery',
        gravida: 2,
        para: 1,
        weeksAtBooking: 14,
        edd: new Date('2024-10-25'),
        deliveryWeeks: 39,
        deliveryDaysAgo: 30,
        postnatalVisits: 4
      },
      {
        folderNumber: 'PAT-TEST-010',
        surname: 'Nyarko',
        otherNames: 'Benedicta',
        gender: Gender.female,
        dateOfBirth: new Date('1993-09-12'),
        contact: '+233244600005',
        address: '8 Postnatal Circle, Tema',
        paymentMode: PaymentMode.private_insurance,
        insuranceDetails: { policyNumber: 'PRV-MAT-005', provider: 'Acacia Health' },
        scenario: 'twins_delivered',
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
    
    for (const pData of maternityPatientsData) {
      console.log(`\n📋 Creating patient: ${pData.surname} (${pData.folderNumber})`);
      
      // Check if patient already exists
      let patient = await prisma.patient.findUnique({
        where: { folderNumber: pData.folderNumber }
      });
      
      if (!patient) {
        patient = await prisma.patient.create({
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
            registeredBy: admin?.fullName || 'System Seed',
            registeredAt: daysAgo(180),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }
      patients.push(patient);
      
      // Create Antenatal Booking Attendance
      const bookingAttendanceDate = pData.scenario.includes('current') 
        ? daysAgo(pData.currentWeeks! * 7) 
        : daysAgo(pData.deliveryDaysAgo! + (pData.deliveryWeeks! * 7));
      
      const bookingAttendance = await prisma.attendance.create({
        data: {
          attendanceNumber: generateAttendanceNumber(),
          patientId: patient.id,
          dateTime: bookingAttendanceDate,
          attendanceType: AttendanceType.antenatal,
          paymentMode: pData.paymentMode,
          insuranceProviderId: pData.insuranceProviderId,
          complaints: 'Routine antenatal booking visit',
          medicalNotes: `G${pData.gravida}P${pData.para} booking visit at ${pData.weeksAtBooking} weeks`,
          historyPresentingComplaint: `Patient presents for antenatal booking. Gravida ${pData.gravida}, Para ${pData.para}.`,
          physicalExamination: 'General condition good. BP 120/80, PR 78/min, Temp 36.5°C.',
          treatmentPlan: 'Routine antenatal care. Start folic acid and iron supplements.',
          createdById: midwife!.id,
          status: AttendanceStatus.completed,
          encounterCategory: EncounterCategory.opd,
          visitCategory: VisitCategory.general,
          serviceCategory: ServiceCategory.opd,
          totalBill: 0,
          paidAmount: 0,
          outstandingBalance: 0
        }
      });
      
      // Calculate LMP from EDD (subtract 280 days)
      const lmpDate = new Date(pData.edd);
      lmpDate.setDate(lmpDate.getDate() - 280);
      
      // Create Antenatal Booking
      const booking = await prisma.antenatalBooking.create({
        data: {
          patientId: patient.id,
          attendanceId: bookingAttendance.id,
          gravida: pData.gravida,
          para: pData.para,
          lmp: lmpDate,
          edd: pData.edd,
          bookingDate: bookingAttendanceDate,
          gestationalAgeWeeks: pData.weeksAtBooking,
          gestationalAgeAtBooking: pData.weeksAtBooking,
          riskLevel: (pData.riskLevel as any) || 'low',
          riskFactors: pData.riskLevel === 'high' ? ['Advanced maternal age', 'Previous CS'] : [],
          bloodGroup: 'O+',
          hivStatus: 'Negative',
          hbLevel: 11.5,
          vdrl: 'Non-reactive',
          isActive: pData.scenario.includes('current'),
          isCompleted: !pData.scenario.includes('current'),
          createdById: midwife!.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          iptpDoses: {},
          ttDoses: {},
          iptp1Date: null,
          iptp2Date: null,
          iptp3Date: null,
          iptp4Date: null,
          iptp5Date: null,
          tt1Date: null,
          tt2Date: null,
          tt3Date: null,
          tt4Date: null,
          tt5Date: null,
          malariaTested: false,
          malariaPositive: false,
          malariaTreatment: null,
          malariaIPTpGiven: false,
          hbBooking: null,
          hb36Weeks: null,
          anaemiaDiagnosed: false,
          ironFolateGiven: false,
          itnGiven: false,
          itnGivenDate: null
        }
      });
      bookings.push(booking);

      // Create ANC Visits
      const visitCount = pData.scenario.includes('current') ? Math.floor(pData.currentWeeks! / 4) : Math.floor(pData.deliveryWeeks! / 4);
      for (let i = 1; i <= Math.min(visitCount, 8); i++) {
        const visitDate = new Date(bookingAttendanceDate);
        visitDate.setDate(visitDate.getDate() + (i * 28));
        
        const visitAttendance = await prisma.attendance.create({
          data: {
            attendanceNumber: generateAttendanceNumber(),
            patientId: patient.id,
            dateTime: visitDate,
            attendanceType: AttendanceType.antenatal,
            paymentMode: pData.paymentMode,
            insuranceProviderId: pData.insuranceProviderId,
            complaints: `Routine ANC visit - ${pData.weeksAtBooking + i * 4} weeks`,
            medicalNotes: `ANC follow-up visit`,
            historyPresentingComplaint: `Patient returns for scheduled antenatal check-up.`,
            physicalExamination: 'General condition good. Vitals stable.',
            treatmentPlan: 'Continue supplements. Next visit in 4 weeks.',
            createdById: midwife!.id,
            status: AttendanceStatus.completed,
            encounterCategory: EncounterCategory.opd,
            visitCategory: VisitCategory.antenatal,
            serviceCategory: ServiceCategory.opd,
            totalBill: 0,
            paidAmount: 0,
            outstandingBalance: 0
          }
        });
        
        await prisma.aNCVisit.create({
          data: {
            bookingId: booking.id,
            attendanceId: visitAttendance.id,
            visitNumber: i,
            visitDate: visitDate,
            gestationalAgeWeeks: pData.weeksAtBooking + i * 4,
            weight: 65 + (i * 0.5),
            bloodPressure: `${110 + i}/70`,
            fundalHeight: (pData.weeksAtBooking + i * 4) * 0.9,
            fetalHeartRate: 140 + (i % 5),
            presentation: i > 5 ? 'Cephalic' : 'Variable',
            iptpGiven: i >= 2,
            iptpDoseNumber: i >= 2 ? Math.min(i - 1, 3) : 0,
            ttGiven: i >= 3,
            ttDoseNumber: i >= 3 ? Math.min(i - 2, 2) : 0,
            dangerSignsPresent: false,
            referralMade: false,
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
            attendanceType: AttendanceType.delivery,
            paymentMode: pData.paymentMode,
            insuranceProviderId: pData.insuranceProviderId,
            complaints: 'In labour / For delivery',
            medicalNotes: `Term pregnancy, G${pData.gravida}P${pData.para}, admitted for delivery`,
            historyPresentingComplaint: 'Patient presented in active labour with regular contractions.',
            physicalExamination: 'On admission: Cervix 4cm dilated, membranes intact.',
            treatmentPlan: 'Monitor labour progress. Provide analgesia as needed.',
            createdById: midwife!.id,
            status: AttendanceStatus.completed,
            encounterCategory: EncounterCategory.ipd,
            visitCategory: VisitCategory.general,
            serviceCategory: ServiceCategory.ipd,
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
            deliveryType: cs ? 'caesarean_section' : (twins ? 'multiple' : 'spontaneous_vertex'),
            deliveryOutcome: 'live_birth',
            placeOfDelivery: 'hospital',
            attendant: midwife!.fullName,
            gestationWeeks: pData.deliveryWeeks!,
            birthWeight: twins ? 2400 : 3200,
            apgarScore1min: 8,
            apgarScore5min: 9,
            resusCitationDone: false,
            maternalOutcome: 'alive',
            complications: twins ? ['Preterm labour'] : [],
            createdById: midwife!.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        deliveries.push(delivery);
        
        // Create Newborn(s) - using newbornRecord model
        const babyWeights = twins ? [2400, 2300] : [3200];
        for (let b = 0; b < babyWeights.length; b++) {
          await prisma.newbornRecord.create({
            data: {
              deliveryRecordId: delivery.id,
              birthWeight: babyWeights[b],
              gender: b % 2 === 0 ? Gender.male : Gender.female,
              apgarScore1min: 8,
              apgarScore5min: 9,
              resuscitation: false,
              outcome: 'alive',
              anomalies: [],
              referredTo: null,
              createdAt: new Date()
            }
          });
        }
      }
      
      console.log(`✅ Created: ${pData.surname}`);
    }
    
    console.log('\n==================================================');
    console.log('✅ MATERNITY DATA SEEDING COMPLETED');
    console.log('==================================================');
    console.log(`Created/Updated: ${patients.length} maternity patients (PAT-TEST-006 to 010)`);
    console.log(`Created: ${bookings.length} antenatal bookings`);
    console.log(`Created: ${deliveries.length} delivery records`);
    
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