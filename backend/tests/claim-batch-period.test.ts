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
    const { service, aggregate } = makeRepo();
    aggregate
      .mockResolvedValueOnce(claimAggregate(3, '1200.50'))
      .mockResolvedValueOnce(claimAggregate(2, '300.25'))
      .mockResolvedValueOnce(claimAggregate(1, '0.00'));

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
    const { service, aggregate } = makeRepo();
    aggregate
      .mockResolvedValueOnce(claimAggregate(1, '900'))
      .mockResolvedValueOnce(claimAggregate(1, '900'))
      .mockResolvedValueOnce(claimAggregate(1, '900'));

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
    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 11 } as any, 'user-1'))
      .rejects.toThrow(/November 2026 has not ended yet[\s\S]*batch October 2026 instead/);
  });

  it('refuses a future month', async () => {
    const { service } = atDate('2026-11-02T09:00:00');
    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2027, periodMonth: 1 } as any, 'user-1'))
      .rejects.toThrow(/has not ended yet/);
  });

  it('carries the December of last year across the new year', async () => {
    const { service } = atDate('2026-01-15T09:00:00');
    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 1 } as any, 'user-1'))
      .rejects.toThrow(/January 2026 has not ended yet[\s\S]*batch December 2025 instead/);
  });

  it('files an NHIS month under the scheme that holds most of its claims', async () => {
    const { service, prisma, findMany, groupBy, created } = generatingFrom([nhisClaim('claim-1', 'MEDI', '100.00')]);
    // The duplicate records a real facility carries: the month spans both, and one is losing.
    groupBy.mockResolvedValueOnce([
      { insuranceProviderId: 'nhis-a', type: 'nhis', name: 'NHIS', _count: { _all: 9 }, _sum: { totalClaimAmount: '900.00' } },
      { insuranceProviderId: 'nhis-b', type: 'nhis', name: 'NHIS (old)', _count: { _all: 3 }, _sum: { totalClaimAmount: '300.00' } },
    ]);
    prisma.insuranceProvider = {
      findMany: vi.fn().mockResolvedValue([
        { id: 'nhis-a', name: 'NHIS', type: 'nhis' },
        { id: 'nhis-b', name: 'NHIS (old)', type: 'nhis' },
      ]),
      findFirst: vi.fn().mockResolvedValue(null),
    };

    await service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1');

    // The batch is named after the dominant scheme…
    expect(created[0].insuranceProviderId).toBe('nhis-a');
    // …but it takes the whole month. Narrowing it to one record would batch 3 of 12 claims while
    // the preview promised 12.
    const claimWhere = findMany.mock.calls[0][0].where;
    expect(claimWhere.insuranceProviderId).toBeUndefined();
    expect(claimWhere.InsuranceProvider).toEqual({ type: 'nhis' });
  });

  it('takes an operator-chosen NHIS scheme at its word', async () => {
    const { service, prisma, findMany } = atDate('2026-11-02T09:00:00');
    prisma.claimBatch = { findFirst: vi.fn().mockResolvedValue(null) };
    prisma.insuranceProvider = { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) };

    await expect(service.generateBatch({
      insuranceType: 'nhis', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'nhis-b',
    } as any, 'user-1')).rejects.toThrow(/No finalized unbatched nhis claims found for 2026-10/);

    expect(findMany.mock.calls[0][0].where.insuranceProviderId).toBe('nhis-b');
  });

  it('falls back to a configured scheme when the month holds none', async () => {
    const { service, prisma, findMany } = atDate('2026-11-02T09:00:00');
    prisma.claimBatch = { findFirst: vi.fn().mockResolvedValue(null) };
    prisma.insuranceProvider = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 'nhis-c' }),
    };

    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1'))
      .rejects.toThrow(/No finalized unbatched nhis claims found for 2026-10/);

    expect(prisma.insuranceProvider.findFirst).toHaveBeenCalled();
    expect(findMany.mock.calls[0][0].where.insuranceProviderId).toBeUndefined();
  });

  it('still refuses an NHIS month when no scheme exists at all', async () => {
    const { service, prisma } = atDate('2026-11-02T09:00:00');
    prisma.insuranceProvider = { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) };

    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1'))
      .rejects.toThrow(/No NHIS provider is configured/);
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

// The payer does not adjudicate a month of NHIS claims as one submission: each G-DRG family —
// surgery, medical, obstetric, the OPD package — is filed and paid separately, and a claim with no
// package code has nothing to be paid under. Both rules live in the batching service, so the
// screen cannot show a month that Generate would refuse to file.
function nhisClaim(id: string, mdc: string | null, amount: string) {
  return {
    id,
    claimNumber: `NHIS-${id}`,
    totalClaimAmount: amount,
    insuranceProviderId: 'nhis-a',
    items: mdc
      ? [
        { itemNumber: 1, itemCategory: 'gdrg', gdrgTariff: { mdc } },
        { itemNumber: 2, itemCategory: 'medicine', lineTotal: '25.00' },
      ]
      : [{ itemNumber: 1, itemCategory: 'diagnosis', lineTotal: '0.00' }],
  };
}

/**
 * A month of `claims` ready to generate: the batch table records whatever the service asks it to
 * create, and the XML step is stubbed — the file it writes is a copy of the batch, not the rule
 * under test, and a test must not touch the disk.
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
    findFirst: vi.fn().mockResolvedValue({ id: 'nhis-a' }),
  };
  vi.spyOn(batch.service as any, 'buildNHISBatchXml').mockResolvedValue('<NHISICClaim/>');
  vi.spyOn(fs.promises, 'mkdir').mockImplementation(async () => undefined as any);
  vi.spyOn(fs.promises, 'writeFile').mockImplementation(async () => undefined);
  return { ...batch, created };
}

describe('an NHIS month is filed one G-DRG family at a time', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('splits the month into one batch per family, biggest first', async () => {
    const { service, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'MEDI', '50.00'),
      nhisClaim('claim-3', 'OPDC', '25.00'),
    ]);

    const result = await service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1');

    expect(result.batches).toHaveLength(2);
    expect(created.map((row) => row.claimFamily)).toEqual(['MEDI', 'OPDC']);
    expect(created[0].totalClaims).toBe(2);
    expect(Number(created[0].totalAmount)).toBe(150);
    expect(created[0].claims.connect.map((c: any) => c.id)).toEqual(['claim-1', 'claim-2']);
    expect(created[1].totalClaims).toBe(1);
    // Each family carries its own number, because each is a separate submission to the payer.
    expect(created[1].batchNumber).not.toBe(created[0].batchNumber);
    expect(created[1].description).toBe('OPDC claims');
  });

  it('holds back a claim with no package code and says how many', async () => {
    const { service, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', null, '10.00'),
    ]);

    const result = await service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1');

    expect(created).toHaveLength(1);
    expect(created[0].claims.connect).toEqual([{ id: 'claim-1' }]);
    expect(result.heldBackUncoded).toBe(1);
  });

  it('refuses a month where nothing carries a package code', async () => {
    const { service, created } = generatingFrom([nhisClaim('claim-1', null, '10.00')]);

    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1'))
      .rejects.toThrow(/None of the 1 NHIS claims for October 2026 carries a G-DRG code/);
    expect(created).toHaveLength(0);
  });

  it('checks the duplicate rule family by family, and writes nothing when one is taken', async () => {
    const { service, prisma, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'OPDC', '25.00'),
    ]);
    // October's MEDI batch exists; OPDC does not.
    prisma.claimBatch.findFirst.mockImplementation(({ where }: any) =>
      Promise.resolve(where.claimFamily === 'MEDI' ? { batchNumber: 'CB-00009' } : null));

    await expect(service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1'))
      .rejects.toThrow(/nhis \/ MEDI \/ 2026-10 \(CB-00009\)/);
    expect(created).toHaveLength(0);

    // The family is part of the duplicate lookup: an October MEDI batch must not be read as proof
    // that the OPDC claims of the same month were already filed.
    const families = prisma.claimBatch.findFirst.mock.calls.map((call: any[]) => call[0].where.claimFamily);
    expect(families).toEqual(['MEDI']);
  });

  it('looks up each family it is about to file before writing any of them', async () => {
    const { service, prisma, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'OPDC', '25.00'),
    ]);

    await service.generateBatch({ insuranceType: 'nhis', periodYear: 2026, periodMonth: 10 } as any, 'user-1');

    expect(prisma.claimBatch.findFirst.mock.calls.map((call: any[]) => call[0].where.claimFamily))
      .toEqual(['MEDI', 'OPDC']);
    expect(created).toHaveLength(2);
  });

  it('previews the same families Generate would build, plus what it leaves out', async () => {
    const { service } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', 'MEDI', '50.00'),
      nhisClaim('claim-3', 'OPDC', '25.00'),
      nhisClaim('claim-4', null, '10.00'),
    ]);

    const summary = await service.eligibleForPeriod(2026, 10);

    expect(summary.nhisFamilies).toEqual([
      { family: 'MEDI', count: 2, amount: 150 },
      { family: 'OPDC', count: 1, amount: 25 },
    ]);
    expect(summary.nhisUncoded).toBe(1);
  });
});

// Only NHIS is filed by code family. Every other payer wants one invoice per month covering
// whatever was done, so the split must not touch them — an uncoded claim there is still billable.
describe('a private or corporate month is filed whole', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps one batch under ALL, package-coded claims or not', async () => {
    const { service, created } = generatingFrom([
      nhisClaim('claim-1', 'MEDI', '100.00'),
      nhisClaim('claim-2', null, '10.00'),
    ]);

    const result = await service.generateBatch({
      insuranceType: 'private', periodYear: 2026, periodMonth: 10, insuranceProviderId: 'mac-fam',
    } as any, 'user-1');

    expect(result.batches).toHaveLength(1);
    expect(result.heldBackUncoded).toBe(0);
    expect(created).toHaveLength(1);
    expect(created[0].claimFamily).toBe('ALL');
    expect(created[0].insuranceProviderId).toBe('mac-fam');
    expect(created[0].claims.connect.map((c: any) => c.id)).toEqual(['claim-1', 'claim-2']);
    // No family suffix on a whole-month batch — the operator's note is kept as written.
    expect(created[0].description).toBeNull();
  });
});
