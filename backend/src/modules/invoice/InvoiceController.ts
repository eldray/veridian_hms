// InvoiceController.ts
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { InvoiceService } from './InvoiceService';
import { CreateInvoiceDTO, UpdateInvoiceDTO } from './InvoiceTypes';
import { AuthRequest } from '../../middleware/authMiddleware';

export class InvoiceController {
  private invoiceService: InvoiceService;

  constructor(invoiceService?: InvoiceService) {
    this.invoiceService = invoiceService || new InvoiceService();
  }

  getInvoices = async (req: Request, res: Response) => {
    try {
      const { supplierName, startDate, endDate, page = 1, limit = 50 } = req.query;

      const filters: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (supplierName) {
        filters.supplierName = supplierName as string;
      }
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const result = await this.invoiceService.getAllInvoices(filters);

      res.json({
        invoices: result.invoices,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        message: 'Error fetching invoices',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  getInvoiceById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await this.invoiceService.getInvoiceById(id);

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({
        message: 'Error fetching invoice',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  createInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        invoiceNumber,
        supplierName,
        invoiceDate,
        totalAmount,
        invoiceItems,
        notes
      } = req.body;

      const invoiceData: CreateInvoiceDTO = {
        invoiceNumber,
        supplierName,
        invoiceDate,
        totalAmount: parseFloat(totalAmount),
        invoiceItems,
        notes
      };

      const createdById = (req as any).user?.id;

      const invoice = await this.invoiceService.createInvoice(invoiceData, createdById);

      res.status(201).json({
        message: 'Invoice created successfully',
        invoice
      });
    } catch (error: any) {
      console.error('Error creating invoice:', error);

      if (error.message.includes('already exists') || error.message.includes('not found')) {
        return res.status(400).json({
          message: error.message
        });
      }

      res.status(500).json({
        message: 'Error creating invoice',
        error: error.message
      });
    }
  };

  updateInvoice = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { supplierName, invoiceDate, totalAmount, notes } = req.body;

      const updateData: UpdateInvoiceDTO = {};
      if (supplierName) updateData.supplierName = supplierName;
      if (invoiceDate) updateData.invoiceDate = invoiceDate;
      if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
      if (notes !== undefined) updateData.notes = notes;

      const invoice = await this.invoiceService.updateInvoice(id, updateData);

      res.json({
        message: 'Invoice updated successfully',
        invoice
      });
    } catch (error: any) {
      console.error('Error updating invoice:', error);

      if (error.message === 'Invoice not found') {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.status(500).json({
        message: 'Error updating invoice',
        error: error.message
      });
    }
  };

  deleteInvoice = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await this.invoiceService.deleteInvoice(id);

      res.json({
        message: 'Invoice deleted successfully (stock levels reversed)',
        deletedInvoice: {
          id: result.id,
          invoiceNumber: result.invoiceNumber,
          supplierName: result.supplierName
        }
      });
    } catch (error: any) {
      console.error('Error deleting invoice:', error);

      if (error.message === 'Invoice not found') {
        return res.status(404).json({ message: 'Invoice not found' });
      }

      res.status(500).json({
        message: 'Error deleting invoice',
        error: error.message
      });
    }
  };

  getSuppliers = async (req: Request, res: Response) => {
    try {
      const suppliers = await this.invoiceService.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({
        message: 'Error fetching suppliers',
        error: error instanceof Error ? error.message : error
      });
    }
  };

  getInvoiceStats = async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      const filters: any = {};
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.invoiceService.getInvoiceStats(filters);

      res.json(stats);
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      res.status(500).json({
        message: 'Error fetching invoice stats',
        error: error instanceof Error ? error.message : error
      });
    }
  };
}
