import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO, toNumber } from './PurchaseInvoiceTypes';

export class PurchaseInvoiceRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'invoice');
  }

  async findAll(filters: any) {
    const { supplierName, startDate, endDate, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (supplierName) where.supplierName = { contains: supplierName, mode: 'insensitive' };
    if (startDate || endDate) {
      where.invoiceDate = {};
      if (startDate) where.invoiceDate.gte = startDate;
      if (endDate) where.invoiceDate.lte = endDate;
    }

    return this.findManyWithPagination({
      where, page, limit: Math.min(limit, 1000), orderBy: { invoiceDate: 'desc' },
      include: {
        InvoiceItem: { include: { StockItem: { select: { name: true, drugCode: true, unitOfMeasure: true } } } },
        StockTransaction: { include: { StockItem: { select: { name: true, drugCode: true } } } },
        User: { select: { fullName: true, username: true } },
        receivedAtDepartment: { select: { id: true, name: true } } // ✅ NEW
      }
    });
  }

  async findByIdWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        InvoiceItem: { include: { StockItem: { select: { name: true, drugCode: true, unitOfMeasure: true, currentStock: true, costPrice: true } } } },
        StockTransaction: true,
        User: { select: { fullName: true, username: true } },
        receivedAtDepartment: { select: { id: true, name: true } } // ✅ NEW
      }
    });
  }

  async create(data: CreatePurchaseInvoiceDTO, createdById: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          supplierName: data.supplierName,
          invoiceDate: new Date(data.invoiceDate),
          totalAmount: data.totalAmount,
          notes: data.notes,
          createdById,
          receivedAtDepartmentId: data.receivedAtDepartmentId // ✅ NEW: Assign receiving location
        }
      });

      for (const item of data.invoiceItems) {
        const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (!stockItem) throw new Error(`Stock item not found: ${item.stockItemId}`);

        // 1. Create Invoice Item
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id, stockItemId: item.stockItemId, quantity: item.quantity,
            unitCost: item.unitCost, batchNumber: item.batchNumber, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }
        });

        // 2. Create Stock Batch (Assigned to the receiving department!)
        if (item.batchNumber) {
          await tx.stockBatch.create({
            data: {
              stockItemId: item.stockItemId, batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : new Date(),
              quantity: item.quantity, costPrice: item.unitCost, receivedDate: new Date(),
              departmentId: data.receivedAtDepartmentId // ✅ NEW: Physical location of the batch
            }
          });
        }

        // 3. Create Stock Transaction
        await tx.stockTransaction.create({
          data: {
            stockItemId: item.stockItemId, transactionType: 'purchase', quantity: item.quantity,
            balanceAfter: stockItem.currentStock + item.quantity, reference: data.invoiceNumber,
            invoiceId: invoice.id, performedBy: createdById || 'system',
            departmentId: data.receivedAtDepartmentId // ✅ NEW: Log where the purchase happened
          }
        });

        // 4. Update Global Stock Item
        await tx.stockItem.update({
          where: { id: item.stockItemId },
          data: { currentStock: { increment: item.quantity }, costPrice: item.unitCost }
        });
      }

      return await tx.invoice.findUnique({ where: { id: invoice.id }, include: { InvoiceItem: true, receivedAtDepartment: true } });
    });
  }

  // ==========================================
  // SAFE DELETE (Prevents negative inventory)
  // ==========================================
  async deleteSafely(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { InvoiceItem: true } });
      if (!invoice) throw new Error('Purchase invoice not found');

      // ✅ PRODUCTION FIX: Safely reverse stock using atomic decrements.
      // If the stock was already dispensed/transferred, this will fail and block the deletion.
      for (const item of invoice.InvoiceItem) {
        const reversed = await tx.stockItem.updateMany({
          where: { id: item.stockItemId, currentStock: { gte: item.quantity } },
          data: { currentStock: { decrement: item.quantity } }
        });

        if (reversed.count === 0) {
          throw new Error(`Cannot delete invoice: Stock for '${item.stockItemId}' has already been consumed, transferred, or dispensed. Please use an adjustment instead.`);
        }

        // Delete the associated batch if it still exists and hasn't been moved
        if (item.batchNumber) {
          await tx.stockBatch.deleteMany({
            where: { stockItemId: item.stockItemId, batchNumber: item.batchNumber, quantity: item.quantity }
          });
        }
      }

      // Delete ledger entries
      await tx.stockTransaction.deleteMany({ where: { invoiceId: id } });
      await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
      
      return tx.invoice.delete({ where: { id } });
    });
  }

  // ==========================================
  // STATS (Fixed Decimal Math)
  // ==========================================
  async getStats(filters: any) {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) where.invoiceDate.gte = filters.startDate;
      if (filters.endDate) where.invoiceDate.lte = filters.endDate;
    }

    const [totalInvoices, totalAmount, recentInvoices, topSuppliers] = await Promise.all([
      this.count(where),
      this.prisma.invoice.aggregate({ where, _sum: { totalAmount: true } }),
      this.count({ ...where, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
      this.prisma.invoice.groupBy({ by: ['supplierName'], where, _sum: { totalAmount: true }, _count: { id: true }, orderBy: { _sum: { totalAmount: 'desc' } }, take: 10 })
    ]);

    return {
      totalInvoices,
      totalAmount: toNumber(totalAmount._sum.totalAmount), // ✅ FIXED: Parsed to JS number
      recentInvoices,
      topSuppliers: topSuppliers.map(s => ({
        supplierName: s.supplierName || '',
        totalAmount: toNumber(s._sum.totalAmount), // ✅ FIXED: Parsed to JS number
        invoiceCount: s._count.id
      }))
    };
  }
}