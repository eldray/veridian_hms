// services/CounterService.ts
import { Prisma, PrismaClient } from '@prisma/client';

// Separate counters for different sequences
// Every sequence starts at NUMBER_BASE and is printed with at least NUMBER_WIDTH digits, so a
// number always looks like "10001" rather than "2001". padStart is a MINIMUM width, not a cap:
// once a sequence passes 99999 it simply prints six digits, so it can never run out.
const NUMBER_BASE = 10000;
const NUMBER_WIDTH = 5;
const padNumber = (value: number): string => String(value).padStart(NUMBER_WIDTH, '0');

let patientCounter = NUMBER_BASE;      // PATIENT SEQUENCE - increments per new patient
let attendanceCounter = NUMBER_BASE;   // ATTENDANCE SEQUENCE - increments per visit (any type)
let receiptCounter = NUMBER_BASE;      // RECEIPT SEQUENCE - increments per payment
let referralCounter = NUMBER_BASE;     // REFERRAL SEQUENCE - independent
let appointmentCounter = NUMBER_BASE;  // APPOINTMENT SEQUENCE - independent
let requisitionCounter = NUMBER_BASE;  // REQUISITION SEQUENCE - independent (was a 6-digit timestamp that repeats every ~17 minutes)
let transferCounter = NUMBER_BASE;     // STOCK TRANSFER SEQUENCE - independent (same problem)

/**
 * A place where numbers from one counter are stored.
 * `model`/`field` are Prisma names; table/column names are resolved from the
 * Prisma datamodel so @@map / @map are respected.
 */
interface NumberSource {
  model: string;
  field: string;
}

/**
 * Regex (PostgreSQL) that pulls the trailing run of 1-7 digits out of a number
 * such as "1001", "BILL-10234", "APT-999" or "RCP-12000".
 * Trailing runs of 8+ digits (legacy random / timestamp numbers) are ignored so
 * they can't push the counter to a huge value.
 */
const TRAILING_NUMBER_REGEX = '(?:^|\\D)(\\d{1,7})$';

const SAFE_IDENTIFIER = /^[A-Za-z0-9_]+$/;

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

  /**
   * Resolve the real table + column name for a Prisma model field.
   */
  private resolveColumn(source: NumberSource): { table: string; column: string } {
    type DmmfModel = { name: string; dbName?: string | null; fields: ReadonlyArray<{ name: string; dbName?: string | null }> };
    const models = Prisma.dmmf.datamodel.models as unknown as ReadonlyArray<DmmfModel>;
    const model = models.find((m) => m.name === source.model);
    const field = model?.fields.find((f) => f.name === source.field);
    const table = model?.dbName ?? source.model;
    const column = field?.dbName ?? source.field;

    if (!SAFE_IDENTIFIER.test(table) || !SAFE_IDENTIFIER.test(column)) {
      throw new Error(`CounterService: unsafe identifier for ${source.model}.${source.field}`);
    }
    return { table, column };
  }

  /**
   * Highest NUMERIC value (not string-sorted!) found across the given sources.
   *
   * IMPORTANT: the old code used `orderBy: { col: 'desc' }` on string columns,
   * which sorts text - "9999" > "10000" - so after the 9,999th record a server
   * restart would reset the counter and hand out duplicate numbers.
   */
  private async maxNumberAcross(sources: NumberSource[]): Promise<number> {
    let max = 0;
    for (const source of sources) {
      const { table, column } = this.resolveColumn(source);
      // Identifiers are validated against SAFE_IDENTIFIER above; the regex is a constant.
      const rows = await this.prisma.$queryRawUnsafe<Array<{ max: string | null }>>(
        `SELECT MAX(CAST(substring("${column}" from '${TRAILING_NUMBER_REGEX}') AS BIGINT))::text AS max FROM "${table}"`
      );
      const value = rows[0]?.max ? parseInt(rows[0].max, 10) : 0;
      if (Number.isFinite(value) && value > max) max = value;
    }
    return max;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('📊 Initializing counters...');

    const [patientMax, attendanceMax, receiptMax, referralMax, appointmentMax, requisitionMax, transferMax] = await Promise.all([
      this.maxNumberAcross([{ model: 'Patient', field: 'folderNumber' }]),

      // The attendance counter is SHARED: it also generates bill, admission and
      // claim numbers (BILL-n, ADM-n, NHIS-n ...). All of them must be checked
      // or a restart can re-issue a number that already exists.
    this.maxNumberAcross([
      { model: 'Attendance', field: 'attendanceNumber' },
      { model: 'Bill', field: 'billNumber' },
      { model: 'Admission', field: 'admissionNumber' },
      { model: 'InsuranceClaim', field: 'claimNumber' },
      { model: 'ProformaInvoice', field: 'referenceNumber' },
    ]),

      // Receipts (RCP-n) and claim batches (BATCH-xxxxxx-n) share the receipt counter.
      this.maxNumberAcross([
        { model: 'Payment', field: 'reference' },
        { model: 'ClaimBatch', field: 'batchNumber' }
      ]),

      this.maxNumberAcross([{ model: 'ReferralRecord', field: 'referralNumber' }]),
      this.maxNumberAcross([{ model: 'Appointment', field: 'appointmentNumber' }]),
      this.maxNumberAcross([{ model: 'Requisition', field: 'requisitionNumber' }]),
      this.maxNumberAcross([{ model: 'StockTransfer', field: 'transferNumber' }])
    ]);

    // Counters only ever move forward.
    patientCounter = Math.max(patientCounter, patientMax);
    attendanceCounter = Math.max(attendanceCounter, attendanceMax);
    receiptCounter = Math.max(receiptCounter, receiptMax);
    referralCounter = Math.max(referralCounter, referralMax);
    appointmentCounter = Math.max(appointmentCounter, appointmentMax);
    requisitionCounter = Math.max(requisitionCounter, requisitionMax);
    transferCounter = Math.max(transferCounter, transferMax);

    this.initialized = true;
    console.log(`✅ Counters initialized: Patient=${patientCounter}, Attendance=${attendanceCounter}, Receipt=${receiptCounter}, Referral=${referralCounter}, Appointment=${appointmentCounter}, Requisition=${requisitionCounter}, Transfer=${transferCounter}`);
  }

  // ============================================
  // PATIENT NUMBER
  // ============================================
  nextPatientNumber(): string {
    return padNumber(++patientCounter);
  }

  // ============================================
  // ATTENDANCE NUMBER (MASTER SEQUENCE)
  // ============================================
  nextAttendanceNumber(): string {
    return padNumber(++attendanceCounter);
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
  getClaimNumberFromAttendance(
    attendanceNumber: string,
    claimType: 'nhis' | 'private' | 'corporate',
  ): string {
    const prefix = claimType === 'nhis' ? 'NHIS' : claimType === 'private' ? 'PRIV' : 'CORP';
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
    return `RCP-${padNumber(++receiptCounter)}`;
  }

  // ============================================
  // REFERRAL NUMBER (independent)
  // ============================================
  // Carries the REF- prefix the existing referral rows already use.
  nextReferralNumber(): string {
    return `REF-${padNumber(++referralCounter)}`;
  }

  // For external referrals (already have number)
  createReferralFromExternal(externalNumber: string): string {
    return externalNumber;
  }

  // ============================================
  // APPOINTMENT NUMBER (independent)
  // ============================================
  nextAppointmentNumber(): string {
    return padNumber(++appointmentCounter);
  }

  // ============================================
  // ADDITIONAL SEQUENCE GENERATORS
  // ============================================
  nextBillNumber(): string {
    return `BILL-${padNumber(++attendanceCounter)}`;
  }

  nextProformaNumber(): string {
    return `PRO-${padNumber(++attendanceCounter)}`;
  }

  nextAdmissionNumber(): string {
    return `ADM-${padNumber(++attendanceCounter)}`;
  }

  nextBatchNumber(): string {
    return `BATCH-${padNumber(++receiptCounter)}`;
  }

  nextNHISClaimNumber(): string {
    return `NHIS-${padNumber(++attendanceCounter)}`;
  }

  nextPrivateClaimNumber(): string {
    return `PRIV-${padNumber(++attendanceCounter)}`;
  }

  nextCorporateClaimNumber(): string {
    return `CORP-${padNumber(++attendanceCounter)}`;
  }

  nextRequisitionNumber(): string {
    return `REQ-${padNumber(++requisitionCounter)}`;
  }

  nextTransferNumber(): string {
    return `TRN-${padNumber(++transferCounter)}`;
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