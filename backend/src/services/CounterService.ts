// services/CounterService.ts
import { PrismaClient } from '@prisma/client';

// Separate counters for different sequences
let patientCounter = 1000;      // PATIENT SEQUENCE - increments per new patient
let attendanceCounter = 1000;   // ATTENDANCE SEQUENCE - increments per visit (any type)
let receiptCounter = 1000;      // RECEIPT SEQUENCE - increments per payment
let referralCounter = 1000;     // REFERRAL SEQUENCE - independent
let appointmentCounter = 1000;  // APPOINTMENT SEQUENCE - independent

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
      const match = lastPatient.folderNumber.match(/\d+$/);
      if (match) patientCounter = parseInt(match[0]);
    }

    // Get last attendance number (critical - this is the master sequence)
    const lastAttendance = await this.prisma.attendance.findFirst({
      orderBy: { attendanceNumber: 'desc' },
      select: { attendanceNumber: true }
    });
    if (lastAttendance?.attendanceNumber) {
      const match = lastAttendance.attendanceNumber.match(/\d+$/);
      if (match) attendanceCounter = parseInt(match[0]);
    }

    // Get last receipt number
    const lastReceipt = await this.prisma.payment.findFirst({
      orderBy: { reference: 'desc' },
      select: { reference: true }
    });
    if (lastReceipt?.reference) {
      const match = lastReceipt.reference.match(/RCP-(\d+)/);
      if (match) receiptCounter = parseInt(match[1]);
    }

    // Get last referral number
    const lastReferral = await this.prisma.referralRecord.findFirst({
      orderBy: { referralNumber: 'desc' },
      select: { referralNumber: true }
    });
    if (lastReferral?.referralNumber) {
      const match = lastReferral.referralNumber.match(/\d+$/);
      if (match) referralCounter = parseInt(match[0]);
    }

    // Get last appointment number
    const lastAppointment = await this.prisma.appointment.findFirst({
      orderBy: { appointmentNumber: 'desc' },
      select: { appointmentNumber: true }
    });
    if (lastAppointment?.appointmentNumber) {
      const match = lastAppointment.appointmentNumber.match(/\d+$/);
      if (match) appointmentCounter = parseInt(match[0]);
    }

    this.initialized = true;
    console.log(`✅ Counters initialized: Patient=${patientCounter}, Attendance=${attendanceCounter}, Receipt=${receiptCounter}, Referral=${referralCounter}, Appointment=${appointmentCounter}`);
  }

  // ============================================
  // PATIENT NUMBER
  // ============================================
  nextPatientNumber(): string {
    return `${++patientCounter}`;
  }

  // ============================================
  // ATTENDANCE NUMBER (MASTER SEQUENCE)
  // ============================================
  nextAttendanceNumber(): string {
    return `${++attendanceCounter}`;
  }

  getCurrentAttendanceNumber(): number {
    return attendanceCounter;
  }

  // ============================================
  // ADMISSION NUMBER (matches attendance)
  // ============================================
  getAdmissionNumberFromAttendance(attendanceNumber: string): string {
    return attendanceNumber;
  }

  // ============================================
  // CLAIM NUMBER (matches attendance)
  // ============================================
  getClaimNumberFromAttendance(attendanceNumber: string, claimType: 'nhis' | 'private_insurance' | 'corporate'): string {
    const prefix = claimType === 'nhis' ? 'NHIS' : claimType === 'private_insurance' ? 'PRV' : 'CORP';
    return `${prefix}-${attendanceNumber}`;
  }

  // ============================================
  // BILL NUMBER (matches attendance)
  // ============================================
  getBillNumberFromAttendance(attendanceNumber: string): string {
    return `BILL-${attendanceNumber}`;
  }

  // ============================================
  // RECEIPT NUMBER (independent sequential)
  // ============================================
  nextReceiptNumber(): string {
    return `RCP-${++receiptCounter}`;
  }

  // ============================================
  // REFERRAL NUMBER (independent)
  // ============================================
  nextReferralNumber(): string {
    return `${++referralCounter}`;
  }

  // For external referrals (already have number)
  createReferralFromExternal(externalNumber: string): string {
    return externalNumber;
  }

  // ============================================
  // APPOINTMENT NUMBER (independent)
  // ============================================
  nextAppointmentNumber(): string {
    return `${++appointmentCounter}`;
  }

  // ============================================
  // ADDITIONAL SEQUENCE GENERATORS
  // ============================================
  nextBillNumber(): string {
    return `BILL-${++attendanceCounter}`;
  }

  nextProformaNumber(): string {
    return `PRO-${++attendanceCounter}`;
  }

  nextAdmissionNumber(): string {
    return `ADM-${++attendanceCounter}`;
  }

  nextBatchNumber(): string {
    return `BATCH-${Date.now().toString().slice(-6)}-${++receiptCounter}`;
  }

  nextNHISClaimNumber(): string {
    return `NHIS-${++attendanceCounter}`;
  }

  nextPrivateClaimNumber(): string {
    return `PRIV-${++attendanceCounter}`;
  }

  nextCorporateClaimNumber(): string {
    return `CORP-${++attendanceCounter}`;
  }

  nextRequisitionNumber(): string {
    return `REQ-${Date.now().toString().slice(-6)}`;
  }

  nextTransferNumber(): string {
    return `TRN-${Date.now().toString().slice(-6)}`;
  }

  // ============================================
  // HELPER METHODS
  // ============================================
  extractAttendanceNumber(recordNumber: string): string {
    const match = recordNumber.match(/\d+$/);
    return match ? match[0] : recordNumber;
  }

  getCounters() {
    return {
      patient: patientCounter,
      attendance: attendanceCounter,
      receipt: receiptCounter,
      referral: referralCounter,
      appointment: appointmentCounter
    };
  }
}

// Singleton export
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