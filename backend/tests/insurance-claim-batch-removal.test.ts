import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

describe('insurance claim batch removal integrity', () => {
  function setup(batchClaims: Array<{ id: string; totalClaimAmount: number }>) {
    const tx: any = {
      claimBatch: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'batch-1',
          status: 'generated',
          totalAmount: 200,
          claims: batchClaims,
        }),
        update: vi.fn().mockResolvedValue({ id: 'batch-1' }),
      },
      insuranceClaim: {
        updateMany: vi.fn().mockResolvedValue({ count: batchClaims.length }),
      },
    };
    const prisma: any = {
      $transaction: vi.fn(async (callback: any) => callback(tx)),
    };
    return { service: new InsuranceClaimService(prisma), tx };
  }

  it('rejects claims that are not members of the selected batch before changing totals', async () => {
    const { service, tx } = setup([{ id: 'claim-in-batch', totalClaimAmount: 100 }]);

    await expect(service.removeClaimsFromBatch('batch-1', ['claim-from-other-batch']))
      .rejects.toThrow(/not members of this batch/i);

    expect(tx.claimBatch.update).not.toHaveBeenCalled();
    expect(tx.insuranceClaim.updateMany).not.toHaveBeenCalled();
  });

  it('clears batch assignment only for verified batch members and recalculates total', async () => {
    const { service, tx } = setup([{ id: 'claim-1', totalClaimAmount: 75.25 }]);

    await service.removeClaimsFromBatch('batch-1', ['claim-1']);

    expect(tx.claimBatch.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'batch-1' },
      data: expect.objectContaining({
        totalAmount: 124.75,
        claims: { disconnect: [{ id: 'claim-1' }] },
      }),
    }));
    expect(tx.insuranceClaim.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['claim-1'], batchId: 'batch-1' } },
      data: { batchId: null },
    });
  });
});
