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


describe('requisition fulfilment input integrity', () => {
  const buildRepository = (requisition: any) => {
    const tx = {
      requisition: {
        findUnique: vi.fn().mockResolvedValue(requisition),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    return { repository: new RequisitionRepository(prisma as any), tx };
  };

  it('rejects a malformed negative approved quantity instead of silently skipping that line', async () => {
    const { repository, tx } = buildRepository({
      id: 'req-2',
      status: 'approved',
      requestingDepartmentId: 'ward-stock',
      requestingWardId: null,
      supplyingDepartmentId: 'pharmacy',
      requisitionNumber: 'REQ-2',
      RequisitionItem: [{
        id: 'line-1',
        stockItemId: 'item-1',
        quantityRequested: 5,
        quantityApproved: -2,
        StockItem: { name: 'Paracetamol' },
      }],
    });

    await expect(repository.fulfillRequisitionWithStockUpdate('req-2', 'user-1', {} as any))
      .rejects.toThrow(/whole number between zero/i);
    expect(tx.requisition.updateMany).not.toHaveBeenCalled();
  });

  it('rejects requisitions that specify both a receiving department and a ward', async () => {
    const { repository, tx } = buildRepository({
      id: 'req-3',
      status: 'approved',
      requestingDepartmentId: 'nursing',
      requestingWardId: 'ward-1',
      supplyingDepartmentId: 'pharmacy',
      requisitionNumber: 'REQ-3',
      RequisitionItem: [{
        id: 'line-2',
        stockItemId: 'item-2',
        quantityRequested: 2,
        quantityApproved: 2,
        StockItem: { name: 'Gauze' },
      }],
    });

    await expect(repository.fulfillRequisitionWithStockUpdate('req-3', 'user-1', {} as any))
      .rejects.toThrow(/exactly one receiving department or ward/i);
    expect(tx.requisition.updateMany).not.toHaveBeenCalled();
  });
});
