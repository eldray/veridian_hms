import { describe, expect, it, vi } from 'vitest';
import { InsuranceClaimService } from '../src/modules/insuranceClaim/InsuranceClaimService';

describe('insurance claim draft CRUD guards', () => {
  it('allows updating a draft header', async () => {
    const claim = { id: 'claim-1', status: 'draft' };
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(claim),
        update: vi.fn().mockResolvedValue({ ...claim, notes: 'Updated' }),
      },
    };
    const service = new InsuranceClaimService(prisma);
    await service.updateClaimDraft('claim-1', { notes: 'Updated' }, 'user-1');
    expect(prisma.insuranceClaim.update).toHaveBeenCalled();
  });

  it('does not allow editing a finalized claim header', async () => {
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue({ id: 'claim-1', status: 'finalized' }),
        update: vi.fn(),
      },
    };
    const service = new InsuranceClaimService(prisma);
    await expect(service.updateClaimDraft('claim-1', { notes: 'Changed' }, 'user-1'))
      .rejects.toThrow(/only draft claims can be edited/i);
    expect(prisma.insuranceClaim.update).not.toHaveBeenCalled();
  });

  it('deletes an untouched draft claim', async () => {
    const claim = {
      id: 'claim-1', claimNumber: 'PRI-1001', status: 'draft', batchId: null,
      trackingEvents: [], claimitSubmissions: [],
    };
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue(claim),
        delete: vi.fn().mockResolvedValue(claim),
      },
    };
    const service = new InsuranceClaimService(prisma);
    await expect(service.deleteDraftClaim('claim-1')).resolves.toEqual(claim);
    expect(prisma.insuranceClaim.delete).toHaveBeenCalledWith({ where: { id: 'claim-1' } });
  });

  it.each([
    [{ status: 'finalized', batchId: null, trackingEvents: [], claimitSubmissions: [] }, /only draft claims/i],
    [{ status: 'draft', batchId: 'batch-1', trackingEvents: [], claimitSubmissions: [] }, /belongs to a claim batch/i],
    [{ status: 'draft', batchId: null, trackingEvents: [{ id: 'event-1' }], claimitSubmissions: [] }, /tracking history/i],
    [{ status: 'draft', batchId: null, trackingEvents: [], claimitSubmissions: [{ id: 'submission-1' }] }, /tracking history/i],
  ])('protects claim history from deletion', async (details, expected) => {
    const prisma: any = {
      insuranceClaim: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'claim-1', claimNumber: 'PRI-1001', ...details,
        }),
        delete: vi.fn(),
      },
    };
    const service = new InsuranceClaimService(prisma);
    await expect(service.deleteDraftClaim('claim-1')).rejects.toThrow(expected);
    expect(prisma.insuranceClaim.delete).not.toHaveBeenCalled();
  });
});
