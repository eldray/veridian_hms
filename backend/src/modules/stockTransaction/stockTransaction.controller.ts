import { Request, Response } from 'express';
import { stockTransactionService } from './stockTransaction.service';
import { StockTransactionType } from '@prisma/client';

export class StockTransactionController {
  // Create a new stock transaction
  async create(req: Request, res: Response) {
    try {
      const result = await stockTransactionService.create(req.body);
      res.status(201).json({
        success: true,
        message: 'Stock transaction created successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create stock transaction'
      });
    }
  }

  // Get all stock transactions with filters
  async getAll(req: Request, res: Response) {
    try {
      const { stockItemId, transactionType, startDate, endDate, page, limit } = req.query;
      const result = await stockTransactionService.getAll({
        stockItemId: stockItemId as string,
        transactionType: transactionType as StockTransactionType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch stock transactions'
      });
    }
  }

  // Get stock transaction by ID
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockTransactionService.getById(id);
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Stock transaction not found'
      });
    }
  }

  // Update stock transaction
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockTransactionService.update(id, req.body);
      res.json({
        success: true,
        message: 'Stock transaction updated successfully',
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update stock transaction'
      });
    }
  }

  // Delete stock transaction
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await stockTransactionService.delete(id);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete stock transaction'
      });
    }
  }

  // Get movement summary report
  async getMovementSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate, category } = req.query;
      const result = await stockTransactionService.getMovementSummary({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        category: category as string
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

  // Get low stock alerts
  async getLowStockAlerts(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const result = await stockTransactionService.getLowStockAlerts({
        category: category as string
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

  // Get requisition transactions
  async getRequisitionTransactions(req: Request, res: Response) {
    try {
      const { requisitionId, status, startDate, endDate } = req.query;
      const result = await stockTransactionService.getRequisitionTransactions({
        requisitionId: requisitionId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch requisition transactions'
      });
    }
  }

  // Get stock valuation
  async getStockValuation(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const result = await stockTransactionService.getStockValuation({
        category: category as string
      });
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch stock valuation'
      });
    }
  }
}

export const stockTransactionController = new StockTransactionController();