// backend/tests/claim-batch-period.test.ts
//
// Claim batching is monthly: a batch for September 2026 must take exactly the claims whose visit
// happened in September 2026, and the numbers shown before generating must describe that same set.
//
// Two things broke this before: the month preview and the batch query were written twice and
// disagreed about how a claim is bucketed by payer, and the screen totalled only the rows it had
// loaded. Both are pinned here.

import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimRepository } from '../src/modules/insuranceClaim/InsuranceClaimRepository';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

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
