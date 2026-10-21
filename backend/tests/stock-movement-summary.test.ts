import { describe, expect, it } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';
import { StockItemService } from '../src/modules/stockItem/StockItemService';

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

    expect(report.totalValue).toBe(38);
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

