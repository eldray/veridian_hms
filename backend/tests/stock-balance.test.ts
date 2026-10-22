import { describe, expect, it, vi } from 'vitest';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance, StockItemRepository } from '../src/modules/stockItem/StockItemRepository';
import { StockItemService } from '../src/modules/stockItem/StockItemService';
import { ValidationError } from '../src/utils/errors';
import { PurchaseInvoiceRepository } from '../src/modules/purchaseInvoice/PurchaseInvoiceRepository';
import { StockTransactionRepository } from '../src/modules/stockTransaction/StockTransactionRepository';
import { StockTransferRepository } from '../src/modules/stockTransfer/StockTransferRepository';
import { EncounterRepository } from '../src/modules/encounter/EncounterRepository';

describe('unassigned stock movement filters', () => {
  it('queries nullable department IDs instead of a non-existent sentinel', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const findMany = vi.fn().mockResolvedValue([]);
    const balanceFindMany = vi.fn().mockResolvedValue([]);
    const prisma: any = {
      stockTransaction: { count, findMany },
      stockItemDepartmentBalance: { findMany: balanceFindMany },
    };
    const repository = new StockItemRepository(prisma);

    await repository.getLedgerTransactions({ limit: 100 });

    expect(count).toHaveBeenCalledWith({
      where: { departmentId: null, wardId: null },
    });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { departmentId: null, wardId: null },
    }));
    expect(balanceFindMany).toHaveBeenCalledWith({
      where: { departmentId: null, wardId: null },
      select: { stockItemId: true, quantity: true },
    });
  });

  it('keeps post-period unassigned movements in the historical reconciliation query', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma: any = {
      stockTransaction: { count, findMany },
      stockItemDepartmentBalance: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const repository = new StockItemRepository(prisma);
    const endDate = new Date('2026-10-20T23:59:59.999Z');

    await repository.getLedgerTransactions({ limit: 100, endDate });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { departmentId: null, wardId: null, transactionDate: { gt: endDate } },
      select: expect.objectContaining({ stockItemId: true, transactionType: true }),
    }));
  });
});

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
    const batchUpdate = vi.fn().mockResolvedValue({ count: 1 });
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
        expiryDate: { gte: expect.any(Date), equals: new Date('2027-10-20T00:00:00.000Z') },
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
        expiryDate: { gte: expect.any(Date) },
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


describe('purchase receipt batch expiry race protection', () => {
  it('stops before balances change if the existing batch expires or changes before increment', async () => {
    const existingBatch = {
      id: 'batch-1',
      expiryDate: new Date('2027-10-20T00:00:00Z'),
      costPrice: 10,
      isActive: true,
    };
    const { repository, batchUpdate, tx } = ((): any => {
      const batchUpdate = vi.fn().mockResolvedValue({ count: 0 });
      const tx: any = {
        invoice: {
          create: vi.fn().mockResolvedValue({ id: 'invoice-1', createdAt: new Date('2026-10-20T00:00:00Z') }),
          findUnique: vi.fn().mockResolvedValue({ id: 'invoice-1' }),
        },
        stockItem: {
          findUnique: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Gloves', currentStock: 100 }),
          update: vi.fn(),
        },
        stockBatch: {
          count: vi.fn().mockResolvedValue(1),
          findFirst: vi.fn().mockResolvedValue(existingBatch),
          updateMany: batchUpdate,
        },
        invoiceItem: { create: vi.fn() },
        stockItemDepartmentBalance: { upsert: vi.fn() },
        stockTransaction: { create: vi.fn() },
      };
      const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
      return { repository: new PurchaseInvoiceRepository(prisma), batchUpdate, tx };
    })();

    await expect(repository.create({
      invoiceNumber: 'INV-BATCH-RACE',
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
    } as any, 'user-1')).rejects.toThrow(/changed or expired during receipt/i);

    expect(batchUpdate).toHaveBeenCalled();
    expect(tx.stockItemDepartmentBalance.upsert).not.toHaveBeenCalled();
    expect(tx.stockItem.update).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });
});


describe('calendar-day batch expiry semantics', () => {
  it('accepts a batch whose recorded expiry date is today at midnight', async () => {
    const expiryToday = new Date();
    expiryToday.setUTCHours(0, 0, 0, 0);
    const tx: any = {
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'batch-today', ...data })),
      },
      stockItemDepartmentBalance: {
        upsert: vi.fn().mockResolvedValue({ quantity: 2 }),
      },
      stockItem: {
        update: vi.fn().mockResolvedValue({ id: 'item-today', currentStock: 2 }),
      },
      stockTransaction: {
        create: vi.fn().mockResolvedValue({ id: 'movement-today' }),
      },
    };
    const repository = new StockItemRepository({} as any);

    const batch = await repository.addBatchWithinTransaction(
      tx, 'item-today', 'LOT-TODAY', expiryToday, 2, 1, new Date(), 'pharmacy',
    );

    expect(batch.expiryDate).toEqual(expiryToday);
    expect(tx.stockBatch.create).toHaveBeenCalled();
    expect(tx.stockItemDepartmentBalance.upsert).toHaveBeenCalled();
  });
});


describe('dispensed medication status transition guard', () => {
  it('rejects resetting a dispensed prescription before touching stock', async () => {
    const medicationUpdate = vi.fn();
    const stockBatchUpdateMany = vi.fn();
    const stockItemUpdateMany = vi.fn();
    const stockTransactionCreate = vi.fn();
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'med-dispensed', attendanceId: 'enc-1', status: 'dispensed', quantity: 2,
          stockItemId: 'item-1',
          StockItem: { id: 'item-1', isActive: true, isMedication: true, currentStock: 8, costPrice: 2 },
        }),
        update: medicationUpdate,
        updateMany: vi.fn(),
      },
      stockBatch: { count: vi.fn().mockResolvedValue(0), updateMany: stockBatchUpdateMany },
      stockItem: { updateMany: stockItemUpdateMany },
      stockTransaction: { create: stockTransactionCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new EncounterRepository(prisma);
    (repository as any).requireActorId = async () => 'user-1';

    await expect(repository.updateMedication(
      'enc-1', 'med-dispensed', { status: 'prescribed' }, 'user-1',
    )).rejects.toThrow(/cannot be reset to a pre-dispensing status/i);

    expect(medicationUpdate).not.toHaveBeenCalled();
    expect(stockBatchUpdateMany).not.toHaveBeenCalled();
    expect(stockItemUpdateMany).not.toHaveBeenCalled();
    expect(stockTransactionCreate).not.toHaveBeenCalled();
  });
});

describe('clinical dispensing calendar-day expiry', () => {
  it('allows dispensing from a batch whose expiry date is today', async () => {
    const expiryToday = new Date();
    expiryToday.setUTCHours(0, 0, 0, 0);
    const stockBatchUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
    const stockTransactionCreate = vi.fn().mockResolvedValue({ id: 'dispense-movement' });
    const tx: any = {
      medication: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'med-1', attendanceId: 'enc-1', status: 'prescribed', quantity: 1,
          stockItemId: 'item-1',
          StockItem: { id: 'item-1', isActive: true, isMedication: true, currentStock: 10, costPrice: 2 },
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'med-1', status: 'dispensed' }),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ departmentId: 'pharmacy', role: 'nurse' }) },
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'batch-today', batchNumber: 'LOT-TODAY', quantity: 5,
          expiryDate: expiryToday, costPrice: 2, isActive: true,
        }]),
        updateMany: stockBatchUpdateMany,
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 4 }),
      },
      stockItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ currentStock: 9 }),
      },
      stockTransaction: { create: stockTransactionCreate },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const repository = new EncounterRepository(prisma);
    (repository as any).requireActorId = async () => 'user-1';

    await repository.updateMedication('enc-1', 'med-1', { status: 'dispensed', quantity: 1 }, 'user-1');

    expect(stockBatchUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'batch-today',
        expiryDate: { gte: expect.any(Date) },
      }),
    }));
    expect(stockTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        balanceAfter: 4,
        departmentId: 'pharmacy',
        transactionType: 'sale',
      }),
    });
  });
});


describe('in-transit stock transfer reporting', () => {
  it('keeps dispatched transfers visible with sent and received quantities for reconciliation', async () => {
    const repository = new StockTransferRepository({} as any);
    const inTransitTransfer = {
      id: 'transfer-1',
      status: 'dispatched',
      originId: 'pharmacy',
      destinationId: 'ward',
      items: [{
        stockItemId: 'item-1',
        quantityRequested: 8,
        quantitySent: 8,
        quantityReceived: 0,
      }],
    };
    const paginate = vi.fn().mockResolvedValue({
      data: [inTransitTransfer],
      total: 1,
    });
    (repository as any).findManyWithPagination = paginate;

    const result = await repository.findAll({
      status: 'dispatched',
      includeAllStockLocations: true,
      page: 1,
      limit: 100,
    } as any);

    expect(paginate).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'dispatched' },
      include: expect.objectContaining({
        items: expect.any(Object),
      }),
    }));
    expect(result.data[0]).toEqual(expect.objectContaining({
      hasStockInTransit: true,
    }));
    expect(result.data[0].items[0]).toEqual(expect.objectContaining({
      quantitySent: 8,
      quantityReceived: 0,
      quantityInTransit: 8,
    }));
  });
});

describe('hospital-wide transfer stock reconciliation', () => {
  it('treats paired internal transfers as stock-neutral for opening and closing totals', async () => {
    const item = {
      id: 'item-1',
      name: 'Gloves',
      category: 'Consumable',
      unitOfMeasure: 'box',
      costPrice: 2,
      currentStock: 80,
    };
    const transferOut = {
      id: 'transfer-out-1',
      stockItemId: 'item-1',
      transactionType: 'transfer_out',
      quantity: 6,
      balanceAfter: 14,
      transactionDate: new Date('2026-10-10T10:00:00.000Z'),
      StockItem: item,
      User: null,
      Department: { name: 'Pharmacy' },
      Requisition: null,
      Invoice: null,
      adjustmentDirection: null,
    };
    const transferIn = {
      ...transferOut,
      id: 'transfer-in-1',
      transactionType: 'transfer_in',
      balanceAfter: 26,
      Department: { name: 'Ward' },
    };
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getLedgerTransactions: vi.fn().mockResolvedValue({
        rows: [transferOut, transferIn],
        total: 2,
        reconciliationRows: [transferOut, transferIn],
        transactionsAfterEnd: [],
        locationBalances: [],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-20T23:59:59.999Z'),
      undefined,
      { includeAllStockLocations: true },
    );

    expect(report.items[0]).toEqual(expect.objectContaining({
      stockItemId: 'item-1',
      openingStock: 80,
      closingStock: 80,
    }));
    expect(report.netChange).toBe(0);
  });
});

describe('legacy adjustment at the start of a report period', () => {
  it('uses the latest pre-period location snapshot to infer a legacy adjustment decrease', async () => {
    const adjustment = {
      id: 'legacy-adjustment-1',
      stockItemId: 'item-1',
      transactionType: 'adjustment',
      quantity: 3,
      adjustmentDirection: null,
      balanceAfter: 7,
      transactionDate: new Date('2026-10-02T10:00:00.000Z'),
      createdAt: new Date('2026-10-02T10:00:00.000Z'),
      StockItem: {
        id: 'item-1',
        name: 'Gloves',
        category: 'Consumable',
        unitOfMeasure: 'box',
        costPrice: 2,
        currentStock: 7,
      },
      User: null,
      Department: { name: 'Pharmacy' },
      Requisition: null,
      Invoice: null,
    };
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getLedgerTransactions: vi.fn().mockResolvedValue({
        rows: [adjustment],
        total: 1,
        transactionsBeforeStart: [{
          stockItemId: 'item-1',
          transactionType: 'purchase',
          quantity: 10,
          adjustmentDirection: null,
          balanceAfter: 10,
          transactionDate: new Date('2026-09-30T10:00:00.000Z'),
          createdAt: new Date('2026-09-30T10:00:00.000Z'),
        }],
        reconciliationRows: [adjustment],
        transactionsAfterEnd: [],
        locationBalances: [{ stockItemId: 'item-1', quantity: 7 }],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-20T23:59:59.999Z'),
      undefined,
      { departmentId: 'pharmacy' },
    );

    expect(report.items[0]).toEqual(expect.objectContaining({
      stockItemId: 'item-1',
      openingStock: 10,
      closingStock: 7,
      quantityIn: 0,
      quantityOut: 3,
    }));
  });
});

describe('legacy adjustment historical stock reconciliation', () => {
  it('uses location balance snapshots to reverse an untyped adjustment after the report end', async () => {
    const periodPurchase = {
      id: 'purchase-1',
      stockItemId: 'item-1',
      transactionType: 'purchase',
      quantity: 5,
      adjustmentDirection: null,
      balanceAfter: 10,
      transactionDate: new Date('2026-10-10T10:00:00.000Z'),
      createdAt: new Date('2026-10-10T10:00:00.000Z'),
      StockItem: {
        id: 'item-1',
        name: 'Gloves',
        category: 'Consumable',
        unitOfMeasure: 'box',
        costPrice: 2,
        currentStock: 7,
      },
      User: null,
      Department: { name: 'Pharmacy' },
      Requisition: null,
      Invoice: null,
    };
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getLedgerTransactions: vi.fn().mockResolvedValue({
        rows: [periodPurchase],
        total: 1,
        reconciliationRows: [periodPurchase],
        transactionsAfterEnd: [{
          stockItemId: 'item-1',
          transactionType: 'adjustment',
          quantity: 3,
          adjustmentDirection: null,
          balanceAfter: 7,
          transactionDate: new Date('2026-10-21T10:00:00.000Z'),
          createdAt: new Date('2026-10-21T10:00:00.000Z'),
        }],
        locationBalances: [{ stockItemId: 'item-1', quantity: 7 }],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-20T23:59:59.999Z'),
      undefined,
      { departmentId: 'pharmacy' },
    );

    expect(report.items[0]).toEqual(expect.objectContaining({
      stockItemId: 'item-1',
      openingStock: 5,
      closingStock: 10,
    }));
  });
});

describe('stock batch service expiry calendar', () => {
  it('allows adding a batch whose expiry date is today', async () => {
    const expiryToday = new Date();
    expiryToday.setUTCHours(0, 0, 0, 0);
    const receivedYesterday = new Date(expiryToday);
    receivedYesterday.setUTCDate(receivedYesterday.getUTCDate() - 1);
    const addBatchSafely = vi.fn().mockResolvedValue({ id: 'batch-today' });
    const service = new StockItemService({} as any);
    (service as any).repo = { addBatchSafely };

    await service.addStockBatch('item-1', 'LOT-TODAY', expiryToday, 2, 5, receivedYesterday, 'pharmacy');

    expect(addBatchSafely).toHaveBeenCalledWith(
      'item-1', 'LOT-TODAY', expiryToday, 2, 5, receivedYesterday, 'pharmacy',
    );
  });
});


describe('legacy negative stock issue reversal', () => {
  it('restores the positive issued quantity to both the location and hospital aggregate', async () => {
    const transaction = {
      id: 'legacy-sale',
      stockItemId: 'item-1',
      transactionType: 'sale',
      quantity: -3,
      departmentId: 'pharmacy',
      wardId: null,
      invoiceId: null,
      requisitionId: null,
      notes: 'Manual sale',
      reference: 'LEGACY-001',
    };
    const balanceUpsert = vi.fn().mockResolvedValue({ quantity: 8 });
    const aggregateUpdate = vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 18 });
    const tx: any = {
      stockTransaction: {
        findUnique: vi.fn().mockResolvedValue(transaction),
        delete: vi.fn().mockResolvedValue(transaction),
      },
      stockBatch: { count: vi.fn().mockResolvedValue(0) },
      stockItemDepartmentBalance: { upsert: balanceUpsert },
      stockItem: { update: aggregateUpdate },
    };
    const repository = new StockTransactionRepository({
      $transaction: async (callback: any) => callback(tx),
    } as any);

    await repository.deleteSafely('legacy-sale');

    expect(balanceUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: { quantity: { increment: 3 } },
    }));
    expect(aggregateUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { currentStock: { increment: 3 } },
    });
    expect(tx.stockTransaction.delete).toHaveBeenCalledWith({ where: { id: 'legacy-sale' } });
  });
});


describe('department-scoped low-stock batch details', () => {
  it('filters batch details to the selected department while retaining scoped balance calculation', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'item-1',
        name: 'Gloves',
        currentStock: 30,
        reorderLevel: 5,
        StockBatch: [{ batchNumber: 'PHARMACY-LOT' }],
        stockBalances: [{ quantity: 3 }],
      },
    ]);
    const repository = new StockItemRepository({ stockItem: { findMany } } as any);

    const result = await repository.getLowStockItems(undefined, { departmentId: 'pharmacy' });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        StockBatch: expect.objectContaining({
          where: { isActive: true, departmentId: 'pharmacy', wardId: null },
        }),
      }),
    }));
    expect(result).toHaveLength(1);
    expect(result[0].currentStock).toBe(3);
  });

  it('does not restrict batches by department for hospital-wide low-stock alerts', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new StockItemRepository({ stockItem: { findMany } } as any);

    await repository.getLowStockItems(undefined, { includeAllStockLocations: true });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        StockBatch: expect.objectContaining({ where: { isActive: true } }),
      }),
    }));
  });
});

describe('unassigned stock transaction report filters', () => {
  it('uses nullable department IDs for transaction lists and details', async () => {
    const findManyWithPagination = vi.fn().mockResolvedValue({ data: [], total: 0 });
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = new StockTransactionRepository({} as any);
    (repository as any).findManyWithPagination = findManyWithPagination;
    (repository as any).getModel = () => ({ findFirst });

    await repository.findAllWithFilters({});
    expect(findManyWithPagination).toHaveBeenCalledWith(expect.objectContaining({
      where: { departmentId: null },
    }));

    await repository.findByIdWithRelations('movement-1');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'movement-1', departmentId: null },
    }));
  });

  it('uses nullable department IDs for valuation and movement report scopes', async () => {
    const stockItemFindMany = vi.fn().mockResolvedValue([]);
    const stockTransactionFindMany = vi.fn().mockResolvedValue([]);
    const prisma: any = {
      stockItem: { findMany: stockItemFindMany },
      stockTransaction: { findMany: stockTransactionFindMany },
    };
    const repository = new StockTransactionRepository(prisma);

    await repository.getValuationData();
    expect(stockItemFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        stockBalances: expect.objectContaining({
          where: { departmentId: null, wardId: null },
        }),
        StockBatch: expect.objectContaining({
          where: expect.objectContaining({ departmentId: null, wardId: null }),
        }),
      }),
    }));

    stockItemFindMany.mockClear();
    stockTransactionFindMany.mockClear();
    await repository.getMovementData();
    expect(stockTransactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { departmentId: null, wardId: null },
    }));
    expect(stockItemFindMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        stockBalances: expect.objectContaining({
          where: { departmentId: null, wardId: null },
        }),
      }),
    }));
  });
});

describe('batch-to-balance valuation reconciliation', () => {
  it('flags batch quantities both above and below the recorded stock balance', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'over-recorded-batches',
        name: 'Item A',
        currentStock: 12,
        costPrice: 2,
        reorderLevel: 1,
        StockBatch: [{ quantity: 15, costPrice: 2 }],
        stockBalances: [{ quantity: 12 }],
      },
      {
        id: 'missing-batch-quantity',
        name: 'Item B',
        currentStock: 15,
        costPrice: 2,
        reorderLevel: 1,
        StockBatch: [{ quantity: 12, costPrice: 2 }],
        stockBalances: [{ quantity: 15 }],
      },
      {
        id: 'legacy-unbatched',
        name: 'Item C',
        currentStock: 15,
        costPrice: 2,
        reorderLevel: 1,
        StockBatch: [],
        stockBalances: [{ quantity: 15 }],
      },
    ]);
    const service = new StockItemService({ stockItem: { findMany } } as any);

    const report = await service.getValueSummary(undefined, { includeAllStockLocations: true });

    expect(report.batchQuantityDiscrepancies).toBe(2);
    expect(report.items.map((item: any) => item.stockDiscrepancy)).toEqual([3, 3, 0]);
    expect(report.items[2].unbatchedQuantity).toBe(15);
  });
});


describe('consumable dispensing stock integrity', () => {
  it('does not deduct department or hospital balances when usable batches are insufficient', async () => {
    const departmentDecrease = vi.fn();
    const hospitalDecrease = vi.fn();
    const batchDecrease = vi.fn();
    const tx: any = {
      stockItem: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'gloves', name: 'Gloves', isActive: true, isMedication: false, currentStock: 20,
        }),
        updateMany: hospitalDecrease,
      },
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'batch-1', quantity: 2, expiryDate: new Date('2027-10-20T00:00:00Z'),
          receivedDate: new Date('2026-10-01T00:00:00Z'), isActive: true,
        }]),
        updateMany: batchDecrease,
      },
      stockItemDepartmentBalance: {
        updateMany: departmentDecrease,
      },
    };
    const repository = new EncounterRepository({} as any);

    await expect((repository as any).consumeConsumableStock(tx, 'gloves', 3, 'pharmacy'))
      .rejects.toThrow(/insufficient usable batch stock/i);

    expect(batchDecrease).not.toHaveBeenCalled();
    expect(departmentDecrease).not.toHaveBeenCalled();
    expect(hospitalDecrease).not.toHaveBeenCalled();
  });

  it('deducts the same quantity from FEFO batches, department balance, and hospital aggregate', async () => {
    const batchDecrease = vi.fn().mockResolvedValue({ count: 1 });
    const departmentDecrease = vi.fn().mockResolvedValue({ count: 1 });
    const departmentFind = vi.fn().mockResolvedValue({ quantity: 4 });
    const hospitalDecrease = vi.fn().mockResolvedValue({ count: 1 });
    const tx: any = {
      stockItem: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({
            id: 'gloves', name: 'Gloves', isActive: true, isMedication: false, currentStock: 10,
          })
          .mockResolvedValueOnce({ id: 'gloves' }),
        updateMany: hospitalDecrease,
      },
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{
          id: 'batch-1', quantity: 6, expiryDate: new Date('2027-10-20T00:00:00Z'),
          receivedDate: new Date('2026-10-01T00:00:00Z'), isActive: true,
        }]),
        updateMany: batchDecrease,
      },
      stockItemDepartmentBalance: {
        updateMany: departmentDecrease,
        findUnique: departmentFind,
      },
    };
    const repository = new EncounterRepository({} as any);

    const result = await (repository as any).consumeConsumableStock(tx, 'gloves', 2, 'pharmacy');

    expect(result).toEqual({ balanceAfter: 4, allocations: [{ batchId: 'batch-1', quantity: 2 }] });
    expect(batchDecrease).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'batch-1', quantity: { gte: 2 } }),
      data: { quantity: { decrement: 2 } },
    }));
    expect(departmentDecrease).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ stockItemId: 'gloves', locationKey: 'pharmacy', quantity: { gte: 2 } }),
      data: { quantity: { decrement: 2 } },
    }));
    expect(hospitalDecrease).toHaveBeenCalledWith({
      where: { id: 'gloves', isActive: true, isMedication: false, currentStock: { gte: 2 } },
      data: { currentStock: { decrement: 2 } },
    });
  });
});


describe('in-transit batch valuation data', () => {
  it('loads valid dispatched batch allocations only for hospital-wide valuation', async () => {
    const stockItemFindMany = vi.fn().mockResolvedValue([{
      id: 'item-1',
      name: 'Gloves',
      currentStock: 10,
      costPrice: '5.00',
      StockBatch: [{ quantity: 4, costPrice: '2.50' }],
    }]);
    const stockTransferItemFindMany = vi.fn().mockResolvedValue([
      {
        stockItemId: 'item-1',
        quantitySent: 3,
        quantityReceived: 0,
        batchAllocations: [{ quantity: 3, costPrice: '4.00', batchNumber: 'LOT-TRANSIT' }],
      },
      {
        stockItemId: 'item-1',
        quantitySent: 2,
        quantityReceived: 0,
        batchAllocations: [{ quantity: 1, costPrice: '4.00', batchNumber: 'BAD-LOT' }],
      },
      {
        stockItemId: 'item-1',
        quantitySent: 1,
        quantityReceived: 0,
        batchAllocations: [{ quantity: 1, costPrice: null, batchNumber: 'MISSING-COST' }],
      },
      {
        stockItemId: 'item-1',
        quantitySent: 1,
        quantityReceived: 0,
        batchAllocations: [{ quantity: 1, costPrice: '', batchNumber: 'EMPTY-COST' }],
      },
    ]);
    const repository = new StockTransactionRepository({
      stockItem: { findMany: stockItemFindMany },
      stockTransferItem: { findMany: stockTransferItemFindMany },
    } as any);

    const result = await repository.getValuationData(undefined, { includeAllStockLocations: true });

    expect(stockTransferItemFindMany).toHaveBeenCalledWith({
      where: { transfer: { status: 'dispatched' }, quantitySent: { gt: 0 }, quantityReceived: 0 },
      select: { stockItemId: true, quantitySent: true, batchAllocations: true },
    });
    expect(result[0].inTransitBatchAllocations).toEqual([{ quantity: 3, costPrice: 4 }]);
  });
});

 
describe('hospital-wide value summary in-transit valuation', () => {
  it('values dispatched batch stock at its saved lot cost instead of catalogue fallback', async () => {
    const repository: any = {
      getItemsForValueReport: vi.fn().mockResolvedValue([{
        id: 'item-transit',
        name: 'Gloves',
        category: 'Consumable',
        currentStock: 10,
        costPrice: '5.00',
        reorderLevel: 1,
        isMedication: false,
        StockBatch: [{ quantity: 4, costPrice: '2.50', isActive: true }],
        stockBalances: [],
        inTransitBatchAllocations: [{ quantity: 3, costPrice: 4 }],
      }]),
    };
    const service = new StockItemService({} as any);
    (service as any).repo = repository;

    const report = await service.getValueSummary(undefined, { includeAllStockLocations: true });

    expect(report.items[0]).toEqual(expect.objectContaining({
      currentStock: 10,
      batchQuantity: 4,
      inTransitBatchQuantity: 3,
      inTransitBatchValue: 12,
      unbatchedQuantity: 3,
      unbatchedValue: 15,
      stockDiscrepancy: 0,
      totalValue: 37,
    }));
    expect(report.totalValue).toBe(37);
  });
});

 
describe('zero-quantity batch reconciliation', () => {
  it('flags aggregate stock with no remaining quantity in its tracked batches', async () => {
    const repository: any = {
      getItemsForValueReport: vi.fn().mockResolvedValue([{
        id: 'tracked-item',
        name: 'Bandages',
        currentStock: 5,
        costPrice: 2,
        reorderLevel: 1,
        isMedication: false,
        _count: { StockBatch: 2 },
        StockBatch: [],
        stockBalances: [],
        inTransitBatchAllocations: [],
      }]),
    };
    const service = new StockItemService({} as any);
    (service as any).repo = repository;

    const report = await service.getValueSummary(undefined, { includeAllStockLocations: true });

    expect(report.batchQuantityDiscrepancies).toBe(1);
    expect(report.items[0].stockDiscrepancy).toBe(5);
    expect(report.items[0].unbatchedQuantity).toBe(5);
  });
});
