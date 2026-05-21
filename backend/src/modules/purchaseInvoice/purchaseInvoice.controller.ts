import { Response } from 'express';
import { validationResult } from 'express-validator';
import { BaseController } from '../../shared/base/BaseController';
import { PurchaseInvoiceService } from './purchaseInvoice.service'; // ✅ Fixed import name
import { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO } from './purchaseInvoice.types';
import { AuthRequest } from '../../middleware/authMiddleware';

export class PurchaseInvoiceController extends BaseController {
  private invoiceService: PurchaseInvoiceService;

  constructor(invoiceService?: PurchaseInvoiceService) {
    super();
    this.invoiceService = invoiceService || new PurchaseInvoiceService();
  }

  getInvoices = async (req: AuthRequest, res: Response) => {
    try {
      const { supplierName, startDate, endDate, page = 1, limit = 50 } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

      const filters: any = {
        page: pageNum,
        limit: limitNum
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

      this.paginated(res, result.invoices, {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        pages: Math.ceil(result.total / limitNum)
      }, 'Purchase invoices retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getInvoiceById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const invoice = await this.invoiceService.getInvoiceById(id);

      if (!invoice) {
        return this.notFound(res, 'Purchase invoice');
      }

      this.ok(res, invoice, 'Purchase invoice retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  createInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const {
        invoiceNumber,
        supplierName,
        invoiceDate,
        totalAmount,
        invoiceItems,
        notes
      } = req.body;

      const invoiceData: CreatePurchaseInvoiceDTO = {
        invoiceNumber,
        supplierName,
        invoiceDate,
        totalAmount: parseFloat(totalAmount),
        invoiceItems,
        notes
      };

      const createdById = req.user?.id;

      if (!createdById) {
        return this.unauthorized(res, 'User authentication required');
      }

      const invoice = await this.invoiceService.createInvoice(invoiceData, createdById);

      this.created(res, invoice, 'Purchase invoice created successfully');
    } catch (error: any) {
      console.error('Error creating purchase invoice:', error);

      if (error.message.includes('already exists') || error.message.includes('not found')) {
        return this.badRequest(res, error.message);
      }

      this.error(res, error);
    }
  };

  updateInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.badRequest(res, 'Validation failed', errors.array());
      }

      const { id } = req.params;
      const { supplierName, invoiceDate, totalAmount, notes } = req.body;

      const updateData: UpdatePurchaseInvoiceDTO = {};
      if (supplierName) updateData.supplierName = supplierName;
      if (invoiceDate) updateData.invoiceDate = invoiceDate;
      if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
      if (notes !== undefined) updateData.notes = notes;

      const invoice = await this.invoiceService.updateInvoice(id, updateData);

      this.ok(res, invoice, 'Purchase invoice updated successfully');
    } catch (error: any) {
      console.error('Error updating purchase invoice:', error);

      if (error.message === 'Purchase invoice not found') {
        return this.notFound(res, 'Purchase invoice');
      }

      this.error(res, error);
    }
  };

  deleteInvoice = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const result = await this.invoiceService.deleteInvoice(id);

      this.ok(res, {
        deletedInvoice: {
          id: result.id,
          invoiceNumber: result.invoiceNumber,
          supplierName: result.supplierName
        }
      }, 'Purchase invoice deleted successfully (stock levels reversed)');
    } catch (error: any) {
      console.error('Error deleting purchase invoice:', error);

      if (error.message === 'Purchase invoice not found') {
        return this.notFound(res, 'Purchase invoice');
      }

      this.error(res, error);
    }
  };

  getSuppliers = async (req: AuthRequest, res: Response) => {
    try {
      const suppliers = await this.invoiceService.getSuppliers();
      this.ok(res, suppliers, 'Suppliers retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };

  getInvoiceStats = async (req: AuthRequest, res: Response) => {
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
      this.ok(res, stats, 'Purchase invoice statistics retrieved successfully');
    } catch (error) {
      this.error(res, error);
    }
  };
}