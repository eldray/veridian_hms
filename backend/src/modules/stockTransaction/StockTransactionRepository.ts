import { PrismaClient, StockTransactionType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockBalance';
import { ValidationError } from '../../utils/errors';

export class StockTransactionRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockTransaction');
  }

  async findAllWithFilters(filters: any) {
    const { stockItemId, transactionType, startDate, endDate, page = 1, limit = 1000, departmentId, includeAllStockLocations } = filters;
    const where: any = {};
    if (!includeAllStockLocations) where.departmentId = departmentId || '__NO_DEPARTMENT__';
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
        Invoice: { select: { invoiceNumber: true, supplierName: true } },
        User: { select: { id: true, fullName: true, email: true } }
      }
    });
  }

  async findByIdWithRelations(id: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    return this.getModel().findFirst({
      where: {
        id,
        ...(!filters.includeAllStockLocations ? { departmentId: filters.departmentId || '__NO_DEPARTMENT__' } : {}),
      },
      include: {
        StockItem: { select: { id: true, name: true, category: true, drugCode: true, unitOfMeasure: true, currentStock: true } },
        Requisition: { select: { requisitionNumber: true, status: true, urgency: true, departments: { select: { name: true } } } },
        Invoice: { select: { invoiceNumber: true, supplierName: true, invoiceDate: true } },
        User: { select: { id: true, fullName: true, email: true } }
      }
    });
  }

  // ✅ PRODUCTION FIX: Thread-safe inventory update using atomic decrement
  async createSafely(data: any) {
    return this.prisma.$transaction(async (tx) => {
      const { stockItemId, transactionType, quantity, reference, notes, performedBy, requisitionId, invoiceId } = data;

      const departmentId = data.departmentId ? String(data.departmentId) : undefined;
      const wardId = data.wardId ? String(data.wardId) : undefined;
      if (departmentId && wardId) throw new ValidationError('Select either a department or a ward, not both');
      const batchCount = await tx.stockBatch.count({ where: { stockItemId } });
      const isOutgoing = transactionType === 'sale' || transactionType === 'requisition' || transactionType === 'write_off';

      // Sales/dispensing from a batch-tracked department must reduce that department's
      // FEFO batches and the hospital aggregate in the same transaction.
      if (isOutgoing && batchCount > 0) {
        if (!departmentId && !wardId) throw new ValidationError('Select the department or ward issuing this stock');
        let remaining = quantity;
        const batches = await tx.stockBatch.findMany({
          where: {
            stockItemId, departmentId: departmentId || null, wardId: wardId || null, quantity: { gt: 0 },
            ...(transactionType === 'write_off' ? {} : { isActive: true, expiryDate: { gt: new Date() } }),
          },
          orderBy: { expiryDate: 'asc' }
        });
        const departmentAvailable = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        if (departmentAvailable < quantity) {
          throw new ValidationError(`Insufficient stock in the selected department. Available: ${departmentAvailable}, requested: ${quantity}`);
        }
        for (const batch of batches) {
          if (remaining <= 0) break;
          const move = Math.min(batch.quantity, remaining);
          const changed = await tx.stockBatch.updateMany({
            where: {
              id: batch.id, departmentId: departmentId || null, wardId: wardId || null, quantity: { gte: move },
              ...(transactionType === 'write_off' ? {} : { isActive: true }),
            },
            data: { quantity: { decrement: move } }
          });
          if (changed.count !== 1) throw new ValidationError('Stock changed during the sale. Please retry.');
          remaining -= move;
        }
      } else if (batchCount > 0) {
        throw new ValidationError('This item uses batch tracking. Receive or adjust it through a batch-aware workflow to keep batch and aggregate stock aligned.');
      }

      if (isOutgoing) {
        await decreaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity, wardId);
        const updated = await tx.stockItem.updateMany({
          where: { id: stockItemId, currentStock: { gte: quantity } },
          data: { currentStock: { decrement: quantity } }
        });
        if (updated.count === 0) {
          const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
          throw new ValidationError(`Insufficient hospital stock. Current: ${item?.currentStock || 0}, requested: ${quantity}`);
        }
      } else {
        await increaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity, wardId);
        await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });
      }

      const updatedItem = await tx.stockItem.findUnique({ where: { id: stockItemId } });
      return tx.stockTransaction.create({
        data: {
          stockItemId, transactionType, quantity: Math.abs(quantity),
          balanceAfter: updatedItem!.currentStock, reference, notes, performedBy: performedBy || 'system',
          requisitionId, invoiceId, departmentId, wardId
        }
      });
    });
  }

  // ✅ PRODUCTION FIX: Thread-safe reversal using atomic increment
  async deleteSafely(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.findUnique({ where: { id } });
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.transactionType === 'transfer_in' || transaction.transactionType === 'transfer_out') {
        throw new ValidationError('Internal transfer entries cannot be deleted individually. Use the dedicated transfer/reconciliation workflow.');
      }

      // Reversing an aggregate-only transaction cannot correctly restore/decrement batch
      // balances. Require a dedicated batch-aware reversal for batch-tracked items.
      const batchCount = await tx.stockBatch.count({ where: { stockItemId: transaction.stockItemId } });
      if (batchCount > 0) {
        throw new ValidationError('This item uses batch tracking. Generic transaction reversal is blocked until a batch-aware reversal workflow is available.');
      }

      const isOutgoing = transaction.transactionType === 'sale' || transaction.transactionType === 'requisition' || transaction.transactionType === 'write_off';

      if (isOutgoing) {
        // Reversing an outgoing transaction restores the same location balance and aggregate.
        await increaseDepartmentStockBalance(tx, transaction.stockItemId, transaction.departmentId, transaction.quantity, transaction.wardId);
        await tx.stockItem.update({ where: { id: transaction.stockItemId }, data: { currentStock: { increment: transaction.quantity } } });
      } else {
        // Reversing an incoming transaction deducts from the recorded location first.
        await decreaseDepartmentStockBalance(tx, transaction.stockItemId, transaction.departmentId, transaction.quantity, transaction.wardId);
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