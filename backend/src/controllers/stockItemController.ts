// controllers/stockItemController.ts
import { Request, Response } from 'express';
import StockItemModel from '../models/StockItem';
import { body, validationResult } from 'express-validator';

export const getStockItems = async (req: Request, res: Response) => {
  try {
    const { category, isActive } = req.query;
    const filter: any = {};
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const items = await StockItemModel.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock items', error });
  }
};

export const getStockItemById = async (req: Request, res: Response) => {
  try {
    const item = await StockItemModel.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock item', error });
  }
};

export const createStockItem = [
  body('name').notEmpty().withMessage('Item name is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('unitOfMeasure').notEmpty().withMessage('Unit of measure is required'),
  body('reorderLevel').isNumeric().withMessage('Reorder level must be a number'),
  body('unitPrice').isNumeric().withMessage('Unit price must be a number'),
  body('sellingPrice').isNumeric().withMessage('Selling price must be a number'),
  body('insurancePrice').isNumeric().withMessage('Insurance price must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const itemData = {
        ...req.body,
        vatRate: req.body.vatRate || 0,
        currentStock: req.body.currentStock || 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isMedication: req.body.isMedication !== undefined ? req.body.isMedication : true,
        requiresAuthorization: req.body.requiresAuthorization || false
      };

      const item = await StockItemModel.create(itemData);
      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating stock item:', error);
      res.status(500).json({ message: 'Error creating stock item', error });
    }
  }
];

export const updateStockItem = [
  body('name').optional().notEmpty().withMessage('Item name cannot be empty'),
  body('reorderLevel').optional().isNumeric().withMessage('Reorder level must be a number'),
  body('unitPrice').optional().isNumeric().withMessage('Unit price must be a number'),
  body('sellingPrice').optional().isNumeric().withMessage('Selling price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),
  body('currentStock').optional().isNumeric().withMessage('Current stock must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const item = await StockItemModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!item) {
        return res.status(404).json({ message: 'Stock item not found' });
      }

      res.json(item);
    } catch (error) {
      console.error('Error updating stock item:', error);
      res.status(500).json({ message: 'Error updating stock item', error });
    }
  }
];

export const deleteStockItem = async (req: Request, res: Response) => {
  try {
    const item = await StockItemModel.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    res.json({ message: 'Stock item deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock item:', error);
    res.status(500).json({ message: 'Error deleting stock item', error });
  }
};
