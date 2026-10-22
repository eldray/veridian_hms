import { describe, expect, it, vi } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';
import { StockTransactionRepository } from '../src/modules/stockTransaction/StockTransactionRepository';
import { StockItemService } from '../src/modules/stockItem/StockItemService';
import { StockItemRepository } from '../src/modules/stockItem/StockItemRepository';
import { ValidationError } from '../src/utils/errors';

describe('stock transaction validation', () => {
  const service = new StockTransactionService({} as any);

  it('rejects expired batches instead of adding them as available stock', async () => {
    const transaction = vi.fn();
    const stockService = new StockItemService({ $transaction: transaction } as any);
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const receivedDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

    await expect(stockService.addStockBatch(
      'item-1', 'EXPIRED-1', expiredDate, 5, 2, receivedDate, 'pharmacy',
    )).rejects.toThrow(/expired batches cannot be added/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects invalid quantities at the repository boundary before opening a transaction', async () => {
    const transaction = vi.fn();
    const repository = new StockTransactionRepository({ $transaction: transaction } as any);

    await expect(repository.createSafely({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: Number.NaN,
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);
    await expect(repository.createSafely({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 0,
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires a department assignment for non-admin stock movements', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'pharmacist',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('requires a reason for expiry or damage write-offs', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'write_off',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
      notes: '   ',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects fractional stock quantities', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1.5,
      role: 'admin',
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects selecting a department and ward at the same time', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
      wardId: 'ward-7',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('requires internal transfers to use the dedicated transfer workflow', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'transfer_out',
      quantity: 1,
      role: 'admin',
      departmentId: 'pharmacy',
    })).rejects.toBeInstanceOf(ValidationError);
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'transfer_in',
      quantity: 1,
      role: 'admin',
      departmentId: 'ward',
    })).rejects.toBeInstanceOf(ValidationError);
  });


  it('rejects generic reversal of an adjustment when direction is ambiguous', async () => {
    const tx = {
      stockTransaction: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'tx-adjustment', stockItemId: 'item-1', transactionType: 'adjustment',
          quantity: 4, departmentId: 'pharmacy', wardId: null,
        }),
        delete: vi.fn(),
      },
      stockBatch: { count: vi.fn() },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const repository = new StockTransactionRepository(prisma as any);

    await expect(repository.deleteSafely('tx-adjustment')).rejects.toBeInstanceOf(ValidationError);
    expect(tx.stockBatch.count).not.toHaveBeenCalled();
    expect(tx.stockTransaction.delete).not.toHaveBeenCalled();
  });

  it('only allows administrators to select a ward directly', async () => {
    await expect(service.create({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 1,
      role: 'pharmacist',
      wardId: 'ward-7',
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it('persists exact batch allocations for batch-tracked stock issues', async () => {
    const createTransaction = vi.fn().mockResolvedValue({ id: 'tx-sale' });
    const tx = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'batch-1',
          batchNumber: 'B-001',
          quantity: 5,
          expiryDate: new Date('2027-06-01T00:00:00Z'),
          costPrice: '2.50',
        }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 4 }),
      },
      stockItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ currentStock: 7 }),
      },
      stockTransaction: { create: createTransaction },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const repository = new StockTransactionRepository(prisma as any);

    await repository.createSafely({
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: 3,
      departmentId: 'pharmacy',
      performedBy: 'user-1',
    });

    expect(tx.stockBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'batch-1',
        isActive: true,
        expiryDate: { gte: expect.any(Date) },
      }),
    }));
    expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        batchAllocations: [{
          batchId: 'batch-1',
          batchNumber: 'B-001',
          quantity: 3,
          expiryDate: new Date('2027-06-01T00:00:00Z'),
          costPrice: '2.50',
        }],
      }),
    }));
  });
});


describe('stock transaction valuation discrepancy consistency', () => {
  it('flags zero-quantity tracked batches and unbatched gaps without flagging legacy untracked stock', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getValuationData: vi.fn().mockResolvedValue([
        {
          id: 'tracked-zero', name: 'Bandages', currentStock: 5, costPrice: 2,
          _count: { StockBatch: 2 }, StockBatch: [], inTransitBatchAllocations: [],
        },
        {
          id: 'tracked-gap', name: 'Gloves', currentStock: 10, costPrice: 5,
          _count: { StockBatch: 1 }, StockBatch: [{ quantity: 4, costPrice: 2.5 }],
          inTransitBatchAllocations: [{ quantity: 3, costPrice: 4 }],
        },
        {
          id: 'legacy-untracked', name: 'Cotton', currentStock: 8, costPrice: 2,
          _count: { StockBatch: 0 }, StockBatch: [], inTransitBatchAllocations: [],
        },
      ]),
    };

    const report = await service.getStockValuation(undefined, { includeAllStockLocations: true });

    expect(report.batchQuantityDiscrepancies).toBe(2);
    expect(report.items.map((item: any) => item.stockDiscrepancy)).toEqual([5, 3, 0]);
    expect(report.items[0].unbatchedQuantity).toBe(5);
    expect(report.items[1].totalValue).toBe(37);
  });
});


describe('batch-specific write-off safety', () => {
  const buildPrisma = (batch: any) => {
    const create = vi.fn().mockResolvedValue({ id: 'tx-writeoff' });
    const updateBatch = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(2),
        findFirst: vi.fn().mockResolvedValue(batch),
        updateMany: updateBatch,
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 3 }),
      },
      stockItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 8 }),
      },
      stockTransaction: { create },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    return { prisma, tx, create, updateBatch };
  };

  it('writes off only the named expired or inactive batch and records its allocation', async () => {
    const batch = {
      id: 'batch-expired', batchNumber: 'EXP-2025-04', quantity: 4,
      expiryDate: new Date('2025-04-01T00:00:00Z'), costPrice: '2.25', isActive: false,
    };
    const { prisma, tx, create, updateBatch } = buildPrisma(batch);
    const repository = new StockTransactionRepository(prisma as any);

    await repository.createSafely({
      stockItemId: 'item-1', transactionType: 'write_off', quantity: 2,
      departmentId: 'pharmacy', batchNumber: 'EXP-2025-04',
      notes: 'Expired stock', performedBy: 'user-1',
    });

    expect(tx.stockBatch.findFirst).toHaveBeenCalledWith({
      where: {
        stockItemId: 'item-1', batchNumber: 'EXP-2025-04',
        departmentId: 'pharmacy', wardId: null, quantity: { gt: 0 },
      },
    });
    expect(updateBatch).toHaveBeenCalledWith({
      where: {
        id: 'batch-expired', departmentId: 'pharmacy', wardId: null, quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactionType: 'write_off',
        batchAllocations: [{
          batchId: 'batch-expired', batchNumber: 'EXP-2025-04', quantity: 2,
          expiryDate: batch.expiryDate, costPrice: '2.25',
        }],
      }),
    }));
  });

  it('rejects batch-tracked write-offs without a batch number before changing stock', async () => {
    const { prisma, tx } = buildPrisma({
      id: 'batch-1', batchNumber: 'B-001', quantity: 4,
      expiryDate: new Date('2027-04-01T00:00:00Z'), costPrice: '2.25',
    });
    const repository = new StockTransactionRepository(prisma as any);

    await expect(repository.createSafely({
      stockItemId: 'item-1', transactionType: 'write_off', quantity: 2,
      departmentId: 'pharmacy', notes: 'Damaged stock',
    })).rejects.toBeInstanceOf(ValidationError);

    expect(tx.stockBatch.findFirst).not.toHaveBeenCalled();
    expect(tx.stockBatch.updateMany).not.toHaveBeenCalled();
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
  });
});


describe('legacy stock-level write-off batch safety', () => {
  const makeRepository = (batch: any) => {
    const batchUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const transactionCreate = vi.fn().mockResolvedValue({ id: 'write-off-1' });
    const tx: any = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(batch),
        findMany: vi.fn().mockResolvedValue([{ ...batch, quantity: 20 }]),
        updateMany: batchUpdate,
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 3 }),
      },
      stockItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 8 }),
      },
      stockTransaction: { create: transactionCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { repository: new StockItemRepository(prisma), tx, batchUpdate, transactionCreate };
  };

  it('requires an explicit batch number instead of silently writing off the FEFO batch', async () => {
    const { repository, tx, batchUpdate } = makeRepository({
      id: 'batch-1', batchNumber: 'GOOD-LOT', quantity: 20,
      expiryDate: new Date('2027-06-01T00:00:00Z'), costPrice: '2.50',
    });

    await expect(repository.updateStockLevelSafely('item-1', 2, 'write_off', undefined, 'Damaged', 'user-1', 'pharmacy'))
      .rejects.toThrow(/batch number being written off/i);

    expect(tx.stockBatch.findMany).not.toHaveBeenCalled();
    expect(batchUpdate).not.toHaveBeenCalled();
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
  });

  it('decrements only the explicitly selected expired or inactive batch', async () => {
    const expiredBatch = {
      id: 'batch-expired', batchNumber: 'EXP-LOT', quantity: 4,
      expiryDate: new Date('2025-04-01T00:00:00Z'), costPrice: '2.25', isActive: false,
    };
    const { repository, tx, batchUpdate, transactionCreate } = makeRepository(expiredBatch);

    await repository.updateStockLevelSafely('item-1', 2, 'write_off', undefined, 'Expired stock', 'user-1', 'pharmacy', 'EXP-LOT');

    expect(tx.stockBatch.findFirst).toHaveBeenCalledWith({
      where: {
        stockItemId: 'item-1', batchNumber: 'EXP-LOT',
        departmentId: 'pharmacy', wardId: null, quantity: { gt: 0 },
      },
    });
    expect(tx.stockBatch.findMany).not.toHaveBeenCalled();
    expect(batchUpdate).toHaveBeenCalledWith({
      where: { id: 'batch-expired', departmentId: 'pharmacy', wardId: null, quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
    expect(transactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'write_off',
        batchAllocations: [{
          batchId: 'batch-expired', batchNumber: 'EXP-LOT', quantity: 2,
          expiryDate: expiredBatch.expiryDate, costPrice: '2.25',
        }],
      }),
    });
  });
});
