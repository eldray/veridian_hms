import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('facility claim batch payment scope', () => {
  it('rejects payer adjudication events because adjudication is external to this system', async () => {
    const create = vi.fn();
    const prisma: any = {
      claimBatch: { findUnique: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'finalized', totalAmount: 100 }) },
      claimBatchTrackingEvent: { create },
    };
    const service = new ClaimBatchService(prisma);
    await expect(service.recordBatchTrackingEvent('batch-1', {
      eventType: 'adjudication', status: 'partially_approved', amount: 65,
    }, 'user-1')).rejects.toThrow(/outside this facility workflow/i);
    expect(create).not.toHaveBeenCalled();
  });
});
