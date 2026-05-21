import { Request, Response } from 'express';
import * as stockItemService from './stockItem.service';
import { StockTransactionType, RequisitionStatus } from '@prisma/client';

export class StockItemController {
  // Create a new stock item
  async create(req: Request, res: Response) {
    try {
      const result = await stockItemService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Stock item created successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create stock item'
      });
    }
  }

  // Get all stock items with filters
  async getAll(req: Request, res: Response) {
    try {
      const { category, search, page, limit } = req.query;
      const result = await stockItemService.getAll({
        category: category as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch stock items'
      });
    }
  }

  // Get stock item by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockItemService.getById(id);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Stock item not found'
      });
    }
  }

  // Update stock item
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockItemService.update(id, req.body);
      res.json({
        success: true,
        message: 'Stock item updated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update stock item'
      });
    }
  }

  // Delete stock item
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await stockItemService.deleteStockItem(id);
      res.json({
        success: true,
        message: 'Stock item deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete stock item'
      });
    }
  }

  // Update stock level
  async updateStockLevel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, transactionType, reference, notes, performedBy } = req.body;
      
      const result = await stockItemService.updateStockLevel(
        id,
        quantity,
        transactionType as StockTransactionType,
        reference,
        notes,
        performedBy
      );
      
      res.json({
        success: true,
        message: 'Stock level updated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update stock level'
      });
    }
  }

  // Get stock transactions
  async getTransactions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      const result = await stockItemService.getStockTransactions(
        id,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch transactions'
      });
    }
  }

  // Add stock batch
  async addStockBatch(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { batchNumber, expiryDate, quantity, costPrice, receivedDate } = req.body;
      
      const result = await stockItemService.addStockBatch(
        id,
        batchNumber,
        new Date(expiryDate),
        quantity,
        costPrice,
        receivedDate ? new Date(receivedDate) : undefined
      );
      
      res.json({
        success: true,
        message: 'Stock batch added successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to add stock batch'
      });
    }
  }

  // Get expiring batches
  async getExpiringBatches(req: Request, res: Response) {
    try {
      const { days } = req.query;
      const result = await stockItemService.getExpiringBatches(
        days ? parseInt(days as string) : 90
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch expiring batches'
      });
    }
  }

  // Get low stock alerts
  async getLowStockAlerts(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const result = await stockItemService.getLowStockAlerts(
        category as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch low stock alerts'
      });
    }
  }

  // Get categories
  async getCategories(req: Request, res: Response) {
    try {
      const result = await stockItemService.getCategories();
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch categories'
      });
    }
  }

  // Get value summary report
  async getValueSummary(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const result = await stockItemService.getValueSummary(
        category as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch value summary'
      });
    }
  }

  // Get expiry report
  async getExpiryReport(req: Request, res: Response) {
    try {
      const { days, category } = req.query;
      const result = await stockItemService.getExpiryReport(
        days ? parseInt(days as string) : 30,
        category as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch expiry report'
      });
    }
  }

  // Get movement summary report
  async getMovementSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, category } = req.query;
      const result = await stockItemService.getMovementSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        category as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch movement summary'
      });
    }
  }

  // Get usage report
  async getUsageReport(req: Request, res: Response) {
    try {
      const { period, limit, category } = req.query;
      const result = await stockItemService.getUsageReport(
        period as string,
        limit ? parseInt(limit as string) : 20,
        category as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch usage report'
      });
    }
  }

  // Get supplier report
  async getSupplierReport(req: Request, res: Response) {
    try {
      const { supplierId } = req.query;
      const result = await stockItemService.getSupplierReport(
        supplierId as string
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch supplier report'
      });
    }
  }

  // Get requisition summary report
  async getRequisitionSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, status } = req.query;
      const result = await stockItemService.getRequisitionSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined,
        status as RequisitionStatus
      );
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch requisition summary'
      });
    }
  }

  // Get medications by stock item
  async getMedicationsByStockItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockItemService.getMedicationsByStockItem(id);
      res.json({
        success: true,
        data: result.medications,
        summary: result.summary
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch medications'
      });
    }
  }
}

export const stockItemController = new StockItemController();