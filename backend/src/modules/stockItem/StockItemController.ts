import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { StockItemService } from './StockItemService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { StockTransactionType, RequisitionStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class StockItemController extends BaseController {
  private service: StockItemService;

  constructor() {
    super();
    this.service = new StockItemService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.create(req.body);
    return this.created(res, result, 'Stock item created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAll({ ...req.query, page, limit });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Stock items retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getById(req.params.id);
    return this.ok(res, result, 'Stock item retrieved');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.params.id, req.body);
    return this.ok(res, result, 'Stock item updated');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteStockItem(req.params.id);
    return this.ok(res, null, 'Stock item deleted');
  });

  updateStockLevel = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quantity, transactionType, reference, notes } = req.body;
    const result = await this.service.updateStockLevel(req.params.id, quantity, transactionType as StockTransactionType, reference, notes, req.user?.id);
    return this.ok(res, result, 'Stock level updated');
  });

  getTransactions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getStockTransactions(req.params.id, page, limit);
    return this.ok(res, result, 'Transactions retrieved');
  });

  addStockBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { batchNumber, expiryDate, quantity, costPrice, receivedDate } = req.body;
    const result = await this.service.addStockBatch(req.params.id, batchNumber, new Date(expiryDate), quantity, costPrice, receivedDate ? new Date(receivedDate) : undefined);
    return this.created(res, result, 'Batch added');
  });

  getExpiringBatches = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getExpiringBatches(req.query.days ? parseInt(req.query.days as string) : 90);
    return this.ok(res, result, 'Expiring batches retrieved');
  });

  getLowStockAlerts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getLowStockAlerts(req.query.category as string);
    return this.ok(res, result, 'Low stock alerts retrieved');
  });

  getCategories = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getCategories();
    return this.ok(res, result, 'Categories retrieved');
  });

  getValueSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getValueSummary(req.query.category as string);
    return this.ok(res, result, 'Value summary retrieved');
  });

  getExpiryReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getExpiryReport(req.query.days ? parseInt(req.query.days as string) : 30, req.query.category as string);
    return this.ok(res, result, 'Expiry report retrieved');
  });

  getMovementSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMovementSummary(req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, req.query.category as string);
    return this.ok(res, result, 'Movement summary retrieved');
  });

  getUsageReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getUsageReport(req.query.period as string, req.query.limit ? parseInt(req.query.limit as string) : 20, req.query.category as string);
    return this.ok(res, result, 'Usage report retrieved');
  });

  getSupplierReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getSupplierReport(req.query.supplierId as string);
    return this.ok(res, result, 'Supplier report retrieved');
  });

  getRequisitionSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getRequisitionSummary(req.query.startDate ? new Date(req.query.startDate as string) : undefined, req.query.endDate ? new Date(req.query.endDate as string) : undefined, req.query.status as RequisitionStatus);
    return this.ok(res, result, 'Requisition summary retrieved');
  });

  getMedicationsByStockItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMedicationsByStockItem(req.params.id);
    return this.ok(res, result, 'Medications retrieved');
  });
}

export const stockItemController = new StockItemController();