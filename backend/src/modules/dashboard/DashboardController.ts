// modules/dashboard/DashboardController.ts
import { Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { DashboardService } from './DashboardService';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
      console.log('📊 Fetching dashboard statistics...');
      
      const stats = await this.dashboardService.getDashboardStats();
      
      console.log('✅ Dashboard stats calculated:', {
        totalPatients: stats.totalPatients,
        todayVisits: stats.todayVisits,
        activeAdmissions: stats.activeAdmissions,
        pendingBills: stats.pendingBills,
        totalRevenue: stats.totalRevenue
      });

      res.json({
        success: true,
        data: stats,
        message: 'Dashboard statistics retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard statistics',
        error: (error as Error).message
      });
    }
  };

  // Optional: Add weekly stats endpoint
  getWeeklyStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.dashboardService.getWeeklyStats();
      res.json({
        success: true,
        data: stats,
        message: 'Weekly statistics retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Weekly stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching weekly statistics',
        error: (error as Error).message
      });
    }
  };

  // Optional: Add monthly stats endpoint
  getMonthlyStats = async (req: AuthRequest, res: Response) => {
    try {
      const stats = await this.dashboardService.getMonthlyStats();
      res.json({
        success: true,
        data: stats,
        message: 'Monthly statistics retrieved successfully'
      });
    } catch (error) {
      console.error('❌ Monthly stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching monthly statistics',
        error: (error as Error).message
      });
    }
  };
}