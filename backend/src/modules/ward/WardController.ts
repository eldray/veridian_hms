/**
 * Ward Controller
 * HTTP request handlers for Ward operations with corporate support
 */

import { Request, Response } from 'express';
import { PrismaClient, PaymentMode } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { WardService } from './WardService';
import { CreateWardDTO, WardFilters } from './WardTypes';

export class WardController extends BaseController {
  private service: WardService;

  constructor(prisma: any) {  // ✅ Accept prisma as parameter
    super();
    this.service = new WardService(prisma);
  }

  /**
   * GET /wards
   * Get all wards with optional filters
   */
  async getWards(req: Request, res: Response) {
    const filters: WardFilters = {
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      wardType: req.query.wardType as string,
      hasAvailableBeds: req.query.hasAvailableBeds === 'true',
      isNHISCovered: req.query.isNHISCovered === 'true' ? true : req.query.isNHISCovered === 'false' ? false : undefined
    };

    const wards = await this.service.getWards(filters);

    return this.ok(res, wards, 'Wards retrieved successfully');
  }

  /**
   * GET /wards/available-beds
   * Get available beds with rates for all payment modes
   */
  async getAvailableBeds(req: Request, res: Response) {
    const { wardId, wardType } = req.query;
    
    const result = await this.service.getAvailableBeds(
      wardId as string | undefined,
      wardType as string | undefined
    );

    return this.ok(res, result, 'Available beds retrieved successfully');
  }

  /**
   * GET /wards/:id
   * Get ward by ID
   */
  async getWardById(req: Request, res: Response) {
    const { id } = req.params;
    
    const ward = await this.service.getWardById(id);

    return this.ok(res, ward, 'Ward retrieved successfully');
  }

  /**
   * POST /wards
   * Create a new ward
   */
  async createWard(req: Request, res: Response) {
    const data: CreateWardDTO = req.body;
    const user = req.user as any;
    
    const ward = await this.service.createWard(data, user?.id);

    return this.created(res, ward, 'Ward created successfully');
  }

  /**
   * PUT /wards/:id
   * Update ward
   */
  async updateWard(req: Request, res: Response) {
    const { id } = req.params;
    const data = req.body;
    
    const ward = await this.service.updateWard(id, data);

    return this.ok(res, ward, 'Ward updated successfully');
  }

  /**
   * DELETE /wards/:id
   * Delete ward
   */
  async deleteWard(req: Request, res: Response) {
    const { id } = req.params;
    
    await this.service.deleteWard(id);

    return this.ok(res, null, 'Ward deleted successfully');
  }

  /**
   * GET /wards/stats
   * Get ward statistics with corporate insights
   */
  async getStats(req: Request, res: Response) {
    const stats = await this.service.getStats();

    return this.ok(res, stats, 'Ward statistics retrieved successfully');
  }

  /**
   * POST /wards/:id/calculate-charge
   * Calculate ward charge for specific payment mode
   */
  async calculateCharge(req: Request, res: Response) {
    const { id } = req.params;
    const { numberOfDays, paymentMode } = req.body;
    
    if (!numberOfDays || !paymentMode) {
      return this.badRequest(res, 'Number of days and payment mode are required');
    }
    
    if (!Object.values(PaymentMode).includes(paymentMode)) {
      return this.badRequest(res, 'Invalid payment mode');
    }
    
    const calculation = await this.service.calculateCharge(id, numberOfDays, paymentMode);
    
    return this.ok(res, calculation, 'Charge calculated successfully');
  }

  /**
   * GET /wards/corporate-eligible
   * Get wards eligible for corporate billing
   */
  async getCorporateEligibleWards(req: Request, res: Response) {
    const wards = await this.service.getCorporateEligibleWards();
    
    return this.ok(res, wards, 'Corporate eligible wards retrieved successfully');
  }

  /**
   * GET /wards/occupancy-report
   * Get occupancy report with revenue potential
   */
  async getOccupancyReport(req: Request, res: Response) {
    const { wardId } = req.query;
    const report = await this.service.getOccupancyReport(wardId as string);
    
    return this.ok(res, report, 'Occupancy report retrieved successfully');
  }
}