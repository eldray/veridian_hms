import { describe, expect, it } from 'vitest';
import { StockTransactionService } from '../src/modules/stockTransaction/StockTransactionService';

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
