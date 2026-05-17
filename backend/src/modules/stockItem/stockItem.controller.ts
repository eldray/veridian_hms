import { Request, Response } from 'express';
import * as stockItemService from './stockItem.service';

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
      const { category, subCategory, departmentId, search, page, limit } = req.query;
      const result = await stockItemService.getAll({
        category: category as string,
        subCategory: subCategory as string,
        departmentId: departmentId as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({
        success: true,
        data: result
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
      await stockItemService.delete(id);
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

  // Get stock value summary report
  async getValueSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, category, departmentId } = req.query;
      const result = await stockItemService.getValueSummary({
        startDate: startDate as string,
        endDate: endDate as string,
        category: category as string,
        departmentId: departmentId as string
      });
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
      const { days, category, departmentId } = req.query;
      const result = await stockItemService.getExpiryReport({
        days: days ? parseInt(days as string) : 30,
        category: category as string,
        departmentId: departmentId as string
      });
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
      const { startDate, endDate, category, departmentId } = req.query;
      const result = await stockItemService.getMovementSummary({
        startDate: startDate as string,
        endDate: endDate as string,
        category: category as string,
        departmentId: departmentId as string
      });
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
      const { startDate, endDate, category, departmentId } = req.query;
      const result = await stockItemService.getUsageReport({
        startDate: startDate as string,
        endDate: endDate as string,
        category: category as string,
        departmentId: departmentId as string
      });
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
      const { startDate, endDate, supplierId } = req.query;
      const result = await stockItemService.getSupplierReport({
        startDate: startDate as string,
        endDate: endDate as string,
        supplierId: supplierId as string
      });
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
      const { startDate, endDate, departmentId, status } = req.query;
      const result = await stockItemService.getRequisitionSummary({
        startDate: startDate as string,
        endDate: endDate as string,
        departmentId: departmentId as string,
        status: status as string
      });
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

  // Get low stock alerts
  async getLowStockAlerts(req: Request, res: Response) {
    try {
      const { category, departmentId } = req.query;
      const result = await stockItemService.getLowStockAlerts({
        category: category as string,
        departmentId: departmentId as string
      });
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
}

export const stockItemController = new StockItemController();
