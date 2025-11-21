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
        medications: {
          include: {
            attendance: {
              select: {
                attendanceNumber: true,
                patient: {
                  select: {
                    surname: true,
                    otherNames: true
                  }
                }
              }
            }
          }
        },
        stockTransactions: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        },
        invoiceItems: {
          include: {
            invoice: {
              select: {
                invoiceNumber: true,
                supplierName: true
              }
            }
          }
        },
        requisitionItems: {
          include: {
            requisition: {
              select: {
                requisitionNumber: true,
                status: true
              }
            }
          }
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

      // ✅ REMOVED: Pricing fields that don't exist in schema (cashPrice, nhisPrice, insurancePrice, vatRate, isTaxable)
      // ✅ REMOVED: NHIS coverage fields that don't exist (isNHISCovered, isPrivateInsExempted, tariffCode)

      const itemData = {
        name: req.body.name,
        description: req.body.description || null,
        category: req.body.category,
        strength: req.body.strength || null,
        unitOfMeasure: req.body.unitOfMeasure,
        drugCode: req.body.drugCode || null,
        reorderLevel: parseInt(req.body.reorderLevel),
        costPrice: parseFloat(req.body.costPrice), // ✅ Only cost price for inventory costing
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
      
      // Check if item exists
      const existingItem = await prisma.stockItem.findUnique({
        where: { id }
      });
      
      if (!existingItem) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      // Prepare update data
      const updateData: any = { ...req.body };
      
      // ✅ REMOVED: Pricing fields that don't exist in schema
      // Convert numeric fields if they exist
      if (req.body.reorderLevel !== undefined) updateData.reorderLevel = parseInt(req.body.reorderLevel);
      if (req.body.costPrice !== undefined) updateData.costPrice = parseFloat(req.body.costPrice);
      if (req.body.currentStock !== undefined) updateData.currentStock = parseInt(req.body.currentStock);

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
    
    // Check if item exists and has no dependencies
    const existingItem = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        medications: { take: 1 },
        stockTransactions: { take: 1 },
        invoiceItems: { take: 1 },
        requisitionItems: { take: 1 }
      }
    });
    
    if (!existingItem) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    // Check for dependencies
    if (existingItem.medications.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated medications' 
      });
    }

    if (existingItem.stockTransactions.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated stock transactions' 
      });
    }

    if (existingItem.invoiceItems.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated invoice items' 
      });
    }

    if (existingItem.requisitionItems.length > 0) {
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

// ✅ ADDED: New function to update stock levels (for inventory management)
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
        // Get current stock item
        const stockItem = await tx.stockItem.findUnique({
          where: { id }
        });

        if (!stockItem) {
          throw new Error('Stock item not found');
        }

        // Calculate new stock level based on transaction type
        let newStock = stockItem.currentStock;
        if (transactionType === 'purchase' || transactionType === 'adjustment') {
          newStock += quantity;
        } else if (transactionType === 'sale' || transactionType === 'requisition') {
          newStock -= quantity;
        }

        if (newStock < 0) {
          throw new Error('Insufficient stock for this transaction');
        }

        // Update stock item
        const updatedItem = await tx.stockItem.update({
          where: { id },
          data: {
            currentStock: newStock
          }
        });

        // Create stock transaction record
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

// ✅ ADDED: Function to get stock transactions for an item
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