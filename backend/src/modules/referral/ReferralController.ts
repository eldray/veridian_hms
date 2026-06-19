import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ReferralService } from './ReferralService';
import { AuthRequest } from '../../types/auth'; // Ensure this path is correct

export class ReferralController extends BaseController {
  private service: ReferralService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new ReferralService(prisma);
  }

  getReferrals = this.asyncHandler(async (req: Request, res: Response) => {
    const {
      referralType, status, patientId, patientPaymentMode,
      corporateAccountId, insuranceProviderId, dateFrom, dateTo, page, limit
    } = req.query;

    const filters = {
      referralType: referralType as any,
      status: status as any,
      patientId: patientId as string,
      patientPaymentMode: patientPaymentMode as string,
      corporateAccountId: corporateAccountId as string,
      insuranceProviderId: insuranceProviderId as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50
    };

    const result = await this.service.getAllReferrals(filters);
    return this.paginated(res, result.data, result.pagination, 'Referrals fetched successfully');
  });

  getReferralById = this.asyncHandler(async (req: Request, res: Response) => {
    const referral = await this.service.getReferralById(req.params.id);
    return this.ok(res, referral, 'Referral fetched successfully');
  });

  getReferralsByPatient = this.asyncHandler(async (req: Request, res: Response) => {
    const referrals = await this.service.getReferralsByPatient(req.params.patientId);
    return this.ok(res, referrals, 'Patient referrals fetched successfully');
  });

  createOutgoingReferral = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?.id) return this.unauthorized(res, 'User authentication required');
    
    const referral = await this.service.createOutgoingReferral(req.body, req.user.id);
    return this.created(res, referral, 'Outgoing referral created successfully');
  });

  createIncomingReferral = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?.id) return this.unauthorized(res, 'User authentication required');
    
    const referral = await this.service.createIncomingReferral(req.body, req.user.id);
    return this.created(res, referral, 'Incoming referral created successfully');
  });

  updateReferralStatus = this.asyncHandler(async (req: Request, res: Response) => {
    const referral = await this.service.updateReferralStatus(req.params.id, req.body);
    return this.ok(res, referral, `Referral ${req.body.status} successfully`);
  });

  deleteReferral = this.asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteReferral(req.params.id);
    return this.ok(res, null, 'Referral deleted successfully');
  });

  // ✅ Consolidated stats into one call
  getReferralStats = this.asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.service.getDashboardStats();
    return this.ok(res, stats, 'Referral statistics fetched successfully');
  });
}