// controllers/stockItemController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getStockItems = async (req: Request, res: Response) => {
  try {
    const { category, isPending, isMedication } = req.query;
    const where: any = {};
    
    if (category) where.category = category as string;
    if (isPending !== undefined) where.isPending = isPending === 'true';
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
        medications: true,
        stockTransactions: {
          orderBy: { transactionDate: 'desc' },
          take: 10
        },
        serviceCatalogs: true
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
  body('cashPrice').isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  body('drugCode').optional().isString(),
  body('vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('VAT rate must be between 0 and 100'),
  
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
        cashPrice: parseFloat(req.body.cashPrice),
        nhisPrice: parseFloat(req.body.nhisPrice) || 0,
        insurancePrice: parseFloat(req.body.insurancePrice),
        vatRate: req.body.vatRate ? parseFloat(req.body.vatRate) : 0,
        currentStock: req.body.currentStock ? parseInt(req.body.currentStock) : 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isPending: req.body.isPending !== undefined ? req.body.isPending : true,
        isMedication: req.body.isMedication !== undefined ? req.body.isMedication : true,
        isNHISCovered: req.body.isNHISCovered !== undefined ? req.body.isNHISCovered : true,
        isPrivateInsExempted: req.body.isPrivateInsExempted !== undefined ? req.body.isPrivateInsExempted : false,
        nhisRequiresAuth: req.body.nhisRequiresAuth || false,
        privateInsRequiresAuth: req.body.privateInsRequiresAuth || false,
        supplier: req.body.supplier || null,
        batchNumber: req.body.batchNumber || null,
        expiryDate: req.body.expiryDate ? new Date(req.body.expiryDate) : null,
        tariffCode: req.body.tariffCode || null
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
  body('cashPrice').optional().isFloat({ min: 0 }).withMessage('Cash price must be a non-negative number'),
  body('nhisPrice').optional().isFloat({ min: 0 }).withMessage('NHIS price must be a non-negative number'),
  body('insurancePrice').optional().isFloat({ min: 0 }).withMessage('Insurance price must be a non-negative number'),
  body('currentStock').optional().isInt({ min: 0 }).withMessage('Current stock must be a non-negative number'),
  body('vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('VAT rate must be between 0 and 100'),
  
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
      
      // Convert numeric fields if they exist
      if (req.body.reorderLevel !== undefined) updateData.reorderLevel = parseInt(req.body.reorderLevel);
      if (req.body.costPrice !== undefined) updateData.costPrice = parseFloat(req.body.costPrice);
      if (req.body.cashPrice !== undefined) updateData.cashPrice = parseFloat(req.body.cashPrice);
      if (req.body.nhisPrice !== undefined) updateData.nhisPrice = parseFloat(req.body.nhisPrice);
      if (req.body.insurancePrice !== undefined) updateData.insurancePrice = parseFloat(req.body.insurancePrice);
      if (req.body.currentStock !== undefined) updateData.currentStock = parseInt(req.body.currentStock);
      if (req.body.vatRate !== undefined) updateData.vatRate = parseFloat(req.body.vatRate);

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
        serviceCatalogs: { take: 1 }
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

    if (existingItem.serviceCatalogs.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete stock item with associated service catalogs' 
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
        isPending: false // Only show non-pending items for low stock alerts
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

export const bulkUpdateStock = [
  body('updates').isArray().withMessage('Updates must be an array'),
  body('updates.*.id').notEmpty().withMessage('Stock item ID is required'),
  body('updates.*.currentStock').isInt({ min: 0 }).withMessage('Current stock must be a non-negative number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { updates } = req.body;

      const results = await prisma.$transaction(
        updates.map((update: any) => 
          prisma.stockItem.update({
            where: { id: update.id },
            data: { currentStock: parseInt(update.currentStock) }
          })
        )
      );

      res.json({
        message: 'Stock levels updated successfully',
        updatedItems: results.length,
        items: results
      });
    } catch (error) {
      console.error('Error in bulk stock update:', error);
      res.status(500).json({ message: 'Error updating stock levels', error });
    }
  }
];