import { describe, expect, it, vi } from 'vitest';
import { ClaimBatchService } from '../src/modules/insuranceClaim/ClaimBatchService';

describe('claim batch finalization integrity', () => {
  function setup(claimOverrides: Record<string, unknown> = {}) {
    const batch = {
      id: 'batch-1',
      batchNumber: 'BATCH-001',
      status: 'generated',
      claims: [{
        id: 'claim-1',
        claimNumber: 'NHIS-001',
        status: 'finalized',
        batchId: 'batch-1',
        totalClaimAmount: { toString: () => '125.50' },
        items: [{ id: 'item-1' }],
        ...claimOverrides,
      }],
    };
    const tx: any = {
      claimBatch: {
        findUnique: vi.fn().mockResolvedValue(batch),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'batch-1', status: 'finalized', totalClaims: 1, totalAmount: '125.50' }),
      },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { service: new ClaimBatchService(prisma), tx };
  }

  it('recomputes batch totals from valid linked finalized claims', async () => {
    const { service, tx } = setup();
    await service.finalizeBatch('batch-1', 'user-1');

    expect(tx.claimBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1', status: 'generated' },
      data: expect.objectContaining({
        status: 'finalized',
        totalClaims: 1,
        finalizedById: 'user-1',
      }),
    }));
    const updateData = tx.claimBatch.updateMany.mock.calls[0][0].data;
    expect(updateData.totalAmount.toString()).toBe('125.5');
  });

  it('refuses to finalize a batch containing a claim without itemized lines', async () => {
    const { service, tx } = setup({ items: [] });
    await expect(service.finalizeBatch('batch-1', 'user-1'))
      .rejects.toThrow(/no itemized lines/i);
    expect(tx.claimBatch.updateMany).not.toHaveBeenCalled();
  });

  it('refuses to finalize when a linked claim is not finalized', async () => {
    const { service, tx } = setup({ status: 'draft' });
    await expect(service.finalizeBatch('batch-1', 'user-1'))
      .rejects.toThrow(/is not finalized/i);
    expect(tx.claimBatch.updateMany).not.toHaveBeenCalled();
  });
});
