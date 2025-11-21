// controllers/stockTransactionController.ts - UPDATED FOR SCHEMA ALIGNMENT
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient, StockTransactionType } from '@prisma/client';

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
    if (transactionType) where.transactionType = transactionType as StockTransactionType;
    
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
          },
          // ✅ ADDED: Include related entities
          requisition: {
            select: {
              requisitionNumber: true,
              status: true
            }
          },
          invoice: {
            select: {
              invoiceNumber: true,
              supplierName: true
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
        },
        // ✅ ADDED: Include related entities
        requisition: {
          select: {
            requisitionNumber: true,
            status: true,
            requestingDepartment: {
              select: {
                name: true
              }
            }
          }
        },
        invoice: {
          select: {
            invoiceNumber: true,
            supplierName: true,
            invoiceDate: true
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
    .isIn(['purchase', 'adjustment', 'requisition', 'sale']) // ✅ UPDATED: Matches StockTransactionType enum
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
        reference,
        notes,
        requisitionId,
        invoiceId
      } = req.body;

      // Validate stock item exists
      const stockItem = await prisma.stockItem.findUnique({
        where: { id: stockItemId }
      });

      if (!stockItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      // ✅ ADDED: Validate requisition if provided
      if (requisitionId) {
        const requisition = await prisma.requisition.findUnique({
          where: { id: requisitionId }
        });
        if (!requisition) {
          return res.status(404).json({ message: 'Requisition not found' });
        }
      }

      // ✅ ADDED: Validate invoice if provided
      if (invoiceId) {
        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId }
        });
        if (!invoice) {
          return res.status(404).json({ message: 'Invoice not found' });
        }
      }

      // Calculate new stock level
      let newStockLevel = stockItem.currentStock;
      const quantityNum = parseInt(quantity);

      switch (transactionType) {
        case 'purchase':
          newStockLevel += quantityNum;
          break;
        case 'sale':
        case 'requisition':
          if (stockItem.currentStock < quantityNum) {
            return res.status(400).json({ 
              message: `Insufficient stock. Available: ${stockItem.currentStock}, Requested: ${quantityNum}` 
            });
          }
          newStockLevel -= quantityNum;
          break;
        case 'adjustment':
          newStockLevel += quantityNum; // Can be positive or negative based on quantity
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
            transactionType: transactionType as StockTransactionType,
            quantity: quantityNum,
            balanceAfter: newStockLevel,
            reference,
            notes,
            requisitionId,
            invoiceId,
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
  body('reference').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Only allow updating notes and reference for safety
      const transaction = await prisma.stockTransaction.update({
        where: { id: req.params.id },
        data: {
          notes: req.body.notes,
          reference: req.body.reference,
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
      
      if (transaction.transactionType === 'purchase') {
        acc.totalIncoming += quantity;
      } else if (transaction.transactionType === 'sale' || transaction.transactionType === 'requisition') {
        acc.totalOutgoing += quantity;
      }
      // adjustment can be both incoming and outgoing based on quantity sign
      else if (transaction.transactionType === 'adjustment') {
        if (quantity > 0) {
          acc.totalIncoming += quantity;
        } else {
          acc.totalOutgoing += Math.abs(quantity);
        }
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
        isActive: true // ✅ FIXED: Use isActive instead of isPending
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
          },
          requisition: {
            select: {
              requisitionNumber: true,
              status: true
            }
          },
          invoice: {
            select: {
              invoiceNumber: true,
              supplierName: true
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
        drugCode: stockItem.drugCode,
        currentStock: stockItem.currentStock,
        reorderLevel: stockItem.reorderLevel
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

// ✅ ADDED: Function to create transaction from requisition
export const createRequisitionTransaction = [
  body('requisitionId').notEmpty().withMessage('Requisition ID is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { requisitionId } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        // Get requisition with items
        const requisition = await tx.requisition.findUnique({
          where: { id: requisitionId },
          include: {
            requisitionItems: {
              include: {
                stockItem: true
              }
            }
          }
        });

        if (!requisition) {
          throw new Error('Requisition not found');
        }

        if (requisition.status !== 'approved') {
          throw new Error('Requisition must be approved before fulfillment');
        }

        const transactions = [];

        // Create transactions for each requisition item
        for (const item of requisition.requisitionItems) {
          const quantityToFulfill = item.quantityApproved || item.quantityRequested;
          
          if (item.stockItem.currentStock < quantityToFulfill) {
            throw new Error(`Insufficient stock for ${item.stockItem.name}. Available: ${item.stockItem.currentStock}, Required: ${quantityToFulfill}`);
          }

          // Create transaction
          const transaction = await tx.stockTransaction.create({
            data: {
              stockItemId: item.stockItemId,
              transactionType: 'requisition',
              quantity: quantityToFulfill,
              balanceAfter: item.stockItem.currentStock - quantityToFulfill,
              reference: requisition.requisitionNumber,
              notes: `Requisition fulfillment for ${requisition.requisitionNumber}`,
              requisitionId: requisition.id,
              performedBy: (req as any).user?.id || 'system'
            }
          });

          // Update stock item
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: {
              currentStock: {
                decrement: quantityToFulfill
              }
            }
          });

          // Update requisition item fulfilled quantity
          await tx.requisitionItem.update({
            where: { id: item.id },
            data: {
              quantityFulfilled: quantityToFulfill
            }
          });

          transactions.push(transaction);
        }

        // Update requisition status
        await tx.requisition.update({
          where: { id: requisitionId },
          data: {
            status: 'fulfilled',
            fulfilledAt: new Date(),
            fulfilledById: (req as any).user?.id
          }
        });

        return transactions;
      });

      res.status(201).json({
        message: 'Requisition transactions created successfully',
        transactions: result
      });
    } catch (error) {
      console.error('Error creating requisition transactions:', error);
      res.status(500).json({ 
        message: 'Error creating requisition transactions', 
        error: (error as Error).message 
      });
    }
  }
];