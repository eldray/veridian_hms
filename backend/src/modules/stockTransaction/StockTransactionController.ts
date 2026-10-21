import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { StockTransactionService } from './StockTransactionService';
import { AuthRequest } from '../../middleware/authMiddleware';


import prisma from '../../core/database/prisma.client';

// Date-only report filters represent the full calendar day, not midnight at
// its start. Preserve explicit timestamps exactly as supplied.
const parseEndDate = (value: unknown): Date | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const raw = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  const parsed = new Date(`${raw}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

export class StockTransactionController extends BaseController {
  private service: StockTransactionService;

  constructor() {
    super();
    this.service = new StockTransactionService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const departmentId = isAdmin ? (req.body.departmentId || undefined) : req.user?.departmentId;
    // Staff are confined to their assigned department; only administrators may select a ward directly.
    const wardId = isAdmin ? (req.body.wardId || undefined) : undefined;
    const result = await this.service.create({ ...req.body, departmentId, wardId, role: req.user?.role, performedBy: req.user?.id });
    return this.created(res, result, 'Stock transaction created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getAll({ ...req.query, page, limit, departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin, startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined, endDate: parseEndDate(req.query.endDate) });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Transactions retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getById(req.params.id, { departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin });
    return this.ok(res, result, 'Transaction retrieved');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.update(req.params.id, req.body, { departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin });
    return this.ok(res, result, 'Transaction updated');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.delete(req.params.id, { departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin });
    return this.ok(res, result, result.message);
  });

  getMovementSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getMovementSummary({
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      departmentId: req.user?.departmentId,
      includeAllStockLocations: isAdmin,
    });
    return this.ok(res, result, 'Movement summary retrieved');
  });

  getLowStockAlerts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getLowStockAlerts(req.query.category as string, { departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin });
    return this.ok(res, result, 'Low stock alerts retrieved');
  });

  getRequisitionTransactions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role).toLowerCase());
    const result = await this.service.getRequisitionTransactions({ requisitionId: req.query.requisitionId as string, status: req.query.status as string, startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined, endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined, departmentId: req.user?.departmentId, includeAllStockLocations: isAdmin });
    return this.ok(res, result, 'Requisition transactions retrieved');
  });

  getStockValuation = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getStockValuation(req.query.category as string, {
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.ok(res, result, 'Stock valuation retrieved');
  });
}

export const stockTransactionController = new StockTransactionController();