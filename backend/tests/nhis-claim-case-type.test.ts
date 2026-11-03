import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

/**
 * The claim must describe the encounter it came from. The demo used to file an outpatient claim that
 * carried a theatre G-DRG, an admitted pregnancy priced as a routine antenatal visit, and a day-case
 * tonsillectomy billed as detention for observation - all three are states the payer bounces, and the
 * claim form shows them as a visit type that contradicts its own codes.
 */
vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextNHISClaimNumber: () => 'NHIS-1001' }),
}));

const serviceDate = new Date('2026-10-24T10:00:00.000Z');

const tariff = (code: string, extra: Record<string, unknown> = {}) => ({
  id: `t-${code}`,
  gdrgCode: code,
  mdc: code.slice(0, 4),
  nhiaTariff: 100,
  minAgeYears: null,
  maxAgeYears: null,
  applicableLevels: null,
  isZoomCode: code.startsWith('ZOOM'),
  isAntenatal: code === 'OPDC02A',
  isActive: true,
  effectiveFrom: new Date('2026-01-01'),
  effectiveTo: null,
  ...extra,
});

type EncounterInput = {
  attendanceType: string;
  encounterCategory: string;
  admission?: { admissionType: string; admissionDate: Date; dischargeDate: Date } | null;
  diagnosisTariffs?: Array<{ tariff: ReturnType<typeof tariff>; isPrimary: boolean }>;
  procedureTariffs?: Array<{ tariff: ReturnType<typeof tariff>; isPrimary: boolean }>;
  /** Another of this patient's stays the claim's service date falls inside. */
  otherStay?: { admissionNumber: string; admissionDate: Date; dischargeDate: Date | null } | null;
};

/** Runs generateNHISClaim against one encounter and returns the claim row it would write. */
function generate(input: EncounterInput) {
  const {
    attendanceType,
    encounterCategory,
    admission = null,
    diagnosisTariffs = [],
    procedureTariffs = [],
    otherStay = null,
  } = input;

  const attendance = {
    id: 'attendance-1',
    attendanceNumber: 'ATT-1',
    patientId: 'patient-1',
    insuranceProviderId: 'nhis-1',
    nhisCCC: '12345',
    attendanceType,
    encounterCategory,
    dateTime: serviceDate,
    status: admission ? 'discharged' : 'completed',
    Patient: { id: 'patient-1', dateOfBirth: new Date('1985-04-02'), surname: 'Mensah', otherNames: 'Kofi' },
    InsuranceProvider: { id: 'nhis-1', type: 'nhis', name: 'NHIS' },
    Bill: { id: 'bill-1' },
    Admission: admission ? { ...admission, dischargeStatus: 'discharged' } : null,
    AttendanceDiagnosis: [{ id: 'dx-1', diagnosisId: 'diag-1', diagnosisType: 'primary', date: serviceDate, Diagnosis: { icdCode: 'B54', name: 'Malaria' } }],
    ServiceRendered: [],
    Medication: [],
    LabTest: [],
    Scan: [],
    Procedure: [{ id: 'proc-1', serviceCatalogId: 'service-proc-1', performedAt: serviceDate, ServiceCatalog: { id: 'service-proc-1', code: 'PROC-ORTH05A', nhisServiceCode: 'ORTH05A', name: 'Wound dressing under anaesthesia' } }],
  };

  const tx: any = {
    insuranceClaim: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => ({ ...data, id: 'claim-new' })),
    },
    attendance: { findUnique: vi.fn().mockResolvedValue(attendance) },
    hospital: { findFirst: vi.fn().mockResolvedValue({ nhisFacilityType: 'Secondary' }) },
    gDRGTariffDiagnosis: { findMany: vi.fn().mockResolvedValue(diagnosisTariffs.map((link) => ({ diagnosisId: "diag-1", gdrgTariff: link.tariff, isPrimary: link.isPrimary }))) },
    gDRGTariffProcedure: { findMany: vi.fn().mockResolvedValue(procedureTariffs.map((link) => ({ procedureId: "service-proc-1", gdrgTariff: link.tariff, isPrimary: link.isPrimary }))) },
    gDRGTariff: { findMany: vi.fn().mockResolvedValue([]) },
    attendanceDiagnosis: { findMany: vi.fn().mockResolvedValue([]) },
    admission: { findFirst: vi.fn().mockResolvedValue(otherStay) },
  };
  const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };

  const service = new InsuranceClaimService(prisma);
  return { service, tx, run: () => service.generateNHISClaim('attendance-1', 'user-1') };
}

const lines = (claim: any) => claim.items.create;
const gdrgLine = (claim: any) => lines(claim).find((item: any) => item.itemCategory === 'gdrg');
const procedureLine = (claim: any) => lines(claim).find((item: any) => item.itemCategory === 'procedure');

/** A draft as the claim table holds it, with the lines the desk saved onto it. */
const draft = (items: any[], overrides: Record<string, unknown> = {}) => ({
  id: 'claim-1',
  claimNumber: 'NHIS-1001',
  status: 'draft',
  insuranceProviderId: 'nhis-1',
  patientId: 'patient-1',
  attendanceId: 'attendance-1',
  totalClaimAmount: 128.7,
  createdAt: serviceDate,
  InsuranceProvider: { type: 'nhis' },
  typeOfService: 'OPD',
  mdcCode: 'OPDC',
  serviceOutcome: 'DISC',
  principalGDRG: 'OPDC06A',
  datesOfService: ['2026-10-24'],
  Attendance: { dateTime: serviceDate, Admission: null },
  items,
  ...overrides,
});

/** `otherStay` is an admission of the same patient the claim's dates fall inside. */
function setupFinalize(claim: any, otherStay: any = null) {
  const prisma: any = {
    insuranceClaim: {
      findUnique: vi.fn().mockResolvedValue(claim),
      update: vi.fn(async ({ data }: any) => ({ ...claim, ...data })),
    },
    insuranceClaimItem: { update: vi.fn().mockResolvedValue({}) },
    gDRGTariff: { findFirst: vi.fn().mockResolvedValue({ id: 't-OPDC06A', nhiaTariff: 28.7 }) },
    admission: { findFirst: vi.fn().mockResolvedValue(otherStay) },
  };
  prisma.$transaction = vi.fn(async (operations: any[]) => Promise.all(operations));
  return { service: new InsuranceClaimService(prisma), prisma };
}

describe('NHIS claim generation follows the case the encounter is', () => {
  it('bills a day-case dressing under its ZOOM code, not the theatre code it also links', async () => {
    const { run } = generate({
      attendanceType: 'general_consultation',
      encounterCategory: 'daycase',
      admission: { admissionType: 'elective', admissionDate: serviceDate, dischargeDate: serviceDate },
      diagnosisTariffs: [{ tariff: tariff('OPDC06A'), isPrimary: true }],
      procedureTariffs: [
        { tariff: tariff('ORTH05A'), isPrimary: true },
        { tariff: tariff('ZOOM07A'), isPrimary: false },
      ],
    });

    const { claim } = await run();

    expect(claim.principalGDRG).toBe('ZOOM07A');
    expect(claim.typeOfService).toBe('OPD');
    expect(procedureLine(claim).gdrgTariffId).toBe('t-ZOOM07A');
  });

  it('keeps a theatre G-DRG off an outpatient claim whose diagnosis only links OPDC', async () => {
    const { run } = generate({
      attendanceType: 'general_consultation',
      encounterCategory: 'opd',
      diagnosisTariffs: [{ tariff: tariff('OPDC06A'), isPrimary: true }],
      procedureTariffs: [{ tariff: tariff('ASUR30A'), isPrimary: true }],
    });

    const { claim } = await run();

    expect(claim.principalGDRG).toBe('OPDC06A');
    expect(claim.typeOfService).toBe('OPD');
    expect(claim.mdcCode).toBe('OPDC');
    // The operation is still listed - the payer wants to see it - but it is priced under the
    // outpatient package the visit can bill, so the claim carries no surgical specialty.
    expect(procedureLine(claim).gdrgTariffId).toBe('t-OPDC06A');
  });

  it('prices an admitted pregnancy as the obstetric admission it is, not as a booking visit', async () => {
    const { run } = generate({
      attendanceType: 'antenatal',
      encounterCategory: 'ipd',
      admission: { admissionType: 'emergency', admissionDate: serviceDate, dischargeDate: new Date('2026-10-28T09:00:00.000Z') },
      diagnosisTariffs: [
        { tariff: tariff('OPDC02A'), isPrimary: true },
        { tariff: tariff('OBGY09A'), isPrimary: false },
      ],
    });

    const { claim } = await run();

    expect(claim.principalGDRG).toBe('OBGY09A');
    expect(claim.typeOfService).toBe('IPD');
    expect(claim.mdcCode).toBe('OBGY');
    expect(claim.datesOfService).toHaveLength(2);
  });

  it('still bills a routine antenatal visit under the bundled antenatal code', async () => {
    const { run } = generate({
      attendanceType: 'antenatal',
      encounterCategory: 'opd',
      diagnosisTariffs: [{ tariff: tariff('OPDC02A'), isPrimary: true }],
    });

    const { claim } = await run();

    expect(claim.principalGDRG).toBe('OPDC02A');
    expect(claim.typeOfService).toBe('OPD');
    expect(claim.typeOfAttendance).toBe('ANC');
    expect(gdrgLine(claim).code).toBe('OPDC02A');
  });
});

/**
 * The manual prices every day of a stay inside that stay's G-DRG, so an outpatient claim dated while
 * the same patient occupies a bed elsewhere is a duplicate the payer reverses. The demo had 310 of
 * them; the rule doc calls it out and nothing in the app checked it.
 */
describe('NHIS claims are not dated on top of an admission', () => {
  const stayDuringVisit = {
    admissionNumber: 'ADM-77',
    admissionDate: new Date('2026-10-20T08:00:00.000Z'),
    dischargeDate: new Date('2026-10-28T09:00:00.000Z'),
  };

  it('refuses an outpatient visit dated inside another admission of the same patient', async () => {
    const { tx, run } = generate({
      attendanceType: 'specialist_consultation',
      encounterCategory: 'opd',
      diagnosisTariffs: [{ tariff: tariff('OPDC06A'), isPrimary: true }],
      otherStay: stayDuringVisit,
    });

    await expect(run()).rejects.toThrow(/inside inpatient stay ADM-77/);
    expect(tx.insuranceClaim.create).not.toHaveBeenCalled();
  });

  it('looks only at inpatient stays, so a day case still claims its own bed-day', async () => {
    const { tx, run } = generate({
      attendanceType: 'general_consultation',
      encounterCategory: 'daycase',
      admission: { admissionType: 'elective', admissionDate: serviceDate, dischargeDate: serviceDate },
      diagnosisTariffs: [{ tariff: tariff('OPDC06A'), isPrimary: true }],
      procedureTariffs: [{ tariff: tariff('ZOOM05A'), isPrimary: true }],
    });

    const { claim } = await run();

    expect(claim.typeOfService).toBe('OPD');
    const where = tx.admission.findFirst.mock.calls[0][0].where;
    expect(where.attendance.encounterCategory).toBe('ipd');
    expect(where.attendance.id).toEqual({ not: 'attendance-1' });
  });

  it('refuses a draft that was edited onto a day of the patient admission', async () => {
    const { service, prisma } = setupFinalize(draft([
      { id: 'line-gdrg', itemCategory: 'gdrg', code: 'OPDC06A', lineTotal: 28.7, gdrgTariff: { gdrgCode: 'OPDC06A' } },
    ]), stayDuringVisit);

    await expect(service.finalizeClaim('claim-1', 'user-1'))
      .rejects.toThrow(/inside inpatient stay ADM-77/);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });
});

describe('NHIS claim finalization checks every line, not only the header', () => {

  it('refuses an outpatient claim hiding a surgical G-DRG on one of its lines', async () => {
    const { service, prisma } = setupFinalize(draft([
      { id: 'line-gdrg', itemCategory: 'gdrg', code: 'OPDC06A', lineTotal: 28.7, gdrgTariff: { gdrgCode: 'OPDC06A' } },
      { id: 'line-proc', itemCategory: 'procedure', code: 'PROC-ASUR30A', lineTotal: 0, gdrgTariff: { gdrgCode: 'ASUR30A' } },
    ]));

    await expect(service.finalizeClaim('claim-1', 'user-1'))
      .rejects.toThrow(/An outpatient claim reports OPDC only — remove ASUR/);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('refuses an inpatient claim that reports the outpatient scheme on a line', async () => {
    const { service } = setupFinalize(draft([
      { id: 'line-gdrg', itemCategory: 'gdrg', code: 'OBGY09A', lineTotal: 147.97, gdrgTariff: { gdrgCode: 'OBGY09A' } },
      { id: 'line-dx', itemCategory: 'diagnosis', code: 'O42.90', lineTotal: 0, gdrgTariff: { gdrgCode: 'OPDC02A' } },
    ], {
      typeOfService: 'IPD',
      mdcCode: 'OBGY',
      principalGDRG: 'OBGY09A',
      totalClaimAmount: 147.97,
      Attendance: { dateTime: serviceDate, Admission: { admissionDate: serviceDate } },
    }));

    await expect(service.finalizeClaim('claim-1', 'user-1'))
      .rejects.toThrow(/inpatient claim must report the clinical specialty|OPDC is the outpatient scheme/);
  });

  it('finalizes a claim whose lines all bill the case it reports', async () => {
    const { service, prisma } = setupFinalize(draft([
      { id: 'line-gdrg', itemCategory: 'gdrg', code: 'ZOOM07A', lineTotal: 81.59, gdrgTariff: { gdrgCode: 'ZOOM07A' } },
      { id: 'line-proc', itemCategory: 'procedure', code: 'PROC-ORTH05A', lineTotal: 0, gdrgTariff: { gdrgCode: 'ZOOM07A' } },
      { id: 'line-dx', itemCategory: 'diagnosis', code: 'L03.115', lineTotal: 0, gdrgTariff: { gdrgCode: 'OPDC06A' } },
    ], { principalGDRG: 'ZOOM07A', totalClaimAmount: 81.59 }));

    const claim = await service.finalizeClaim('claim-1', 'user-1');

    expect(claim.status).toBe('finalized');
    expect(prisma.insuranceClaim.update).toHaveBeenCalled();
  });
});
