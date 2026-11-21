import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('adjudicated batch payment limits', () => {
  const batch = { id: 'batch-1', batchNumber: 'BATCH-001', status: 'finalized', totalAmount: 100 };
  function setup(paymentRows: any[], adjudicationRows: any[]) {
    const eventCreate = vi.fn(async ({ data }: any) => ({ id: 'payment-new', ...data }));
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      claimBatchTrackingEvent: {
        findMany: vi.fn().mockResolvedValueOnce(paymentRows).mockResolvedValueOnce(adjudicationRows),
        create: eventCreate,
      },
    };
    const prisma: any = {
      claimBatch: { findUnique: vi.fn().mockResolvedValue(batch) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    return { service: new ClaimBatchService(prisma), tx, eventCreate };
  }

  it('blocks remittances beyond the latest partial approval', async () => {
    const { service, eventCreate } = setup([{ amount: 40 }], [{ status: 'partially_approved', amount: 60 }]);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 25, paymentReference: 'REMIT-2',
    }, 'accounts-user')).rejects.toThrow(/exceeds the ₵60.00 approved limit/);
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('allows payment up to the adjudicated amount even when below the submission', async () => {
    const { service, eventCreate } = setup([{ amount: 20 }], [{ status: 'approved', amount: 50 }]);
    await service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 30, paymentReference: 'REMIT-2',
    }, 'accounts-user');
    expect(eventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 30 }) }));
  });

  it('blocks all payments after rejection even if a rejected event contains a mistaken positive amount', async () => {
    const { service, eventCreate } = setup([], [{ status: 'rejected', amount: 100 }]);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 1, paymentReference: 'REMIT-REJECTED',
    }, 'accounts-user')).rejects.toThrow(/exceeds the ₵0.00 approved limit/);
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('summarizes outstanding balance against the adjudicated amount and exposes overpayment', async () => {
    const { service } = setup([], []);
    (service as any).repo.findBatchesForTracking = vi.fn().mockResolvedValue({
      data: [{ id: 'batch-1', totalAmount: 100, finalizedAt: null, trackingEvents: [
        { eventType: 'adjudication', status: 'partially_approved', amount: 60, createdAt: new Date('2026-11-01') },
        { eventType: 'payment', amount: 70, createdAt: new Date('2026-11-02') },
      ] }], pagination: {}, summary: {},
    });
    const result = await service.listBatchTracking({});
    expect(result.data[0].tracking).toMatchObject({
      amountSubmitted: 100, amountAdjudicated: 60, amountPayable: 60, totalPaid: 70, outstanding: 0, overpaid: 10, latestStatus: 'overpaid',
    });
  });
});