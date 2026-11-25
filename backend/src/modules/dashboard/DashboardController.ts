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
    // Dashboard cards are role-specific in the UI, but the API must not send
    // hidden finance/clinical/stock figures to roles that cannot open those areas.
    // Clone the cached result before redaction so one user's role cannot alter
    // the shared 15-second cache entry seen by another user.
    const role = String(req.user?.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'super_admin';
    const canViewFinance = isAdmin || role === 'accounts';
    const canViewStock = isAdmin || role === 'accounts' || role === 'pharmacist';
    const canViewClinicalDiagnoses = isAdmin || ['doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer'].includes(role);
    const visibleStats = { ...stats, topDiagnoses: [...stats.topDiagnoses] };
    if (!canViewFinance) {
      visibleStats.pendingBills = 0;
      visibleStats.pendingClaims = 0;
      visibleStats.totalRevenue = 0;
    }
    if (!canViewStock) visibleStats.lowStockItems = 0;
    if (!canViewClinicalDiagnoses) visibleStats.topDiagnoses = [];
    return this.ok(res, visibleStats, 'Dashboard statistics retrieved successfully');
  });
}