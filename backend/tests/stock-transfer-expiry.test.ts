import { describe, expect, it, vi } from 'vitest';
import { StockTransferService } from '../src/modules/stockTransfer/StockTransferService';

describe('stock transfer receipt expiry safety', () => {
  it('receives a batch that expired in transit as inactive stock for reconciliation', async () => {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const transfer = {
      id: 'transfer-1',
      status: 'dispatched',
      receivedAt: null,
      destinationId: 'pharmacy',
      origin: { name: 'Main Store' },
      destination: { id: 'pharmacy' },
      items: [{
        id: 'transfer-item-1',
        stockItemId: 'item-1',
        quantitySent: 4,
        quantityReceived: 0,
        batchAllocations: [{
          batchId: 'batch-origin',
          quantity: 4,
          batchNumber: 'LOT-EXPIRED',
          expiryDate: expiredDate.toISOString(),
          costPrice: '12.50',
        }],
      }],
    };
    const batchCreate = vi.fn().mockResolvedValue({ id: 'destination-batch' });
    const batchFindFirst = vi.fn().mockResolvedValue(null);
    const tx: any = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue(transfer),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: {
        upsert: vi.fn().mockResolvedValue({ quantity: 4 }),
      },
      stockBatch: {
        findFirst: batchFindFirst,
        create: batchCreate,
      },
      stockTransaction: { create: vi.fn().mockResolvedValue({ id: 'movement-1' }) },
      stockTransferItem: { update: vi.fn().mockResolvedValue({}) },
    };
    tx.stockTransfer.findUnique.mockResolvedValueOnce(transfer).mockResolvedValueOnce({ ...transfer, status: 'received' });
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new StockTransferService(prisma);

    await service.receiveTransfer('transfer-1', 'user-1');

    expect(batchCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        batchNumber: 'LOT-EXPIRED',
        quantity: 4,
        departmentId: 'pharmacy',
        isActive: false,
      }),
    });
  });
});
