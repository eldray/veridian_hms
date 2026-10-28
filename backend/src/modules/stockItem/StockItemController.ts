import { Request, Response } from 'express';
import { parseReportRange } from '../../utils/reportDates';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { StockItemService } from './StockItemService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { parsePageSize } from '../../shared/pagination';
import { StockTransactionType, RequisitionStatus } from '@prisma/client';

import prisma from '../../core/database/prisma.client';

export class StockItemController extends BaseController {
  private service: StockItemService;

  constructor() {
    super();
    this.service = new StockItemService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const data = { ...req.body, departmentId: isAdmin ? req.body.departmentId : req.user?.departmentId };
    const result = await this.service.create(data, req.user?.id);
    return this.created(res, result, 'Stock item created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    // Stock list is a reference list: allow up to 1000 per request (repository already caps at 1000)
    const { page, limit } = this.getPaginationParams(req, 1000);
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getAll({
      ...req.query, page, limit,
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.paginated(res, result.data, { page, limit, total: result.total }, 'Stock items retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getById(req.params.id, {
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.ok(res, result, 'Stock item retrieved');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.update(req.params.id, req.body, req.user?.id);
    return this.ok(res, result, 'Stock item updated');
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteStockItem(req.params.id);
    return this.ok(res, null, 'Stock item deleted');
  });

  updateStockLevel = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { quantity, transactionType, reference, notes, departmentId, batchNumber } = req.body;
    const userDepartmentId = req.user?.departmentId;
    const role = String(req.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'super_admin'].includes(role);
    const effectiveDepartmentId = isAdmin ? (departmentId || userDepartmentId) : userDepartmentId;
    const result = await this.service.updateStockLevel(
      req.params.id, Number(quantity), transactionType as StockTransactionType,
      reference, notes, req.user?.id, effectiveDepartmentId || undefined, role, batchNumber,
    );
    return this.ok(res, result, 'Stock level updated');
  });

  allocateStock = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { departmentId, quantity } = req.body;
    const result = await this.service.allocateUnassignedStock(req.params.id, String(departmentId || ''), Number(quantity), req.user?.id);
    return this.ok(res, result, 'Stock allocated to department without changing hospital total');
  });

  getTransactions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const includeAllStockLocations = ['admin', 'super_admin', 'accounts'].includes(String(req.user?.role));
    const result = await this.service.getStockTransactions(req.params.id, page, limit, {
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.ok(res, result, 'Transactions retrieved');
  });

  addStockBatch = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { batchNumber, expiryDate, quantity, costPrice, receivedDate, departmentId } = req.body;
    const isAdmin = ['admin', 'super_admin'].includes(String(req.user?.role));
    const effectiveDepartmentId = isAdmin ? departmentId : req.user?.departmentId;
    const result = await this.service.addStockBatch(req.params.id, batchNumber, new Date(expiryDate), Number(quantity), Number(costPrice), receivedDate ? new Date(receivedDate) : undefined, effectiveDepartmentId ? String(effectiveDepartmentId) : undefined);
    return this.created(res, result, 'Batch added');
  });

  getExpiringBatches = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.getExpiringBatches(
      req.query.days ? parseInt(req.query.days as string) : 90,
      { departmentId: req.user?.departmentId, includeAllStockLocations },
    );
    return this.ok(res, result, 'Expiring batches retrieved');
  });

  getLowStockAlerts = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role));
    const result = await this.service.getLowStockAlerts(req.query.category as string, {
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.ok(res, result, 'Low stock alerts retrieved');
  });

  getCategories = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getCategories();
    return this.ok(res, result, 'Categories retrieved');
  });

  getValueSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const allLocations = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.getValueSummary(req.query.category as string, { departmentId: req.user?.departmentId, includeAllStockLocations: allLocations });
    return this.ok(res, result, 'Value summary retrieved');
  });

  getExpiryReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.getExpiryReport(
      req.query.days ? parseInt(req.query.days as string) : 30,
      req.query.category as string,
      { departmentId: req.user?.departmentId, includeAllStockLocations },
    );
    return this.ok(res, result, 'Expiry report retrieved');
  });

  getMovementSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const range = parseReportRange(req.query.startDate as string | undefined, req.query.endDate as string | undefined);
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.getMovementSummary(range?.gte, range?.lte, req.query.category as string | undefined, {
      stockItemId: req.query.stockItemId as string | undefined,
      transactionType: req.query.transactionType as string | undefined,
      departmentId: req.user?.departmentId,
      includeAllStockLocations,
    });
    return this.ok(res, result, 'Movement summary retrieved');
  });

  getUsageReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const includeAllStockLocations = ['admin', 'super_admin'].includes(String(req.user?.role || '').toLowerCase());
    const result = await this.service.getUsageReport(
      req.query.period as string,
      parsePageSize(req.query.limit, 20),
      req.query.category as string,
      { departmentId: req.user?.departmentId, includeAllStockLocations },
    );
    return this.ok(res, result, 'Usage report retrieved');
  });

  getSupplierReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getSupplierReport(req.query.supplierId as string);
    return this.ok(res, result, 'Supplier report retrieved');
  });

  getRequisitionSummary = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const range = parseReportRange(req.query.startDate as string | undefined, req.query.endDate as string | undefined);
    const result = await this.service.getRequisitionSummary(range?.gte, range?.lte, req.query.status as RequisitionStatus);
    return this.ok(res, result, 'Requisition summary retrieved');
  });

  getMedicationsByStockItem = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getMedicationsByStockItem(req.params.id);
    return this.ok(res, result, 'Medications retrieved');
  });
}

export const stockItemController = new StockItemController();