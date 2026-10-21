import { describe, expect, it, vi } from 'vitest';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../src/modules/stockItem/StockItemRepository';
import { ValidationError } from '../src/utils/errors';
import { PurchaseInvoiceRepository } from '../src/modules/purchaseInvoice/PurchaseInvoiceRepository';

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
      },
      stockItem: {
        findUnique: vi.fn().mockResolvedValue({ id: 'item-1', name: 'Gloves', currentStock: 100 }),
        update: vi.fn().mockResolvedValue({ id: 'item-1', currentStock: 107 }),
      },
      stockBatch: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(existingBatch),
        update: batchUpdate,
      },
      invoiceItem: { create: vi.fn().mockResolvedValue({ id: 'invoice-item-1' }) },
      stockItemDepartmentBalance: {
        upsert: vi.fn().mockResolvedValue({ quantity: 7 }),
      },
      stockTransaction: { create: vi.fn().mockResolvedValue({ id: 'movement-1' }) },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    return { repository: new PurchaseInvoiceRepository(prisma), batchUpdate };
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
      where: { id: 'batch-1' },
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
