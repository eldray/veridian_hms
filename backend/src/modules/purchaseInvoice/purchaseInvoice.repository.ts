import { PrismaClient, Invoice, InvoiceItem } from '@prisma/client';
import { 
  CreatePurchaseInvoiceDTO, 
  UpdatePurchaseInvoiceDTO, 
  PurchaseInvoiceWithRelations, 
  PurchaseInvoiceStats 
} from './purchaseInvoice.types';

export class PurchaseInvoiceRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  async findAll(filters: {
    supplierName?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: PurchaseInvoiceWithRelations[]; total: number }> {
    const where: any = {};

    if (filters.supplierName) {
      where.supplierName = {
        contains: filters.supplierName,
        mode: 'insensitive'
      };
    }

    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) where.invoiceDate.gte = filters.startDate;
      if (filters.endDate) where.invoiceDate.lte = filters.endDate;
    }

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 50));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          InvoiceItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          },
          StockTransaction: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true
                }
              }
            }
          },
          User: {
            select: {
              fullName: true,
              username: true
            }
          }
        },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.invoice.count({ where })
    ]);

    return { invoices, total };
  }

  async findById(id: string): Promise<PurchaseInvoiceWithRelations | null> {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        InvoiceItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true,
                currentStock: true,
                costPrice: true
              }
            }
          }
        },
        StockTransaction: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true
              }
            }
          }
        },
        User: {
          select: {
            fullName: true,
            username: true
          }
        }
      }
    });
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({
      where: { invoiceNumber }
    });
  }

  async create(data: CreatePurchaseInvoiceDTO, createdById: string): Promise<PurchaseInvoiceWithRelations> {
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          supplierName: data.supplierName,
          invoiceDate: new Date(data.invoiceDate),
          totalAmount: parseFloat(data.totalAmount as any),
          notes: data.notes,
          createdById
        }
      });

      for (const item of data.invoiceItems) {
        const stockItem = await tx.stockItem.findUnique({
          where: { id: item.stockItemId }
        });

        if (!stockItem) {
          throw new Error(`Stock item not found: ${item.stockItemId}`);
        }

        // Create invoice item
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            stockItemId: item.stockItemId,
            quantity: parseInt(item.quantity as any),
            unitCost: parseFloat(item.unitCost as any),
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
          }
        });

        // Create stock batch if batch number provided
        if (item.batchNumber) {
          await tx.stockBatch.create({
            data: {
              stockItemId: item.stockItemId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : new Date(),
              quantity: parseInt(item.quantity as any),
              costPrice: parseFloat(item.unitCost as any),
              receivedDate: new Date()
            }
          });
        }

        const newStockLevel = stockItem.currentStock + parseInt(item.quantity as any);

        // Create stock transaction
        await tx.stockTransaction.create({
          data: {
            stockItemId: item.stockItemId,
            transactionType: 'purchase',
            quantity: parseInt(item.quantity as any),
            balanceAfter: newStockLevel,
            reference: data.invoiceNumber,
            invoiceId: invoice.id,
            performedBy: createdById || 'system'
          }
        });

        // Update stock item
        await tx.stockItem.update({
          where: { id: item.stockItemId },
          data: {
            currentStock: newStockLevel,
            costPrice: parseFloat(item.unitCost as any)
          }
        });
      }

      return await tx.invoice.findUnique({
        where: { id: invoice.id },
        include: {
          InvoiceItem: {
            include: {
              StockItem: {
                select: {
                  name: true,
                  drugCode: true,
                  unitOfMeasure: true
                }
              }
            }
          }
        }
      });
    });

    return result as PurchaseInvoiceWithRelations;
  }

  async update(id: string, data: UpdatePurchaseInvoiceDTO): Promise<PurchaseInvoiceWithRelations> {
    const updateData: any = {};
    if (data.supplierName) updateData.supplierName = data.supplierName;
    if (data.invoiceDate) updateData.invoiceDate = new Date(data.invoiceDate);
    if (data.totalAmount !== undefined) updateData.totalAmount = parseFloat(data.totalAmount as any);
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updatedAt = new Date();

    return this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        InvoiceItem: {
          include: {
            StockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true
              }
            }
          }
        }
      }
    });
  }

  async delete(id: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
        include: {
          invoiceItems: {
            include: {
              stockItem: true
            }
          },
          stockTransactions: true
        }
      });

      if (!invoice) {
        throw new Error('Purchase invoice not found');
      }

      // Reverse stock levels
      for (const transaction of invoice.stockTransactions) {
        const stockItem = await tx.stockItem.findUnique({
          where: { id: transaction.stockItemId }
        });

        if (stockItem) {
          const newStockLevel = stockItem.currentStock - transaction.quantity;
          await tx.stockItem.update({
            where: { id: transaction.stockItemId },
            data: { currentStock: Math.max(0, newStockLevel) }
          });
        }

        await tx.stockTransaction.delete({
          where: { id: transaction.id }
        });
      }

      // Delete stock batches associated with this invoice
      for (const item of invoice.invoiceItems) {
        if (item.batchNumber) {
          await tx.stockBatch.deleteMany({
            where: {
              stockItemId: item.stockItemId,
              batchNumber: item.batchNumber
            }
          });
        }
      }

      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      });

      await tx.invoice.delete({
        where: { id }
      });

      return invoice;
    });
  }

  async getSuppliers(): Promise<string[]> {
    const suppliers = await this.prisma.invoice.findMany({
      distinct: ['supplierName'],
      select: {
        supplierName: true
      },
      where: {
        supplierName: {
          not: null
        }
      },
      orderBy: {
        supplierName: 'asc'
      }
    });

    return suppliers.map(item => item.supplierName).filter(Boolean) as string[];
  }

  async getStats(filters: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<PurchaseInvoiceStats> {
    const where: any = {};
    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) where.invoiceDate.gte = filters.startDate;
      if (filters.endDate) where.invoiceDate.lte = filters.endDate;
    }

    const [
      totalInvoices,
      totalAmount,
      recentInvoices,
      topSuppliers
    ] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          totalAmount: true
        }
      }),
      this.prisma.invoice.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.invoice.groupBy({
        by: ['supplierName'],
        where,
        _sum: {
          totalAmount: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalAmount: 'desc'
          }
        },
        take: 10
      })
    ]);

    return {
      totalInvoices,
      totalAmount: totalAmount._sum.totalAmount || 0,
      recentInvoices,
      topSuppliers: topSuppliers.map(supplier => ({
        supplierName: supplier.supplierName || '',
        totalAmount: supplier._sum.totalAmount || 0,
        invoiceCount: supplier._count.id
      }))
    };
  }
}