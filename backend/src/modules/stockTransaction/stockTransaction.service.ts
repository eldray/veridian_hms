import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StockTransactionFilters {
  stockItemId?: string;
  transactionType?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

interface MovementSummaryFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  departmentId?: string;
}

export class StockTransactionService {
  // Create a new stock transaction
  async create(data: any) {
    const { stockItemId, transactionType, quantity, unitPrice, totalAmount, departmentId, referenceNumber, notes, batchNumber, expiryDate } = data;

    // Validate required fields
    if (!stockItemId || !transactionType || !quantity) {
      throw new Error('Stock item ID, transaction type, and quantity are required');
    }

    // Validate transaction type
    const validTypes = ['PURCHASE', 'DISPENSE', 'ADJUSTMENT', 'RETURN', 'TRANSFER', 'EXPIRED', 'DAMAGED'];
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
    let newQuantity = stockItem.quantity;
    if (['PURCHASE', 'RETURN', 'TRANSFER'].includes(transactionType)) {
      newQuantity += quantity;
    } else if (['DISPENSE', 'ADJUSTMENT', 'EXPIRED', 'DAMAGED'].includes(transactionType)) {
      if (stockItem.quantity < quantity) {
        throw new Error('Insufficient stock quantity');
      }
      newQuantity -= quantity;
    }

    // Create transaction and update stock item in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.create({
        data: {
          stockItemId,
          transactionType,
          quantity,
          unitPrice: unitPrice || 0,
          totalAmount: totalAmount || (unitPrice || 0) * quantity,
          departmentId,
          referenceNumber,
          notes,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          balanceAfter: newQuantity
        }
      });

      // Update stock item quantity
      await tx.stockItem.update({
        where: { id: stockItemId },
        data: { quantity: newQuantity }
      });

      return transaction;
    });

    return result;
  }

  // Get all stock transactions with filters
  async getAll(filters: StockTransactionFilters) {
    const { stockItemId, transactionType, departmentId, startDate, endDate, page = 1, limit = 50 } = filters;

    const where: any = {};

    if (stockItemId) where.stockItemId = stockItemId;
    if (transactionType) where.transactionType = transactionType;
    if (departmentId) where.departmentId = departmentId;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          stockItem: true,
          department: true
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.stockTransaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCount: total,
        limit
      }
    };
  }

  // Get stock transaction by ID
  async getById(id: string) {
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id },
      include: {
        stockItem: true,
        department: true
      }
    });

    if (!transaction) {
      throw new Error('Stock transaction not found');
    }

    return transaction;
  }

  // Update stock transaction
  async update(id: string, data: any) {
    const existingTransaction = await prisma.stockTransaction.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      throw new Error('Stock transaction not found');
    }

    // Note: Updating transactions that affect stock quantity requires careful handling
    // For simplicity, we'll only allow updating non-quantity fields
    const { referenceNumber, notes } = data;

    return await prisma.stockTransaction.update({
      where: { id },
      data: {
        referenceNumber,
        notes
      },
      include: {
        stockItem: true,
        department: true
      }
    });
  }

  // Delete stock transaction
  async delete(id: string) {
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id }
    });

    if (!transaction) {
      throw new Error('Stock transaction not found');
    }

    // Note: Deleting a transaction that affected stock quantity requires reversing the quantity change
    // This should be done carefully and may require additional business logic

    await prisma.stockTransaction.delete({
      where: { id }
    });
  }

  // Get movement summary report
  async getMovementSummary(filters: MovementSummaryFilters) {
    const { startDate, endDate, category, departmentId } = filters;

    const startDateObj = startDate ? new Date(startDate) : new Date(0);
    const endDateObj = endDate ? new Date(endDate) : new Date();

    // Build query for stock items
    const stockItemWhere: any = {};
    if (category) stockItemWhere.category = category;
    if (departmentId) stockItemWhere.departmentId = departmentId;

    const stockItems = await prisma.stockItem.findMany({
      where: stockItemWhere,
      include: {
        department: true
      }
    });

    const movementSummary = await Promise.all(
      stockItems.map(async (item) => {
        const transactions = await prisma.stockTransaction.findMany({
          where: {
            stockItemId: item.id,
            date: {
              gte: startDateObj,
              lte: endDateObj
            }
          }
        });

        const purchases = transactions
          .filter(t => t.transactionType === 'PURCHASE')
          .reduce((sum, t) => sum + t.quantity, 0);

        const dispenses = transactions
          .filter(t => t.transactionType === 'DISPENSE')
          .reduce((sum, t) => sum + t.quantity, 0);

        const adjustments = transactions
          .filter(t => t.transactionType === 'ADJUSTMENT')
          .reduce((sum, t) => sum + t.quantity, 0);

        const returns = transactions
          .filter(t => t.transactionType === 'RETURN')
          .reduce((sum, t) => sum + t.quantity, 0);

        const expired = transactions
          .filter(t => t.transactionType === 'EXPIRED')
          .reduce((sum, t) => sum + t.quantity, 0);

        const damaged = transactions
          .filter(t => t.transactionType === 'DAMAGED')
          .reduce((sum, t) => sum + t.quantity, 0);

        const openingStock = item.quantity - purchases + dispenses + adjustments - returns + expired + damaged;
        const closingStock = item.quantity;

        return {
          stockItemId: item.id,
          itemName: item.name,
          category: item.category,
          subCategory: item.subCategory,
          department: item.department?.name,
          unit: item.unit,
          openingStock,
          purchases,
          dispenses,
          adjustments,
          returns,
          expired,
          damaged,
          closingStock
        };
      })
    );

    return movementSummary;
  }

  // Get low stock alerts
  async getLowStockAlerts(filters: { category?: string; departmentId?: string }) {
    const { category, departmentId } = filters;

    const where: any = {};
    if (category) where.category = category;
    if (departmentId) where.departmentId = departmentId;

    // Find items where quantity <= reorderLevel
    const lowStockItems = await prisma.stockItem.findMany({
      where: {
        ...where,
        quantity: {
          lte: prisma.stockItem.fields.reorderLevel
        }
      },
      include: {
        department: true
      }
    });

    return lowStockItems.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      subCategory: item.subCategory,
      currentQuantity: item.quantity,
      reorderLevel: item.reorderLevel,
      unit: item.unit,
      department: item.department?.name,
      shortage: item.reorderLevel - item.quantity
    }));
  }

  // Get requisition transactions
  async getRequisitionTransactions(filters: { departmentId?: string; status?: string; startDate?: string; endDate?: string }) {
    const { departmentId, status, startDate, endDate } = filters;

    const where: any = {};
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        stockItem: true,
        department: true
      },
      orderBy: { date: 'desc' }
    });

    return transactions;
  }
}

export const stockTransactionService = new StockTransactionService();
