import { describe, expect, it, vi } from 'vitest';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance, StockItemRepository } from '../src/modules/stockItem/StockItemRepository';
import { ValidationError } from '../src/utils/errors';
import { PurchaseInvoiceRepository } from '../src/modules/purchaseInvoice/PurchaseInvoiceRepository';
import { StockTransactionRepository } from '../src/modules/stockTransaction/StockTransactionRepository';

describe('purchase receipt location snapshots', () => {
  it('records the receiving location balance rather than the hospital aggregate', async () => {
    const stockTransactionCreate = vi.fn().mockResolvedValue({ id: 'movement-1' });
    const balanceUpsert = vi.fn().mockResolvedValue({ quantity: 7 });
    const tx: any = {
      invoice: {
        create: vi.fn().mockResolvedValue({ id: 'invoice-1', createdAt: new Date('2026-10-20T00:00:00Z') }),
        findUnique: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
      },
      stockItem: {
        findUnique: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Gloves', currentStock: 100 }),
        update: vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 107 }),
      },
      stockBatch: { count: vi.fn().mockResolvedValue(0) },
      invoiceItem: { create: vi.fn().mockResolvedValue({ id: 'invoice-item-1' }) },
      stockItemDepartmentBalance: { upsert: balanceUpsert },
      stockTransaction: { create: stockTransactionCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new PurchaseInvoiceRepository(prisma);

    await repository.create({
      invoiceNumber: 'INV-TEST-1',
      supplierName: 'Test supplier',
      invoiceDate: '2026-10-20',
      totalAmount: 70,
      invoiceItems: [{ stockItemId: 'item-1', quantity: 7, unitCost: 10 }],
      receivedAtDepartmentId: 'pharmacy',
    } as any, 'user-1');

    expect(balanceUpsert).toHaveBeenCalled();
    expect(stockTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stockItemId: 'item-1',
        transactionType: 'purchase',
        quantity: 7,
        departmentId: 'pharmacy',
        balanceAfter: 7,
      }),
    });
  });
});

describe('purchase receipt batch integrity', () => {
  const makeRepository = (existingBatch: any) => {
    const batchUpdate = vi.fn().mockResolvedValue(existingBatch);
    const tx: any = {
      invoice: {
        create: vi.fn().mockResolvedValue({ id: 'invoice-1', createdAt: new Date('2026-10-20T00:00:00Z') }),
        findUnique: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
      },
      stockItem: {
        findUnique: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Gloves', currentStock: 100 }),
        update: vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 107 }),
      },
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(existingBatch),
        updateMany: batchUpdate,
      },
      invoiceItem: { create: vi.fn().mockResolvedValue({ id: 'invoice-item-1' }) },
      stockItemDepartmentBalance: {
        upsert: vi.fn().mockResolvedValue({ quantity: 7 }),
      },
      stockTransaction: { create: vi.fn().mockResolvedValue({ id: 'movement-1' }) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { repository: new PurchaseInvoiceRepository(prisma), batchUpdate, tx };
  };

  const receipt = {
    invoiceNumber: 'INV-BATCH-TEST',
    supplierName: 'Test supplier',
    invoiceDate: '2026-10-20',
    totalAmount: 70,
    invoiceItems: [{
      stockItemId: 'item-1',
      quantity: 7,
      unitCost: 10,
      batchNumber: 'B-1',
      expiryDate: '2027-10-20',
    }],
    receivedAtDepartmentId: 'pharmacy',
  } as any;

  it('rejects zero, negative, or fractional purchase quantities before opening a stock transaction', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 10,
      isActive: true,
    };
    const { repository, batchUpdate } = makeRepository(existingBatch);

    await expect(repository.create({
      ...receipt,
      invoiceItems: [{ ...receipt.invoiceItems[0], quantity: 0 }],
    }, 'user-1')).rejects.toThrow(/positive whole numbers/i);
    await expect(repository.create({
      ...receipt,
      invoiceItems: [{ ...receipt.invoiceItems[0], quantity: -2 }],
    }, 'user-1')).rejects.toThrow(/positive whole numbers/i);
    await expect(repository.create({
      ...receipt,
      invoiceItems: [{ ...receipt.invoiceItems[0], quantity: 1.5 }],
    }, 'user-1')).rejects.toThrow(/positive whole numbers/i);
    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it('rejects negative or non-finite purchase item costs', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 10,
      isActive: true,
    };
    const { repository, batchUpdate } = makeRepository(existingBatch);

    await expect(repository.create({
      ...receipt,
      invoiceItems: [{ ...receipt.invoiceItems[0], unitCost: -1 }],
    }, 'user-1')).rejects.toThrow(/finite, non-negative amount/i);
    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it('rejects an existing batch with a different cost without changing its quantity or metadata', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 9,
      isActive: true,
    };
    const { repository, batchUpdate } = makeRepository(existingBatch);

    await expect(repository.create(receipt, 'user-1'))
      .rejects.toThrow(/different cost price/i);
    expect(batchUpdate).not.toHaveBeenCalled();
  });

  it('increases quantity only when the existing batch metadata matches and is active', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 10,
      isActive: true,
    };
    const { repository, batchUpdate } = makeRepository(existingBatch);

    await repository.create(receipt, 'user-1');

    expect(batchUpdate).toHaveBeenCalledWith({
      where: {
        id: 'batch-1',
        isActive: true,
        expiryDate: { gt: expect.any(Date), equals: new Date('2027-10-20T00:00:00.000Z') },
        costPrice: 10,
      },
      data: { quantity: { increment: 7 } },
    });
  });

  it('rejects an inactive matching batch instead of reactivating it', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 10,
      isActive: false,
    };
    const { repository, batchUpdate } = makeRepository(existingBatch);

    await expect(repository.create(receipt, 'user-1'))
      .rejects.toThrow(/inactive/i);
    expect(batchUpdate).not.toHaveBeenCalled();
  });
});

describe('safe purchase invoice deletion', () => {
  it('rejects deletion when batch metadata no longer matches and treats adjustments as outgoing activity', async () => {
    const createdAt = new Date('2026-10-01T00:00:00Z');
    const expiryDate = new Date('2027-10-20T00:00:00Z');
    const invoice = {
      id: 'invoice-1',
      createdAt,
      receivedAtDepartmentId: 'pharmacy',
      receivedAtWardId: null,
      InvoiceItem: [{
        stockItemId: 'item-1',
        quantity: 7,
        batchNumber: 'B-1',
        expiryDate,
        unitCost: 10,
      }],
    };
    const stockTransactionCount = vi.fn().mockResolvedValue(0);
    const stockBatchFindFirst = vi.fn().mockResolvedValue({
      id: 'batch-1',
      quantity: 12,
      expiryDate: new Date('2028-01-01T00:00:00Z'),
      costPrice: 10,
      isActive: true,
    });
    const tx: any = {
      invoice: { findUnique: vi.fn().mockResolvedValue(invoice) },
      stockTransaction: { count: stockTransactionCount },
      stockBatch: { findFirst: stockBatchFindFirst },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new PurchaseInvoiceRepository(prisma);

    await expect(repository.deleteSafely('invoice-1'))
      .rejects.toThrow(/expiry metadata no longer matches/i);

    expect(stockTransactionCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        transactionType: { in: ['sale', 'requisition', 'transfer_out', 'write_off', 'adjustment'] },
      }),
    });
  });
});

describe('department stock balance ledger', () => {
  it('creates a department balance using the department id as the stable location key', async () => {
    const upsert = vi.fn().mockResolvedValue({ quantity: 12 });
    const tx = { stockItemDepartmentBalance: { upsert } };

    await increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 12);

    expect(upsert).toHaveBeenCalledWith({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'pharmacy' } },
      create: {
        stockItemId: 'item-1',
        departmentId: 'pharmacy',
        wardId: null,
        locationKey: 'pharmacy',
        quantity: 12,
      },
      update: { quantity: { increment: 12 } },
    });
  });

  it('uses a stable WARD location key for ward stock', async () => {
    const upsert = vi.fn().mockResolvedValue({ quantity: 3 });
    const tx = { stockItemDepartmentBalance: { upsert } };

    await increaseDepartmentStockBalance(tx, 'item-1', null, 3, 'ward-7');

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'WARD:ward-7' } },
      create: expect.objectContaining({ departmentId: null, wardId: 'ward-7', locationKey: 'WARD:ward-7', quantity: 3 }),
    }));
  });

  it('rejects ambiguous department and ward locations', async () => {
    const tx = { stockItemDepartmentBalance: { upsert: vi.fn() } };

    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 1, 'ward-7'))
      .rejects.toBeInstanceOf(ValidationError);
    expect(tx.stockItemDepartmentBalance.upsert).not.toHaveBeenCalled();
  });

  it('rejects non-positive and fractional quantities', async () => {
    const tx = { stockItemDepartmentBalance: { upsert: vi.fn() } };

    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 0)).rejects.toBeInstanceOf(ValidationError);
    await expect(increaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 1.5)).rejects.toBeInstanceOf(ValidationError);
    expect(tx.stockItemDepartmentBalance.upsert).not.toHaveBeenCalled();
  });

  it('decrements only when the selected location has enough stock', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUnique = vi.fn().mockResolvedValue({ quantity: 4 });
    const tx = { stockItemDepartmentBalance: { updateMany, findUnique } };

    await decreaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 2);

    expect(updateMany).toHaveBeenCalledWith({
      where: { stockItemId: 'item-1', locationKey: 'pharmacy', quantity: { gte: 2 } },
      data: { quantity: { decrement: 2 } },
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { stockItemId_locationKey: { stockItemId: 'item-1', locationKey: 'pharmacy' } },
    });
  });

  it('rejects a decrement that would make a location balance negative', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue({ quantity: 1 });
    const tx = { stockItemDepartmentBalance: { updateMany, findUnique } };

    await expect(decreaseDepartmentStockBalance(tx, 'item-1', 'pharmacy', 2))
      .rejects.toBeInstanceOf(ValidationError);
  });
});


describe('batch write-off reconciliation', () => {
  it('allows inactive expired batches to be written off without reactivating them', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const updateBatch = vi.fn().mockResolvedValue({ count: 1 });
    const createTransaction = vi.fn().mockResolvedValue({ id: 'write-off-1' });
    const tx: any = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'expired-batch',
          batchNumber: 'EXPIRED-LOT',
          quantity: 3,
          expiryDate: expiredDate,
          costPrice: '4.25',
          isActive: false,
        }]),
        updateMany: updateBatch,
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 2 }),
      },
      stockItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ currentStock: 2 }),
      },
      stockTransaction: { create: createTransaction },
    };
    const prisma: any = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    const repository = new StockItemRepository(prisma);

    await repository.updateStockLevelSafely(
      'item-1', 1, 'write_off', 'EXPIRY-WO', 'Expired batch disposal', 'user-1', 'pharmacy',
    );

    expect(updateBatch).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'expired-batch',
        departmentId: 'pharmacy',
        quantity: { gte: 1 },
      }),
      data: { quantity: { decrement: 1 } },
    });
    expect(updateBatch.mock.calls[0][0].where).not.toHaveProperty('isActive');
    expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactionType: 'write_off',
        batchAllocations: [expect.objectContaining({ batchId: 'expired-batch', quantity: 1 })],
      }),
    }));
  });
});



describe('clinical stock movement audit protection', () => {
  it('prevents editing clinical markers that generic deletion relies on', async () => {
    const update = vi.fn();
    const findUnique = vi.fn().mockResolvedValue({
      notes: 'Consumable use: gloves',
      reference: 'Encounter ENC-1',
    });
    const prisma: any = {
      stockTransaction: { findUnique, update },
    };
    const repository = new StockTransactionRepository(prisma);

    await expect(repository.updateNotes('movement-1', 'routine issue', 'MANUAL-1'))
      .rejects.toThrow(/clinical stock movement notes and references cannot be edited/i);

    expect(update).not.toHaveBeenCalled();
  });

  it('continues to allow ordinary stock transaction notes to be updated', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'movement-2' });
    const findUnique = vi.fn().mockResolvedValue({
      notes: 'Routine stock issue',
      reference: 'REQ-001',
    });
    const prisma: any = {
      stockTransaction: { findUnique, update },
    };
    const repository = new StockTransactionRepository(prisma);

    await repository.updateNotes('movement-2', 'Count verified', 'REQ-001');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'movement-2' },
      data: { notes: 'Count verified', reference: 'REQ-001' },
    }));
  });
});



describe('batch receipt expiry race protection', () => {
  it('does not increment an existing batch if it is no longer eligible at the atomic write', async () => {
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const balanceUpsert = vi.fn();
    const stockItemUpdate = vi.fn();
    const tx: any = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue({
          id: 'batch-1',
          expiryDate,
          costPrice: 2,
          isActive: true,
        }),
        updateMany,
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      stockItem: {
        findUnique: vi.fn(),
        update: stockItemUpdate,
      },
      stockItemDepartmentBalance: { upsert: balanceUpsert },
      stockTransaction: { create: vi.fn() },
    };
    const repository = new StockItemRepository({} as any);

    await expect(repository.addBatchWithinTransaction(
      tx, 'item-1', 'LOT-1', expiryDate, 3, 2, undefined, 'pharmacy',
    )).rejects.toThrow(/changed or expired during receipt/i);

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'batch-1',
        isActive: true,
        expiryDate: { gt: expect.any(Date) },
      },
      data: { quantity: { increment: 3 } },
    });
    expect(balanceUpsert).not.toHaveBeenCalled();
    expect(stockItemUpdate).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });
});


describe('purchase invoice batch reversal concurrency', () => {
  it('refuses to reverse a batch whose quantity changed after the invoice read', async () => {
    const createdAt = new Date('2026-10-01T00:00:00Z');
    const expiryDate = new Date('2027-10-20T00:00:00Z');
    const invoice = {
      id: 'invoice-race',
      createdAt,
      receivedAtDepartmentId: 'pharmacy',
      receivedAtWardId: null,
      InvoiceItem: [{
        stockItemId: 'item-1',
        quantity: 5,
        batchNumber: 'LOT-1',
        expiryDate,
        unitCost: 10,
      }],
    };
    const batchUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
    const balanceUpdateMany = vi.fn();
    const stockItemUpdateMany = vi.fn();
    const tx: any = {
      invoice: { findUnique: vi.fn().mockResolvedValue(invoice) },
      stockTransaction: {
        count: vi.fn().mockResolvedValue(0),
        deleteMany: vi.fn(),
      },
      stockBatch: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'batch-1',
          quantity: 5,
          expiryDate,
          costPrice: 10,
          isActive: true,
        }),
        updateMany: batchUpdateMany,
        deleteMany: vi.fn(),
      },
      stockItemDepartmentBalance: {
        updateMany: balanceUpdateMany,
        findUnique: vi.fn(),
      },
      stockItem: { updateMany: stockItemUpdateMany },
      invoiceItem: { deleteMany: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new PurchaseInvoiceRepository(prisma);

    await expect(repository.deleteSafely('invoice-race'))
      .rejects.toThrow(/batch LOT-1 changed during reversal/i);

    expect(batchUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'batch-1',
        quantity: { gte: 5 },
        isActive: true,
        expiryDate,
        costPrice: 10,
      },
      data: { quantity: { decrement: 5 } },
    });
    expect(balanceUpdateMany).not.toHaveBeenCalled();
    expect(stockItemUpdateMany).not.toHaveBeenCalled();
    expect(tx.stockTransaction.deleteMany).not.toHaveBeenCalled();
    expect(tx.invoiceItem.deleteMany).not.toHaveBeenCalled();
  });
});


describe('legacy unbatched invoice reversal safety', () => {
  it('blocks reversal when the stock item is now batch-tracked', async () => {
    const invoice = {
      id: 'legacy-invoice',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      receivedAtDepartmentId: 'pharmacy',
      receivedAtWardId: null,
      InvoiceItem: [{
        stockItemId: 'item-legacy',
        quantity: 4,
        batchNumber: null,
        expiryDate: null,
        unitCost: 2,
      }],
    };
    const balanceUpdateMany = vi.fn();
    const stockItemUpdateMany = vi.fn();
    const tx: any = {
      invoice: { findUnique: vi.fn().mockResolvedValue(invoice) },
      stockBatch: { count: vi.fn().mockResolvedValue(1) },
      stockTransaction: { count: vi.fn(), deleteMany: vi.fn() },
      stockItemDepartmentBalance: { updateMany: balanceUpdateMany, findUnique: vi.fn() },
      stockItem: { updateMany: stockItemUpdateMany },
      invoiceItem: { deleteMany: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new PurchaseInvoiceRepository(prisma);

    await expect(repository.deleteSafely('legacy-invoice'))
      .rejects.toThrow(/now batch-tracked but this receipt has no batch number/i);

    expect(tx.stockBatch.count).toHaveBeenCalledWith({ where: { stockItemId: 'item-legacy' } });
    expect(balanceUpdateMany).not.toHaveBeenCalled();
    expect(stockItemUpdateMany).not.toHaveBeenCalled();
    expect(tx.stockTransaction.deleteMany).not.toHaveBeenCalled();
    expect(tx.invoiceItem.deleteMany).not.toHaveBeenCalled();
  });
});
