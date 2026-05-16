// backend/src/modules/referral/ReferralController.ts

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ReferralService } from './ReferralService';
import { 
  CreateOutgoingReferralDTO, 
  CreateIncomingReferralDTO, 
  UpdateReferralStatusDTO 
} from './ReferralTypes';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../middleware/authMiddleware';

export class ReferralController extends BaseController {
  private service: ReferralService;

  constructor() {
    super('ReferralController');
    this.service = new ReferralService();
  }

  // GET /api/referrals
  async getReferrals(req: Request, res: Response) {
    try {
      const {
        referralType,
        status,
        patientId,
        dateFrom,
        dateTo,
        page,
        limit
      } = req.query;

      const filters = {
        referralType: referralType as any,
        status: status as any,
        patientId: patientId as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50
      };

      const result = await this.service.getAllReferrals(filters);

      return this.successResponse(res, {
        data: result.data,
        pagination: result.pagination
      }, 'Referrals fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching referrals');
    }
  }

  // GET /api/referrals/:id
  async getReferralById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const referral = await this.service.getReferralById(id);
      return this.successResponse(res, { data: referral }, 'Referral fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching referral');
    }
  }

  // GET /api/referrals/patient/:patientId
  async getReferralsByPatient(req: Request, res: Response) {
    try {
      const { patientId } = req.params;
      const referrals = await this.service.getReferralsByPatient(patientId);
      return this.successResponse(res, { data: referrals }, 'Patient referrals fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching patient referrals');
    }
  }

  // POST /api/referrals/outgoing
  async createOutgoingReferral(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.validationErrorResponse(res, errors.array());
      }

      const data: CreateOutgoingReferralDTO = req.body;
      
      if (!req.user?.id) {
        return this.unauthorizedResponse(res, 'User authentication required');
      }

      const referral = await this.service.createOutgoingReferral(data, req.user.id);

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      return this.successResponse(res, { data: referralWithFullName }, 'Outgoing referral created successfully', 201);
    } catch (error) {
      return this.errorResponse(res, error, 'Error creating outgoing referral');
    }
  }

  // POST /api/referrals/incoming
  async createIncomingReferral(req: AuthRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return this.validationErrorResponse(res, errors.array());
      }

      const data: CreateIncomingReferralDTO = req.body;
      
      if (!req.user?.id) {
        return this.unauthorizedResponse(res, 'User authentication required');
      }

      const referral = await this.service.createIncomingReferral(data, req.user.id);

      const referralWithFullName = {
        ...referral,
        patient: referral.patient ? {
          ...referral.patient,
          fullName: `${referral.patient.surname} ${referral.patient.otherNames}`.trim()
        } : null
      };

      return this.successResponse(res, { data: referralWithFullName }, 'Incoming referral created successfully', 201);
    } catch (error) {
      return this.errorResponse(res, error, 'Error creating incoming referral');
    }
  }

  // PUT /api/referrals/:id/status
  async updateReferralStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data: UpdateReferralStatusDTO = req.body;

      const referral = await this.service.updateReferralStatus(id, data);

      return this.successResponse(res, { data: referral }, `Referral ${data.status} successfully`);
    } catch (error) {
      return this.errorResponse(res, error, 'Error updating referral status');
    }
  }

  // DELETE /api/referrals/:id
  async deleteReferral(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await this.service.deleteReferral(id);
      return this.successResponse(res, null, 'Referral deleted successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error deleting referral');
    }
  }

  // GET /api/referrals/stats/summary
  async getReferralStats(req: Request, res: Response) {
    try {
      const [pendingCount, urgentReferrals] = await Promise.all([
        this.service.getPendingReferralsCount(),
        this.service.getUrgentReferrals()
      ]);

      return this.successResponse(res, {
        data: {
          pendingCount,
          urgentCount: urgentReferrals.length,
          urgentReferrals: urgentReferrals.slice(0, 10) // Top 10 urgent
        }
      }, 'Referral statistics fetched successfully');
    } catch (error) {
      return this.errorResponse(res, error, 'Error fetching referral statistics');
    }
  }
}
