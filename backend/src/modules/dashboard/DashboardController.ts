import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { DashboardService } from './DashboardService';

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      console.log('📊 Fetching dashboard statistics...');
      
      const stats = await this.dashboardService.getDashboardStats();
      
      console.log('✅ Dashboard stats calculated:', stats);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ Dashboard stats error:', error);
      next(error);
    }
  };
}
