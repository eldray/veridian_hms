// modules/dashboard/DashboardController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';
import { DashboardService } from './DashboardService';

export class DashboardController {
  private dashboardService: DashboardService;

  // FIXED: accepts prisma so the connection pool is shared across the app
  constructor(prisma: PrismaClient) {
    this.dashboardService = new DashboardService(prisma);
  }

  getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.dashboardService.getDashboardStats();
      res.json({
        success: true,
        data: stats,  // ✅ Return the full stats object
        message: 'Dashboard statistics retrieved successfully',
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard statistics',
        error: (error as Error).message,
      });
    }
  };

  getWeeklyStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.dashboardService.getWeeklyStats();
      res.json({ success: true, data: stats, message: 'Weekly statistics retrieved successfully' });
    } catch (error) {
      console.error('Weekly stats error:', error);
      res.status(500).json({ success: false, message: 'Error fetching weekly statistics', error: (error as Error).message });
    }
  };

  getMonthlyStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.dashboardService.getMonthlyStats();
      res.json({ success: true, data: stats, message: 'Monthly statistics retrieved successfully' });
    } catch (error) {
      console.error('Monthly stats error:', error);
      res.status(500).json({ success: false, message: 'Error fetching monthly statistics', error: (error as Error).message });
    }
  };
}