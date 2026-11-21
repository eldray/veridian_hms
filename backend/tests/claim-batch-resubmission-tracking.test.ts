import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('claim batch payment summary', () => {
  it('ignores external adjudication and resubmission events when calculating facility receipts', async () => {
    const service = new ClaimBatchService({} as any);
    (service as any).repo.findBatchesForTracking = vi.fn().mockResolvedValue({
      data: [{ id: 'batch-1', totalAmount: 100, finalizedAt: new Date('2026-10-01'), trackingEvents: [
        { eventType: 'submission', submissionDate: new Date('2026-10-01'), createdAt: new Date('2026-10-01') },
        { eventType: 'adjudication', status: 'queried', notes: 'External payer decision', createdAt: new Date('2026-10-05') },
        { eventType: 'resubmission', payerReference: 'RESUB-01', submissionDate: new Date('2026-10-07'), createdAt: new Date('2026-10-07') },
        { eventType: 'payment', amount: 40, paymentReference: 'PAY-01', createdAt: new Date('2026-10-10') },
      ] }], pagination: {}, summary: {},
    });
    const result = await service.listBatchTracking({});
    expect(result.data[0].tracking).toMatchObject({
      amountSubmitted: 100, totalPaid: 40, outstanding: 60, overpaid: 0, latestStatus: 'partially_paid',
    });
  });
});
