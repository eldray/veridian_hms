import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('simple submitted-batch payment tracking', () => {
  const batch = { id: 'batch-1', batchNumber: 'BATCH-001', status: 'finalized', totalAmount: '100.00' };

  function setup(paymentRows: any[] = [], createImpl?: (args: any) => any) {
    const create = vi.fn(createImpl ?? (async ({ data }: any) => ({ id: 'payment-new', ...data })));
    const tx: any = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      claimBatchTrackingEvent: {
        findMany: vi.fn().mockResolvedValue(paymentRows),
        create,
      },
    };
    const prisma: any = {
      claimBatch: { findUnique: vi.fn().mockResolvedValue(batch) },
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    const service = new ClaimBatchService(prisma);
    return { service, prisma, tx, create };
  }

  it('allows a partial payment and locks the batch while checking the received total', async () => {
    const { service, tx, create } = setup([{ amount: '40.00' }]);
    const result = await service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 30, paymentDate: '2026-11-05', paymentReference: 'REMIT-001', paymentMethod: 'bank_transfer',
    }, 'accounts-user');

    expect(result).toMatchObject({ batchId: 'batch-1', eventType: 'payment', amount: 30, paymentDate: new Date('2026-11-05'), paymentReference: 'REMIT-001' });
    expect(tx.$queryRaw).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledOnce();
  });

  it('rejects payments above the submitted amount, regardless of legacy decision events', async () => {
    const { service, create } = setup([{ amount: '90.00' }]);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 10.01, paymentReference: 'REMIT-002',
    }, 'accounts-user')).rejects.toThrow(/exceeds the ₵100.00 submitted amount/);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an invalid payment date', async () => {
    const { service, create } = setup();
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 10, paymentDate: 'not-a-date', paymentReference: 'REMIT-BAD-DATE',
    }, 'accounts-user')).rejects.toThrow(/Payment date is invalid/);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate payment reference reported by the database', async () => {
    const { service } = setup([], async () => {
      const error: any = new Error('Unique constraint failed');
      error.code = 'P2002';
      throw error;
    });
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'payment', amount: 10, paymentReference: 'REMIT-DUP',
    }, 'accounts-user')).rejects.toThrow(/already been recorded/);
  });

  it('does not accept adjudication or corrected-resubmission tracking events', async () => {
    const { service } = setup();
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'approved',
    }, 'accounts-user')).rejects.toThrow(/Invalid tracking event type/);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'resubmission', payerReference: 'RESUB-1',
    }, 'accounts-user')).rejects.toThrow(/Invalid tracking event type/);
  });

  it('calculates outstanding from the submitted amount and recorded payments only', async () => {
    const service = new ClaimBatchService({} as any);
    (service as any).repo.findBatchesForTracking = vi.fn().mockResolvedValue({
      data: [{
        id: 'batch-1', totalAmount: '100.00', finalizedAt: null,
        trackingEvents: [
          { eventType: 'adjudication', status: 'partially_approved', amount: 50 },
          { eventType: 'payment', amount: 30, createdAt: new Date('2026-11-02') },
        ],
      }],
      pagination: {}, summary: {},
    });

    const result = await service.listBatchTracking({});
    expect(result.data[0].tracking).toMatchObject({
      amountSubmitted: 100, amountPayable: 100, totalPaid: 30, outstanding: 70, overpaid: 0,
      latestStatus: 'partially_paid',
    });
    expect(result.data[0].tracking).not.toHaveProperty('amountAdjudicated');
  });

  it('requires a payer reference when recording a submission', async () => {
    const { service, prisma } = setup();
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'submission',
    }, 'accounts-user')).rejects.toThrow(/submission reference/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
