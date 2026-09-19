import { PrismaClient, StockTransactionType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class StockTransactionRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockTransaction');
  }

  async findAllWithFilters(filters: any) {
    const { stockItemId, transactionType, startDate, endDate, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (stockItemId) where.stockItemId = stockItemId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { transactionDate: 'desc' },
      include: {
        StockItem: { select: { id: true, name: true, category: true, drugCode: true, unitOfMeasure: true } },
        Requisition: { select: { requisitionNumber: true, status: true, urgency: true } },
        Invoice: { select: { invoiceNumber: true, supplierName: true } }
      }
    });
  }

  async findByIdWithRelations(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        StockItem: { select: { id: true, name: true, category: true, drugCode: true, unitOfMeasure: true, currentStock: true } },
        Requisition: { select: { requisitionNumber: true, status: true, urgency: true, departments: { select: { name: true } } } },
        Invoice: { select: { invoiceNumber: true, supplierName: true, invoiceDate: true } }
      }
    });
  }

  // ✅ PRODUCTION FIX: Thread-safe inventory update using atomic decrement
  async createSafely(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const { stockItemId, transactionType, quantity, reference, notes, performedBy, requisitionId, invoiceId } = data;
      
      const isOutgoing = transactionType === 'sale' || transactionType === 'requisition';
      
      if (isOutgoing) {
        // Atomically decrement ONLY if we have enough stock
        const updated = await tx.stockItem.updateMany({
          where: { id: stockItemId, currentStock: { gte: quantity } },
          data: { currentStock: { decrement: quantity } }
        });
        if (updated.count === 0) {
          const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
          throw new Error(`Insufficient stock. Current: ${item?.currentStock || 0}, Requested: ${quantity}`);
        }
      } else {
        await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });
      }

      const updatedItem = await tx.stockItem.findUnique({ where: { id: stockItemId } });

      const transaction = await tx.stockTransaction.create({
        data: {
          stockItemId, transactionType, quantity: Math.abs(quantity),
          balanceAfter: updatedItem!.currentStock, reference, notes, performedBy: performedBy || 'system', requisitionId, invoiceId
        }
      });

      if (requisitionId && transactionType === 'requisition') {
        await tx.requisition.update({ where: { id: requisitionId }, data: { status: 'fulfilled', fulfilledAt: new Date(), fulfilledById: performedBy } });
        await tx.requisitionItem.updateMany({ where: { requisitionId }, data: { quantityFulfilled: { increment: quantity } } });
      }

      return transaction;
    });
  }

  // ✅ PRODUCTION FIX: Thread-safe reversal using atomic increment
  async deleteSafely(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.findUnique({ where: { id } });
      if (!transaction) throw new Error('Transaction not found');

      const isOutgoing = transaction.transactionType === 'sale' || transaction.transactionType === 'requisition';
      
      if (isOutgoing) {
        // Reversing an outgoing transaction means adding stock back
        await tx.stockItem.update({ where: { id: transaction.stockItemId }, data: { currentStock: { increment: transaction.quantity } } });
      } else {
        // Reversing an incoming transaction means deducting stock safely
        const updated = await tx.stockItem.updateMany({
          where: { id: transaction.stockItemId, currentStock: { gte: transaction.quantity } },
          data: { currentStock: { decrement: transaction.quantity } }
        });
        if (updated.count === 0) throw new Error('Cannot delete transaction - would cause negative stock');
      }

      await tx.stockTransaction.delete({ where: { id } });
      return { success: true, message: 'Transaction deleted and stock reversed' };
    });
  }

  async updateNotes(id: string, notes?: string, reference?: string) {
    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (reference !== undefined) updateData.reference = reference;
    return this.getModel().update({ where: { id }, data: updateData, include: { StockItem: { select: { name: true, drugCode: true } } } });
  }

  // ✅ FIXED: Prisma doesn't support comparing two fields directly. We fetch and filter in memory.
  async getLowStockItems(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await this.prisma.stockItem.findMany({ where, select: { id: true, name: true, category: true, currentStock: true, reorderLevel: true, unitOfMeasure: true, drugCode: true }, orderBy: { currentStock: 'asc' } });
    return items.filter(i => i.currentStock <= i.reorderLevel);
  }

  async getRequisitionTransactions(filters: any) {
    const where: any = { transactionType: 'requisition' };
    if (filters.requisitionId) where.requisitionId = filters.requisitionId;
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = filters.startDate;
      if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }
    return this.getModel().findMany({ where, include: { StockItem: { select: { id: true, name: true, category: true, drugCode: true, unitOfMeasure: true } }, Requisition: { include: { departments: { select: { name: true } }, RequisitionItem: { include: { StockItem: { select: { name: true, drugCode: true } } } } } } }, orderBy: { transactionDate: 'desc' } });
  }

  async getValuationData(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.prisma.stockItem.findMany({ where, select: { id: true, name: true, category: true, currentStock: true, costPrice: true, unitOfMeasure: true, reorderLevel: true } });
  }

  async getMovementData(startDate?: Date, endDate?: Date, category?: string) {
    const whereTx: any = {};
    if (startDate || endDate) { whereTx.transactionDate = {}; if (startDate) whereTx.transactionDate.gte = startDate; if (endDate) whereTx.transactionDate.lte = endDate; }
    
    const whereItem: any = {};
    if (category) whereItem.category = category;

    const [stockItems, transactions] = await Promise.all([
      this.prisma.stockItem.findMany({ where: whereItem, select: { id: true, name: true, category: true, currentStock: true, unitOfMeasure: true } }),
      this.getModel().findMany({ where: whereTx, include: { StockItem: { select: { id: true, name: true, category: true } } } })
    ]);

    return { stockItems, transactions };
  }
}