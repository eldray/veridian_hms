import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { PurchaseInvoiceService } from './PurchaseInvoiceService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { CreatePurchaseInvoiceDTO, UpdatePurchaseInvoiceDTO } from './PurchaseInvoiceTypes';

const prisma = new PrismaClient();

export class PurchaseInvoiceController extends BaseController {
  private service: PurchaseInvoiceService;

  constructor() {
    super();
    this.service = new PurchaseInvoiceService(prisma);
  }

  getInvoices = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const filters = {
      ...req.query, page, limit,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };
    const result = await this.service.getAllInvoices(filters);
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Purchase invoices retrieved');
  });

  getInvoiceById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const invoice = await this.service.getInvoiceById(req.params.id);
    return this.ok(res, invoice, 'Purchase invoice retrieved');
  });

  createInvoice = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: CreatePurchaseInvoiceDTO = {
      ...req.body,
      totalAmount: parseFloat(req.body.totalAmount),
      invoiceItems: req.body.invoiceItems.map((i: any) => ({ ...i, quantity: parseInt(i.quantity), unitCost: parseFloat(i.unitCost) }))
    };
    const invoice = await this.service.createInvoice(data, req.user!.id);
    return this.created(res, invoice, 'Purchase invoice created successfully');
  });

  updateInvoice = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const data: UpdatePurchaseInvoiceDTO = { ...req.body };
    if (data.totalAmount !== undefined) data.totalAmount = parseFloat(data.totalAmount as any);
    const invoice = await this.service.updateInvoice(req.params.id, data);
    return this.ok(res, invoice, 'Purchase invoice updated');
  });

  deleteInvoice = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.deleteInvoice(req.params.id);
    return this.ok(res, { deletedInvoice: { id: result.id, invoiceNumber: result.invoiceNumber } }, 'Purchase invoice deleted (stock reversed)');
  });

  getSuppliers = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const suppliers = await this.service.getSuppliers();
    return this.ok(res, suppliers, 'Suppliers retrieved');
  });

  getInvoiceStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };
    const stats = await this.service.getInvoiceStats(filters);
    return this.ok(res, stats, 'Statistics retrieved');
  });
}

export const purchaseInvoiceController = new PurchaseInvoiceController();