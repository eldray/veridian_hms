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

  getDashboardStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getDashboardStats();
    return this.ok(res, stats, 'Dashboard statistics retrieved successfully');
  });

  getWeeklyStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getWeeklyStats();
    return this.ok(res, stats, 'Weekly statistics retrieved successfully');
  });

  getMonthlyStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const stats = await this.service.getMonthlyStats();
    return this.ok(res, stats, 'Monthly statistics retrieved successfully');
  });
}