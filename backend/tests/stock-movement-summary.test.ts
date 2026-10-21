import { describe, expect, it } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';
import { StockItemService } from '../src/modules/stockItem/StockItemService';
import { StockItemRepository } from '../src/modules/stockItem/StockItemRepository';
import { StockTransactionRepository } from '../src/modules/stockTransaction/StockTransactionRepository';

describe('location-scoped stock value summary', () => {
  it('uses department balances instead of hospital-wide stock for non-admin summaries', async () => {
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getItemsForValueReport: async (_category: string | undefined, filters: any) => {
        expect(filters.departmentId).toBe('pharmacy');
        expect(filters.includeAllStockLocations).toBe(false);
        return [{
          id: 'item-1', name: 'Gloves', category: 'consumable', currentStock: 100,
          costPrice: '5.00', reorderLevel: 10, isMedication: false,
          stockBalances: [{ quantity: 8 }],
          StockBatch: [{ quantity: 3, costPrice: '2.00' }],
        }];
      },
    };

    const report = await service.getValueSummary('consumable', { departmentId: 'pharmacy', includeAllStockLocations: false });

    expect(report.totalValue).toBe(31);
    expect(report.lowStockItems).toBe(1);
    expect(report.items[0]).toMatchObject({ currentStock: 8, batchQuantity: 3, unbatchedQuantity: 5, totalValue: 31 });
  });
});

describe('stock valuation report', () => {
  it('values remaining batches at their recorded cost and unbatched stock at catalogue cost', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getValuationData: async () => [
        {
          id: 'item-1', name: 'Gloves', category: 'consumable', currentStock: 10,
          costPrice: '5.00', unitOfMeasure: 'box', reorderLevel: 2,
          StockBatch: [
            { quantity: 4, costPrice: '2.50' },
            { quantity: 2, costPrice: '3.00' },
          ],
        },
      ],
    };

    const report = await service.getStockValuation(undefined, { includeAllStockLocations: true });

    expect(report.totalValue).toBe(36);
    expect(report.items[0]).toMatchObject({
      batchQuantity: 6,
      batchValue: 16,
      unbatchedQuantity: 4,
      totalValue: 36,
      stockDiscrepancy: 0,
    });
    expect(report.byCategory.consumable.value).toBe(36);
  });
});

describe('department stock movement summary', () => {
  it('reports internal transfers separately and includes them in location balances', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{
          id: 'item-1',
          name: 'Paracetamol',
          category: 'medication',
          unitOfMeasure: 'tablet',
          currentStock: 75,
        }],
        transactions: [
          { stockItemId: 'item-1', transactionType: 'purchase', quantity: 10 },
          { stockItemId: 'item-1', transactionType: 'transfer_in', quantity: 5 },
          { stockItemId: 'item-1', transactionType: 'transfer_out', quantity: 3 },
          { stockItemId: 'item-1', transactionType: 'sale', quantity: 2 },
        ],
      }),
    };

    const report = await service.getMovementSummary({
      departmentId: 'pharmacy',
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-20T23:59:59Z'),
    });

    expect(report.items[0]).toMatchObject({
      purchases: 10,
      transfersIn: 5,
      transfersOut: 3,
      sales: 2,
      openingStock: 65,
      closingStock: 75,
      netChange: 10,
    });
    expect(report.totals).toMatchObject({
      totalPurchases: 10,
      totalTransfersIn: 5,
      totalTransfersOut: 3,
      totalSales: 2,
    });
  });
});


describe('stock usage report', () => {
  it('counts absolute issued quantities and keeps same-name catalogue items separate', async () => {
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getTransactionsForUsageReport: async () => [
        { stockItemId: 'item-1', transactionType: 'sale', quantity: -3, StockItem: { id: 'item-1', name: 'Paracetamol', category: 'medication', unitOfMeasure: 'tablet', isMedication: true } },
        { stockItemId: 'item-2', transactionType: 'requisition', quantity: 4, StockItem: { id: 'item-2', name: 'Paracetamol', category: 'medication', unitOfMeasure: 'tablet', isMedication: true } },
      ],
    };

    const report = await service.getUsageReport('month', 1);

    expect(report.summary).toMatchObject({ totalItemsDispensed: 2, totalQuantity: 7, medicationsOnly: 2 });
    expect(report.topItems).toHaveLength(1);
    expect(report.topItems[0]).toMatchObject({ stockItemId: 'item-2', quantity: 4, requisitionQuantity: 4 });
  });
});


describe('stock expiry report', () => {
  it('uses positive batch quantities and batch expiry dates when item-level expiry is absent', async () => {
    const today = new Date();
    const dateInDays = (days: number) => {
      const value = new Date(today);
      value.setDate(value.getDate() + days);
      return value;
    };
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getItemsForExpiryReport: async () => [
        {
          id: 'soon-item', name: 'Batch soon', currentStock: 100, costPrice: 99, expiryDate: null,
          StockBatch: [{ batchNumber: 'SOON-1', expiryDate: dateInDays(10), quantity: 5, costPrice: '2.00' }],
        },
        {
          id: 'expired-item', name: 'Expired batch', currentStock: 10, costPrice: 10, expiryDate: null,
          StockBatch: [{ batchNumber: 'OLD-1', expiryDate: dateInDays(-5), quantity: 3, costPrice: '4.00' }],
        },
        {
          id: 'healthy-item', name: 'Healthy batch', currentStock: 20, costPrice: 1, expiryDate: null,
          StockBatch: [{ batchNumber: 'GOOD-1', expiryDate: dateInDays(120), quantity: 20, costPrice: '1.00' }],
        },
      ],
      getExpiringBatches: async () => [{ batchNumber: 'SOON-1' }],
    };

    const report = await service.getExpiryReport(30);

    expect(report.summary).toMatchObject({
      totalWithExpiry: 3,
      expiringSoon: 1,
      expired: 1,
      healthy: 1,
      expiringValue: 10,
      expiringBatches: 1,
    });
    expect(report.expiringSoon[0].id).toBe('soon-item');
    expect(report.expired[0].id).toBe('expired-item');
  });
});


describe('historical stock movement balances', () => {
  it('backs out movements after the report end date before calculating closing stock', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{ id: 'item-1', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', currentStock: 70 }],
        transactions: [
          { stockItemId: 'item-1', transactionType: 'purchase', quantity: 10 },
          { stockItemId: 'item-1', transactionType: 'sale', quantity: 2 },
        ],
        transactionsAfterEnd: [
          { stockItemId: 'item-1', transactionType: 'sale', quantity: 5 },
        ],
      }),
    };

    const report = await service.getMovementSummary({
      departmentId: 'pharmacy',
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-10T23:59:59Z'),
    });

    expect(report.items[0]).toMatchObject({
      openingStock: 67,
      closingStock: 75,
      netChange: 8,
    });
  });
});

describe('legacy stock movement quantities', () => {
  it('normalizes legacy negative sales and adjustments in movement totals', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{ id: 'item-legacy', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', currentStock: 10 }],
        transactions: [
          { stockItemId: 'item-legacy', transactionType: 'purchase', quantity: 5 },
          { stockItemId: 'item-legacy', transactionType: 'sale', quantity: -2 },
          { stockItemId: 'item-legacy', transactionType: 'adjustment', quantity: -3 },
        ],
        transactionsAfterEnd: [],
      }),
    };

    const report = await service.getMovementSummary({
      departmentId: 'pharmacy',
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-20T23:59:59Z'),
    });

    expect(report.items[0]).toMatchObject({
      purchases: 5,
      sales: 2,
      adjustments: 3,
      adjustmentIn: 0,
      adjustmentOut: 3,
      openingStock: 10,
      closingStock: 10,
      netChange: 0,
    });
  });
});

describe('hospital-wide stock movement reconciliation', () => {
  it('does not count internal transfers as hospital-wide gains or losses', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{ id: 'item-1', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', currentStock: 80 }],
        transactions: [
          { stockItemId: 'item-1', transactionType: 'purchase', quantity: 10 },
          { stockItemId: 'item-1', transactionType: 'transfer_out', quantity: 5 },
          { stockItemId: 'item-1', transactionType: 'transfer_in', quantity: 5 },
          { stockItemId: 'item-1', transactionType: 'sale', quantity: 2 },
        ],
        transactionsAfterEnd: [
          { stockItemId: 'item-1', transactionType: 'transfer_out', quantity: 4 },
          { stockItemId: 'item-1', transactionType: 'sale', quantity: 3 },
        ],
      }),
    };

    const report = await service.getMovementSummary({
      includeAllStockLocations: true,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-20T23:59:59.999Z'),
    });

    expect(report.items[0]).toMatchObject({
      purchases: 10,
      transfersIn: 5,
      transfersOut: 5,
      sales: 2,
      openingStock: 75,
      closingStock: 83,
      netChange: 8,
    });
  });
});



describe('stock ledger location scope', () => {
  it('limits ledger rows to the caller department by default', async () => {
    let countArgs: any;
    let findArgs: any;
    const prisma = {
      stockTransaction: {
        count: async (args: any) => { countArgs = args; return 0; },
        findMany: async (args: any) => { findArgs = args; return []; },
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getLedgerTransactions({ departmentId: 'pharmacy', limit: 100 });

    expect(countArgs.where.departmentId).toBe('pharmacy');
    expect(findArgs.where.departmentId).toBe('pharmacy');
  });

  it('only omits the department restriction when hospital-wide scope is explicitly enabled', async () => {
    let findArgs: any;
    const prisma = {
      stockTransaction: {
        count: async () => 0,
        findMany: async (args: any) => { findArgs = args; return []; },
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getLedgerTransactions({ departmentId: 'pharmacy', includeAllStockLocations: true, limit: 100 });

    expect(findArgs.where.departmentId).toBeUndefined();
  });

  it('does not silently include unassigned movements when a caller has no department', async () => {
    let findArgs: any;
    const prisma = {
      stockTransaction: {
        count: async (args: any) => { findArgs = args; return 0; },
        findMany: async () => [],
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getLedgerTransactions({ limit: 100 });

    expect(findArgs.where.departmentId).toBe('__NO_DEPARTMENT__');
  });
});


describe('stock usage report location scope', () => {
  it('limits usage-report transactions to the caller department by default', async () => {
    let query: any;
    const prisma = {
      stockTransaction: {
        findMany: async (args: any) => { query = args; return []; },
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getTransactionsForUsageReport(new Date('2026-10-01T00:00:00Z'), { departmentId: 'pharmacy' });

    expect(query.where.departmentId).toBe('pharmacy');
    expect(query.where.transactionType.in).toEqual(['sale', 'requisition']);
    expect(query.where.NOT).toEqual([
      { notes: { startsWith: 'Consumable use: [EDITED]' } },
      { notes: { startsWith: 'Consumable use: [DELETED]' } },
    ]);
  });

  it('restricts callers without a department to unassigned usage rows', async () => {
    let query: any;
    const prisma = {
      stockTransaction: {
        findMany: async (args: any) => { query = args; return []; },
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getTransactionsForUsageReport(new Date('2026-10-01T00:00:00Z'));

    expect(query.where.departmentId).toBe('__NO_DEPARTMENT__');
  });
});


describe('consumable correction reporting', () => {
  it('excludes superseded consumable rows from activity totals but reconciles their ledger reversals', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{ id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'pair', currentStock: 8 }],
        transactions: [
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 3, notes: 'Consumable use: [EDITED] old entry' },
          { stockItemId: 'gloves', transactionType: 'adjustment', quantity: 3, notes: 'Consumable use edit reversal: tx-old' },
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 2, notes: 'Consumable use: current entry' },
        ],
        transactionsAfterEnd: [],
      }),
    };

    const report = await service.getMovementSummary({
      includeAllStockLocations: true,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-21T23:59:59.999Z'),
    });

    expect(report.items[0]).toMatchObject({
      sales: 2,
      adjustments: 0,
      netChange: -2,
      openingStock: 10,
      closingStock: 8,
    });
  });
});


describe('stock transaction location balance snapshots', () => {
  it('records the department balance after a department stock issue, not the hospital aggregate', async () => {
    let savedTransaction: any;
    const tx: any = {
      stockBatch: { count: async () => 0 },
      stockItemDepartmentBalance: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ quantity: 7 }),
      },
      stockItem: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ id: 'gloves', currentStock: 87 }),
      },
      stockTransaction: {
        create: async ({ data }: any) => {
          savedTransaction = data;
          return data;
        },
      },
    };
    const prisma: any = { $transaction: async (callback: any) => callback(tx) };
    const repository = new StockTransactionRepository(prisma);

    await repository.createSafely({
      stockItemId: 'gloves',
      transactionType: 'sale',
      quantity: 3,
      departmentId: 'pharmacy',
      performedBy: 'user-1',
    });

    expect(savedTransaction.departmentId).toBe('pharmacy');
    expect(savedTransaction.balanceAfter).toBe(7);
  });
});

describe('department report balance isolation', () => {
  it('excludes ward balances from department low-stock and movement totals', async () => {
    const stockItemQueries: any[] = [];
    const prisma: any = {
      stockItem: {
        findMany: async (args: any) => {
          stockItemQueries.push(args);
          return [];
        },
      },
      stockTransaction: {
        findMany: async () => [],
      },
    };
    const repository = new StockTransactionRepository(prisma);

    await repository.getLowStockItems(undefined, { departmentId: 'pharmacy' });
    await repository.getMovementData(undefined, undefined, undefined, { departmentId: 'pharmacy' });

    expect(stockItemQueries).toHaveLength(2);
    for (const query of stockItemQueries) {
      expect(query.select.stockBalances.where).toEqual({
        departmentId: 'pharmacy',
        wardId: null,
      });
    }
  });
});

describe('stock item transaction balance snapshots', () => {
  it('records the location balance instead of the hospital aggregate', async () => {
    let savedTransaction: any;
    const tx: any = {
      stockBatch: { count: async () => 0 },
      stockItemDepartmentBalance: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ quantity: 11 }),
      },
      stockItem: {
        updateMany: async () => ({ count: 1 }),
        findUnique: async () => ({ id: 'gloves', currentStock: 91 }),
      },
      stockTransaction: {
        create: async ({ data }: any) => {
          savedTransaction = data;
          return data;
        },
      },
    };
    const prisma: any = { $transaction: async (callback: any) => callback(tx) };
    const repository = new StockItemRepository(prisma);

    await repository.updateStockLevelSafely('gloves', 3, 'sale' as any, undefined, 'dispense', 'user-1', 'pharmacy');

    expect(savedTransaction.departmentId).toBe('pharmacy');
    expect(savedTransaction.balanceAfter).toBe(11);
  });
});
