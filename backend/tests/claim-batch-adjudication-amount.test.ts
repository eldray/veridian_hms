import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('claim batch adjudication tracking', () => {
  function setup() {
    const batch = { id: 'batch-1', batchNumber: 'BATCH-001', status: 'finalized', totalAmount: 100 };
    const created: any[] = [];
    const prisma: any = {
      claimBatch: { findUnique: vi.fn().mockResolvedValue(batch) },
      claimBatchTrackingEvent: {
        create: vi.fn(async ({ data }: any) => { created.push(data); return { id: 'event-1', ...data }; }),
      },
    };
    return { service: new ClaimBatchService(prisma), prisma, created };
  }

  it('stores the adjudicated amount for a partial approval', async () => {
    const { service, prisma, created } = setup();
    await service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'partially_approved', amount: 65,
      notes: 'Payer approved part of the submitted amount',
    }, 'user-1');
    expect(prisma.claimBatchTrackingEvent.create).toHaveBeenCalled();
    expect(created[0]).toMatchObject({ eventType: 'adjudication', status: 'partially_approved', amount: 65, recordedById: 'user-1' });
  });

  it('rejects adjudication amounts above the submitted batch amount', async () => {
    const { service, prisma } = setup();
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'approved', amount: 101,
    }, 'user-1')).rejects.toThrow(/cannot exceed the submitted batch amount/i);
    expect(prisma.claimBatchTrackingEvent.create).not.toHaveBeenCalled();
  });

  it('rejects negative adjudication amounts', async () => {
    const { service, prisma } = setup();
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'rejected', amount: -1,
    }, 'user-1')).rejects.toThrow(/zero or more/i);
    expect(prisma.claimBatchTrackingEvent.create).not.toHaveBeenCalled();
  });
});
