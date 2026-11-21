import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimRepository } from '../src/modules/insuranceClaim/InsuranceClaimRepository';

describe('claim batch tracking aggregate balances', () => {
  function setup(payableRows: any[], paid: number) {
    const prisma: any = {
      claimBatch: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(payableRows),
        count: vi.fn().mockResolvedValue(payableRows.length),
        aggregate: vi.fn().mockResolvedValue({ _count: { _all: payableRows.length }, _sum: { totalAmount: 100, totalClaims: 5 } }),
      },
      claimBatchTrackingEvent: { aggregate: vi.fn().mockResolvedValue({ _sum: { amount: paid } }) },
    };
    return new InsuranceClaimRepository(prisma);
  }

  it('calculates filtered payable across partial, status-only and rejected batches', async () => {
    const repo = setup([
      { totalAmount: 100, trackingEvents: [{ status: 'partially_approved', amount: 60 }] },
      { totalAmount: 100, trackingEvents: [{ status: 'under_review', amount: null }] },
      { totalAmount: 100, trackingEvents: [{ status: 'rejected', amount: 90 }] },
    ], 70);
    const result = await repo.findBatchesForTracking({ page: 1, limit: 1 });
    expect(result.summary).toMatchObject({ payable: 160, paid: 70, outstanding: 90, overpaid: 0 });
  });

  it('reports aggregate overpayment if remittances exceed approved payable', async () => {
    const repo = setup([{ totalAmount: 100, trackingEvents: [{ status: 'approved', amount: 40 }] }], 200);
    const result = await repo.findBatchesForTracking({});
    expect(result.summary).toMatchObject({ payable: 40, paid: 200, outstanding: 0, overpaid: 160 });
  });
});