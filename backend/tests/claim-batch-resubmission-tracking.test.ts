import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('claim batch resubmission tracking', () => {
  it('counts corrected resubmissions separately from the original submission', async () => {
    const service = new ClaimBatchService({} as any);
    (service as any).repo.findBatchesForTracking = vi.fn().mockResolvedValue({
      data: [{ id: 'batch-1', totalAmount: 100, finalizedAt: null, trackingEvents: [
        { eventType: 'submission', submissionDate: new Date('2026-10-01'), createdAt: new Date('2026-10-01') },
        { eventType: 'adjudication', status: 'queried', notes: 'Correct diagnosis code', createdAt: new Date('2026-10-05') },
        { eventType: 'resubmission', payerReference: 'RESUB-01', submissionDate: new Date('2026-10-07'), createdAt: new Date('2026-10-07') },
        { eventType: 'resubmission', payerReference: 'RESUB-02', submissionDate: new Date('2026-10-10'), createdAt: new Date('2026-10-10') },
      ] }], pagination: {}, summary: {},
    });
    const result = await service.listBatchTracking({});
    expect(result.data[0].tracking).toMatchObject({
      resubmissionCount: 2, latestResubmissionAt: new Date('2026-10-10'),
    });
  });
});