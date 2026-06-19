import { Request, Response } from 'express';
import { PrismaClient, PaymentMode } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { WardService } from './WardService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class WardController extends BaseController {
  private service: WardService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new WardService(prisma);
  }

  getWards = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const filters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      wardType: req.query.wardType as string,
      hasAvailableBeds: req.query.hasAvailableBeds === 'true',
      isNHISCovered: req.query.isNHISCovered === 'true' ? true : req.query.isNHISCovered === 'false' ? false : undefined
    };
    const wards = await this.service.getWards(filters);
    return this.ok(res, wards, 'Wards retrieved successfully');
  });

  getAvailableBeds = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.getAvailableBeds(req.query.wardId as string, req.query.wardType as string);
    return this.ok(res, result, 'Available beds retrieved successfully');
  });

  getWardById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const ward = await this.service.getWardById(req.params.id);
      return this.ok(res, ward, 'Ward retrieved successfully');
    } catch (e: any) {
      if (e.message === 'Ward not found') return this.notFound(res, 'Ward');
      throw e;
    }
  });

  createWard = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const ward = await this.service.createWard(req.body, req.user?.id || 'system');
    return this.created(res, ward, 'Ward created successfully');
  });

  updateWard = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      const ward = await this.service.updateWard(req.params.id, req.body);
      return this.ok(res, ward, 'Ward updated successfully');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Ward');
      throw e;
    }
  });

  deleteWard = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    try {
      await this.service.deleteWard(req.params.id);
      return this.ok(res, null, 'Ward deleted successfully');
    } catch (e: any) {
      if (e.message.includes('not found')) return this.notFound(res, 'Ward');
      if (e.message.includes('occupied beds')) return this.badRequest(res, e.message);
      throw e;
    }
  });

  getStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getStats();
    return this.ok(res, stats, 'Ward statistics retrieved successfully');
  });

  calculateCharge = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { numberOfDays, paymentMode } = req.body;
    if (!numberOfDays || !paymentMode) return this.badRequest(res, 'Number of days and payment mode are required');
    if (!Object.values(PaymentMode).includes(paymentMode)) return this.badRequest(res, 'Invalid payment mode');
    
    const calculation = await this.service.calculateCharge(req.params.id, numberOfDays, paymentMode);
    return this.ok(res, calculation, 'Charge calculated successfully');
  });

  getCorporateEligibleWards = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const wards = await this.service.getCorporateEligibleWards();
    return this.ok(res, wards, 'Corporate eligible wards retrieved successfully');
  });

  getOccupancyReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const report = await this.service.getOccupancyReport(req.query.wardId as string);
    return this.ok(res, report, 'Occupancy report retrieved successfully');
  });
}