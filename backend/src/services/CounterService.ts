// services/CounterService.ts
import { PrismaClient } from '@prisma/client';

let patientCounter = 1000;
let attendanceCounter = 1000;
let admissionCounter = 1000;
let claimCounter = 1000;
let referralCounter = 1000;
let billCounter = 1000;
let appointmentCounter = 1000;  // ✅ Added

export class CounterService {
  private static instance: CounterService;
  private prisma: PrismaClient;
  private initialized = false;

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  static getInstance(prisma: PrismaClient): CounterService {
    if (!CounterService.instance) {
      CounterService.instance = new CounterService(prisma);
    }
    return CounterService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('📊 Initializing counters...');

    // Get last patient number
    const lastPatient = await this.prisma.patient.findFirst({
      orderBy: { folderNumber: 'desc' },
      select: { folderNumber: true }
    });
    if (lastPatient?.folderNumber) {
      const match = lastPatient.folderNumber.match(/PAT-(\d+)/);
      if (match) patientCounter = parseInt(match[1]);
    }

    // Get last attendance number
    const lastAttendance = await this.prisma.attendance.findFirst({
      orderBy: { attendanceNumber: 'desc' },
      select: { attendanceNumber: true }
    });
    if (lastAttendance?.attendanceNumber) {
      const match = lastAttendance.attendanceNumber.match(/ATT-(\d+)/);
      if (match) attendanceCounter = parseInt(match[1]);
    }

    // Get last admission number
    const lastAdmission = await this.prisma.admission.findFirst({
      orderBy: { admissionNumber: 'desc' },
      select: { admissionNumber: true }
    });
    if (lastAdmission?.admissionNumber) {
      const match = lastAdmission.admissionNumber.match(/ADM-(\d+)/);
      if (match) admissionCounter = parseInt(match[1]);
    }

    // Get last claim number
    const lastClaim = await this.prisma.insuranceClaim.findFirst({
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true }
    });
    if (lastClaim?.claimNumber) {
      const match = lastClaim.claimNumber.match(/CLAIM-(\d+)/);
      if (match) claimCounter = parseInt(match[1]);
    }

    // Get last referral number
    const lastReferral = await this.prisma.referralRecord.findFirst({
      orderBy: { referralNumber: 'desc' },
      select: { referralNumber: true }
    });
    if (lastReferral?.referralNumber) {
      const match = lastReferral.referralNumber.match(/REF-(\d+)/);
      if (match) referralCounter = parseInt(match[1]);
    }

    // Get last bill number
    const lastBill = await this.prisma.bill.findFirst({
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true }
    });
    if (lastBill?.billNumber) {
      const match = lastBill.billNumber.match(/BILL-(\d+)/);
      if (match) billCounter = parseInt(match[1]);
    }

    // ✅ Get last appointment number
    const lastAppointment = await this.prisma.appointment.findFirst({
      orderBy: { appointmentNumber: 'desc' },
      select: { appointmentNumber: true }
    });
    if (lastAppointment?.appointmentNumber) {
      const match = lastAppointment.appointmentNumber.match(/APT-(\d+)/);
      if (match) appointmentCounter = parseInt(match[1]);
    }

    this.initialized = true;
    console.log(`✅ Counters initialized: Patient=${patientCounter}, Attendance=${attendanceCounter}, Admission=${admissionCounter}, Claim=${claimCounter}, Referral=${referralCounter}, Bill=${billCounter}, Appointment=${appointmentCounter}`);
  }

  nextPatientNumber(): string {
    return `PAT-${++patientCounter}`;
  }

  nextAttendanceNumber(): string {
    return `ATT-${++attendanceCounter}`;
  }

  nextAdmissionNumber(): string {
    return `ADM-${++admissionCounter}`;
  }

  nextClaimNumber(): string {
    return `CLAIM-${++claimCounter}`;
  }

  nextReferralNumber(): string {
    return `REF-${++referralCounter}`;
  }

  nextBillNumber(): string {
    return `BILL-${++billCounter}`;
  }

  // ✅ Add this method
  nextAppointmentNumber(): string {
    return `APT-${++appointmentCounter}`;
  }

  getCounters() {
    return {
      patient: patientCounter,
      attendance: attendanceCounter,
      admission: admissionCounter,
      claim: claimCounter,
      referral: referralCounter,
      bill: billCounter,
      appointment: appointmentCounter  // ✅ Added
    };
  }
}

// Export a singleton instance (will be initialized in server.ts)
let counterServiceInstance: CounterService | null = null;

export function getCounterService(prisma?: PrismaClient): CounterService {
  if (!counterServiceInstance && prisma) {
    counterServiceInstance = CounterService.getInstance(prisma);
  }
  if (!counterServiceInstance) {
    throw new Error('CounterService not initialized. Call initCounterService first.');
  }
  return counterServiceInstance;
}

export async function initCounterService(prisma: PrismaClient): Promise<CounterService> {
  counterServiceInstance = CounterService.getInstance(prisma);
  await counterServiceInstance.initialize();
  return counterServiceInstance;
}