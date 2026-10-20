import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO, toNumber } from './PurchaseInvoiceTypes';
import { decreaseDepartmentStockBalance, increaseDepartmentStockBalance } from '../stockItem/StockItemRepository';


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
        receivedAtDepartment: { select: { id: true, name: true } },
        receivedAtWard: { select: { id: true, wardName: true } }
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
          receivedAtDepartmentId: data.receivedAtDepartmentId || null,
          receivedAtWardId: data.receivedAtWardId || null
        }
      });

      for (const item of data.invoiceItems) {
        const stockItem = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (!stockItem) throw new Error(`Stock item not found: ${item.stockItemId}`);
        const existingBatchCount = await tx.stockBatch.count({ where: { stockItemId: item.stockItemId } });
        if (existingBatchCount > 0 && !item.batchNumber) {
          throw new Error(`Item ${stockItem.name} is batch-tracked; batch number and expiry date are required for every receipt.`);
        }
        if (existingBatchCount === 0 && item.batchNumber && stockItem.currentStock > 0) {
          throw new Error(`Item ${stockItem.name} has unbatched stock remaining. Reconcile or issue it before starting batch tracking.`);
        }

        // 1. Create Invoice Item
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id, stockItemId: item.stockItemId, quantity: item.quantity,
            unitCost: item.unitCost, batchNumber: item.batchNumber, expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }
        });

        // 2. Create Stock Batch (Assigned to the receiving department!)
        if (item.batchNumber) {
          const batchExpiry = item.expiryDate ? new Date(item.expiryDate) : null;
          if (!batchExpiry || !Number.isFinite(batchExpiry.getTime()) || batchExpiry <= new Date()) {
            throw new Error(`A future expiry date is required for batch-tracked item ${stockItem.name}`);
          }
          const batchLocation = {
            departmentId: data.receivedAtDepartmentId || null,
            wardId: data.receivedAtWardId || null,
          };
          const existingBatch = await tx.stockBatch.findFirst({
            where: {
              stockItemId: item.stockItemId, batchNumber: item.batchNumber,
              ...batchLocation,
            },
          });
          if (existingBatch) {
            if (existingBatch.expiryDate.getTime() !== batchExpiry.getTime()) {
              throw new Error(`Batch ${item.batchNumber} for ${stockItem.name} already exists at this location with a different expiry date.`);
            }
            await tx.stockBatch.update({
              where: { id: existingBatch.id },
              data: { quantity: { increment: item.quantity }, costPrice: item.unitCost, isActive: true },
            });
          } else {
            await tx.stockBatch.create({
              data: {
                stockItemId: item.stockItemId, batchNumber: item.batchNumber,
                expiryDate: batchExpiry, quantity: item.quantity, costPrice: item.unitCost,
                receivedDate: new Date(), ...batchLocation,
              },
            });
          }
        }

        // Keep the location ledger in sync with the batch/receipt and hospital aggregate.
        await increaseDepartmentStockBalance(
          tx, item.stockItemId, data.receivedAtDepartmentId || null, item.quantity, data.receivedAtWardId || null,
        );

        // 3. Create Stock Transaction
        await tx.stockTransaction.create({
          data: {
            stockItemId: item.stockItemId, transactionType: 'purchase', quantity: item.quantity,
            balanceAfter: stockItem.currentStock + item.quantity, reference: data.invoiceNumber,
            invoiceId: invoice.id, performedBy: createdById || undefined,
            departmentId: data.receivedAtDepartmentId || undefined,
            wardId: data.receivedAtWardId || undefined
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

      // Reverse only when the received stock can still be identified at the receiving location.
      // The entire delete runs transactionally; any failed line cancels all reversals.
      for (const item of invoice.InvoiceItem) {
        if (item.batchNumber) {
          const outgoingSinceReceipt = await tx.stockTransaction.count({
            where: {
              stockItemId: item.stockItemId,
              departmentId: invoice.receivedAtDepartmentId || null,
              wardId: invoice.receivedAtWardId || null,
              transactionDate: { gte: invoice.createdAt },
              transactionType: { in: ['sale', 'requisition', 'transfer_out', 'write_off'] },
            },
          });
          if (outgoingSinceReceipt > 0) {
            throw new Error(`Cannot delete invoice: stock for batch ${item.batchNumber} may have been consumed or transferred since receipt.`);
          }
          const batch = await tx.stockBatch.findFirst({
            where: {
              stockItemId: item.stockItemId,
              batchNumber: item.batchNumber,
              departmentId: invoice.receivedAtDepartmentId || null,
              wardId: invoice.receivedAtWardId || null,
              quantity: { gte: item.quantity },
            },
          });
          if (!batch) throw new Error(`Cannot delete invoice: batch ${item.batchNumber} for item ${item.stockItemId} no longer has enough stock at the receiving location.`);
          const remainingBatchQty = batch.quantity - item.quantity;
          if (remainingBatchQty === 0) {
            await tx.stockBatch.delete({ where: { id: batch.id } });
          } else {
            await tx.stockBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: item.quantity } } });
          }
        } else {
          const outgoingSinceReceipt = await tx.stockTransaction.count({
            where: {
              stockItemId: item.stockItemId,
              departmentId: invoice.receivedAtDepartmentId || null,
              wardId: invoice.receivedAtWardId || null,
              transactionDate: { gte: invoice.createdAt },
              transactionType: { in: ['sale', 'requisition', 'transfer_out', 'write_off'] },
            },
          });
          if (outgoingSinceReceipt > 0) {
            throw new Error(`Cannot safely delete invoice: stock for item ${item.stockItemId} may have been consumed or transferred since receipt.`);
          }
        }

        await decreaseDepartmentStockBalance(
          tx, item.stockItemId, invoice.receivedAtDepartmentId || null, item.quantity, invoice.receivedAtWardId || null,
        );
        const reversed = await tx.stockItem.updateMany({
          where: { id: item.stockItemId, currentStock: { gte: item.quantity } },
          data: { currentStock: { decrement: item.quantity } }
        });

        if (reversed.count === 0) {
          throw new Error(`Cannot delete invoice: Stock for '${item.stockItemId}' has already been consumed, transferred, or dispensed. Please use an adjustment instead.`);
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