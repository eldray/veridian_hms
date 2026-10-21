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

  it('rejects malformed saved batch allocations before changing destination stock', async () => {
    const transfer = {
      id: 'transfer-invalid-allocation',
      status: 'dispatched',
      receivedAt: null,
      destinationId: 'pharmacy',
      origin: { name: 'Main Store' },
      destination: { id: 'pharmacy' },
      items: [{
        id: 'transfer-item-invalid',
        stockItemId: 'item-1',
        quantitySent: 4,
        quantityReceived: 0,
        batchAllocations: [{
          batchId: 'batch-origin',
          quantity: -1,
          batchNumber: 'LOT-1',
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
          costPrice: '12.50',
        }, {
          batchId: 'batch-origin-2',
          quantity: 5,
          batchNumber: 'LOT-2',
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
          costPrice: '12.50',
        }],
      }],
    };
    const balanceUpsert = vi.fn().mockResolvedValue({ quantity: 4 });
    const tx: any = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue(transfer),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: { upsert: balanceUpsert },
      stockBatch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      stockTransaction: { create: vi.fn() },
      stockTransferItem: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new StockTransferService(prisma);

    await expect(service.receiveTransfer('transfer-invalid-allocation', 'user-1'))
      .rejects.toThrow(/invalid batch metadata or quantity/i);

    expect(balanceUpsert).not.toHaveBeenCalled();
    expect(tx.stockBatch.create).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });


  it('rejects a non-array saved allocation payload before changing destination stock', async () => {
    const transfer = {
      id: 'transfer-malformed-payload',
      status: 'dispatched',
      receivedAt: null,
      destinationId: 'pharmacy',
      origin: { name: 'Main Store' },
      destination: { id: 'pharmacy' },
      items: [{
        id: 'transfer-item-malformed',
        stockItemId: 'item-1',
        quantitySent: 4,
        quantityReceived: 0,
        batchAllocations: { quantity: 4, batchNumber: 'LOT-1' },
      }],
    };
    const balanceUpsert = vi.fn();
    const tx: any = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValue(transfer),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: { upsert: balanceUpsert },
      stockBatch: { count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      stockTransaction: { create: vi.fn() },
      stockTransferItem: { update: vi.fn() },
    };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new StockTransferService(prisma);

    await expect(service.receiveTransfer('transfer-malformed-payload', 'user-1'))
      .rejects.toThrow(/saved batch allocations.*malformed/i);

    expect(balanceUpsert).not.toHaveBeenCalled();
    expect(tx.stockBatch.create).not.toHaveBeenCalled();
    expect(tx.stockTransaction.create).not.toHaveBeenCalled();
  });
});
