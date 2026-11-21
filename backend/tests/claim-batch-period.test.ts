// backend/tests/claim-batch-period.test.ts
//
// Claim batching is monthly: a batch for September 2026 must take exactly the claims whose visit
// happened in September 2026, and the numbers shown before generating must describe that same set.
//
// Two things broke this before: the month preview and the batch query were written twice and
// disagreed about how a claim is bucketed by payer, and the screen totalled only the rows it had
// loaded. Both are pinned here.

import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { InsuranceClaimRepository } from '../src/modules/insuranceClaim/InsuranceClaimRepository';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

// Batch numbers come from the counter table; the generation tests only care that each batch
// gets its own, so the sequence lives here instead of reaching for a database.
let batchSequence = 0;
vi.mock('../src/services/CounterService', () => ({
  getCounterService: () => ({ nextBatchNumber: () => `CB-${String(++batchSequence).padStart(5, '0')}` }),
}));

const SEP = new Date(2026, 8, 1, 0, 0, 0, 0);
const OCT = new Date(2026, 9, 1, 0, 0, 0, 0);

function claimAggregate(count: number, amount: string | null) {
  return { _count: { _all: count }, _sum: { totalClaimAmount: count ? amount : null } };
}

function makeRepo(extra: Record<string, any> = {}) {
  const aggregate = vi.fn().mockImplementation(() => Promise.resolve(claimAggregate(0, null)));
  const findMany = vi.fn().mockResolvedValue([]);
  const count = vi.fn().mockResolvedValue(0);
  const groupBy = vi.fn().mockResolvedValue([]);
  const prisma: any = {
    insuranceClaim: { aggregate, findMany, count, groupBy },
    ...extra,
  };
  return {
    repo: new InsuranceClaimRepository(prisma),
    service: new ClaimBatchService(prisma),
    prisma,
    aggregate,
    findMany,
    count,
    groupBy,
  };
}

/** The whole suite is calendar-sensitive, so every case runs at a fixed "today". */
function atDate(iso: string, extra: Record<string, any> = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
  return makeRepo(extra);
}

describe('claim batch month selection', () => {
  it('reads the month of the visit: September in, October out', async () => {
    const { repo, aggregate } = makeRepo();
    await repo.summarizeBatchableByType(2026, 9);

    const where = aggregate.mock.calls[0][0].where;
    expect(where.Attendance.dateTime).toEqual({ gte: SEP, lt: OCT });
    expect(where.status).toBe('finalized');
    expect(where.batchId).toBeNull();
    expect(where.InsuranceProvider).toEqual({ type: 'nhis' });
  });

  it('uses one month rule for the preview and for the batch itself', async () => {
    const { repo, aggregate, findMany } = makeRepo();

    // The preview is a promise about what the batch will do. If the two queries drift apart, the
    // number on screen is not the batch that gets built — which is exactly what used to happen.
    await repo.summarizeBatchableByType(2026, 9, { insuranceProviderId: 'provider-1' });
    await repo.findEligibleClaimsForBatch('private', 2026, 9, 'provider-1', null);

    expect(findMany.mock.calls[0][0].where).toEqual(aggregate.mock.calls[1][0].where);
  });

  it('scopes a batch by provider so one provider’s claims never join another’s batch', async () => {
    const { repo, findMany } = makeRepo();
    await repo.findEligibleClaimsForBatch('private', 2026, 9, 'provider-2', null);

    const where = findMany.mock.calls[0][0].where;
    expect(where.insuranceProviderId).toBe('provider-2');
    expect(where.InsuranceProvider).toEqual({ type: 'private' });
  });

  it('keeps a corporate account’s own claims whatever provider sits behind them', async () => {
    const { repo, findMany } = makeRepo();
    await repo.findEligibleClaimsForBatch('corporate', 2026, 9, 'provider-3', 'account-7');

    const where = findMany.mock.calls[0][0].where;
    expect(where.corporateAccountId).toBe('account-7');
    expect(where.InsuranceProvider).toBeUndefined();
  });
});

describe('claim batch month totals', () => {
  it('reports each payer bucket and the month overall from the database counts', async () => {
    const { service, aggregate, findMany } = makeRepo();
    aggregate
      .mockResolvedValueOnce(claimAggregate(3, '1200.50'))
      .mockResolvedValueOnce(claimAggregate(2, '300.25'))
      .mockResolvedValueOnce(claimAggregate(1, '0.00'));
    // NHIS preview now independently verifies that these aggregate rows have a priced G-DRG.
    findMany.mockResolvedValueOnce([
      nhisClaim('nhis-1', 'MEDI', '500.00'),
      nhisClaim('nhis-2', 'OPDC', '400.00'),
      nhisClaim('nhis-3', 'ASUR', '300.50'),
    ]);

    const summary = await service.eligibleForPeriod(2026, 9);

    expect(summary).toMatchObject({
      periodYear: 2026,
      periodMonth: 9,
      nhis: 3,
      private: 2,
      corporate: 1,
      totalAmount: { nhis: 1200.5, private: 300.25, corporate: 0 },
      overall: { count: 6, totalAmount: 1500.75 },
    });
  });

  it('adds batch amounts as money, never as text', async () => {
    const { service, aggregate, findMany } = makeRepo();
    aggregate
      .mockResolvedValueOnce(claimAggregate(1, '900'))
      .mockResolvedValueOnce(claimAggregate(1, '900'))
      .mockResolvedValueOnce(claimAggregate(1, '900'));
    findMany.mockResolvedValueOnce([nhisClaim('nhis-1', 'MEDI', '900')]);

    const summary = await service.eligibleForPeriod(2026, 9);
    expect(summary.overall.totalAmount).toBe(2700);
  });

  it('sums the month’s claims and names what a batch would take', async () => {
    const { repo, findMany, count, aggregate, groupBy } = makeRepo();
    findMany.mockResolvedValueOnce([
      {
        id: 'claim-1',
        claimNumber: 'NHIS-001',
        status: 'finalized',
        totalClaimAmount: '250.00',
        Attendance: { attendanceNumber: 'A-1', dateTime: new Date(2026, 8, 14) },
        Patient: { folderNumber: 'F/001', surname: 'Mensah', otherNames: 'Kofi' },
        InsuranceProvider: { name: 'NHIS', type: 'nhis' },
        CorporateAccount: null,
        batch: null,
      },
    ]);
    count.mockResolvedValueOnce(41);
    aggregate
      .mockResolvedValueOnce({ _sum: { totalClaimAmount: '9876.54' } })
      .mockResolvedValueOnce(claimAggregate(12, '5000.00'));
    groupBy.mockResolvedValueOnce([
      { status: 'finalized', _count: { _all: 30 }, _sum: { totalClaimAmount: '9000.00' } },
      { status: 'draft', _count: { _all: 11 }, _sum: { totalClaimAmount: '876.54' } },
    ]);

    const result = await repo.findClaimsForPeriod(2026, 9, { page: 1, limit: 25 });

    expect(result.totals).toEqual({
      claims: 41,
      amount: 9876.54,
      byStatus: {
        draft: { count: 11, amount: 876.54 },
        finalized: { count: 30, amount: 9000 },
      },
      batchable: { count: 12, amount: 5000 },
    });
    expect(result.data[0]).toMatchObject({
      claimNumber: 'NHIS-001',
      patient: 'Mensah Kofi',
      amount: 250,
      insuranceType: 'nhis',
      batch: null,
    });
    expect(result.pagination).toEqual({ page: 1, limit: 25, total: 41, pages: 2 });
  });

  it('caps a month’s claim page rather than silently truncating the total', async () => {
    const { repo, findMany } = makeRepo();
    await repo.findClaimsForPeriod(2026, 9, { page: 1, limit: 5000 });

    expect(findMany.mock.calls[0][0].take).toBe(200);
  });

  it('totals the whole batch filter, not the page currently open', async () => {
    const claimBatch: any = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(23),
      aggregate: vi.fn().mockResolvedValue({
        _count: { _all: 23 },
        _sum: { totalAmount: '41200.00', totalClaims: 390 },
      }),
    };
    const { repo } = makeRepo({ claimBatch });

    const result = await repo.findBatchesWithFilters({ periodYear: 2026, periodMonth: 9, limit: 10 });

    expect(claimBatch.aggregate.mock.calls[0][0].where).toEqual({ periodYear: 2026, periodMonth: 9 });
    expect(result.summary).toEqual({ batches: 23, claims: 390, amount: 41200 });
    expect(result.pagination.total).toBe(23);
  });

  it('searches batches on the server instead of filtering the loaded page', async () => {
    const claimBatch: any = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: { _all: 0 }, _sum: {} }),
    };
    const { repo } = makeRepo({ claimBatch });

    await repo.findBatchesWithFilters({ periodYear: 2026, periodMonth: 9, search: '  OCT  ', limit: 20 });

    const where = claimBatch.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      { OR: [
        { batchNumber: { contains: 'OCT', mode: 'insensitive' } },
        { description: { contains: 'OCT', mode: 'insensitive' } },
      ] },
    ]);
  });

  it('keeps the month filter and the search filter together', async () => {
    const claimBatch: any = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: { _all: 0 }, _sum: {} }),
    };
    const { repo } = makeRepo({ claimBatch });

    await repo.findBatchesWithFilters({
      periodMonth: 9,
      startDate: '2026-08-15',
      endDate: '2026-09-20',
      search: 'BATCH',
    });

    const where = claimBatch.findMany.mock.calls[0][0].where;
    expect(where.periodMonth).toBe(9);
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0].OR).toEqual([
      { periodYear: 2026, periodMonth: 8 },
      { periodYear: 2026, periodMonth: 9 },
    ]);
  });

  it('includes the payer relations the list screen shows', async () => {
    const claimBatch: any = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn().mockResolvedValue({ _count: { _all: 0 }, _sum: {} }),
    };
    const { repo } = makeRepo({ claimBatch });

    await repo.findBatchesWithFilters({ periodYear: 2026, periodMonth: 9 });

    const include = claimBatch.findMany.mock.calls[0][0].include;
    expect(include.insuranceProvider).toBeTruthy();
    expect(include.corporateAccount).toBeTruthy();
  });
});

describe('monthly batch remittance tracking', () => {
  it('records partial payments against the selected provider-month batch', async () => {
    const batch = {
      id: 'batch-2026-10-provider-a',
      batchNumber: 'BATCH-2026-10-A',
      status: 'finalized',
      totalAmount: '100.00',
    };
    const findManyEvents = vi.fn().mockResolvedValue([{ amount: '40.00' }]);
    const createEvent = vi.fn(async ({ data }: any) => ({ id: 'payment-1', ...data }));
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      claimBatchTrackingEvent: { findMany: findManyEvents, create: createEvent },
    };
    const { service, prisma } = makeRepo({
      claimBatch: { findUnique: vi.fn().mockResolvedValue(batch) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    });

    const event = await service.recordBatchTrackingEvent('batch-2026-10-provider-a', {
      eventType: 'payment',
      amount: 30,
      paymentReference: 'REMIT-OCT-PART-1',
      paymentMethod: 'bank_transfer',
    }, 'accounts-user');

    expect(event).toMatchObject({
      batchId: 'batch-2026-10-provider-a',
      eventType: 'payment',
      amount: 30,
      paymentReference: 'REMIT-OCT-PART-1',
      recordedById: 'accounts-user',
    });
    expect(findManyEvents).toHaveBeenCalledWith({
      where: { batchId: 'batch-2026-10-provider-a', eventType: 'payment' },
      select: { amount: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('prevents monthly remittances from exceeding the submitted batch amount', async () => {
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      claimBatchTrackingEvent: {
        findMany: vi.fn().mockResolvedValue([{ amount: '40.00' }]),
        create: vi.fn(),
      },
    };
    const { service } = makeRepo({
      claimBatch: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'batch-2026-10-provider-a',
          batchNumber: 'BATCH-2026-10-A',
          status: 'finalized',
          totalAmount: '100.00',
        }),
      },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    });

    await expect(service.recordBatchTrackingEvent('batch-2026-10-provider-a', {
      eventType: 'payment',
      amount: 60.01,
      paymentReference: 'REMIT-OCT-PART-2',
    }, 'accounts-user')).rejects.toThrow(/Payment exceeds the ₵100.00 submitted amount/);
    expect(tx.claimBatchTrackingEvent.create).not.toHaveBeenCalled();
  });
});

describe('claim batch period validation', () => {
  it('refuses a month that has no calendar', async () => {
    const { service } = makeRepo();
    await expect(service.eligibleForPeriod(2026, 13)).rejects.toThrow(/periodMonth must be 1–12/);
    await expect(service.claimsForPeriod(2026, 0)).rejects.toThrow(/periodMonth/);
    await expect(service.claimsForPeriod('2026' as any, 9)).rejects.toThrow(/periodYear/);
  });

  it('refuses an unknown payer before it reaches the database', async () => {
    // An invented enum value in a Prisma where clause is a 500, not an empty list.
    const { service, aggregate } = makeRepo();
    await expect(service.claimsForPeriod(2026, 9, { insuranceType: 'walk_in' })).rejects.toThrow(
      /must be nhis, private, or corporate/,
    );
    expect(aggregate).not.toHaveBeenCalled();
  });

  it('refuses an unknown batched flag', async () => {
    const { service, aggregate } = makeRepo();
    await expect(service.claimsForPeriod(2026, 9, { batched: 'maybe' })).rejects.toThrow(/batched/);
    expect(aggregate).not.toHaveBeenCalled();
  });
});

// A batch built in the middle of a month silently drops every visit still to come in it, and the
// payer reads the second batch for that month as a duplicate submission. Reading must stay
// possible — only sending is gated.
describe('claim batches are only generated for a month that has ended', () => {
  afterEach(() => vi.useRealTimers());

  it('refuses the month still open and names the last one that passed', async () => {
    const { service } = atDate('2026-11-02T09:00:00');
    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 11, insuranceProviderId: 'nhis-a',
    } as any, 'user-1')).rejects.toThrow(/November 2026 has not ended yet[\s\S]*batch October 2026 instead/);
  });

  it('refuses a future month', async () => {
    const { service } = atDate('2026-11-02T09:00:00');
    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2027, periodMonth: 1, insuranceProviderId: 'nhis-a',
    } as any, 'user-1')).rejects.toThrow(/has not ended yet/);
  });

  it('carries the December of last year across the new year', async () => {
    const { service } = atDate('2026-01-15T09:00:00');
    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 1, insuranceProviderId: 'nhis-a',
    } as any, 'user-1')).rejects.toThrow(/January 2026 has not ended yet[\s\S]*batch December 2025 instead/);
  });

  it('requires an explicit NHIS provider so each scheme gets its own monthly batch', async () => {
    const { service } = atDate('2026-11-02T09:00:00');
    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10,
    } as any, 'user-1')).rejects.toThrow(/insuranceProviderId is required for nhis monthly batches/);
  });

  it('creates one NHIS batch for the provider-month across all G-DRG families', async () => {
    const { service, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'MEDI', '50.00'),
      nhisClaim('claim-3', 'OPDC', '25.00'),
    ]);

    const result = await service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'nhis-a',
    } as any, 'user-1');

    expect(result.batches).toHaveLength(1);
    expect(result.heldBackUncoded).toBe(0);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      insuranceType: 'nhis',
      insuranceProviderId: 'nhis-a',
      claimFamily: 'ALL',
      periodYear: 2026,
      periodMonth: 10,
      totalClaims: 3,
    });
    expect(Number(created[0].totalAmount)).toBe(175);
    expect(created[0].claims.connect.map((claim: any) => claim.id))
      .toEqual(['claim-1', 'claim-2', 'claim-3']);
  });

  it('keeps NHIS claims without a priced G-DRG outside the monthly batch for correction', async () => {
    const { service, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', null, '10.00'),
    ]);

    const result = await service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'nhis-a',
    } as any, 'user-1');

    expect(result.batches).toHaveLength(1);
    expect(result.heldBackUncoded).toBe(1);
    expect(created[0].claims.connect).toEqual([{ id: 'claim-1' }]);
    expect(created[0].claimFamily).toBe('ALL');
  });

  it('refuses to create an empty NHIS monthly batch when every claim lacks a priced G-DRG', async () => {
    const { service, created } = generatingFrom([nhisClaim('claim-1', null, '10.00')]);

    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'nhis-a',
    } as any, 'user-1')).rejects.toThrow(/No NHIS claims with a priced G-DRG package are ready/);
    expect(created).toHaveLength(0);
  });

  it('blocks a new monthly batch when a legacy G-DRG-family batch already exists', async () => {
    const { service, prisma, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'OPDC', '25.00'),
    ]);
    prisma.claimBatch.findFirst.mockResolvedValueOnce({ batchNumber: 'CB-00009', claimFamily: 'MEDI' });

    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'nhis-a',
    } as any, 'user-1')).rejects.toThrow(/A legacy nhis MEDI batch already exists for this payer in October 2026/);
    expect(created).toHaveLength(0);
    expect(prisma.claimBatch.findFirst.mock.calls[0][0].where).not.toHaveProperty('claimFamily');
  });

  it('keeps private batches separate by provider and month', async () => {
    const { service, created, findMany } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', null, '10.00'),
    ]);
    const result = await service.generateBatch({
      insuranceType: 'private', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'private-a',
    } as any, 'user-1');

    expect(result.batches).toHaveLength(1);
    expect(created[0]).toMatchObject({
      insuranceType: 'private', insuranceProviderId: 'private-a',
      corporateAccountId: null, claimFamily: 'ALL', totalClaims: 2,
    });
    expect(findMany.mock.calls[0][0].where.insuranceProviderId).toBe('private-a');
  });

  it('keeps corporate monthly batches separate by employer account and its contracted provider', async () => {
    const { service, created, findMany } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
    ]);
    const result = await service.generateBatch({
      insuranceType: 'corporate', periodYear: 2026, periodMonth: 10, corporateAccountId: 'account-1',
    } as any, 'user-1');

    expect(result.batches).toHaveLength(1);
    expect(created[0]).toMatchObject({
      insuranceType: 'corporate',
      insuranceProviderId: 'provider-corp',
      corporateAccountId: 'account-1',
      periodYear: 2026,
      periodMonth: 10,
      claimFamily: 'ALL',
    });
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      insuranceProviderId: 'provider-corp',
      corporateAccountId: 'account-1',
    });
  });

  it('previews only coded NHIS claims for the selected provider and reports held-back claims separately', async () => {
    const { service } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'OPDC', '50.00'),
      nhisClaim('claim-3', null, '10.00'),
    ]);

    const summary = await service.eligibleForPeriod(2026, 10, { insuranceProviderId: 'nhis-a' });

    expect(summary).toMatchObject({
      nhis: 2,
      totalAmount: { nhis: 150 },
      nhisUncoded: 1,
    });
    expect(summary).not.toHaveProperty('nhisFamilies');
  });

  it('still previews an open month, and says it is open', async () => {
    const { service } = atDate('2026-11-02T09:00:00');
    const summary = await service.eligibleForPeriod(2026, 11);
    expect(summary).toMatchObject({
      periodIsClosed: false,
      lastClosedPeriod: { periodYear: 2026, periodMonth: 10 },
    });

    const closed = await service.eligibleForPeriod(2026, 10);
    expect(closed).toMatchObject({ periodIsClosed: true });
  });
});

function nhisClaim(id: string, mdc: string | null, amount: string) {
  return {
    id,
    claimNumber: `NHIS-${id}`,
    totalClaimAmount: amount,
    insuranceProviderId: 'nhis-a',
    corporateAccountId: null,
    items: mdc
      ? [
        { itemNumber: 1, itemCategory: 'gdrg', gdrgTariff: { mdc } },
        { itemNumber: 2, itemCategory: 'medicine', lineTotal: '25.00' },
      ]
      : [{ itemNumber: 1, itemCategory: 'diagnosis', lineTotal: '0.00' }],
  };
}

/**
 * A month of claims ready to generate. Each invocation is isolated from the database
 * and the NHIS XML writer; tests assert the payer-period grouping itself.
 */
function generatingFrom(claims: any[], date = '2026-11-02T09:00:00') {
  const created: any[] = [];
  const batch = atDate(date, {
    claimBatch: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: any) => {
        created.push(data);
        return { id: `batch-${created.length}`, batchNumber: data.batchNumber, insuranceType: data.insuranceType };
      }),
      update: vi.fn().mockResolvedValue(null),
    },
  });
  batch.findMany.mockResolvedValue(claims);
  batch.prisma.insuranceProvider = {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockImplementation(async ({ where }: any) => ({
      id: where.id, name: 'NHIS', type: where.id === 'private-a' ? 'private' : 'nhis', isActive: true,
    })),
  };
  batch.prisma.corporateAccount = {
    findUnique: vi.fn().mockResolvedValue({
      id: 'account-1', companyName: 'Acacia', isActive: true, insuranceProviderId: 'provider-corp',
    }),
  };
  batch.prisma.$transaction = vi.fn(async (callback: any) => callback({
    $queryRaw: vi.fn().mockResolvedValue([]),
    claimBatch: batch.prisma.claimBatch,
  }));
  vi.spyOn(batch.service as any, 'buildNHISBatchXml').mockResolvedValue('<NHISICClaim/>');
  vi.spyOn(fs.promises, 'mkdir').mockImplementation(async () => undefined as any);
  vi.spyOn(fs.promises, 'writeFile').mockImplementation(async () => undefined);
  return { ...batch, created };
}
