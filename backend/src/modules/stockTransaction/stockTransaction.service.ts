import { PrismaClient, StockTransactionType } from '@prisma/client';

const prisma = new PrismaClient();

interface StockTransactionFilters {
  stockItemId?: string;
  transactionType?: StockTransactionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

interface MovementSummaryFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
}

export class StockTransactionService {
  // Create a new stock transaction
  async create(data: any) {
    const { 
      stockItemId, 
      transactionType, 
      quantity, 
      reference, 
      notes, 
      performedBy,
      requisitionId,
      invoiceId
    } = data;

    // Validate required fields
    if (!stockItemId || !transactionType || !quantity) {
      throw new Error('Stock item ID, transaction type, and quantity are required');
    }

    // Validate transaction type matches Prisma enum
    const validTypes: StockTransactionType[] = ['purchase', 'adjustment', 'requisition', 'sale'];
    if (!validTypes.includes(transactionType)) {
      throw new Error(`Invalid transaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Get stock item to update quantity
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId }
    });

    if (!stockItem) {
      throw new Error('Stock item not found');
    }

    // Calculate new quantity based on transaction type
    let newStock = stockItem.currentStock;
    
    if (transactionType === 'purchase') {
      newStock += quantity;
    } else if (transactionType === 'adjustment') {
      newStock += quantity; // Adjustment can be positive or negative
    } else if (transactionType === 'requisition' || transactionType === 'sale') {
      if (stockItem.currentStock < quantity) {
        throw new Error(`Insufficient stock. Current: ${stockItem.currentStock}, Requested: ${quantity}`);
      }
      newStock -= quantity;
    }

    if (newStock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Create transaction and update stock item in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.create({
        data: {
          stockItemId,
          transactionType,
          quantity: Math.abs(quantity),
          balanceAfter: newStock,
          reference,
          notes,
          performedBy: performedBy || 'system',
          requisitionId,
          invoiceId
        }
      });

      // Update stock item current stock
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { currentStock: newStock }
      });

      // If this is a requisition transaction, update requisition status
      if (requisitionId && transactionType === 'requisition') {
        await tx.requisition.update({
          where: { id: requisitionId },
          data: { 
            status: 'fulfilled',
            fulfilledAt: new Date(),
            fulfilledById: performedBy
          }
        });

        // Update requisition items
        await tx.requisitionItem.updateMany({
          where: { requisitionId },
          data: { quantityFulfilled: { increment: quantity } }
        });
      }

      return transaction;
    });

    return result;
  }

  // Get all stock transactions with filters
  async getAll(filters: StockTransactionFilters) {
    const { stockItemId, transactionType, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (stockItemId) where.stockItemId = stockItemId;
    if (transactionType) where.transactionType = transactionType;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          StockItem: {
            select: {
              id: true,
              name: true,
              category: true,
              drugCode: true,
              unitOfMeasure: true
            }
          },
          Requisition: {
            select: {
              requisitionNumber: true,
              status: true,
              urgency: true
            }
          },
          Invoice: {
            select: {
              invoiceNumber: true,
              supplierName: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.stockTransaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalCount: total,
        limit: limitNum
      }
    };
  }

  // Get stock transaction by ID
  async getById(id: string) {
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        StockItem: {
          select: {
            id: true,
            name: true,
            category: true,
            drugCode: true,
            unitOfMeasure: true,
            currentStock: true
          }
        },
        Requisition: {
          select: {
            requisitionNumber: true,
            status: true,
            urgency: true,
            departments: {
              select: { name: true }
            }
          }
        },
        Invoice: {
          select: {
            invoiceNumber: true,
            supplierName: true,
            invoiceDate: true
          }
        }
      }
    });

    if (!transaction) {
      throw new Error('Stock transaction not found');
    }

    return transaction;
  }

  // Update stock transaction (limited fields only)
  async update(id: string, data: any) {
    const existingTransaction = await prisma.stockTransaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      throw new Error('Stock transaction not found');
    }

    // Only allow updating notes and reference
    const { notes, reference } = data;

    return await prisma.stockTransaction.update({
      where: { id },
      data: {
        notes: notes !== undefined ? notes : existingTransaction.notes,
        reference: reference !== undefined ? reference : existingTransaction.reference
      },
      include: {
        StockItem: {
          select: {
            name: true,
            drugCode: true
          }
        }
      }
    });
  }

  // Delete stock transaction (with reversal logic)
  async delete(id: string) {
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        StockItem: true
      }
    });

    if (!transaction) {
      throw new Error('Stock transaction not found');
    }

    // Reverse the stock quantity change
    const result = await prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.findUnique({
        where: { id: transaction.stockItemId }
      });

      if (!stockItem) {
        throw new Error('Stock item not found');
      }

      // Reverse the quantity change
      let newStock = stockItem.currentStock;
      
      if (transaction.transactionType === 'purchase') {
        newStock -= transaction.quantity;
      } else if (transaction.transactionType === 'requisition' || transaction.transactionType === 'sale') {
        newStock += transaction.quantity;
      } else if (transaction.transactionType === 'adjustment') {
        newStock -= transaction.quantity;
      }

      if (newStock < 0) {
        throw new Error('Cannot delete transaction - would cause negative stock');
      }

      await tx.stockItem.update({
        where: { id: transaction.stockItemId },
        data: { currentStock: newStock }
      });

      await tx.stockTransaction.delete({
        where: { id }
      });

      return { success: true, message: 'Transaction deleted and stock reversed' };
    });

    return result;
  }

  // Get movement summary report
  async getMovementSummary(filters: MovementSummaryFilters) {
    const { startDate, endDate, category } = filters;

    const whereTransaction: any = {};
    if (startDate) whereTransaction.transactionDate = { gte: startDate };
    if (endDate) whereTransaction.transactionDate = { ...whereTransaction.transactionDate, lte: endDate };

    const whereStockItem: any = {};
    if (category) whereStockItem.category = category;

    // Get all stock items (with optional category filter)
    const stockItems = await prisma.stockItem.findMany({
      where: whereStockItem,
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        unitOfMeasure: true
      }
    });

    // Get all transactions in date range
    const transactions = await prisma.stockTransaction.findMany({
      where: whereTransaction,
      include: {
        StockItem: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });

    // Calculate movement summary per item
    const movementSummary = stockItems.map(item => {
      const itemTransactions = transactions.filter(t => t.stockItemId === item.id);
      
      const purchases = itemTransactions
        .filter(t => t.transactionType === 'purchase')
        .reduce((sum, t) => sum + t.quantity, 0);

      const sales = itemTransactions
        .filter(t => t.transactionType === 'sale')
        .reduce((sum, t) => sum + t.quantity, 0);

      const requisitions = itemTransactions
        .filter(t => t.transactionType === 'requisition')
        .reduce((sum, t) => sum + t.quantity, 0);

      const adjustments = itemTransactions
        .filter(t => t.transactionType === 'adjustment')
        .reduce((sum, t) => sum + t.quantity, 0);

      const totalOut = sales + requisitions;
      const totalIn = purchases + (adjustments > 0 ? adjustments : 0);
      const netChange = totalIn - totalOut;

      return {
        stockItemId: item.id,
        itemName: item.name,
        category: item.category,
        unit: item.unitOfMeasure,
        openingStock: item.currentStock - netChange,
        purchases,
        sales,
        requisitions,
        adjustments: Math.abs(adjustments),
        closingStock: item.currentStock,
        netChange
      };
    });

    // Calculate totals
    const totals = movementSummary.reduce((acc, item) => {
      acc.totalPurchases += item.purchases;
      acc.totalSales += item.sales;
      acc.totalRequisitions += item.requisitions;
      acc.totalAdjustments += item.adjustments;
      return acc;
    }, { totalPurchases: 0, totalSales: 0, totalRequisitions: 0, totalAdjustments: 0 });

    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      totals,
      items: movementSummary.filter(item => 
        item.purchases > 0 || item.sales > 0 || item.requisitions > 0 || item.adjustments !== 0
      )
    };
  }

  // Get low stock alerts (using StockItem table)
  async getLowStockAlerts(filters: { category?: string }) {
    const { category } = filters;

    const where: any = {
      isActive: true,
      currentStock: {
        lte: prisma.stockItem.fields.reorderLevel
      }
    };
    
    if (category) where.category = category;

    const lowStockItems = await prisma.stockItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        reorderLevel: true,
        unitOfMeasure: true,
        drugCode: true
      },
      orderBy: { currentStock: 'asc' }
    });

    return lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      drugCode: item.drugCode,
      currentQuantity: item.currentStock,
      reorderLevel: item.reorderLevel,
      unit: item.unitOfMeasure,
      shortage: Math.max(0, item.reorderLevel - item.currentStock),
      status: item.currentStock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    }));
  }

  // Get requisition transactions
  async getRequisitionTransactions(filters: { requisitionId?: string; status?: string; startDate?: Date; endDate?: Date }) {
    const { requisitionId, status, startDate, endDate } = filters;

    const where: any = { transactionType: 'requisition' };
    
    if (requisitionId) where.requisitionId = requisitionId;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = startDate;
      if (endDate) where.transactionDate.lte = endDate;
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        StockItem: {
          select: {
            id: true,
            name: true,
            category: true,
            drugCode: true,
            unitOfMeasure: true
          }
        },
        Requisition: {
          include: {
            departments: {
              select: { name: true }
            },
            RequisitionItem: {
              include: {
                StockItem: {
                  select: {
                    name: true,
                    drugCode: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    // Filter by requisition status if provided
    let filteredTransactions = transactions;
    if (status) {
      filteredTransactions = transactions.filter(t => t.Requisition?.status === status);
    }

    return filteredTransactions;
  }

  // Get stock valuation report
  async getStockValuation(filters: { category?: string }) {
    const { category } = filters;

    const where: any = { isActive: true };
    if (category) where.category = category;

    const stockItems = await prisma.stockItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        category: true,
        currentStock: true,
        costPrice: true,
        unitOfMeasure: true,
        reorderLevel: true
      }
    });

    const totalValue = stockItems.reduce((sum, item) => sum + (item.costPrice || 0) * item.currentStock, 0);
    
    const byCategory = stockItems.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = { count: 0, value: 0, items: [] };
      }
      acc[cat].count++;
      acc[cat].value += (item.costPrice || 0) * item.currentStock;
      acc[cat].items.push(item.name);
      return acc;
    }, {} as Record<string, any>);

    return {
      totalItems: stockItems.length,
      totalValue,
      averageValuePerItem: stockItems.length > 0 ? totalValue / stockItems.length : 0,
      byCategory,
      items: stockItems.map(item => ({
        ...item,
        totalValue: (item.costPrice || 0) * item.currentStock
      }))
    };
  }
}

export const stockTransactionService = new StockTransactionService();