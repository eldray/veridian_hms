import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { DashboardService } from './DashboardService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class DashboardController extends BaseController {
  private service: DashboardService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new DashboardService(prisma);
  }

  /**
   * GET /dashboard/stats
   * Query params (all optional — defaults to today):
   *   period    : 'today' | 'week' | 'month'
   *   startDate : ISO date string  e.g. '2025-01-01'
   *   endDate   : ISO date string  e.g. '2025-01-31'
   *
   * startDate + endDate take priority over period.
   */
  getDashboardStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { period, startDate, endDate } = req.query as {
      period?: string;
      startDate?: string;
      endDate?: string;
    };
    const stats = await this.service.getDashboardStats(startDate, endDate, period);
    return this.ok(res, stats, 'Dashboard statistics retrieved successfully');
  });
}