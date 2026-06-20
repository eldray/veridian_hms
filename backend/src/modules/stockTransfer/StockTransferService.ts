import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { StockTransferRepository } from './StockTransferRepository';
import { CreateTransferDTO, TransferQueryParams } from './StockTransferTypes';
import { getCounterService } from '../../services/CounterService';

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

      // 1. Verify Origin actually has the stock in its physical batches
      for (const item of transfer.items) {
        const batches = await this.repo.getBatchesByDepartment(item.stockItemId, transfer.originId, tx);
        const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
        
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

        // ✅ FEFO: Get batches from Origin, sorted by Expiry Date
        const originBatches = await this.repo.getBatchesByDepartment(item.stockItemId, transfer.originId, tx);

        for (const batch of originBatches) {
          if (qtyToReceive <= 0) break;

          const qtyToMove = Math.min(batch.quantity, qtyToReceive);

          // 1. Deduct from Origin Batch
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: qtyToMove } }
          });

          // 2. Create (or merge) Batch in Destination Department
          let destBatch = await tx.stockBatch.findFirst({
            where: { stockItemId: item.stockItemId, batchNumber: batch.batchNumber, departmentId: transfer.destinationId }
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
              balanceAfter: batch.quantity - qtyToMove, departmentId: transfer.originId,
              reference: transfer.transferNumber, notes: `Transferred to ${transfer.destination.name}`, performedBy: userId
            }
          });

          await tx.stockTransaction.create({
            data: {
              stockItemId: item.stockItemId, transactionType: 'transfer_in', quantity: qtyToMove,
              balanceAfter: qtyToMove, departmentId: transfer.destinationId,
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
      }

      return tx.stockTransfer.update({
        where: { id },
        data: { status: 'received', receivedAt: new Date() },
        include: { origin: true, destination: true, items: true }
      });
    });
  }
}