import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { DashboardRepository } from './DashboardRepository';
import { IDashboardStats, IWeeklyStats, IMonthlyStats } from './DashboardTypes';

export class DashboardService extends BaseService {
  private repository: DashboardRepository;

  constructor(prisma: PrismaClient) {
    super('DashboardService');
    this.repository = new DashboardRepository(prisma);
  }

  async getDashboardStats(): Promise<IDashboardStats> {
    this.logInfo('Fetching dashboard stats');
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Single Promise.all — all queries run in parallel
    const [
      totalPatients, todayVisits, activeAdmissions, pendingBills, pendingClaims,
      lowStockRaw, scheduledAppointments, revenue, completedProcedures, diagnosisGroups
    ] = await Promise.all([
      this.repository.getTotalPatients(),
      this.repository.getTodayVisits(startOfToday, endOfToday),
      this.repository.getActiveAdmissions(),
      this.repository.getPendingBills(),
      this.repository.getPendingClaims(),
      this.repository.getLowStockItems(),
      this.repository.getScheduledAppointments(startOfToday, endOfToday),
      this.repository.getRevenue(startOfToday, endOfToday),
      this.repository.getCompletedProcedures(startOfToday, endOfToday),
      this.repository.getTopDiagnoses(thirtyDaysAgo, endOfToday)
    ]);

    const lowStockItems = (lowStockRaw as any[])
      .filter((i: any) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0)).length;

    let topDiagnoses: IDashboardStats['topDiagnoses'] = [];
    const groups = diagnosisGroups as any[];

    if (groups.length > 0) {
      const ids = groups.map((g: any) => g.diagnosisId);
      const details = await this.repository.getDiagnosisDetails(ids);
      const detailMap = new Map((details as any[]).map((d: any) => [d.id, d]));

      topDiagnoses = groups.map((g: any) => {
        const d = detailMap.get(g.diagnosisId) as any;
        return {
          disease: d?.name ?? 'Unknown',
          icdCode: d?.icdCode ?? '—',
          patients: g._count.diagnosisId
        };
      }).filter((d: any) => d.disease !== 'Unknown');
    }

    return {
      totalPatients, todayVisits, activeAdmissions, pendingBills, pendingClaims,
      lowStockItems, totalRevenue: revenue, scheduledAppointments, completedProcedures,
      topDiagnoses // ✅ Aligned with Types
    };
  }

  async getWeeklyStats(): Promise<IWeeklyStats> {
    this.logInfo('Fetching weekly stats');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const stats = await this.repository.getPeriodStats(startOfWeek, endOfWeek);
    return { period: { start: startOfWeek, end: endOfWeek }, ...stats };
  }

  async getMonthlyStats(): Promise<IMonthlyStats> {
    this.logInfo('Fetching monthly stats');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const stats = await this.repository.getPeriodStats(startOfMonth, endOfMonth);
    return { period: { start: startOfMonth, end: endOfMonth }, ...stats };
  }
}