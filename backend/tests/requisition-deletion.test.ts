import { describe, expect, it, vi } from 'vitest';
import { RequisitionRepository } from '../src/modules/requisition/RequisitionRepository';

describe('requisition deletion concurrency guard', () => {
  it('does not delete requisition items if the draft status claim fails', async () => {
    const deleteItems = vi.fn();
    const deleteRequisition = vi.fn();
    const tx = {
      requisition: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        delete: deleteRequisition,
      },
      requisitionItem: { deleteMany: deleteItems },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const repository = new RequisitionRepository(prisma as any);

    await expect(repository.delete('req-1')).rejects.toThrow(/only a draft requisition can be deleted/i);
    expect(tx.requisition.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'req-1', status: 'draft' },
    }));
    expect(deleteItems).not.toHaveBeenCalled();
    expect(deleteRequisition).not.toHaveBeenCalled();
  });

  it('deletes draft requisition items and the requisition in one transaction after claiming draft state', async () => {
    const deleteItems = vi.fn().mockResolvedValue({ count: 2 });
    const deleted = { id: 'req-1' };
    const deleteRequisition = vi.fn().mockResolvedValue(deleted);
    const tx = {
      requisition: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: deleteRequisition,
      },
      requisitionItem: { deleteMany: deleteItems },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const repository = new RequisitionRepository(prisma as any);

    await expect(repository.delete('req-1')).resolves.toEqual(deleted);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteItems).toHaveBeenCalledWith({ where: { requisitionId: 'req-1' } });
    expect(deleteRequisition).toHaveBeenCalledWith({ where: { id: 'req-1' } });
  });
});
