import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { StockTransferRepository } from './StockTransferRepository';
import { CreateTransferDTO, TransferQueryParams } from './StockTransferTypes';
import { getCounterService } from '../../services/CounterService';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockItemRepository';


export class StockTransferService extends BaseService {
  private repo: StockTransferRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('StockTransferService');
    this.prisma = prisma;
    this.repo = new StockTransferRepository(prisma);
  }

  async getAllTransfers(filters: TransferQueryParams) {
    return this.repo.findAll(filters);
  }

  async getTransferById(id: string) {
    const transfer = await this.repo.findByIdWithDetails(id);
    if (!transfer) throw new Error('Transfer not found');
    return transfer;
  }

  async requestTransfer(data: CreateTransferDTO, userId: string) {
    if (!data?.originId || !data?.destinationId) {
      throw new ValidationError('Origin and destination departments are required');
    }
    if (data.originId === data.destinationId) {
      throw new ValidationError('Origin and destination must be different departments');
    }
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new ValidationError('A transfer must contain at least one item');
    }

    const seenItems = new Set<string>();
    for (const item of data.items) {
      if (!item?.stockItemId) throw new ValidationError('Every transfer item must specify a stock item');
      if (seenItems.has(item.stockItemId)) {
        throw new ValidationError('Duplicate stock items are not allowed in one transfer; combine their quantities');
      }
      seenItems.add(item.stockItemId);
      if (!Number.isSafeInteger(item.quantityRequested) || item.quantityRequested <= 0) {
        throw new ValidationError('Transfer quantities must be positive whole numbers');
      }
    }

    const [origin, destination, stockItems, requester] = await Promise.all([
      this.prisma.department.findUnique({ where: { id: data.originId }, select: { id: true } }),
      this.prisma.department.findUnique({ where: { id: data.destinationId }, select: { id: true } }),
      this.prisma.stockItem.findMany({
        where: { id: { in: [...seenItems] }, isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, departmentId: true, isActive: true } }),
    ]);
    if (!requester?.isActive) throw new ValidationError('An active signed-in user is required to request a transfer');
    const role = String(requester.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    if (!isAdmin && requester.departmentId !== data.originId) {
      throw new ValidationError('You can only request a transfer from your assigned department');
    }
    if (!origin) throw new NotFoundError('Origin department', data.originId);
    if (!destination) throw new NotFoundError('Destination department', data.destinationId);
    if (stockItems.length !== seenItems.size) {
      const found = new Set(stockItems.map((item: { id: string }) => item.id));
      const missingId = [...seenItems].find(id => !found.has(id));
      throw new ValidationError(`Stock item ${missingId || ''} does not exist or is inactive`);
    }

    this.logInfo('Requesting stock transfer', { origin: data.originId, destination: data.destinationId });
    const transferNumber = getCounterService().nextTransferNumber();
    return this.repo.createTransfer(data, userId, transferNumber);
  }

  async approveTransfer(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id } });
      if (!transfer || transfer.status !== 'requested') throw new Error('Only requested transfers can be approved');
      
      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'approved', approvedById: userId }
      });
    });
  }

  async dispatchTransfer(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { items: true } });
      if (!transfer || transfer.status !== 'approved') throw new Error('Transfer must be approved before dispatching');

      // 1. Verify origin availability. Batch-tracked items use eligible batches;
      // non-batch supplies use the canonical department balance.
      for (const item of transfer.items) {
        const batchCount = await tx.stockBatch.count({ where: { stockItemId: item.stockItemId } });
        const batches: Array<{ id: string; quantity: number; batchNumber: string; expiryDate: Date; costPrice: any }> = batchCount > 0
          ? await this.repo.getBatchesByDepartment(item.stockItemId, transfer.originId, tx)
          : [];
        const balance = batchCount === 0 ? await tx.stockItemDepartmentBalance.findUnique({
          where: { stockItemId_locationKey: { stockItemId: item.stockItemId, locationKey: transfer.originId } },
          select: { quantity: true },
        }) : null;
        const totalAvailable = batchCount > 0
          ? batches.reduce((sum, b) => sum + b.quantity, 0)
          : (balance?.quantity ?? 0);

        if (totalAvailable < item.quantityRequested) {
          throw new Error(`Insufficient stock in Origin for item ${item.stockItemId}. Available: ${totalAvailable}, Requested: ${item.quantityRequested}`);
        }
        
        // Reserve physical stock at dispatch so the origin cannot sell/use it again
        // while the transfer is in transit. Persist exact batch allocations for receipt.
        const qty = item.quantityRequested;
        const originBalanceAfter = await decreaseDepartmentStockBalance(tx, item.stockItemId, transfer.originId, qty);
        const allocations: Array<{ batchId: string; quantity: number; batchNumber: string; expiryDate: Date; costPrice: any }> = [];
        let remaining = qty;
        if (batchCount > 0) {
          for (const batch of batches) {
            if (remaining <= 0) break;
            const take = Math.min(batch.quantity, remaining);
            const claimed = await tx.stockBatch.updateMany({
              where: { id: batch.id, departmentId: transfer.originId, wardId: null, isActive: true, expiryDate: { gt: new Date() }, quantity: { gte: take } },
              data: { quantity: { decrement: take } },
            });
            if (claimed.count !== 1) throw new Error('Origin batch stock changed during dispatch. Refresh and retry.');
            allocations.push({ batchId: batch.id, quantity: take, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate, costPrice: String(batch.costPrice) });
            remaining -= take;
          }
          if (remaining > 0) throw new Error('Not enough eligible batch stock to reserve the full transfer quantity');
        }
        await tx.stockTransaction.create({
          data: {
            stockItemId: item.stockItemId, transactionType: 'transfer_out', quantity: qty,
            balanceAfter: originBalanceAfter.quantity, departmentId: transfer.originId,
            reference: transfer.transferNumber, notes: `Dispatched to ${transfer.destinationId}; stock reserved in transit`, performedBy: userId,
            batchAllocations: allocations.length ? allocations as any : undefined,
          },
        });
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { quantitySent: qty, batchAllocations: allocations.length ? allocations as any : undefined },
        });
      }

      // Claim the approved transfer exactly once. This guards against two
      // dispatch requests racing and both treating the same transfer as pending.
      const dispatchClaim = await tx.stockTransfer.updateMany({
        where: { id, status: 'approved' },
        data: { status: 'dispatched', dispatchedAt: new Date() },
      });
      if (dispatchClaim.count !== 1) {
        throw new Error('Transfer was already dispatched or its status changed. Refresh and try again.');
      }

      return tx.stockTransfer.findUnique({
        where: { id },
        include: { items: true, origin: true, destination: true },
      });
    });
  }

  // ==========================================
  // RECEIVE TRANSFER (The Magic Logic)
  // ==========================================
  async receiveTransfer(id: string, userId: string) {
    this.logInfo('Receiving stock transfer', { id });
    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({ where: { id }, include: { items: true, origin: true, destination: true } });
      if (!transfer || transfer.status !== 'dispatched') throw new Error('Transfer must be dispatched before receiving');

      const receiptClaim = await tx.stockTransfer.updateMany({
        where: { id, status: 'dispatched', receivedAt: null },
        data: { status: 'received', receivedAt: new Date() },
      });
      if (receiptClaim.count !== 1) throw new Error('Transfer has already been received or its status changed. Refresh and try again.');

      for (const item of transfer.items) {
        if (item.quantityReceived !== 0) throw new Error(`Transfer item ${item.id} already has received quantity; refusing duplicate receipt`);
        const qty = item.quantitySent;
        if (!Number.isSafeInteger(qty) || qty <= 0) throw new Error(`Transfer item ${item.id} has no valid dispatched quantity`);

        // Origin stock and batches were already deducted/reserved at dispatch.
        // Receipt only adds the reserved quantity to the destination, preserving hospital total.
        const destinationBalanceAfter = await increaseDepartmentStockBalance(tx, item.stockItemId, transfer.destinationId, qty);
        const allocations = Array.isArray(item.batchAllocations) ? item.batchAllocations as Array<{ batchId: string; quantity: number; batchNumber: string; expiryDate: string | Date; costPrice: any }> : [];

        if (allocations.length) {
          const allocated = allocations.reduce((sum, a) => sum + Number(a.quantity), 0);
          if (allocated !== qty) throw new Error(`Saved batch allocations for transfer item ${item.id} do not match dispatched quantity`);
          for (const allocation of allocations) {
            const existing = await tx.stockBatch.findFirst({
              where: { stockItemId: item.stockItemId, batchNumber: allocation.batchNumber, departmentId: transfer.destinationId, wardId: null },
            });
            if (existing) {
              const expectedExpiry = new Date(allocation.expiryDate);
              if (existing.expiryDate.getTime() !== expectedExpiry.getTime()) {
                throw new Error(`Destination already has batch ${allocation.batchNumber} with a different expiry date. Reconcile the batch before receiving this transfer.`);
              }
              if (Number(existing.costPrice) !== Number(allocation.costPrice)) {
                throw new Error(`Destination already has batch ${allocation.batchNumber} with a different cost price. Reconcile the batch before receiving this transfer.`);
              }
              const expiredAtReceipt = expectedExpiry <= new Date();
              if (!existing.isActive && !expiredAtReceipt) {
                throw new Error(`Destination batch ${allocation.batchNumber} is inactive. Reconcile the batch before receiving this transfer.`);
              }
              await tx.stockBatch.update({
                where: { id: existing.id },
                data: {
                  quantity: { increment: allocation.quantity },
                  ...(expiredAtReceipt ? { isActive: false } : {}),
                },
              });
            } else {
              await tx.stockBatch.create({
                data: {
                  stockItemId: item.stockItemId, batchNumber: allocation.batchNumber,
                  expiryDate: new Date(allocation.expiryDate), costPrice: allocation.costPrice,
                  quantity: allocation.quantity, departmentId: transfer.destinationId, receivedDate: new Date(),
                  // A batch that expires in transit must be received for reconciliation,
                  // but must not remain available for dispensing at the destination.
                  isActive: new Date(allocation.expiryDate) > new Date(),
                },
              });
            }
          }
        } else {
          // Backward compatibility for transfers created before batch allocations were saved.
          const batchCount = await tx.stockBatch.count({ where: { stockItemId: item.stockItemId } });
          if (batchCount > 0) throw new Error(`Transfer item ${item.id} has no saved batch allocations. Reconcile this legacy transfer before receipt.`);
        }

        await tx.stockTransaction.create({
          data: {
            stockItemId: item.stockItemId, transactionType: 'transfer_in', quantity: qty,
            balanceAfter: destinationBalanceAfter.quantity, departmentId: transfer.destinationId,
            reference: transfer.transferNumber, notes: `Received reserved stock from ${transfer.origin.name}`, performedBy: userId,
            batchAllocations: allocations.length ? allocations as any : undefined,
          },
        });
        await tx.stockTransferItem.update({ where: { id: item.id }, data: { quantityReceived: qty } });
      }

      return tx.stockTransfer.findUnique({ where: { id }, include: { origin: true, destination: true, items: true } });
    });
  }
}