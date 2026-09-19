import { PrismaClient, StockTransactionType, RequisitionStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class StockItemRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'stockItem');
  }

  async findAllWithFilters(filters: any) {
    const { category, search, page = 1, limit = 1000 } = filters;
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
      include: { StockBatch: { where: { isActive: true }, orderBy: { expiryDate: 'asc' } } }
    });
  }

  async findByIdWithRelations(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Medication: { include: { Attendance: { select: { attendanceNumber: true, Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } } }, orderBy: { prescribedAt: 'desc' }, take: 50 },
        StockTransaction: { orderBy: { transactionDate: 'desc' }, take: 20 },
        InvoiceItem: { include: { Invoice: { select: { invoiceNumber: true, supplierName: true, invoiceDate: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        RequisitionItem: { include: { Requisition: { select: { requisitionNumber: true, status: true, urgency: true, createdAt: true } } }, orderBy: { createdAt: 'desc' }, take: 10 },
        StockBatch: { orderBy: { receivedDate: 'desc' } }
      }
    });
  }

  async hasDependencies(id: string) {
    const item = await this.getModel().findUnique({
      where: { id },
      include: { Medication: { take: 1 }, StockTransaction: { take: 1 }, InvoiceItem: { take: 1 }, RequisitionItem: { take: 1 }, StockBatch: { take: 1 } }
    });
    if (!item) throw new Error('Stock item not found');
    return item.Medication.length > 0 || item.StockTransaction.length > 0 || item.InvoiceItem.length > 0 || item.RequisitionItem.length > 0 || item.StockBatch.length > 0;
  }

  // ✅ PRODUCTION FIX: Thread-safe inventory update using atomic decrement
  async updateStockLevelSafely(id: string, quantity: number, transactionType: StockTransactionType, reference?: string, notes?: string, performedBy?: string) {
    return this.prisma.$transaction(async (tx) => {
      const isOutgoing = transactionType === 'sale' || transactionType === 'requisition';
      
      if (isOutgoing) {
        // Atomically decrement ONLY if we have enough stock
        const updated = await tx.stockItem.updateMany({
          where: { id, currentStock: { gte: quantity } },
          data: { currentStock: { decrement: quantity } }
        });
        if (updated.count === 0) {
          const item = await tx.stockItem.findUnique({ where: { id } });
          throw new Error(`Insufficient stock. Current: ${item?.currentStock || 0}, Requested: ${quantity}`);
        }
      } else {
        await tx.stockItem.update({ where: { id }, data: { currentStock: { increment: quantity } } });
      }

      // Fetch the new balance for the transaction log
      const updatedItem = await tx.stockItem.findUnique({ where: { id } });

      await tx.stockTransaction.create({
        data: {
          stockItemId: id, transactionType, quantity: Math.abs(quantity),
          balanceAfter: updatedItem!.currentStock, reference, notes, performedBy: performedBy || 'system'
        }
      });

      return updatedItem;
    });
  }

  async getTransactions(id: string, page: number = 1, limit: number = 50) {
    return this.prisma.stockTransaction.findMany({
      where: { stockItemId: id },
      include: { Requisition: { select: { requisitionNumber: true, status: true, urgency: true } }, Invoice: { select: { invoiceNumber: true, supplierName: true } } },
      orderBy: { transactionDate: 'desc' }
    });
  }

  async addBatchSafely(stockItemId: string, batchNumber: string, expiryDate: Date, quantity: number, costPrice: number, receivedDate?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.create({ data: { stockItemId, batchNumber, expiryDate, quantity, costPrice, receivedDate: receivedDate || new Date() } });
      await tx.stockItem.update({ where: { id: stockItemId }, data: { currentStock: { increment: quantity } } });
      const updatedItem = await tx.stockItem.findUnique({ where: { id: stockItemId } });
      
      await tx.stockTransaction.create({
        data: { stockItemId, transactionType: 'purchase', quantity, balanceAfter: updatedItem!.currentStock, reference: `BATCH-${batchNumber}`, notes: `Added batch ${batchNumber}`, performedBy: 'system' }
      });
      return batch;
    });
  }

  // ✅ FIXED: Prisma doesn't support comparing two fields directly. We fetch and filter in memory.
  async getLowStockItems(category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const items = await this.getModel().findMany({ where, orderBy: { currentStock: 'asc' }, include: { StockBatch: { where: { isActive: true }, orderBy: { expiryDate: 'asc' }, take: 3 } } });
    return items.filter(i => i.currentStock <= i.reorderLevel);
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
    const cats = await this.getModel().findMany({ distinct: ['category'], select: { category: true }, where: { category: { not: null } }, orderBy: { category: 'asc' } });
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