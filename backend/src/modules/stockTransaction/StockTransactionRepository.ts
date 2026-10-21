import { PrismaClient, StockTransactionType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockItemRepository';

import { ValidationError } from '../../utils/errors';

// Expiry fields are date-only in the UI and are stored at midnight. Treat a
// batch as usable through its recorded expiry calendar day, not expired at 00:00.
const startOfCurrentDay = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

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
    // Validate before opening a database transaction so malformed requests do
    // not consume a transaction or acquire database resources unnecessarily.
    const { stockItemId, transactionType, quantity, reference, notes, performedBy, requisitionId, invoiceId } = data;
    const numericQuantity = Number(quantity);
    if (!stockItemId || !Number.isSafeInteger(numericQuantity) || numericQuantity === 0 ||
        (numericQuantity < 0 && transactionType !== 'adjustment')) {
      throw new ValidationError('Stock quantity must be a non-zero whole number; negative quantities are only allowed for adjustments');
    }
    const effectiveQuantity = Math.abs(numericQuantity);
    const adjustmentDirection = transactionType === 'adjustment' ? (numericQuantity < 0 ? 'decrease' : 'increase') : undefined;

    return this.prisma.$transaction(async (tx) => {

      if (transactionType === 'transfer_in' || transactionType === 'transfer_out') {
        throw new ValidationError('Internal transfers must use the dedicated stock transfer or requisition fulfilment workflow');
      }

      const departmentId = data.departmentId ? String(data.departmentId) : undefined;
      const wardId = data.wardId ? String(data.wardId) : undefined;
      if (departmentId && wardId) throw new ValidationError('Select either a department or a ward, not both');
      const batchCount = await tx.stockBatch.count({ where: { stockItemId } });
      const isOutgoing = transactionType === 'sale' || transactionType === 'requisition' || transactionType === 'write_off' || (transactionType === 'adjustment' && adjustmentDirection === 'decrease');
      const batchAllocations: Array<{ batchId: string; batchNumber: string; quantity: number; expiryDate: Date; costPrice: string }> = [];

      // Sales/dispensing from a batch-tracked department must reduce that department's
      // FEFO batches and the hospital aggregate in the same transaction.
      if (isOutgoing && batchCount > 0) {
        if (!departmentId && !wardId) throw new ValidationError('Select the department or ward issuing this stock');
        let remaining = effectiveQuantity;
        const batches = await tx.stockBatch.findMany({
          where: {
            stockItemId, departmentId: departmentId || null, wardId: wardId || null, quantity: { gt: 0 },
            ...(transactionType === 'write_off' ? {} : { isActive: true, expiryDate: { gte: startOfCurrentDay() } }),
          },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }]
        });
        const departmentAvailable = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        if (departmentAvailable < effectiveQuantity) {
          throw new ValidationError(`Insufficient stock in the selected department. Available: ${departmentAvailable}, requested: ${effectiveQuantity}`);
        }
        for (const batch of batches) {
          if (remaining <= 0) break;
          const move = Math.min(batch.quantity, remaining);
          const changed = await tx.stockBatch.updateMany({
            where: {
              id: batch.id, departmentId: departmentId || null, wardId: wardId || null, quantity: { gte: move },
              ...(transactionType === 'write_off' ? {} : { isActive: true, expiryDate: { gte: startOfCurrentDay() } }),
            },
            data: { quantity: { decrement: move } }
          });
          if (changed.count !== 1) throw new ValidationError('Stock changed during the sale. Please retry.');
          batchAllocations.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            quantity: move,
            expiryDate: batch.expiryDate,
            costPrice: String(batch.costPrice),
          });
          remaining -= move;
        }
      } else if (batchCount > 0) {
        throw new ValidationError('This item uses batch tracking. Receive or adjust it through a batch-aware workflow to keep batch and aggregate stock aligned.');
      }

      let locationBalanceAfter: number;
      if (isOutgoing) {
        const balance = await decreaseDepartmentStockBalance(tx, stockItemId, departmentId, effectiveQuantity, wardId);
        locationBalanceAfter = balance.quantity;
        const updated = await tx.stockItem.updateMany({
          where: { id: stockItemId, currentStock: { gte: effectiveQuantity } },
          data: { currentStock: { decrement: effectiveQuantity } }
        });
        if (updated.count === 0) {
          const item = await tx.stockItem.findUnique({ where: { id: stockItemId } });
          throw new ValidationError(`Insufficient hospital stock. Current: ${item?.currentStock || 0}, requested: ${effectiveQuantity}`);
        }
      } else {
        const balance = await increaseDepartmentStockBalance(tx, stockItemId, departmentId, effectiveQuantity, wardId);
        locationBalanceAfter = balance.quantity;
        await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: effectiveQuantity } } });
      }

      return tx.stockTransaction.create({
        data: {
          stockItemId, transactionType, quantity: effectiveQuantity,
          balanceAfter: locationBalanceAfter, reference, notes, performedBy: performedBy || 'system',
          requisitionId, invoiceId, departmentId, wardId, adjustmentDirection,
          batchAllocations: batchAllocations.length ? batchAllocations as any : undefined
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
      if (transaction.transactionType === 'adjustment') {
        throw new ValidationError('Stock adjustments are audit-sensitive and cannot be deleted directly. Record a correcting adjustment with an audit note instead.');
      }

      // Do not let a generic transaction delete silently desynchronise the
      // operational record that originally moved stock (invoice, requisition,
      // or clinical dispensing/consumable use). Those require their own audited
      // reversal/correction workflow.
      if (transaction.invoiceId || transaction.requisitionId) {
        throw new ValidationError('This stock movement is linked to an invoice or requisition. Correct it through the original workflow so stock and source records remain consistent.');
      }
      const notes = String(transaction.notes || '');
      const reference = String(transaction.reference || '');
      if (
        /^Dispensed\b/i.test(notes) ||
        /^Consumable use:/i.test(notes) ||
        /^Encounter\s/i.test(reference)
      ) {
        throw new ValidationError('This stock movement is linked to a clinical encounter. Use the encounter correction workflow rather than deleting its stock ledger entry.');
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
    const model = this.getModel();
    const existing = await model.findUnique({
      where: { id },
      select: { notes: true, reference: true },
    });
    if (!existing) throw new ValidationError('Stock transaction not found');

    // The generic delete guard uses these legacy markers to identify clinical
    // dispensing and consumable-use movements. Do not allow those markers to be
    // edited away, or a user could bypass the guard and desynchronise the
    // clinical encounter from the stock ledger.
    const existingNotes = String(existing.notes || '');
    const existingReference = String(existing.reference || '');
    const isClinicalMovement =
      /^Dispensed\b/i.test(existingNotes) ||
      /^Consumable use:/i.test(existingNotes) ||
      /^Encounter\s/i.test(existingReference);
    if (isClinicalMovement && (notes !== undefined || reference !== undefined)) {
      throw new ValidationError('Clinical stock movement notes and references cannot be edited here. Correct the movement through the encounter workflow.');
    }

    const updateData: any = {};
    if (notes !== undefined) updateData.notes = notes;
    if (reference !== undefined) updateData.reference = reference;
    return model.update({ where: { id }, data: updateData, include: { StockItem: { select: { name: true, drugCode: true } } } });
  }

  // ✅ FIXED: Prisma doesn't support comparing two fields directly. We fetch and filter in memory.
  async getLowStockItems(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await this.prisma.stockItem.findMany({
      where,
      select: {
        id: true, name: true, category: true, currentStock: true, reorderLevel: true, unitOfMeasure: true, drugCode: true,
        stockBalances: filters.includeAllStockLocations ? false as any : {
          where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
          select: { quantity: true },
        },
      },
      orderBy: { currentStock: 'asc' },
    });
    const scoped = items.map((item: any) => ({
      ...item,
      currentStock: filters.includeAllStockLocations ? item.currentStock : item.stockBalances.reduce((sum: number, b: any) => sum + b.quantity, 0),
    }));
    return scoped.filter((i: any) => i.currentStock <= i.reorderLevel);
  }

  async getRequisitionTransactions(filters: any) {
    const where: any = { transactionType: 'requisition' };
    // Non-administrators may only view requisition stock movements in their own department.
    if (!filters.includeAllStockLocations) where.departmentId = filters.departmentId || '__NO_DEPARTMENT__';
    if (filters.requisitionId) where.requisitionId = filters.requisitionId;
    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) where.transactionDate.gte = filters.startDate;
      if (filters.endDate) where.transactionDate.lte = filters.endDate;
    }
    return this.getModel().findMany({ where, include: { StockItem: { select: { id: true, name: true, category: true, drugCode: true, unitOfMeasure: true } }, Requisition: { include: { departments: { select: { name: true } }, RequisitionItem: { include: { StockItem: { select: { name: true, drugCode: true } } } } } } }, orderBy: { transactionDate: 'desc' } });
  }

  async getValuationData(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await this.prisma.stockItem.findMany({
      where,
      select: {
        id: true, name: true, category: true, currentStock: true, costPrice: true, unitOfMeasure: true, reorderLevel: true,
        StockBatch: {
          where: {
            quantity: { gt: 0 },
            ...(filters.includeAllStockLocations ? {} : { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null }),
          },
          select: { quantity: true, costPrice: true },
        },
        stockBalances: filters.includeAllStockLocations ? false as any : {
          where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
          select: { quantity: true },
        },
      },
    });
    return items.map((item: any) => ({
      ...item,
      currentStock: filters.includeAllStockLocations
        ? item.currentStock
        : item.stockBalances.reduce((sum: number, balance: any) => sum + balance.quantity, 0),
    }));
  }

  async getMovementData(startDate?: Date, endDate?: Date, category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const locationWhere: any = {};
    if (!filters.includeAllStockLocations) locationWhere.departmentId = filters.departmentId || '__NO_DEPARTMENT__';

    const whereTx: any = { ...locationWhere };
    if (startDate || endDate) {
      whereTx.transactionDate = {};
      if (startDate) whereTx.transactionDate.gte = startDate;
      if (endDate) whereTx.transactionDate.lte = endDate;
    }

    const whereAfterEnd: any = { ...locationWhere };
    if (endDate) whereAfterEnd.transactionDate = { gt: endDate };

    const whereItem: any = {};
    if (category) whereItem.category = category;
    if (category) {
      whereTx.StockItem = { category };
      whereAfterEnd.StockItem = { category };
    }

    const [stockItems, transactions, transactionsAfterEnd] = await Promise.all([
      this.prisma.stockItem.findMany({
        where: whereItem,
        select: {
          id: true, name: true, category: true, currentStock: true, unitOfMeasure: true,
          stockBalances: filters.includeAllStockLocations ? false as any : {
            where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
            select: { quantity: true },
          },
        },
      }),
      this.getModel().findMany({ where: whereTx, include: { StockItem: { select: { id: true, name: true, category: true } } }, orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }] }),
      endDate
        ? this.getModel().findMany({ where: whereAfterEnd, select: { stockItemId: true, transactionType: true, quantity: true, adjustmentDirection: true } })
        : Promise.resolve([]),
    ]);
    const scopedItems = stockItems.map((item: any) => ({
      ...item,
      currentStock: filters.includeAllStockLocations ? item.currentStock : item.stockBalances.reduce((sum: number, b: any) => sum + b.quantity, 0),
    }));
    return { stockItems: scopedItems, transactions, transactionsAfterEnd };
  }
}