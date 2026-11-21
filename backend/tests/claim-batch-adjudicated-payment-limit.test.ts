import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('facility batch payment receipts', () => {
  const batch = { id: 'batch-1', batchNumber: 'BATCH-001', status: 'finalized', totalAmount: 100 };
  function setup(paymentRows: any[]) {
    const eventCreate = vi.fn(async ({ data }: any) => ({ id: 'payment-new', ...data }));
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      claimBatchTrackingEvent: {
        findMany: vi.fn().mockResolvedValue(paymentRows),
        create: eventCreate,
      },
    };
    const prisma: any = {
      claimBatch: { findUnique: vi.fn().mockResolvedValue(batch) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    return { service: new ClaimBatchService(prisma), tx, eventCreate };
  }

  it('rejects a receipt total above the submitted batch amount, without adjudication data', async () => {
    const { service, eventCreate } = setup([{ amount: 40 }]);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 60.01, paymentReference: 'REMIT-2',
    }, 'accounts-user')).rejects.toThrow(/exceeds the ₵100.00 submitted amount/);
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('allows partial payments up to the submitted amount', async () => {
    const { service, eventCreate } = setup([{ amount: 20 }]);
    await service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 30, paymentReference: 'REMIT-2',
    }, 'accounts-user');
    expect(eventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ amount: 30 }) }));
  });

  it('does not accept payer adjudication or claim resubmission events in this facility workflow', async () => {
    const { service, eventCreate } = setup([]);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'rejected',
    }, 'accounts-user')).rejects.toThrow(/outside this facility workflow/);
    expect(eventCreate).not.toHaveBeenCalled();
  });

  it('calculates the outstanding balance from submitted amount less receipts only', async () => {
    const { service } = setup([]);
    (service as any).repo.findBatchesForTracking = vi.fn().mockResolvedValue({
      data: [{ id: 'batch-1', totalAmount: 100, finalizedAt: null, trackingEvents: [
        { eventType: 'adjudication', status: 'partially_approved', amount: 60, createdAt: new Date('2026-11-01') },
        { eventType: 'payment', amount: 70, createdAt: new Date('2026-11-02') },
      ] }], pagination: {}, summary: {},
    });
    const result = await service.listBatchTracking({});
    expect(result.data[0].tracking).toMatchObject({
      amountSubmitted: 100, totalPaid: 70, outstanding: 30, overpaid: 0, latestStatus: 'partially_paid',
    });
  });
});
