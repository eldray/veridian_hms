// modules/referral/ReferralController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ReferralService } from './ReferralService';
import { 
  CreateOutgoingReferralDTO, 
  CreateIncomingReferralDTO, 
  UpdateReferralStatusDTO,
  ReferralFilters 
} from './ReferralTypes';
import { AuthRequest } from '../../types/auth';

export class ReferralController extends BaseController {
  private service: ReferralService;

  constructor(prisma: PrismaClient) {  // ✅ FIXED - accept prisma
    super();  // ✅ FIXED - no args to super
    this.service = new ReferralService(prisma);
  }

  // GET /api/referrals
  async getReferrals(req: Request, res: Response) {
    try {
      const {
        referralType,
        status,
        patientId,
        patientPaymentMode,
        corporateAccountId,
        insuranceProviderId,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const filters: ReferralFilters = {
        referralType: referralType as any,
        status: status as any,
        patientId: patientId as string,
        patientPaymentMode: patientPaymentMode as string,  // ✅ ADDED
        corporateAccountId: corporateAccountId as string,  // ✅ ADDED
        insuranceProviderId: insuranceProviderId as string,  // ✅ ADDED
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      };

      const result = await this.service.getAllReferrals(filters);

      return this.ok(res, result.data, 'Referrals fetched successfully', result.pagination);
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // GET /api/referrals/:id
  async getReferralById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const referral = await this.service.getReferralById(id);
      return this.ok(res, referral, 'Referral fetched successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // GET /api/referrals/patient/:patientId
  async getReferralsByPatient(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      const referrals = await this.service.getReferralsByPatient(patientId);
      return this.ok(res, referrals, 'Patient referrals fetched successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // POST /api/referrals/outgoing
  async createOutgoingReferral(req: AuthRequest, res: Response) {
    try {
      const data: CreateOutgoingReferralDTO = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'User authentication required');
      }

      const referral = await this.service.createOutgoingReferral(data, req.user.id);

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      return this.created(res, referralWithFullName, 'Outgoing referral created successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // POST /api/referrals/incoming
  async createIncomingReferral(req: AuthRequest, res: Response) {
    try {
      const data: CreateIncomingReferralDTO = req.body;
      
      if (!req.user?.id) {
        return this.unauthorized(res, 'User authentication required');
      }

      const referral = await this.service.createIncomingReferral(data, req.user.id);

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      return this.created(res, referralWithFullName, 'Incoming referral created successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // PUT /api/referrals/:id/status
  async updateReferralStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateReferralStatusDTO = req.body;

      const referral = await this.service.updateReferralStatus(id, data);

      return this.ok(res, referral, `Referral ${data.status} successfully`);
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // DELETE /api/referrals/:id
  async deleteReferral(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.service.deleteReferral(id);
      return this.ok(res, null, 'Referral deleted successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }

  // GET /api/referrals/stats/summary
  async getReferralStats(req: Request, res: Response) {
    try {
      const [pendingCount, urgentReferrals, stats] = await Promise.all([
        this.service.getPendingReferralsCount(),
        this.service.getUrgentReferrals(),
        this.service.getReferralStats()  // ✅ ADDED - full stats
      ]);

      return this.ok(res, {
        pendingCount,
        urgentCount: urgentReferrals.length,
        urgentReferrals: urgentReferrals.slice(0, 10),
        ...stats  // ✅ ADDED - include full stats
      }, 'Referral statistics fetched successfully');
    } catch (error: any) {
      return this.error(res, error);
    }
  }
}