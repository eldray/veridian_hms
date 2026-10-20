import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { StockTransferRepository } from './StockTransferRepository';
import { CreateTransferDTO, TransferQueryParams } from './StockTransferTypes';
import { getCounterService } from '../../services/CounterService';
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
    this.logInfo('Requesting stock transfer', { origin: data.originId, destination: data.destinationId });
    const transferNumber = getCounterService().nextTransferNumber(); // Add this to your CounterService!
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
        const batches = batchCount > 0
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
        
        // Mark as sent
        await tx.stockTransferItem.update({ where: { id: item.id }, data: { quantitySent: item.quantityRequested } });
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'dispatched', dispatchedAt: new Date() }
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

      for (const item of transfer.items) {
        let qtyToReceive = item.quantitySent;

        if (!Number.isSafeInteger(qtyToReceive) || qtyToReceive <= 0) {
          throw new Error(`Transfer item ${item.id} has no valid dispatched quantity`);
        }
        // Internal transfer moves the balance between departments without changing
        // StockItem.currentStock (the hospital-wide aggregate).
        const originBalanceAfter = await decreaseDepartmentStockBalance(tx, item.stockItemId, transfer.originId, qtyToReceive);
        const destinationBalanceAfter = await increaseDepartmentStockBalance(tx, item.stockItemId, transfer.destinationId, qtyToReceive);

        // Batch-tracked items move their physical batches. Non-batch supplies move only
        // their location balances; both paths preserve the hospital-wide total.
        const batchCount = await tx.stockBatch.count({ where: { stockItemId: item.stockItemId } });
        const originBatches = batchCount > 0
          ? await this.repo.getBatchesByDepartment(item.stockItemId, transfer.originId, tx)
          : [];

        for (const batch of originBatches) {
          if (qtyToReceive <= 0) break;

          const qtyToMove = Math.min(batch.quantity, qtyToReceive);

          // 1. Deduct from Origin Batch
          const originBatchUpdate = await tx.stockBatch.updateMany({
            where: {
              id: batch.id, departmentId: transfer.originId, wardId: null,
              isActive: true, expiryDate: { gt: new Date() }, quantity: { gte: qtyToMove },
            },
            data: { quantity: { decrement: qtyToMove } },
          });
          if (originBatchUpdate.count !== 1) {
            throw new Error('Origin batch stock changed during transfer receipt. Please retry.');
          }

          // 2. Create (or merge) Batch in Destination Department
          let destBatch = await tx.stockBatch.findFirst({
            where: { stockItemId: item.stockItemId, batchNumber: batch.batchNumber, departmentId: transfer.destinationId, wardId: null }
          });

          if (destBatch) {
            // Merge into existing batch at destination
            await tx.stockBatch.update({ where: { id: destBatch.id }, data: { quantity: { increment: qtyToMove } } });
          } else {
            // Create a new batch record at destination (Batch Splitting)
            await tx.stockBatch.create({
              data: {
                stockItemId: item.stockItemId,
                batchNumber: batch.batchNumber, // Keeps the same batch number for traceability!
                expiryDate: batch.expiryDate,
                costPrice: batch.costPrice,
                quantity: qtyToMove,
                departmentId: transfer.destinationId, // ✅ Assigns to the new location
                receivedDate: new Date()
              }
            });
          }

          // 3. Create Audit Transactions (Global stock doesn't change, we just log the movement)
          await tx.stockTransaction.create({
            data: {
              stockItemId: item.stockItemId, transactionType: 'transfer_out', quantity: qtyToMove,
              balanceAfter: originBalanceAfter.quantity, departmentId: transfer.originId,
              reference: transfer.transferNumber, notes: `Transferred to ${transfer.destination.name}`, performedBy: userId
            }
          });

          await tx.stockTransaction.create({
            data: {
              stockItemId: item.stockItemId, transactionType: 'transfer_in', quantity: qtyToMove,
              balanceAfter: destinationBalanceAfter.quantity, departmentId: transfer.destinationId,
              reference: transfer.transferNumber, notes: `Received from ${transfer.origin.name}`, performedBy: userId
            }
          });

          // 4. Update the transfer item record
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: { increment: qtyToMove } }
          });

          qtyToReceive -= qtyToMove;
        }
        if (batchCount > 0 && qtyToReceive > 0) {
          throw new Error(`Transfer item ${item.id} no longer has enough usable origin batch stock to receive the full dispatched quantity`);
        }
        if (batchCount === 0) {
          await tx.stockTransaction.createMany({
            data: [
              {
                stockItemId: item.stockItemId, transactionType: 'transfer_out', quantity: item.quantitySent,
                balanceAfter: originBalanceAfter.quantity, departmentId: transfer.originId,
                reference: transfer.transferNumber, notes: `Transferred to ${transfer.destination.name}`, performedBy: userId,
              },
              {
                stockItemId: item.stockItemId, transactionType: 'transfer_in', quantity: item.quantitySent,
                balanceAfter: destinationBalanceAfter.quantity, departmentId: transfer.destinationId,
                reference: transfer.transferNumber, notes: `Received from ${transfer.origin.name}`, performedBy: userId,
              },
            ],
          });
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: item.quantitySent },
          });
        }
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'received', receivedAt: new Date() },
        include: { origin: true, destination: true, items: true }
      });
    });
  }
}