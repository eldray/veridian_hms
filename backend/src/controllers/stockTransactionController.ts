// controllers/stockTransactionController.ts - SIMPLIFIED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getStockTransactions = async (req: Request, res: Response) => {
  try {
    const { 
      stockItemId, 
      transactionType, 
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;

    const where: any = {};

    if (stockItemId) where.stockItemId = stockItemId as string;
    if (transactionType) where.transactionType = transactionType as string;
    
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where,
        include: {
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              category: true,
              unitOfMeasure: true,
              currentStock: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.stockTransaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    res.status(500).json({ 
      message: 'Error fetching stock transactions', 
      error: (error as Error).message 
    });
  }
};

export const getStockTransactionById = async (req: Request, res: Response) => {
  try {
    const transaction = await prisma.stockTransaction.findUnique({
      where: { id: req.params.id },
      include: {
        stockItem: {
          select: {
            name: true,
            drugCode: true,
            category: true,
            unitOfMeasure: true,
            currentStock: true,
            reorderLevel: true
          }
        }
      }
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Stock transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching stock transaction:', error);
    res.status(500).json({ 
      message: 'Error fetching stock transaction', 
      error: (error as Error).message 
    });
  }
};

export const createStockTransaction = [
  body('stockItemId').notEmpty().withMessage('Stock item ID is required'),
  body('transactionType')
    .isIn(['purchase', 'sale', 'return', 'adjustment', 'transfer', 'consumption'])
    .withMessage('Valid transaction type is required'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        stockItemId,
        transactionType,
        quantity,
        notes
      } = req.body;

      // Validate stock item exists
      const stockItem = await prisma.stockItem.findUnique({
        where: { id: stockItemId }
      });

      if (!stockItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      // Calculate new stock level
      let newStockLevel = stockItem.currentStock;
      const quantityNum = parseInt(quantity);

      switch (transactionType) {
        case 'purchase':
        case 'return':
          newStockLevel += quantityNum;
          break;
        case 'sale':
        case 'consumption':
        case 'transfer':
          if (stockItem.currentStock < quantityNum) {
            return res.status(400).json({ 
              message: `Insufficient stock. Available: ${stockItem.currentStock}, Requested: ${quantityNum}` 
            });
          }
          newStockLevel -= quantityNum;
          break;
        case 'adjustment':
          newStockLevel += quantityNum;
          if (newStockLevel < 0) {
            return res.status(400).json({ 
              message: 'Adjustment would result in negative stock' 
            });
          }
          break;
      }

      // Use transaction for data consistency
      const result = await prisma.$transaction(async (tx) => {
        // Create transaction record
        const transaction = await tx.stockTransaction.create({
          data: {
            stockItemId,
            transactionType,
            quantity: quantityNum,
            balanceAfter: newStockLevel,
            notes,
            performedBy: (req as any).user?.id || 'system'
          },
          include: {
            stockItem: {
              select: {
                name: true,
                drugCode: true,
                unitOfMeasure: true
              }
            }
          }
        });

        // Update stock item
        await tx.stockItem.update({
          where: { id: stockItemId },
          data: { currentStock: newStockLevel }
        });

        return transaction;
      });

      res.status(201).json({
        message: 'Stock transaction created successfully',
        transaction: result
      });
    } catch (error) {
      console.error('Error creating stock transaction:', error);
      res.status(500).json({ 
        message: 'Error creating stock transaction', 
        error: (error as Error).message 
      });
    }
  }
];

export const updateStockTransaction = [
  body('notes').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Only allow updating notes for safety
      const transaction = await prisma.stockTransaction.update({
        where: { id: req.params.id },
        data: {
          notes: req.body.notes,
          updatedAt: new Date()
        },
        include: {
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              unitOfMeasure: true
            }
          }
        }
      });

      res.json({
        message: 'Stock transaction updated successfully',
        transaction
      });
    } catch (error) {
      console.error('Error updating stock transaction:', error);
      
      if ((error as any).code === 'P2025') {
        return res.status(404).json({ message: 'Stock transaction not found' });
      }
      
      res.status(500).json({ 
        message: 'Error updating stock transaction', 
        error: (error as Error).message 
      });
    }
  }
];

export const getStockMovementReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, stockItemId, category } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    if (stockItemId) {
      where.stockItemId = stockItemId as string;
    }

    if (category) {
      where.stockItem = {
        category: category as string
      };
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        stockItem: {
          select: {
            name: true,
            category: true,
            unitOfMeasure: true
          }
        }
      },
      orderBy: { transactionDate: 'desc' }
    });

    // Calculate summary
    const summary = transactions.reduce((acc, transaction) => {
      const quantity = transaction.quantity;
      
      if (transaction.transactionType === 'purchase' || transaction.transactionType === 'return') {
        acc.totalIncoming += quantity;
      } else if (transaction.transactionType === 'sale' || transaction.transactionType === 'consumption') {
        acc.totalOutgoing += quantity;
      }
      
      acc.totalTransactions++;
      return acc;
    }, {
      totalTransactions: 0,
      totalIncoming: 0,
      totalOutgoing: 0
    });

    res.json({
      reportPeriod: {
        startDate: startDate || 'Beginning',
        endDate: endDate || 'Now'
      },
      summary,
      transactions
    });
  } catch (error) {
    console.error('Error generating stock movement report:', error);
    res.status(500).json({ 
      message: 'Error generating stock movement report', 
      error: (error as Error).message 
    });
  }
};

export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const lowStockItems = await prisma.stockItem.findMany({
      where: {
        currentStock: {
          lte: prisma.stockItem.fields.reorderLevel
        },
        isPending: false
      },
      select: {
        id: true,
        name: true,
        drugCode: true,
        category: true,
        currentStock: true,
        reorderLevel: true,
        unitOfMeasure: true
      },
      orderBy: {
        currentStock: 'asc'
      }
    });

    res.json({
      lowStockItems,
      total: lowStockItems.length
    });
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ 
      message: 'Error fetching low stock alerts', 
      error: (error as Error).message 
    });
  }
};

export const getStockItemTransactionHistory = async (req: Request, res: Response) => {
  try {
    const { stockItemId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify stock item exists
    const stockItem = await prisma.stockItem.findUnique({
      where: { id: stockItemId }
    });

    if (!stockItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: { stockItemId },
        include: {
          stockItem: {
            select: {
              name: true,
              drugCode: true,
              unitOfMeasure: true
            }
          }
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: parseInt(limit as string)
      }),
      prisma.stockTransaction.count({ where: { stockItemId } })
    ]);

    res.json({
      stockItem: {
        id: stockItem.id,
        name: stockItem.name,
        drugCode: stockItem.drugCode
      },
      transactions,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Error fetching stock item transaction history:', error);
    res.status(500).json({ 
      message: 'Error fetching stock item transaction history', 
      error: (error as Error).message 
    });
  }
};