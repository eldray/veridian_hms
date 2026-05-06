// controllers/stockItemController.ts - FIXED
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getStockItems = async (req: Request, res: Response) => {
  try {
    const { category, isActive, isMedication } = req.query;
    const where: any = {};
    
    if (category) where.category = category as string;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isMedication !== undefined) where.isMedication = isMedication === 'true';

    const items = await prisma.stockItem.findMany({
      where,
      // ✅ REMOVED: stockBatches doesn't exist as a relation field
      // The correct relation name is StockBatch (capital S), but it's not needed for list view
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching stock items:', error);
    res.status(500).json({ message: 'Error fetching stock items', error });
  }
};

export const getStockItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const item = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        Medication: {
          include: {
            Attendance: {
              select: {
                attendanceNumber: true,
                Patient: {
                  select: {
                    surname: true,
                    otherNames: true
                  }
                }
              }
            }
          }
        },
        StockTransaction: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        },
        InvoiceItem: {
          include: {
            Invoice: {
              select: {
                invoiceNumber: true,
                supplierName: true
              }
            }
          }
        },
        RequisitionItem: {
          include: {
            Requisition: {
              select: {
                requisitionNumber: true,
                status: true
              }
            }
          }
        },
        // ✅ CORRECT: Use StockBatch (capital S, capital B) if you need batches
        StockBatch: {
          orderBy: { receivedDate: 'desc' }
        }
      }
    });
    
    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching stock item:', error);
    res.status(500).json({ message: 'Error fetching stock item', error });
  }
};

// Rest of the controller remains the same...
export const createStockItem = [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required'),
  body('strength').optional().isString(),
  body('reorderLevel').isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('drugCode').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const itemData = {
        name: req.body.name,
        description: req.body.description || null,
        category: req.body.category,
        strength: req.body.strength || null,
        unitOfMeasure: req.body.unitOfMeasure,
        drugCode: req.body.drugCode || null,
        reorderLevel: parseInt(req.body.reorderLevel),
        costPrice: parseFloat(req.body.costPrice),
        currentStock: req.body.currentStock ? parseInt(req.body.currentStock) : 0,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isMedication: req.body.isMedication !== undefined ? req.body.isMedication : true,
        supplier: req.body.supplier || null,
        batchNumber: req.body.batchNumber || null,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
      };

      const item = await prisma.stockItem.create({
        data: itemData
      });
      
      // If batchNumber provided, also create a StockBatch record
      if (req.body.batchNumber && req.body.expiryDate) {
        await prisma.stockBatch.create({
          data: {
            stockItemId: item.id,
            batchNumber: req.body.batchNumber,
            expiryDate: new Date(req.body.expiryDate),
            quantity: item.currentStock,
            costPrice: item.costPrice,
            receivedDate: new Date()
          }
        });
      }
      
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating stock item:', error);
      res.status(500).json({ message: 'Error creating stock item', error });
    }
  }
];

export const updateStockItem = [
  body('name').optional().notEmpty().withMessage('Item name cannot be empty'),
  body('reorderLevel').optional().isInt({ min: 0 }).withMessage('Reorder level must be a non-negative number'),
  body('costPrice').optional().isFloat({ min: 0 }).withMessage('Cost price must be a non-negative number'),
  body('currentStock').optional().isInt({ min: 0 }).withMessage('Current stock must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      
      const existingItem = await prisma.stockItem.findUnique({
        where: { id }
      });
      
      if (!existingItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      const updateData: any = { ...req.body };
      
      if (req.body.reorderLevel !== undefined) updateData.reorderLevel = parseInt(req.body.reorderLevel);
      if (req.body.costPrice !== undefined) updateData.costPrice = parseFloat(req.body.costPrice);
      if (req.body.currentStock !== undefined) updateData.currentStock = parseInt(req.body.currentStock);
      if (req.body.expiryDate !== undefined) updateData.expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : null;

      const item = await prisma.stockItem.update({
        where: { id },
        data: updateData
      });
      
      res.json(item);
    } catch (error) {
      console.error('Error updating stock item:', error);
      res.status(500).json({ message: 'Error updating stock item', error });
    }
  }
];

export const deleteStockItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingItem = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        Medication: { take: 1 },
        StockTransaction: { take: 1 },
        InvoiceItem: { take: 1 },
        RequisitionItem: { take: 1 }
      }
    });
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    if (existingItem.Medication.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated medications' 
      });
    }

    if (existingItem.StockTransaction.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated stock transactions' 
      });
    }

    if (existingItem.InvoiceItem.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated invoice items' 
      });
    }

    if (existingItem.RequisitionItem.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated requisition items' 
      });
    }

    await prisma.stockItem.delete({
      where: { id }
    });

    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock item:', error);
    res.status(500).json({ message: 'Error deleting stock item', error });
  }
};

export const getLowStockItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.stockItem.findMany({
      where: {
        currentStock: {
          lte: prisma.stockItem.fields.reorderLevel
        },
        isActive: true
      },
      orderBy: {
        currentStock: 'asc'
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: 'Error fetching low stock items', error });
  }
};

export const getStockCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.stockItem.findMany({
      distinct: ['category'],
      select: {
        category: true
      },
      where: {
        category: {
          not: null
        }
      }
    });
    
    const categoryList = categories.map(item => item.category).filter(Boolean);
    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching stock categories:', error);
    res.status(500).json({ message: 'Error fetching stock categories', error });
  }
};

export const updateStockLevel = [
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('transactionType').isIn(['purchase', 'adjustment', 'requisition', 'sale']).withMessage('Valid transaction type required'),
  body('reference').optional().isString(),
  body('notes').optional().isString(),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { quantity, transactionType, reference, notes } = req.body;

      const result = await prisma.$transaction(async (tx) => {
        const stockItem = await tx.stockItem.findUnique({
          where: { id }
        });

        if (!stockItem) {
          throw new Error('Stock item not found');
        }

        let newStock = stockItem.currentStock;
        if (transactionType === 'purchase' || transactionType === 'adjustment') {
          newStock += quantity;
        } else if (transactionType === 'sale' || transactionType === 'requisition') {
          newStock -= quantity;
        }

        if (newStock < 0) {
          throw new Error('Insufficient stock for this transaction');
        }

        const updatedItem = await tx.stockItem.update({
          where: { id },
          data: { currentStock: newStock }
        });
        
        await tx.stockTransaction.create({
          data: {
            stockItemId: id,
            transactionType,
            quantity: Math.abs(quantity),
            balanceAfter: newStock,
            reference,
            notes,
            performedBy: (req as any).user?.id || 'system'
          }
        });

        return updatedItem;
      });

      res.json({
        message: 'Stock level updated successfully',
        item: result
      });
    } catch (error) {
      console.error('Error updating stock level:', error);
      res.status(500).json({ 
        message: 'Error updating stock level', 
        error: (error as Error).message 
      });
    }
  }
];

export const getStockTransactions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
        where: { stockItemId: id },
        include: {
          Requisition: {
            select: {
              requisitionNumber: true,
              status: true
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
      prisma.stockTransaction.count({
        where: { stockItemId: id }
      })
    ]);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching stock transactions:', error);
    res.status(500).json({ message: 'Error fetching stock transactions', error });
  }
};

export const getMedicationsByStockItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const medications = await prisma.medication.findMany({
      where: { stockItemId: id },
      include: {
        Attendance: {
          include: {
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
              }
            }
          }
        },
        ServiceCatalog: {
          include: { pricing: true }
        }
      },
      orderBy: { prescribedAt: 'desc' },
      take: 50
    });
    
    const summary = {
      totalPrescribed: medications.length,
      dispensed: medications.filter(m => m.status === 'dispensed').length,
      administered: medications.filter(m => m.status === 'administered').length,
      cancelled: medications.filter(m => m.status === 'cancelled').length,
      pending: medications.filter(m => m.status === 'prescribed').length,
      totalQuantityDispensed: medications.reduce((sum, m) => sum + (m.quantity || 0), 0)
    };
    
    res.json({
      medications,
      summary
    });
  } catch (error) {
    console.error('Error fetching medications by stock item:', error);
    res.status(500).json({ message: 'Error fetching medications', error });
  }
};