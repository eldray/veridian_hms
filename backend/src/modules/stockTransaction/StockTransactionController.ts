import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { StockTransactionService } from './StockTransactionService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class StockTransactionController extends BaseController {
  private service: StockTransactionService;

  constructor() {
    super();
    this.service = new StockTransactionService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.create({ ...req.body, performedBy: req.user?.id });
    return this.created(res, result, 'Stock transaction created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAll({ ...req.query, page, limit, startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined, endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Transactions retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getById(req.params.id);
    return this.ok(res, result, 'Transaction retrieved');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.params.id, req.body);
    return this.ok(res, result, 'Transaction updated');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.delete(req.params.id);
    return this.ok(res, result, result.message);
  });

  getMovementSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMovementSummary({ startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined, endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined, category: req.query.category as string });
    return this.ok(res, result, 'Movement summary retrieved');
  });

  getLowStockAlerts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getLowStockAlerts(req.query.category as string);
    return this.ok(res, result, 'Low stock alerts retrieved');
  });

  getRequisitionTransactions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getRequisitionTransactions({ requisitionId: req.query.requisitionId as string, status: req.query.status as string, startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined, endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined });
    return this.ok(res, result, 'Requisition transactions retrieved');
  });

  getStockValuation = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getStockValuation(req.query.category as string);
    return this.ok(res, result, 'Stock valuation retrieved');
  });
}

export const stockTransactionController = new StockTransactionController();