import { describe, expect, it, vi } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';
import { StockTransactionRepository } from '../src/modules/stockTransaction/StockTransactionRepository';
import { ValidationError } from '../src/utils/errors';

describe('stock transaction validation', () => {
  const service = new StockTransactionService({} as any);

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
