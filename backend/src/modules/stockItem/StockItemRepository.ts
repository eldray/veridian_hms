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
          where: includeAllStockLocations ? {} : { departmentId: departmentId || '__NO_DEPARTMENT__', wardId: null },
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
    const balanceWhere = includeAllStockLocations ? {} : { departmentId: departmentId || '__NO_DEPARTMENT__', wardId: null };
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
          where: balanceWhere,
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
      const batchAllocations: Array<{ batchId: string; batchNumber: string; quantity: number; expiryDate: Date; costPrice: string }> = [];

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
        throw new Error('This item uses batch tracking. Use the batch receipt workflow for incoming stock.');
      }

      let locationBalanceAfter: number;
      if (isOutgoing) {
        const balance = await decreaseDepartmentStockBalance(tx, id, normalizedDepartmentId, effectiveQuantity);
        locationBalanceAfter = balance.quantity;
        const updated = await tx.stockItem.updateMany({
          where: { id, currentStock: { gte: effectiveQuantity } },
          data: { currentStock: { decrement: effectiveQuantity } },
        });
        if (updated.count !== 1) throw new Error('Insufficient hospital-wide stock');
      } else {
        const balance = await increaseDepartmentStockBalance(tx, id, normalizedDepartmentId, effectiveQuantity);
        locationBalanceAfter = balance.quantity;
        await tx.stockItem.update({ where: { id }, data: { currentStock: { increment: effectiveQuantity } } });
      }

      const updatedItem = await tx.stockItem.findUnique({ where: { id } });
      if (!updatedItem) throw new Error('Stock item not found');
      await tx.stockTransaction.create({
        data: {
          stockItemId: id, transactionType, quantity: effectiveQuantity,
          balanceAfter: locationBalanceAfter, reference, notes,
          performedBy: performedBy || 'system', departmentId: normalizedDepartmentId, adjustmentDirection,
          batchAllocations: batchAllocations.length ? batchAllocations as any : undefined,
        },
      });
      // This workflow is location-scoped. Return the balance for the selected
      // department so the caller does not display the hospital aggregate as local stock.
      return normalizedDepartmentId
        ? { ...updatedItem, currentStock: locationBalanceAfter }
        : updatedItem;
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
          // The unique key is item + batch number + location. Refuse to merge
          // stock when the existing destination lot has a different acquisition cost.
          if (Number(existing.costPrice) !== Number(batch.costPrice)) {
            throw new Error(`Destination already has batch ${batch.batchNumber} with a different cost price. Reconcile the batch before allocating stock.`);
          }
          if (!existing.isActive) {
            throw new Error(`Destination batch ${batch.batchNumber} is inactive. Reconcile the batch before allocating stock.`);
          }
          await tx.stockBatch.update({ where: { id: existing.id }, data: { quantity: { increment: move } } });
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
    if (!stockItemId || !batchNumber?.trim()) throw new ValidationError('Stock item and batch number are required');
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new ValidationError('Batch quantity must be a positive whole number');
    if (!(expiryDate instanceof Date) || Number.isNaN(expiryDate.getTime())) throw new ValidationError('A valid batch expiry date is required');
    if (!Number.isFinite(Number(costPrice)) || Number(costPrice) < 0) throw new ValidationError('Batch cost price must be a valid non-negative amount');

    const normalizedDepartmentId = departmentId || null;
    const existingBatchCount = await tx.stockBatch.count({ where: { stockItemId } });
    if (existingBatchCount === 0) {
      const existingItem = await tx.stockItem.findUnique({ where: { id: stockItemId }, select: { currentStock: true, name: true } });
      if (!existingItem) throw new Error('Stock item not found while receiving batch');
      if (existingItem.currentStock > 0) {
        throw new Error(`Cannot start batch tracking for ${existingItem.name} while ${existingItem.currentStock} units of unbatched stock remain. Reconcile or issue the existing stock first.`);
      }
    }

    // The database permits one batch row per item, batch number and location.
    // Reuse it only when expiry and cost match exactly; never blend distinct lots.
    const existingBatch = await tx.stockBatch.findFirst({
      where: { stockItemId, batchNumber: batchNumber.trim(), departmentId: normalizedDepartmentId, wardId: null },
    });
    let batch;
    if (existingBatch) {
      if (existingBatch.expiryDate.getTime() !== expiryDate.getTime()) {
        throw new ValidationError(`Batch ${batchNumber} already exists at this location with a different expiry date`);
      }
      if (Number(existingBatch.costPrice) !== Number(costPrice)) {
        throw new ValidationError(`Batch ${batchNumber} already exists at this location with a different cost price`);
      }
      if (!existingBatch.isActive) {
        throw new ValidationError(`Batch ${batchNumber} is inactive at this location; reconcile it before receiving more stock`);
      }
      const incremented = await tx.stockBatch.updateMany({
        where: { id: existingBatch.id, isActive: true },
        data: { quantity: { increment: quantity } },
      });
      if (incremented.count !== 1) throw new ValidationError('Batch changed during receipt. Please retry.');
      batch = await tx.stockBatch.findUnique({ where: { id: existingBatch.id } });
    } else {
      batch = await tx.stockBatch.create({
        data: {
          stockItemId, batchNumber: batchNumber.trim(), expiryDate, quantity, costPrice,
          receivedDate: receivedDate || new Date(),
          departmentId: normalizedDepartmentId,
        },
      });
    }
    const locationBalanceAfter = await increaseDepartmentStockBalance(tx, stockItemId, departmentId, quantity);
    await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });

    await tx.stockTransaction.create({
      data: {
        stockItemId, transactionType: 'purchase', quantity,
        balanceAfter: locationBalanceAfter.quantity, reference: `BATCH-${batchNumber}`,
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
          where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
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
    return scopedItems.filter((item: any) => item.currentStock <= item.reorderLevel);
  }

  async getExpiringBatches(
    daysThreshold: number = 90,
    filters: { departmentId?: string; includeAllStockLocations?: boolean } = {},
  ) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
    return this.prisma.stockBatch.findMany({
      where: {
        expiryDate: { lte: thresholdDate, gte: new Date() },
        isActive: true,
        quantity: { gt: 0 },
        ...(!filters.includeAllStockLocations
          ? { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null }
          : {}),
      },
      include: {
        stockItem: {
          select: {
            name: true, category: true, unitOfMeasure: true, currentStock: true,
            stockBalances: filters.includeAllStockLocations ? false as any : {
              where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
              select: { quantity: true },
            },
          },
        },
      },
      orderBy: { expiryDate: 'asc' }
    }).then((batches: any[]) => batches.map((batch: any) => {
      if (!batch.stockItem || filters.includeAllStockLocations) return batch;
      const { stockBalances = [], ...stockItem } = batch.stockItem;
      return {
        ...batch,
        stockItem: {
          ...stockItem,
          currentStock: stockBalances.reduce((sum: number, balance: any) => sum + balance.quantity, 0),
        },
      };
    }));
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
  async getItemsForValueReport(category?: string, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    return this.getModel().findMany({
      where,
      select: {
        id: true, name: true, category: true, currentStock: true,
        costPrice: true, reorderLevel: true, isMedication: true,
        StockBatch: {
          where: {
            quantity: { gt: 0 },
            ...(filters.includeAllStockLocations ? {} : { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null }),
          },
          select: { quantity: true, costPrice: true, isActive: true },
        },
        stockBalances: filters.includeAllStockLocations ? false as any : {
          where: { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null },
          select: { quantity: true },
        },
      },
    });
  }

  async getItemsForExpiryReport(
    category?: string,
    filters: { departmentId?: string; includeAllStockLocations?: boolean } = {},
  ) {
    // Batch-tracked items may have no legacy item-level expiryDate, so do not
    // exclude them from the report on that field alone. Department reports only
    // inspect batches and balances physically assigned to that department.
    const batchLocationWhere = filters.includeAllStockLocations
      ? {}
      : { departmentId: filters.departmentId || '__NO_DEPARTMENT__', wardId: null };
    const where: any = {
      isActive: true,
      OR: [
        { expiryDate: { not: null } },
        { StockBatch: { some: { isActive: true, quantity: { gt: 0 }, ...batchLocationWhere } } },
      ],
    };
    if (category) where.category = category;
    const items = await this.getModel().findMany({
      where,
      select: {
        id: true, name: true, category: true, currentStock: true, expiryDate: true,
        unitOfMeasure: true, costPrice: true,
        StockBatch: {
          where: { isActive: true, quantity: { gt: 0 }, ...batchLocationWhere },
          select: { batchNumber: true, expiryDate: true, quantity: true, costPrice: true },
          orderBy: { expiryDate: 'asc' },
        },
        stockBalances: filters.includeAllStockLocations ? false as any : {
          where: batchLocationWhere,
          select: { quantity: true },
        },
      },
      orderBy: { expiryDate: 'asc' },
    });
    const scoped = items.map((item: any) => ({
      ...item,
      currentStock: filters.includeAllStockLocations
        ? item.currentStock
        : item.stockBalances.reduce((sum: number, balance: any) => sum + balance.quantity, 0),
    }));
    return scoped.filter((item: any) =>
      item.currentStock > 0 || item.StockBatch.some((batch: any) => Number(batch.quantity) > 0)
    );
  }

  async getTransactionsForMovementReport(startDate?: Date, endDate?: Date) {
    const where: any = {};
    if (startDate && endDate) where.transactionDate = { gte: startDate, lte: endDate };
    return this.prisma.stockTransaction.findMany({ where, include: { StockItem: { select: { name: true, category: true, isMedication: true, costPrice: true } } }, orderBy: { transactionDate: 'desc' } });
  }

  /** Every stock transaction in the period, oldest first, so balances can be chained. Newest `limit` rows when there are more. */
  async getLedgerTransactions(opts: { startDate?: Date; endDate?: Date; category?: string; stockItemId?: string; transactionType?: string; departmentId?: string; includeAllStockLocations?: boolean; limit: number }) {
    const where: any = {};
    // Movement ledgers are location-scoped by default. Only explicitly authorized
    // callers may request the hospital-wide ledger.
    if (!opts.includeAllStockLocations) where.departmentId = opts.departmentId || '__NO_DEPARTMENT__';
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
        StockItem: { select: { id: true, name: true, category: true, unitOfMeasure: true, drugCode: true, costPrice: true, currentStock: true } },
        User: { select: { fullName: true } },
        Department: { select: { name: true } },
        Requisition: { select: { requisitionNumber: true } },
        Invoice: { select: { invoiceNumber: true, supplierName: true } },
      },
    });

    // Hospital-wide historical closing balances must be based on the aggregate item
    // balance, not a department-specific balanceAfter snapshot. Fetch all movements
    // after the report end (without the activity-type filter) so the service can
    // reverse later movements while treating internal transfers as stock-neutral.
    let transactionsAfterEnd: any[] = [];
    if (opts.endDate) {
      const afterWhere: any = {
        transactionDate: { gt: opts.endDate },
      };
      if (!opts.includeAllStockLocations) afterWhere.departmentId = opts.departmentId || '__NO_DEPARTMENT__';
      if (opts.stockItemId) afterWhere.stockItemId = opts.stockItemId;
      if (opts.category) afterWhere.StockItem = { category: opts.category };
      transactionsAfterEnd = await this.prisma.stockTransaction.findMany({
        where: afterWhere,
        select: { stockItemId: true, transactionType: true, quantity: true, adjustmentDirection: true },
      });
    }
    return { rows, total, transactionsAfterEnd };
  }

  async getTransactionsForUsageReport(startDate: Date, filters: { departmentId?: string; includeAllStockLocations?: boolean } = {}) {
    const where: any = {
      transactionType: { in: ['sale', 'requisition'] },
      transactionDate: { gte: startDate },
      // Edited/deleted consumable rows remain in the ledger for audit history,
      // but should not be counted as current usage alongside their correction.
      NOT: [
        { notes: { startsWith: 'Consumable use: [EDITED]' } },
        { notes: { startsWith: 'Consumable use: [DELETED]' } },
      ],
    };
    if (!filters.includeAllStockLocations) where.departmentId = filters.departmentId || '__NO_DEPARTMENT__';
    return this.prisma.stockTransaction.findMany({
      where,
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