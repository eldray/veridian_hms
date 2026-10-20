import { PrismaClient, StockTransactionType, RequisitionStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ValidationError } from '../../utils/errors';

/**
 * Department-level balance ledger.
 * locationKey is the department id, or __UNASSIGNED__ for legacy stock not yet assigned.
 * Call only inside the same Prisma transaction as the physical batch and aggregate update.
 */
export async function increaseDepartmentStockBalance(
  tx: any,
  stockItemId: string,
  departmentId: string | null | undefined,
  quantity: number,
  wardId?: string | null,
) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Stock balance increase must be a positive whole number');
  }
  const normalizedDepartmentId = departmentId || null;
  const normalizedWardId = wardId || null;
  if (normalizedDepartmentId && normalizedWardId) throw new ValidationError('Stock cannot belong to a department and ward at the same time');
  const locationKey = normalizedDepartmentId || (normalizedWardId ? `WARD:${normalizedWardId}` : '__UNASSIGNED__');
  return tx.stockItemDepartmentBalance.upsert({
    where: { stockItemId_locationKey: { stockItemId, locationKey } },
    create: {
      stockItemId,
      departmentId: normalizedDepartmentId,
      wardId: normalizedWardId,
      locationKey,
      quantity,
    },
    update: { quantity: { increment: quantity } },
  });
}

export async function decreaseDepartmentStockBalance(
  tx: any,
  stockItemId: string,
  departmentId: string | null | undefined,
  quantity: number,
  wardId?: string | null,
) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new ValidationError('Stock balance decrease must be a positive whole number');
  }
  const normalizedDepartmentId = departmentId || null;
  const normalizedWardId = wardId || null;
  if (normalizedDepartmentId && normalizedWardId) throw new ValidationError('Stock cannot belong to a department and ward at the same time');
  const locationKey = normalizedDepartmentId || (normalizedWardId ? `WARD:${normalizedWardId}` : '__UNASSIGNED__');
  const result = await tx.stockItemDepartmentBalance.updateMany({
    where: { stockItemId, locationKey, quantity: { gte: quantity } },
    data: { quantity: { decrement: quantity } },
  });
  if (result.count !== 1) {
    const balance = await tx.stockItemDepartmentBalance.findUnique({
      where: { stockItemId_locationKey: { stockItemId, locationKey } },
      select: { quantity: true },
    });
    const locationLabel = normalizedDepartmentId
      ? 'the selected department/store'
      : normalizedWardId
        ? 'the selected ward'
        : 'unassigned stock';
    throw new ValidationError(
      `Insufficient stock balance in ${locationLabel}. Available: ${balance?.quantity ?? 0}, requested: ${quantity}`,
    );
  }
  return tx.stockItemDepartmentBalance.findUnique({
    where: { stockItemId_locationKey: { stockItemId, locationKey } },
  });
}

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class StockItemRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockItem');
  }

  async findAllWithFilters(filters: any) {
    const { category, search, page = 1, limit = 1000, departmentId, includeAllStockLocations } = filters;
    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { drugCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { name: 'asc' },
      include: {
        StockBatch: {
          where: {
            isActive: true,
            ...(!includeAllStockLocations ? { departmentId: departmentId || '__NO_DEPARTMENT__', wardId: null } : {}),
          },
          include: { department: { select: { id: true, name: true } }, ward: { select: { id: true, wardName: true } } },
          orderBy: { expiryDate: 'asc' },
        },
        stockBalances: {
          where: includeAllStockLocations ? {} : { departmentId: departmentId || '__NO_DEPARTMENT__' },
          include: { department: { select: { id: true, name: true } }, ward: { select: { id: true, wardName: true } } },
        },
        // Current patient prices (cash / NHIS / insurance / corporate) live on the item's catalog entry
        ServiceCatalog: { select: { id: true, code: true, pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } }
      }
    });
  }

  async findByIdWithRelations(id: string, filters: any = {}) {
    const { departmentId, includeAllStockLocations } = filters;
    const locationWhere = includeAllStockLocations ? {} : { departmentId: departmentId || '__NO_DEPARTMENT__' };
    return this.getModel().findUnique({
      where: { id },
      include: {
        Medication: { include: { Attendance: { select: { attendanceNumber: true, Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } } }, orderBy: { prescribedAt: 'desc' }, take: 50 },
        StockTransaction: { where: includeAllStockLocations ? {} : locationWhere, orderBy: { transactionDate: 'desc' }, take: 20 },
        InvoiceItem: { include: { Invoice: { select: { invoiceNumber: true, supplierName: true, invoiceDate: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        RequisitionItem: { include: { Requisition: { select: { requisitionNumber: true, status: true, urgency: true, createdAt: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        StockBatch: {
          where: includeAllStockLocations ? {} : { departmentId: departmentId || '__NO_DEPARTMENT__', wardId: null },
          include: { department: { select: { id: true, name: true } }, ward: { select: { id: true, wardName: true } } },
          orderBy: { receivedDate: 'desc' },
        },
        stockBalances: {
          where: locationWhere,
          include: { department: { select: { id: true, name: true } }, ward: { select: { id: true, wardName: true } } },
        },
        ServiceCatalog: { select: { id: true, code: true, pricing: { where: { isActive: true }, orderBy: { effectiveDate: 'desc' }, take: 1 } } }
      }
    });
  }

  async hasDependencies(id: string) {
    const item = await this.getModel().findUnique({
      where: { id },
      include: { Medication: { take: 1 }, StockTransaction: { take: 1 }, InvoiceItem: { take: 1 }, RequisitionItem: { take: 1 }, StockBatch: { take: 1 }, transferItems: { take: 1 } }
    });
    if (!item) throw new Error('Stock item not found');
    return item.Medication.length > 0 || item.StockTransaction.length > 0 || item.InvoiceItem.length > 0 || item.RequisitionItem.length > 0 || item.StockBatch.length > 0 || item.transferItems.length > 0;
  }

  // ✅ PRODUCTION FIX: Thread-safe inventory update using atomic decrement
  async updateStockLevelSafely(
    id: string,
    quantity: number,
    transactionType: StockTransactionType,
    reference?: string,
    notes?: string,
    performedBy?: string,
    departmentId?: string,
  ) {
    if (transactionType === 'transfer_in' || transactionType === 'transfer_out') {
      throw new Error('Internal transfers must use the dedicated stock transfer or requisition fulfilment workflow');
    }
    if (!Number.isSafeInteger(quantity) || quantity === 0 || (quantity < 0 && transactionType !== 'adjustment')) throw new Error('Stock quantity must be a non-zero whole number; negative quantities are only allowed for adjustments');
    return this.prisma.$transaction(async (tx) => {
      const effectiveQuantity = Math.abs(quantity);
      const adjustmentDirection = transactionType === 'adjustment' ? (quantity < 0 ? 'decrease' : 'increase') : undefined;
      const isOutgoing = transactionType === 'sale' || transactionType === 'requisition' || transactionType === 'write_off' || (transactionType === 'adjustment' && adjustmentDirection === 'decrease');
      const normalizedDepartmentId = departmentId || undefined;
      const batchCount = await tx.stockBatch.count({ where: { stockItemId: id } });

      if (batchCount > 0 && isOutgoing) {
        if (!normalizedDepartmentId) throw new Error('Select the department issuing this stock');
        const now = new Date();
        const batches = await tx.stockBatch.findMany({
          where: {
            stockItemId: id, departmentId: normalizedDepartmentId, wardId: null,
            quantity: { gt: 0 },
            ...(transactionType === 'write_off' ? {} : { isActive: true, expiryDate: { gt: now } }),
          },
          orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
        });
        const available = batches.reduce((sum, batch) => sum + batch.quantity, 0);
        if (available < effectiveQuantity) throw new Error(`Insufficient stock in department. Available: ${available}, requested: ${effectiveQuantity}`);
        let remaining = effectiveQuantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const move = Math.min(batch.quantity, remaining);
          const changed = await tx.stockBatch.updateMany({
            where: {
              id: batch.id, departmentId: normalizedDepartmentId, wardId: null, quantity: { gte: move },
              ...(transactionType === 'write_off' ? {} : { isActive: true }),
            },
            data: { quantity: { decrement: move } },
          });
          if (changed.count !== 1) throw new Error('Stock changed during the transaction. Please retry.');
          remaining -= move;
        }
      } else if (batchCount > 0) {
        throw new Error('This item uses batch tracking. Use the batch receipt workflow for incoming stock.');
      }

      if (isOutgoing) {
        await decreaseDepartmentStockBalance(tx, id, normalizedDepartmentId, effectiveQuantity);
        const updated = await tx.stockItem.updateMany({
          where: { id, currentStock: { gte: effectiveQuantity } },
          data: { currentStock: { decrement: effectiveQuantity } },
        });
        if (updated.count !== 1) throw new Error('Insufficient hospital-wide stock');
      } else {
        await increaseDepartmentStockBalance(tx, id, normalizedDepartmentId, effectiveQuantity);
        await tx.stockItem.update({ where: { id }, data: { currentStock: { increment: effectiveQuantity } } });
      }

      const updatedItem = await tx.stockItem.findUnique({ where: { id } });
      if (!updatedItem) throw new Error('Stock item not found');
      await tx.stockTransaction.create({
        data: {
          stockItemId: id, transactionType, quantity: effectiveQuantity,
          balanceAfter: updatedItem.currentStock, reference, notes,
          performedBy: performedBy || 'system', departmentId: normalizedDepartmentId, adjustmentDirection,
        },
      });
      return updatedItem;
    });
  }

  async allocateUnassignedStockSafely(
    stockItemId: string,
    departmentId: string,
    quantity: number,
    performedBy?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (!departmentId) throw new Error('Receiving department is required');
      if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Allocation quantity must be a positive whole number');
      const item = await tx.stockItem.findUnique({ where: { id: stockItemId }, select: { id: true, currentStock: true } });
      if (!item) throw new Error('Stock item not found');

      const batchCount = await tx.stockBatch.count({ where: { stockItemId } });
      let remaining = quantity;
      const sourceBatches = batchCount > 0
        ? await tx.stockBatch.findMany({
            where: {
              stockItemId, departmentId: null, wardId: null, isActive: true,
              quantity: { gt: 0 }, expiryDate: { gt: new Date() },
            },
            orderBy: [{ expiryDate: 'asc' }, { receivedDate: 'asc' }],
          })
        : [];
      const usableUnassignedBatches = sourceBatches.reduce((sum, batch) => sum + batch.quantity, 0);
      if (batchCount > 0 && usableUnassignedBatches < quantity) {
        throw new Error(`This item is batch-tracked. Only ${usableUnassignedBatches} usable unassigned batch units can be allocated; requested ${quantity}. Expired or unbatched stock must be reconciled first.`);
      }

      const unassignedBalance = await decreaseDepartmentStockBalance(tx, stockItemId, null, quantity);
      const destinationBalance = await increaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity);

      for (const batch of sourceBatches) {
        if (remaining <= 0) break;
        const move = Math.min(batch.quantity, remaining);
        const changed = await tx.stockBatch.updateMany({
          where: { id: batch.id, departmentId: null, wardId: null, quantity: { gte: move }, isActive: true },
          data: { quantity: { decrement: move } },
        });
        if (changed.count !== 1) throw new Error('Unassigned batch stock changed during allocation. Please retry.');

        const existing = await tx.stockBatch.findFirst({
          where: {
            stockItemId, batchNumber: batch.batchNumber, departmentId,
            wardId: null, expiryDate: batch.expiryDate,
          },
        });
        if (existing) {
          await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: move }, isActive: true } });
        } else {
          await tx.stockBatch.create({
            data: {
              stockItemId, batchNumber: batch.batchNumber, expiryDate: batch.expiryDate,
              costPrice: batch.costPrice, quantity: move, departmentId, receivedDate: batch.receivedDate,
            },
          });
        }
        remaining -= move;
      }

      await tx.stockTransaction.createMany({
        data: [
          {
            stockItemId, transactionType: 'transfer_out', quantity,
            balanceAfter: unassignedBalance.quantity, reference: 'STOCK-ALLOCATION',
            notes: `Allocated legacy/unassigned stock to department ${departmentId}`,
            performedBy: performedBy || undefined,
          },
          {
            stockItemId, transactionType: 'transfer_in', quantity,
            balanceAfter: destinationBalance.quantity, departmentId, reference: 'STOCK-ALLOCATION',
            notes: 'Received allocation from unassigned hospital stock',
            performedBy: performedBy || undefined,
          },
        ],
      });
      return { stockItemId, departmentId, quantity, hospitalTotal: item.currentStock };
    });
  }

  async getTransactions(
    id: string,
    page: number = 1,
    limit: number = 50,
    filters: { departmentId?: string; includeAllStockLocations?: boolean } = {},
  ) {
    const where: any = { stockItemId: id };
    if (!filters.includeAllStockLocations) where.departmentId = filters.departmentId || '__NO_DEPARTMENT__';
    const safePage = Math.max(1, Math.floor(page));
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit)));
    const [transactions, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          Requisition: { select: { requisitionNumber: true, status: true, urgency: true } },
          Invoice: { select: { invoiceNumber: true, supplierName: true } },
          Department: { select: { id: true, name: true } },
          User: { select: { id: true, fullName: true } },
        },
        orderBy: { transactionDate: 'desc' },
      }),
      this.prisma.stockTransaction.count({ where }),
    ]);
    return { transactions, total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) };
  }

  async addBatchWithinTransaction(
    tx: any,
    stockItemId: string,
    batchNumber: string,
    expiryDate: Date,
    quantity: number,
    costPrice: number,
    receivedDate?: Date,
    departmentId?: string,
  ) {
    const existingBatchCount = await tx.stockBatch.count({ where: { stockItemId } });
    if (existingBatchCount === 0) {
      const existingItem = await tx.stockItem.findUnique({ where: { id: stockItemId }, select: { currentStock: true, name: true } });
      if (existingItem && existingItem.currentStock > 0) {
        throw new Error(`Cannot start batch tracking for ${existingItem.name} while ${existingItem.currentStock} units of unbatched stock remain. Reconcile or issue the existing stock first.`);
      }
    }
    const batch = await tx.stockBatch.create({
      data: {
        stockItemId, batchNumber, expiryDate, quantity, costPrice,
        receivedDate: receivedDate || new Date(),
        ...(departmentId ? { departmentId } : {}),
      },
    });
    await increaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity);
    await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });
    const updatedItem = await tx.stockItem.findUnique({ where: { id: stockItemId } });
    if (!updatedItem) throw new Error('Stock item not found while receiving batch');

    await tx.stockTransaction.create({
      data: {
        stockItemId, transactionType: 'purchase', quantity,
        balanceAfter: updatedItem.currentStock, reference: `BATCH-${batchNumber}`,
        notes: `Added batch ${batchNumber}`, performedBy: 'system',
        ...(departmentId ? { departmentId } : {}),
      },
    });
    return batch;
  }

  async addBatchSafely(stockItemId: string, batchNumber: string, expiryDate: Date, quantity: number, costPrice: number, receivedDate?: Date, departmentId?: string) {
    return this.prisma.$transaction((tx) =>
      this.addBatchWithinTransaction(tx, stockItemId, batchNumber, expiryDate, quantity, costPrice, receivedDate, departmentId)
    );
  }

  // ✅ FIXED: Prisma doesn't support comparing two fields directly. We fetch and filter in memory.
  async getLowStockItems(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await this.getModel().findMany({
      where,
      orderBy: { currentStock: 'asc' },
      include: {
        StockBatch: { where: { isActive: true }, orderBy: { expiryDate: 'asc' }, take: 3 },
        stockBalances: filters.includeAllStockLocations ? true : {
          where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__' },
          select: { quantity: true },
        },
      },
    });
    const scopedItems = items.map((item: any) => ({
      ...item,
      currentStock: filters.includeAllStockLocations
        ? item.currentStock
        : item.stockBalances.reduce((sum: number, balance: any) => sum + balance.quantity, 0),
    }));
    return scopedItems.filter(item => item.currentStock <= item.reorderLevel);
  }

  async getExpiringBatches(daysThreshold: number = 90) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    return this.prisma.stockBatch.findMany({
      where: { expiryDate: { lte: thresholdDate, gte: new Date() }, isActive: true, quantity: { gt: 0 } },
      include: { stockItem: { select: { name: true, category: true, unitOfMeasure: true, currentStock: true } } },
      orderBy: { expiryDate: 'asc' }
    });
  }

  async getCategories() {
    const cats = await this.getModel().findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } });
    return cats.map((i: any) => i.category).filter(Boolean);
  }

  async getMedicationsByStockItem(id: string) {
    return this.prisma.medication.findMany({
      where: { stockItemId: id },
      include: { Attendance: { include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } }, ServiceCatalog: { include: { pricing: { where: { isActive: true }, take: 1 } } } }, // ✅ Fixed 1-to-N pricing
      orderBy: { prescribedAt: 'desc' }
    });
  }

  // ==========================================
  // REPORT DATA FETCHERS (Preserved exactly)
  // ==========================================
  async getItemsForValueReport(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.getModel().findMany({ where, select: { id: true, name: true, category: true, currentStock: true, costPrice: true, reorderLevel: true, isMedication: true } });
  }

  async getItemsForExpiryReport(category?: string) {
    const where: any = { expiryDate: { not: null }, isActive: true };
    if (category) where.category = category;
    return this.getModel().findMany({ where, select: { id: true, name: true, category: true, currentStock: true, expiryDate: true, unitOfMeasure: true, costPrice: true, StockBatch: { where: { isActive: true }, select: { batchNumber: true, expiryDate: true, quantity: true } } }, orderBy: { expiryDate: 'asc' } });
  }

  async getTransactionsForMovementReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) where.transactionDate = { gte: startDate, lte: endDate };
    return this.prisma.stockTransaction.findMany({ where, include: { StockItem: { select: { name: true, category: true, isMedication: true, costPrice: true } } }, orderBy: { transactionDate: 'desc' } });
  }

  /** Every stock transaction in the period, oldest first, so balances can be chained. Newest `limit` rows when there are more. */
  async getLedgerTransactions(opts: { startDate?: Date; endDate?: Date; category?: string; stockItemId?: string; transactionType?: string; limit: number }) {
    const where: any = {};
    if (opts.startDate || opts.endDate) {
      where.transactionDate = {};
      if (opts.startDate) where.transactionDate.gte = opts.startDate;
      if (opts.endDate) where.transactionDate.lte = opts.endDate;
    }
    if (opts.stockItemId) where.stockItemId = opts.stockItemId;
    if (opts.transactionType) where.transactionType = opts.transactionType;
    if (opts.category) where.StockItem = { category: opts.category };
    const total = await this.prisma.stockTransaction.count({ where });
    const rows = await this.prisma.stockTransaction.findMany({
      where,
      orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      skip: Math.max(0, total - opts.limit),
      take: opts.limit,
      include: {
        StockItem: { select: { id: true, name: true, category: true, unitOfMeasure: true, drugCode: true, costPrice: true } },
        User: { select: { fullName: true } },
        Department: { select: { name: true } },
        Requisition: { select: { requisitionNumber: true } },
        Invoice: { select: { invoiceNumber: true, supplierName: true } },
      },
    });
    return { rows, total };
  }

  async getTransactionsForUsageReport(startDate: Date) {
    return this.prisma.stockTransaction.findMany({
      where: { transactionType: { in: ['sale', 'requisition'] }, transactionDate: { gte: startDate } },
      include: { StockItem: { select: { name: true, category: true, unitOfMeasure: true, isMedication: true } } }
    });
  }

  async getInvoicesForSupplierReport() {
    return this.prisma.invoice.findMany({ include: { InvoiceItem: { include: { StockItem: { select: { name: true, category: true, drugCode: true } } } } }, orderBy: { invoiceDate: 'desc' } });
  }

  async getRequisitionsForSummaryReport(startDate?: Date, endDate?: Date, status?: RequisitionStatus) {
    const where: any = {};
    if (startDate && endDate) where.createdAt = { gte: startDate, lte: endDate };
    if (status) where.status = status;
    return this.prisma.requisition.findMany({
      where, include: { RequisitionItem: { include: { StockItem: { select: { name: true, category: true, unitOfMeasure: true } } } }, departments: { select: { id: true, name: true } }, requestedBy: { select: { id: true, fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }
}