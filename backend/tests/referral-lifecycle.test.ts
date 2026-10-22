import { describe, expect, it, vi } from 'vitest';
import { ReferralRepository } from '../src/modules/referral/ReferralRepository';

describe('referral status transitions', () => {
  it('allows a pending referral to be accepted', async () => {
    const result = { id: 'referral-1', status: 'accepted' };
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ id: 'referral-1', status: 'pending' })
      .mockResolvedValueOnce(result);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = new ReferralRepository({
      referralRecord: { findUnique, updateMany },
    } as any);

    await expect(repository.updateStatus('referral-1', 'accepted')).resolves.toEqual(result);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'referral-1', status: 'pending' },
      data: { status: 'accepted' },
    });
  });

  it('does not allow a completed referral to be reopened', async () => {
    const updateMany = vi.fn();
    const repository = new ReferralRepository({
      referralRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'referral-1', status: 'completed' }),
        updateMany,
      },
    } as any);

    await expect(repository.updateStatus('referral-1', 'pending' as any))
      .rejects.toThrow(/cannot transition from completed to pending/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('does not allow a cancelled referral to be accepted', async () => {
    const updateMany = vi.fn();
    const repository = new ReferralRepository({
      referralRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'referral-1', status: 'cancelled' }),
        updateMany,
      },
    } as any);

    await expect(repository.updateStatus('referral-1', 'accepted'))
      .rejects.toThrow(/cannot transition from cancelled to accepted/i);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('detects a concurrent status change instead of overwriting it', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new ReferralRepository({
      referralRecord: {
        findUnique: vi.fn().mockResolvedValue({ id: 'referral-1', status: 'pending' }),
        updateMany,
      },
    } as any);

    await expect(repository.updateStatus('referral-1', 'accepted'))
      .rejects.toThrow(/status changed; refresh and try again/i);
  });

  it('reports a missing referral clearly', async () => {
    const updateMany = vi.fn();
    const repository = new ReferralRepository({
      referralRecord: {
        findUnique: vi.fn().mockResolvedValue(null),
        updateMany,
      },
    } as any);

    await expect(repository.updateStatus('missing-referral', 'accepted'))
      .rejects.toThrow(/referral with id missing-referral not found/i);
    expect(updateMany).not.toHaveBeenCalled();
  });
});
