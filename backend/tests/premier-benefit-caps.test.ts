import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

const policy = {
  version: 1,
  scheme: 'premier_health',
  opd: { perVisitCap: 350, maxVisitsPerCalendarMonth: 2, deferFirstVisitExcess: true },
  ipd: { perAdmissionCap: 1200 },
  surgery: { cap: 2000 },
  aggregateCategories: ['service', 'procedure', 'medicine', 'investigation'],
};

const makeService = () => new InsuranceClaimService({} as any);
const allocate = (service: InsuranceClaimService, db: any, context: any, rows: any[]) =>
  (service as any).applyPremierBenefitAllocation(db, context, rows);

const context = (overrides: any = {}) => ({
  id: 'current-attendance',
  patientId: 'patient-1',
  insuranceProviderId: 'premier-provider',
  dateTime: new Date('2026-11-27T10:00:00.000Z'),
  encounterCategory: 'opd',
  InsuranceProvider: { benefitPolicy: policy },
  ...overrides,
});

const line = (itemCategory: string, grossLineTotal: number) => ({
  itemCategory,
  quantity: 1,
  unitPrice: grossLineTotal,
  lineTotal: grossLineTotal,
  grossUnitPrice: grossLineTotal,
  grossLineTotal,
});

describe('Premier Health Insurance aggregate benefit caps', () => {
  it('defers first OPD attendance excess instead of collecting it immediately', async () => {
    const db = { attendance: { findMany: vi.fn().mockResolvedValue([]) }, insuranceClaim: { findMany: vi.fn() } };
    const rows = [line('service', 500)];
    const result = await allocate(makeService(), db, context(), rows);

    expect(result).toMatchObject({
      visitOrdinal: 1,
      cap: 350,
      grossAmount: 500,
      insurerCovered: 350,
      patientPayableNow: 0,
      deferredPatientBalance: 150,
    });
    expect(rows[0].lineTotal).toBe(350);
  });

  it('collects the first visit deferred excess together with the second visit excess', async () => {
    const db = {
      attendance: { findMany: vi.fn().mockResolvedValue([{ id: 'first-attendance' }]) },
      insuranceClaim: { findMany: vi.fn().mockResolvedValue([{
        attendanceId: 'first-attendance',
        metadata: { benefitCalculation: { scheme: 'premier_health', insurerCovered: 350, deferredPatientBalance: 150 } },
      }]) },
    };
    const rows = [line('medicine', 400)];
    const result = await allocate(makeService(), db, context(), rows);

    expect(result).toMatchObject({
      visitOrdinal: 2,
      cap: 350,
      grossAmount: 400,
      insurerCovered: 350,
      priorDeferred: 150,
      patientPayableNow: 200,
      deferredPatientBalance: 0,
    });
  });

  it('removes Premier OPD insurer benefit after the second attendance in the month', async () => {
    const db = {
      attendance: { findMany: vi.fn().mockResolvedValue([{ id: 'first' }, { id: 'second' }]) },
      insuranceClaim: { findMany: vi.fn().mockResolvedValue([
        { attendanceId: 'first', totalClaimAmount: 350, metadata: { benefitCalculation: { scheme: 'premier_health', insurerCovered: 350, deferredPatientBalance: 0 } } },
        { attendanceId: 'second', totalClaimAmount: 350, metadata: { benefitCalculation: { scheme: 'premier_health', insurerCovered: 350, deferredPatientBalance: 0 } } },
      ]) },
    };
    const result = await allocate(makeService(), db, context(), [line('service', 250)]);

    expect(result).toMatchObject({ visitOrdinal: 3, cap: 0, insurerCovered: 0, patientPayableNow: 250 });
  });

  it('applies the GHS 1,200 IPD cap across ward, medicines and investigations together', async () => {
    const db = { attendance: { findMany: vi.fn() }, insuranceClaim: { findMany: vi.fn() } };
    const rows = [line('service', 500), line('medicine', 500), line('investigation', 600)];
    const result = await allocate(makeService(), db, context({
      encounterCategory: 'ipd',
      Admission: { id: 'admission-1' },
    }), rows);

    expect(result).toMatchObject({ cap: 1200, grossAmount: 1600, insurerCovered: 1200, patientPayableNow: 400 });
    expect(rows.map(row => row.lineTotal)).toEqual([375, 375, 450]);
  });

  it('uses the surgical cap for day-case procedures and their related entries', async () => {
    const db = { attendance: { findMany: vi.fn() }, insuranceClaim: { findMany: vi.fn() } };
    const rows = [line('service', 900), line('procedure', 900), line('medicine', 500)];
    const result = await allocate(makeService(), db, context({
      encounterCategory: 'daycase',
      Admission: { id: 'daycase-admission' },
    }), rows);

    expect(result).toMatchObject({ surgeryCase: true, cap: 2000, grossAmount: 2300, insurerCovered: 2000, patientPayableNow: 300 });
  });

  it('applies the surgical admission cap to all entries, not only the procedure line', async () => {
    const db = { attendance: { findMany: vi.fn() }, insuranceClaim: { findMany: vi.fn() } };
    const rows = [line('service', 900), line('medicine', 800), line('procedure', 900), line('investigation', 400)];
    const result = await allocate(makeService(), db, context({
      encounterCategory: 'ipd',
      Admission: { id: 'surgical-admission' },
    }), rows);

    expect(result).toMatchObject({ surgeryCase: true, cap: 2000, grossAmount: 3000, insurerCovered: 2000, patientPayableNow: 1000 });
    expect(rows.reduce((sum, row) => sum + row.lineTotal, 0)).toBe(2000);
  });
  it('uses the configured OPD and IPD caps from the provider policy', async () => {
    const customPolicy = { ...policy, opd: { perVisitCap: 250, maxVisitsPerCalendarMonth: 1, deferFirstVisitExcess: true }, ipd: { perAdmissionCap: 900 } };
    const db = { attendance: { findMany: vi.fn().mockResolvedValue([]) }, insuranceClaim: { findMany: vi.fn() } };
    const opdRows = [line('service', 400)];
    const opdResult = await allocate(makeService(), db, context({ InsuranceProvider: { benefitPolicy: customPolicy } }), opdRows);
    expect(opdResult).toMatchObject({ visitOrdinal: 1, cap: 250, insurerCovered: 250, deferredPatientBalance: 150 });
    const ipdRows = [line('service', 1200)];
    const ipdResult = await allocate(makeService(), db, context({ InsuranceProvider: { benefitPolicy: customPolicy }, encounterCategory: 'ipd', Admission: { id: 'custom-admission' } }), ipdRows);
    expect(ipdResult).toMatchObject({ cap: 900, insurerCovered: 900, patientPayableNow: 300 });
  });
});
