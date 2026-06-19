import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { WaiverService } from './WaiverService';
import { AuthRequest } from '../../middleware/authMiddleware';

const prisma = new PrismaClient();

export class WaiverController extends BaseController {
  private service: WaiverService;

  constructor() {
    super();
    this.service = new WaiverService(prisma);
  }

  create = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.create({ ...req.body, requestedById: req.user!.id });
    return this.created(res, result, 'Waiver request created successfully');
  });

  getAll = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const result = await this.service.getAll({
      ...req.query, page, limit,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    });
    return this.paginated(res, result.waivers, { page, limit, total: result.total }, 'Waivers retrieved');
  });

  getById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.getById(req.params.id);
      return this.ok(res, result, 'Waiver retrieved');
    } catch (e: any) {
      if (e.message === 'Waiver not found') return this.notFound(res, 'Waiver');
      throw e;
    }
  });

  approve = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { approvedById, amountApproved, rejectionReason } = req.body;
    if (!approvedById) return this.badRequest(res, 'approvedById is required');
    
    const result = await this.service.approve(req.params.id, approvedById, amountApproved, rejectionReason);
    return this.ok(res, result, 'Waiver approved successfully');
  });

  reject = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { approvedById, rejectionReason } = req.body;
    if (!approvedById) return this.badRequest(res, 'approvedById is required');
    if (!rejectionReason) return this.badRequest(res, 'rejectionReason is required');
    
    const result = await this.service.reject(req.params.id, approvedById, rejectionReason);
    return this.ok(res, result, 'Waiver rejected successfully');
  });

  getStatistics = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getStatistics({
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    });
    return this.ok(res, result, 'Statistics retrieved');
  });

  getByBill = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getByBillId(req.params.billId);
    return this.ok(res, result, 'Waivers for bill retrieved');
  });

  getByPatient = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getByPatientId(req.params.patientId);
    return this.ok(res, result, 'Waivers for patient retrieved');
  });

  update = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.service.update(req.params.id, req.body);
      return this.ok(res, result, 'Waiver updated');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Waiver');
      if (e.message.includes('pending')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  delete = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id);
      return this.ok(res, null, 'Waiver deleted');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Waiver');
      if (e.message.includes('pending')) return this.badRequest(res, e.message);
      throw e;
    }
  });
}

export const waiverController = new WaiverController();