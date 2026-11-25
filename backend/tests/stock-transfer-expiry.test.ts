import { describe, expect, it, vi } from 'vitest';
import { StockTransferService } from '../src/modules/stockTransfer/StockTransferService';
import { annotateTransferReconciliation } from '../src/modules/stockTransfer/StockTransferRepository';

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

  it('rejects null expiry and cost metadata before changing destination stock', async () => {
    for (const invalidAllocation of [
      { batchId: 'batch-null-expiry', quantity: 4, batchNumber: 'LOT-NULL-EXPIRY', expiryDate: null, costPrice: '12.50' },
      { batchId: 'batch-null-cost', quantity: 4, batchNumber: 'LOT-NULL-COST', expiryDate: new Date(Date.now() + 86400000).toISOString(), costPrice: null },
    ]) {
      const transfer = {
        id: `transfer-${invalidAllocation.batchId}`,
        status: 'dispatched',
        receivedAt: null,
        destinationId: 'pharmacy',
        origin: { name: 'Main Store' },
        destination: { id: 'pharmacy' },
        items: [{
          id: `item-${invalidAllocation.batchId}`,
          stockItemId: 'item-1',
          quantitySent: 4,
          quantityReceived: 0,
          batchAllocations: [invalidAllocation],
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

      await expect(service.receiveTransfer(transfer.id, 'user-1'))
        .rejects.toThrow(/invalid batch metadata or quantity/i);
      expect(balanceUpsert).not.toHaveBeenCalled();
      expect(tx.stockBatch.create).not.toHaveBeenCalled();
      expect(tx.stockTransaction.create).not.toHaveBeenCalled();
    }
  });
});


describe('stock transfer approval concurrency', () => {
  it('claims a requested transfer atomically before recording approval', async () => {
    const transfer = { id: 'transfer-approval', status: 'requested' };
    const approved = { ...transfer, status: 'approved', approvedById: 'user-1' };
    const findUnique = vi.fn().mockResolvedValueOnce(transfer).mockResolvedValueOnce(approved);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx: any = { stockTransfer: { findUnique, updateMany } };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new StockTransferService(prisma);

    await expect(service.approveTransfer('transfer-approval', 'user-1')).resolves.toEqual(approved);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'transfer-approval', status: 'requested' },
      data: { status: 'approved', approvedById: 'user-1' },
    });
  });

  it('rejects a concurrent approval when another request already changed the status', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'transfer-approval', status: 'requested' });
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const tx: any = { stockTransfer: { findUnique, updateMany } };
    const prisma: any = { $transaction: vi.fn(async (callback: any) => callback(tx)) };
    const service = new StockTransferService(prisma);

    await expect(service.approveTransfer('transfer-approval', 'user-2'))
      .rejects.toThrow(/already approved or its status changed/i);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});


describe('transfer receipt calendar-day expiry', () => {
  it('keeps a batch active when it is received on its recorded expiry day', async () => {
    const expiryToday = new Date();
    expiryToday.setUTCHours(0, 0, 0, 0);
    const transfer = {
      id: 'transfer-expiry-today',
      status: 'dispatched',
      receivedAt: null,
      destinationId: 'pharmacy',
      origin: { name: 'Main Store' },
      destination: { id: 'pharmacy' },
      items: [{
        id: 'transfer-item-expiry-today',
        stockItemId: 'item-1',
        quantitySent: 2,
        quantityReceived: 0,
        batchAllocations: [{
          batchId: 'batch-origin',
          quantity: 2,
          batchNumber: 'LOT-EXPIRES-TODAY',
          expiryDate: expiryToday.toISOString(),
          costPrice: '5.00',
        }],
      }],
    };
    const batchCreate = vi.fn().mockResolvedValue({ id: 'destination-batch' });
    const tx: any = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValueOnce(transfer).mockResolvedValueOnce({ ...transfer, status: 'received' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: { upsert: vi.fn().mockResolvedValue({ quantity: 2 }) },
      stockBatch: { findFirst: vi.fn().mockResolvedValue(null), create: batchCreate },
      stockTransaction: { create: vi.fn().mockResolvedValue({ id: 'movement-1' }) },
      stockTransferItem: { update: vi.fn().mockResolvedValue({}) },
    };
    const service = new StockTransferService({ $transaction: async (callback: any) => callback(tx) } as any);

    await service.receiveTransfer(transfer.id, 'user-1');

    expect(batchCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ batchNumber: 'LOT-EXPIRES-TODAY', isActive: true }),
    });
  });
});


describe('stock transfer dispatch batch reconciliation', () => {
  it('reserves exact eligible FEFO batch allocations without changing hospital aggregate stock', async () => {
    const transfer = {
      id: 'transfer-dispatch',
      status: 'approved',
      originId: 'pharmacy',
      destinationId: 'main-store',
      transferNumber: 'TR-2026-001',
      items: [{
        id: 'transfer-item-1',
        stockItemId: 'item-1',
        quantityRequested: 3,
        quantitySent: 0,
        quantityReceived: 0,
      }],
    };
    const batches = [
      {
        id: 'batch-near-expiry', batchNumber: 'LOT-A', quantity: 2,
        expiryDate: new Date('2027-01-01T00:00:00Z'), costPrice: '2.50',
      },
      {
        id: 'batch-later', batchNumber: 'LOT-B', quantity: 5,
        expiryDate: new Date('2027-06-01T00:00:00Z'), costPrice: '3.00',
      },
    ];
    const batchUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const movementCreate = vi.fn().mockResolvedValue({ id: 'movement-out' });
    const transferItemUpdate = vi.fn().mockResolvedValue({});
    const transferFindUnique = vi.fn()
      .mockResolvedValueOnce(transfer)
      .mockResolvedValueOnce({ ...transfer, status: 'dispatched' });
    const tx: any = {
      stockTransfer: {
        findUnique: transferFindUnique,
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockTransferItem: { update: transferItemUpdate },
      stockBatch: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue(batches),
        updateMany: batchUpdate,
      },
      stockItemDepartmentBalance: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUnique: vi.fn().mockResolvedValue({ quantity: 7 }),
      },
      stockTransaction: { create: movementCreate },
      stockItem: { update: vi.fn(), updateMany: vi.fn() },
    };
    const service = new StockTransferService({ $transaction: async (callback: any) => callback(tx) } as any);

    await service.dispatchTransfer('transfer-dispatch', 'user-1');

    expect(batchUpdate).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'batch-near-expiry', stockItemId: 'item-1', batchNumber: 'LOT-A',
        departmentId: 'pharmacy', wardId: null, isActive: true,
        expiryDate: new Date('2027-01-01T00:00:00Z'), costPrice: '2.50', quantity: { gte: 2 },
      },
      data: { quantity: { decrement: 2 } },
    });
    expect(batchUpdate).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'batch-later', stockItemId: 'item-1', batchNumber: 'LOT-B',
        departmentId: 'pharmacy', wardId: null, isActive: true,
        expiryDate: new Date('2027-06-01T00:00:00Z'), costPrice: '3.00', quantity: { gte: 1 },
      },
      data: { quantity: { decrement: 1 } },
    });
    expect(transferItemUpdate).toHaveBeenCalledWith({
      where: { id: 'transfer-item-1' },
      data: {
        quantitySent: 3,
        batchAllocations: [
          expect.objectContaining({ batchId: 'batch-near-expiry', batchNumber: 'LOT-A', quantity: 2, costPrice: '2.50' }),
          expect.objectContaining({ batchId: 'batch-later', batchNumber: 'LOT-B', quantity: 1, costPrice: '3.00' }),
        ],
      },
    });
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        transactionType: 'transfer_out', quantity: 3,
        batchAllocations: [
          expect.objectContaining({ batchId: 'batch-near-expiry', quantity: 2 }),
          expect.objectContaining({ batchId: 'batch-later', quantity: 1 }),
        ],
      }),
    });
    expect(tx.stockItem.update).not.toHaveBeenCalled();
    expect(tx.stockItem.updateMany).not.toHaveBeenCalled();
  });
});


describe('stock transfer register reconciliation diagnostics', () => {
  it('shows the safe in-transit quantity and flags a legacy partial receipt still marked dispatched', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-legacy-partial',
      status: 'dispatched',
      items: [{
        id: 'item-legacy-partial',
        stockItemId: 'stock-1',
        quantityRequested: 10,
        quantitySent: 10,
        quantityReceived: 3,
        batchAllocations: [],
        stockItem: { id: 'stock-1', name: 'Gloves', _count: { StockBatch: 0 } },
      }],
    });

    expect(result.items[0].quantityInTransit).toBe(7);
    expect(result.hasStockInTransit).toBe(true);
    expect(result.hasReconciliationIssues).toBe(true);
    expect(result.reconciliationIssues).toEqual([expect.objectContaining({
      itemId: 'item-legacy-partial',
      stockItemId: 'stock-1',
      issue: expect.stringMatching(/still marked dispatched/i),
    })]);
  });

  it('does not report missing batch allocations for non-batch-tracked stock', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-non-batch',
      status: 'dispatched',
      items: [{
        id: 'item-non-batch',
        stockItemId: 'stock-2',
        quantityRequested: 5,
        quantitySent: 5,
        quantityReceived: 0,
        stockItem: { id: 'stock-2', name: 'Cotton wool', _count: { StockBatch: 0 } },
      }],
    });

    expect(result.items[0].quantityInTransit).toBe(5);
    expect(result.items[0].reconciliationIssues).toEqual([]);
    expect(result.hasReconciliationIssues).toBe(false);
  });

  it('flags a dispatched quantity that differs from the original request', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-request-mismatch',
      status: 'dispatched',
      items: [{
        id: 'item-request-mismatch',
        stockItemId: 'stock-request-mismatch',
        quantityRequested: 10,
        quantitySent: 8,
        quantityReceived: 0,
        stockItem: { id: 'stock-request-mismatch', name: 'Gloves', _count: { StockBatch: 0 } },
      }],
    });

    expect(result.items[0].quantityInTransit).toBe(8);
    expect(result.hasReconciliationIssues).toBe(true);
    expect(result.reconciliationIssues.some((entry: any) => /does not match the originally requested quantity/i.test(entry.issue))).toBe(true);
  });

  it('flags completed transfers whose received quantity differs from sent quantity', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-mismatch',
      status: 'received',
      items: [{
        id: 'item-mismatch',
        stockItemId: 'stock-3',
        quantityRequested: 8,
        quantitySent: 8,
        quantityReceived: 6,
        stockItem: { id: 'stock-3', name: 'Syringes', _count: { StockBatch: 0 } },
      }],
    });

    expect(result.items[0].quantityInTransit).toBe(0);
    expect(result.hasReconciliationIssues).toBe(true);
    expect(result.reconciliationIssues[0].issue).toMatch(/sent and received quantities do not match/i);
  });

  it('does not disguise invalid quantities as a normal in-transit balance', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-invalid-qty',
      status: 'dispatched',
      items: [{
        id: 'item-invalid-qty',
        stockItemId: 'stock-4',
        quantityRequested: 4,
        quantitySent: 4,
        quantityReceived: 7,
        stockItem: { id: 'stock-4', name: 'Bandages', _count: { StockBatch: 0 } },
      }],
    });

    expect(result.items[0].quantityInTransit).toBe(0);
    expect(result.hasStockInTransit).toBe(false);
    expect(result.hasReconciliationIssues).toBe(true);
    expect(result.reconciliationIssues.some((entry: any) => /exceeds quantity sent/i.test(entry.issue))).toBe(true);
  });

  it('flags missing batch allocations only for batch-tracked stock', () => {
    const result = annotateTransferReconciliation({
      id: 'transfer-missing-batches',
      status: 'dispatched',
      items: [{
        id: 'item-missing-batches',
        stockItemId: 'stock-5',
        quantityRequested: 4,
        quantitySent: 4,
        quantityReceived: 0,
        batchAllocations: [],
        stockItem: { id: 'stock-5', name: 'Amoxicillin', _count: { StockBatch: 2 } },
      }],
    });

    expect(result.hasReconciliationIssues).toBe(true);
    expect(result.reconciliationIssues[0].issue).toMatch(/allocation total does not match quantity sent/i);
  });
});

describe('transfer receipt destination batch race protection', () => {
  it('rejects the receipt if the existing destination batch changes location before increment', async () => {
    const expiryDate = new Date(Date.now() + 30 * 86400000);
    const transfer = {
      id: 'transfer-destination-race',
      status: 'dispatched',
      receivedAt: null,
      destinationId: 'pharmacy',
      origin: { name: 'Main Store' },
      destination: { id: 'pharmacy' },
      items: [{
        id: 'transfer-item-destination-race',
        stockItemId: 'item-1',
        quantitySent: 2,
        quantityReceived: 0,
        batchAllocations: [{
          batchId: 'origin-batch',
          quantity: 2,
          batchNumber: 'LOT-RACE',
          expiryDate: expiryDate.toISOString(),
          costPrice: '5.00',
        }],
      }],
    };
    const batchUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
    const movementCreate = vi.fn();
    const tx: any = {
      stockTransfer: {
        findUnique: vi.fn().mockResolvedValueOnce(transfer).mockResolvedValueOnce({ ...transfer, status: 'received' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      stockItemDepartmentBalance: { upsert: vi.fn().mockResolvedValue({ quantity: 2 }) },
      stockBatch: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'destination-batch',
          stockItemId: 'item-1',
          batchNumber: 'LOT-RACE',
          departmentId: 'pharmacy',
          wardId: null,
          expiryDate,
          costPrice: '5.00',
          isActive: true,
        }),
        updateMany: batchUpdateMany,
        create: vi.fn(),
      },
      stockTransaction: { create: movementCreate },
      stockTransferItem: { update: vi.fn() },
    };
    const service = new StockTransferService({ $transaction: async (callback: any) => callback(tx) } as any);

    await expect(service.receiveTransfer(transfer.id, 'user-1'))
      .rejects.toThrow(/destination batch LOT-RACE changed during transfer receipt/i);

    expect(batchUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'destination-batch',
        stockItemId: 'item-1',
        batchNumber: 'LOT-RACE',
        departmentId: 'pharmacy',
        wardId: null,
        expiryDate,
        isActive: true,
      },
      data: { quantity: { increment: 2 } },
    });
    expect(movementCreate).not.toHaveBeenCalled();
    expect(tx.stockTransferItem.update).not.toHaveBeenCalled();
  });
});
