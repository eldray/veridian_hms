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
      stockItemDepartmentBalance: { findMany: async () => [] },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getLedgerTransactions({ departmentId: 'pharmacy', limit: 100 });

    expect(countArgs.where.departmentId).toBe('pharmacy');
    expect(countArgs.where.wardId).toBeNull();
    expect(findArgs.where.departmentId).toBe('pharmacy');
    expect(findArgs.where.wardId).toBeNull();
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
    expect(findArgs.where.wardId).toBeUndefined();
  });

  it('does not silently include unassigned movements when a caller has no department', async () => {
    let findArgs: any;
    const prisma = {
      stockTransaction: {
        count: async (args: any) => { findArgs = args; return 0; },
        findMany: async () => [],
      },
      stockItemDepartmentBalance: {
        findMany: async () => [],
      },
    };
    const repo = new StockItemRepository(prisma as any);

    await repo.getLedgerTransactions({ limit: 100 });

    expect(findArgs.where.departmentId).toBeNull();
    expect(findArgs.where.wardId).toBeNull();
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

    expect(query.where.departmentId).toBeNull();
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

    const result = await repository.updateStockLevelSafely('gloves', 3, 'sale' as any, undefined, 'dispense', 'user-1', 'pharmacy');

    expect(savedTransaction.departmentId).toBe('pharmacy');
    expect(savedTransaction.balanceAfter).toBe(11);
    expect(result.currentStock).toBe(91);
    expect(result.locationStock).toBe(11);
  });
});

describe('batch receipt balance snapshots', () => {
  it('records the receiving department balance rather than hospital aggregate stock', async () => {
    let savedTransaction: any;
    const tx: any = {
      stockBatch: {
        count: async () => 1,
        findFirst: async () => null,
        create: async ({ data }: any) => ({ id: 'batch-1', ...data }),
      },
      stockItemDepartmentBalance: {
        upsert: async () => ({ quantity: 6 }),
      },
      stockItem: {
        update: async () => ({ id: 'gloves', currentStock: 106 }),
      },
      stockTransaction: {
        create: async ({ data }: any) => {
          savedTransaction = data;
          return data;
        },
      },
    };
    const repository = new StockItemRepository({} as any);

    await repository.addBatchWithinTransaction(
      tx,
      'gloves',
      'LOT-001',
      new Date('2027-12-31T00:00:00Z'),
      4,
      2.5,
      new Date('2026-10-21T00:00:00Z'),
      'pharmacy',
    );

    expect(savedTransaction.departmentId).toBe('pharmacy');
    expect(savedTransaction.balanceAfter).toBe(6);
  });
});

describe('stock item view balance isolation', () => {
  it('excludes ward balances from department stock lists and item details', async () => {
    let listArgs: any;
    let detailArgs: any;
    const model: any = {
      findMany: async (args: any) => { listArgs = args; return []; },
      count: async () => 0,
      findUnique: async (args: any) => { detailArgs = args; return null; },
    };
    const repository = new StockItemRepository({ stockItem: model } as any);

    await repository.findAllWithFilters({ departmentId: 'pharmacy', page: 1, limit: 25 });
    await repository.findByIdWithRelations('gloves', { departmentId: 'pharmacy' });

    expect(listArgs.include.stockBalances.where).toEqual({
      departmentId: 'pharmacy',
      wardId: null,
    });
    expect(detailArgs.include.stockBalances.where).toEqual({
      departmentId: 'pharmacy',
      wardId: null,
    });
    // Transaction history remains department-scoped, independently of balance filtering.
    expect(detailArgs.include.StockTransaction.where).toEqual({ departmentId: 'pharmacy' });
  });
});

describe('stock item report location filters', () => {
  it('excludes ward balances from low-stock alerts', async () => {
    let query: any;
    const repository = new StockItemRepository({
      stockItem: {
        findMany: async (args: any) => { query = args; return []; },
      },
    } as any);

    await repository.getLowStockItems(undefined, { departmentId: 'pharmacy' });

    expect(query.include.stockBalances.where).toEqual({
      departmentId: 'pharmacy',
      wardId: null,
    });
  });

  it('does not expose unassigned stock in valuation when no department is supplied', async () => {
    let query: any;
    const repository = new StockItemRepository({
      stockItem: {
        findMany: async (args: any) => { query = args; return []; },
      },
    } as any);

    await repository.getItemsForValueReport();

    expect(query.select.stockBalances.where).toEqual({
      departmentId: null,
      wardId: null,
    });
    expect(query.select.StockBatch.where).toMatchObject({
      departmentId: null,
      wardId: null,
    });
  });
});

describe('expiry report location isolation', () => {
  it('scopes expiring batches and expiry report stock to the selected department', async () => {
    let batchArgs: any;
    let itemArgs: any;
    const repository = new StockItemRepository({
      stockBatch: {
        findMany: async (args: any) => { batchArgs = args; return []; },
      },
      stockItem: {
        findMany: async (args: any) => { itemArgs = args; return []; },
      },
    } as any);

    await repository.getExpiringBatches(30, { departmentId: 'pharmacy' });
    await repository.getItemsForExpiryReport(undefined, { departmentId: 'pharmacy' });

    expect(batchArgs.where).toMatchObject({
      departmentId: 'pharmacy',
      wardId: null,
      isActive: true,
      quantity: { gt: 0 },
    });
    expect(itemArgs.select.StockBatch.where).toMatchObject({
      departmentId: 'pharmacy',
      wardId: null,
      quantity: { gt: 0 },
    });
    expect(itemArgs.select.stockBalances.where).toEqual({
      departmentId: 'pharmacy',
      wardId: null,
    });
    expect(itemArgs.where.OR[1].StockBatch.some).toMatchObject({
      departmentId: 'pharmacy',
      wardId: null,
    });
  });

  it('scopes expiry reports to unassigned stock when no department is supplied', async () => {
    let query: any;
    const repository = new StockItemRepository({
      stockItem: {
        findMany: async (args: any) => { query = args; return []; },
      },
    } as any);

    await repository.getItemsForExpiryReport();

    expect(query.select.stockBalances.where).toEqual({
      departmentId: null,
      wardId: null,
    });
  });
});

describe('expiring batch location balances', () => {
  it('returns the department balance rather than the hospital-wide item total', async () => {
    let query: any;
    const repository = new StockItemRepository({
      stockBatch: {
        findMany: async (args: any) => {
          query = args;
          return [{
            id: 'batch-1',
            quantity: 2,
            stockItem: {
              name: 'Gloves',
              category: 'consumable',
              unitOfMeasure: 'box',
              currentStock: 100,
              stockBalances: [{ quantity: 7 }],
            },
          }];
        },
      },
    } as any);

    const batches = await repository.getExpiringBatches(30, { departmentId: 'pharmacy' });

    expect(query.include.stockItem.select.stockBalances.where).toEqual({
      departmentId: 'pharmacy',
      wardId: null,
    });
    expect(batches[0].stockItem.currentStock).toBe(7);
    expect(batches[0].stockItem.stockBalances).toBeUndefined();
  });
});

describe('hospital-wide stock item movement reconciliation', () => {
  it('uses aggregate stock and treats internal transfers as stock-neutral', async () => {
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getLedgerTransactions: async () => ({
        total: 4,
        rows: [
          { id: 'p1', stockItemId: 'gloves', transactionType: 'purchase', quantity: 10, balanceAfter: 20, transactionDate: new Date('2026-10-02T00:00:00Z'), StockItem: { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 100 } },
          { id: 't1', stockItemId: 'gloves', transactionType: 'transfer_out', quantity: 5, balanceAfter: 15, transactionDate: new Date('2026-10-03T00:00:00Z'), StockItem: { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 100 } },
          { id: 't2', stockItemId: 'gloves', transactionType: 'transfer_in', quantity: 5, balanceAfter: 25, transactionDate: new Date('2026-10-04T00:00:00Z'), StockItem: { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 100 } },
          { id: 's1', stockItemId: 'gloves', transactionType: 'sale', quantity: 2, balanceAfter: 23, transactionDate: new Date('2026-10-05T00:00:00Z'), StockItem: { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 100 } },
        ],
        transactionsAfterEnd: [
          { stockItemId: 'gloves', transactionType: 'transfer_out', quantity: 4 },
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 3 },
        ],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-10T23:59:59.999Z'),
      undefined,
      { includeAllStockLocations: true },
    );

    expect(report.items[0]).toMatchObject({
      openingStock: 95,
      closingStock: 103,
      quantityIn: 15,
      quantityOut: 7,
    });
    expect(report.summary.netChange).toBe(8);
  });
});

describe('hospital-wide movement filter reconciliation', () => {
  it('keeps opening and closing stock correct when the ledger is filtered by type', async () => {
    const service = new StockItemService({} as any);
    const item = { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 10 };
    (service as any).repo = {
      getLedgerTransactions: async () => ({
        total: 1,
        rows: [
          { id: 's1', stockItemId: 'gloves', transactionType: 'sale', quantity: 2, balanceAfter: 10, transactionDate: new Date('2026-10-05T00:00:00Z'), StockItem: item },
        ],
        reconciliationRows: [
          { stockItemId: 'gloves', transactionType: 'purchase', quantity: 10, adjustmentDirection: null, StockItem: item },
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 2, adjustmentDirection: null, StockItem: item },
        ],
        transactionsAfterEnd: [],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-10T23:59:59.999Z'),
      undefined,
      { includeAllStockLocations: true, transactionType: 'sale' },
    );

    expect(report.items[0]).toMatchObject({
      openingStock: 2,
      closingStock: 10,
      quantityIn: 0,
      quantityOut: 2,
    });
    expect(report.summary.totalTransactions).toBe(1);
  });
});


describe('department movement filter reconciliation', () => {
  it('keeps location opening and closing balances correct when filtered by movement type', async () => {
    const service = new StockItemService({} as any);
    const item = { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 100 };
    (service as any).repo = {
      getLedgerTransactions: async () => ({
        total: 1,
        rows: [
          { id: 's1', stockItemId: 'gloves', transactionType: 'sale', quantity: 2, balanceAfter: 10, transactionDate: new Date('2026-10-05T00:00:00Z'), StockItem: item },
        ],
        reconciliationRows: [
          { stockItemId: 'gloves', transactionType: 'purchase', quantity: 10, balanceAfter: 12, adjustmentDirection: null, StockItem: item },
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 2, balanceAfter: 10, adjustmentDirection: null, StockItem: item },
        ],
        transactionsAfterEnd: [
          { stockItemId: 'gloves', transactionType: 'sale', quantity: 3, adjustmentDirection: null },
        ],
        // Current location balance is 7 after the post-period sale of 3;
        // reversing that later movement reconstructs the period-end balance of 10.
        locationBalances: [{ stockItemId: 'gloves', quantity: 7 }],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-10T23:59:59.999Z'),
      undefined,
      { departmentId: 'pharmacy', transactionType: 'sale' },
    );

    expect(report.items[0]).toMatchObject({
      openingStock: 2,
      closingStock: 10,
      quantityIn: 0,
      quantityOut: 2,
    });
    expect(report.summary.totalTransactions).toBe(1);
  });
});


describe('filtered legacy adjustment quantities', () => {
  it('uses the preceding full-ledger balance rather than the preceding visible adjustment', async () => {
    const service = new StockItemService({} as any);
    const item = { id: 'gloves', name: 'Gloves', category: 'consumable', unitOfMeasure: 'box', costPrice: 2, currentStock: 6 };
    (service as any).repo = {
      getLedgerTransactions: async () => ({
        total: 2,
        rows: [
          { id: 'a1', stockItemId: 'gloves', transactionType: 'adjustment', quantity: 1, balanceAfter: 9, transactionDate: new Date('2026-10-02T00:00:00Z'), adjustmentDirection: null, StockItem: item },
          { id: 'a2', stockItemId: 'gloves', transactionType: 'adjustment', quantity: 1, balanceAfter: 6, transactionDate: new Date('2026-10-04T00:00:00Z'), adjustmentDirection: null, StockItem: item },
        ],
        reconciliationRows: [
          { id: 'p1', stockItemId: 'gloves', transactionType: 'purchase', quantity: 10, balanceAfter: 10, adjustmentDirection: null, StockItem: item },
          { id: 'a1', stockItemId: 'gloves', transactionType: 'adjustment', quantity: 1, balanceAfter: 9, adjustmentDirection: null, StockItem: item },
          { id: 's1', stockItemId: 'gloves', transactionType: 'sale', quantity: 4, balanceAfter: 5, adjustmentDirection: null, StockItem: item },
          { id: 'a2', stockItemId: 'gloves', transactionType: 'adjustment', quantity: 1, balanceAfter: 6, adjustmentDirection: null, StockItem: item },
        ],
        transactionsAfterEnd: [],
        locationBalances: [{ stockItemId: 'gloves', quantity: 6 }],
      }),
    };

    const report = await service.getMovementSummary(
      new Date('2026-10-01T00:00:00Z'),
      new Date('2026-10-10T23:59:59.999Z'),
      undefined,
      { departmentId: 'pharmacy', transactionType: 'adjustment' },
    );

    expect(report.items[0]).toMatchObject({
      openingStock: 0,
      closingStock: 6,
      quantityIn: 1,
      quantityOut: 1,
    });
  });
});

describe('historical movement data retrieval', () => {
  it('fetches post-period movements without the activity-type filter for reconciliation', async () => {
    const queries: any[] = [];
    const repository = new StockItemRepository({
      stockTransaction: {
        count: async () => 1,
        findMany: async (args: any) => {
          queries.push(args);
          return [];
        },
      },
      stockItemDepartmentBalance: {
        findMany: async (args: any) => {
          queries.push({ locationBalanceQuery: args });
          return [{ stockItemId: 'item-1', quantity: 0 }];
        },
      },
    } as any);

    const result = await repository.getLedgerTransactions({
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-10T23:59:59.999Z'),
      transactionType: 'sale',
      departmentId: 'pharmacy',
      includeAllStockLocations: false,
      limit: 5000,
    });

    expect(queries).toHaveLength(4);
    expect(queries[0].where.transactionType).toBe('sale');
    expect(queries[1].where.transactionType).toBeUndefined();
    expect(queries[1].where.departmentId).toBe('pharmacy');
    expect(queries[1].where.transactionDate).toEqual({
      gte: new Date('2026-10-01T00:00:00Z'),
      lte: new Date('2026-10-10T23:59:59.999Z'),
    });
    expect(queries[2].where.transactionDate).toEqual({
      gt: new Date('2026-10-10T23:59:59.999Z'),
    });
    expect(queries[2].where.transactionType).toBeUndefined();
    expect(queries[2].where.departmentId).toBe('pharmacy');
    expect(result.transactionsAfterEnd).toEqual([]);
    expect(queries[0].include.StockItem.select.currentStock).toBe(true);
    expect(queries[3].locationBalanceQuery.where).toEqual({ departmentId: 'pharmacy', wardId: null });
    expect(result.locationBalances).toEqual([{ stockItemId: 'item-1', quantity: 0 }]);
  });
});


describe('department movement report ward isolation', () => {
  it('excludes ward ledger rows from both period activity and post-period reconciliation', async () => {
    const transactionQueries: any[] = [];
    const prisma: any = {
      stockItem: {
        findMany: async () => [{
          id: 'gloves', name: 'Gloves', category: 'consumable', currentStock: 20,
          unitOfMeasure: 'box', stockBalances: [{ quantity: 8 }],
        }],
      },
      stockTransaction: {
        findMany: async (args: any) => {
          transactionQueries.push(args);
          return [];
        },
      },
    };
    const repository = new StockTransactionRepository(prisma);

    await repository.getMovementData(
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-15T23:59:59.999Z'),
      undefined,
      { departmentId: 'pharmacy' },
    );

    expect(transactionQueries).toHaveLength(2);
    expect(transactionQueries[0].where).toMatchObject({ departmentId: 'pharmacy', wardId: null });
    expect(transactionQueries[1].where).toMatchObject({ departmentId: 'pharmacy', wardId: null });
  });
});


describe('stock report date boundaries', () => {
  it('uses the local calendar day for both date-only boundaries', async () => {
    const { parseReportBoundary } = await import('../src/utils/reportDates');
    const start = parseReportBoundary('2026-10-21', 'start');
    const end = parseReportBoundary('2026-10-21', 'end');

    expect(start).toBeDefined();
    expect(end).toBeDefined();
    expect(start!.getFullYear()).toBe(2026);
    expect(start!.getMonth()).toBe(9);
    expect(start!.getDate()).toBe(21);
    expect(start!.getHours()).toBe(0);
    expect(end!.getFullYear()).toBe(2026);
    expect(end!.getMonth()).toBe(9);
    expect(end!.getDate()).toBe(21);
    expect(end!.getHours()).toBe(23);
    expect(end!.getMinutes()).toBe(59);
    expect(end!.getSeconds()).toBe(59);
    expect(end!.getMilliseconds()).toBe(999);
  });

  it('preserves explicit timestamps and rejects invalid boundaries', async () => {
    const { parseReportBoundary } = await import('../src/utils/reportDates');
    const timestamp = '2026-10-21T12:34:56.000Z';

    expect(parseReportBoundary(timestamp, 'start')?.toISOString()).toBe(timestamp);
    expect(parseReportBoundary(timestamp, 'end')?.toISOString()).toBe(timestamp);
    expect(parseReportBoundary('not-a-date', 'start')).toBeUndefined();
    expect(parseReportBoundary('', 'end')).toBeUndefined();
  });
});


describe('expiry report calendar-day boundaries', () => {
  it('does not classify a batch expiring today as already expired', async () => {
    const expiryToday = new Date();
    expiryToday.setUTCHours(0, 0, 0, 0);
    const service = new StockItemService({} as any);
    (service as any).repo = {
      getItemsForExpiryReport: async () => [{
        id: 'item-expiring-today',
        name: 'Batch expiring today',
        currentStock: 2,
        costPrice: 5,
        expiryDate: null,
        StockBatch: [{
          batchNumber: 'TODAY-1',
          expiryDate: expiryToday,
          quantity: 2,
          costPrice: '5.00',
        }],
      }],
      getExpiringBatches: async () => [],
    };

    const report = await service.getExpiryReport(30);

    expect(report.expiringSoon.map((item: any) => item.id)).toContain('item-expiring-today');
    expect(report.expired.map((item: any) => item.id)).not.toContain('item-expiring-today');
  });
});


describe('consumable correction movement reconciliation', () => {
  it('excludes superseded consumable uses from activity totals but keeps reversals in balance reconciliation', async () => {
    const service = new StockTransactionService({} as any);
    (service as any).repo = {
      getMovementData: async () => ({
        stockItems: [{
          id: 'gloves',
          name: 'Examination gloves',
          category: 'consumable',
          unitOfMeasure: 'pair',
          currentStock: 20,
        }],
        transactions: [
          { stockItemId: 'gloves', transactionType: 'purchase', quantity: 10 },
          {
            stockItemId: 'gloves',
            transactionType: 'sale',
            quantity: 2,
            notes: 'Consumable use: [EDITED] old entry',
          },
          {
            stockItemId: 'gloves',
            transactionType: 'adjustment',
            quantity: 2,
            notes: 'Consumable use edit reversal: old-entry',
          },
          {
            stockItemId: 'gloves',
            transactionType: 'sale',
            quantity: 3,
            notes: 'Consumable use: replacement entry',
          },
          {
            stockItemId: 'gloves',
            transactionType: 'sale',
            quantity: 1,
            notes: 'Consumable use: [DELETED] removed entry',
          },
          {
            stockItemId: 'gloves',
            transactionType: 'adjustment',
            quantity: 1,
            notes: 'Consumable use deletion reversal: removed-entry',
          },
        ],
        transactionsAfterEnd: [],
      }),
    };

    const report = await service.getMovementSummary({
      includeAllStockLocations: true,
      startDate: new Date('2026-10-01T00:00:00Z'),
      endDate: new Date('2026-10-20T23:59:59.999Z'),
    });

    expect(report.items[0]).toMatchObject({
      purchases: 10,
      sales: 3,
      adjustments: 0,
      adjustmentIn: 0,
      adjustmentOut: 0,
      openingStock: 13,
      closingStock: 20,
      netChange: 7,
    });
  });
});
