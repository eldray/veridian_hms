import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { DashboardRepository } from './DashboardRepository';
import { IDashboardStats } from './DashboardTypes';

export class DashboardService extends BaseService {
  private repository: DashboardRepository;

  constructor(prisma: PrismaClient) {
    super('DashboardService');
    this.repository = new DashboardRepository(prisma);
  }

  /**
   * Derive start/end dates from an optional period string or explicit dates.
   * Period precedence: explicit startDate/endDate > preset ('today'|'week'|'month') > today
   */
  private resolveDateRange(
    startDate?: string,
    endDate?: string,
    period?: string
  ): { start: Date; end: Date } {
    const now = new Date();

    // Explicit dates always win
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }

    // Default: today
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  async getDashboardStats(
    startDate?: string,
    endDate?: string,
    period?: string
  ): Promise<IDashboardStats> {
    this.logInfo(`Fetching dashboard stats [period=${period ?? 'today'}, start=${startDate}, end=${endDate}]`);

    const { start, end } = this.resolveDateRange(startDate, endDate, period);

    // For topDiagnoses use full period; for very short periods (today) expand to 30 days
    // so the diagnoses panel is always meaningful.
    const diagStart = period === 'today' || (!period && !startDate)
      ? (() => { const d = new Date(start); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d; })()
      : start;

    const [
      totalPatients,
      todayVisits,
      activeAdmissions,
      pendingBills,
      pendingClaims,
      lowStockRaw,
      scheduledAppointments,
      revenue,
      completedProcedures,
      diagnosisGroups,
    ] = await Promise.all([
      this.repository.getTotalPatients(),
      this.repository.getTodayVisits(start, end),
      this.repository.getActiveAdmissions(),
      this.repository.getPendingBills(),
      this.repository.getPendingClaims(),
      this.repository.getLowStockItems(),
      this.repository.getScheduledAppointments(start, end),
      this.repository.getRevenue(start, end),
      this.repository.getCompletedProcedures(start, end),
      this.repository.getTopDiagnoses(diagStart, end),
    ]);

    const lowStockItems = (lowStockRaw as any[])
      .filter((i: any) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0)).length;

    let topDiagnoses: IDashboardStats['topDiagnoses'] = [];
    const groups = diagnosisGroups as any[];

    if (groups.length > 0) {
      const ids = groups.map((g: any) => g.diagnosisId);
      const details = await this.repository.getDiagnosisDetails(ids);
      const map = new Map((details as any[]).map((d: any) => [d.id, d]));
      topDiagnoses = groups
        .map((g: any) => {
          const d = map.get(g.diagnosisId) as any;
          return { disease: d?.name ?? 'Unknown', icdCode: d?.icdCode ?? '—', patients: g._count.diagnosisId };
        })
        .filter((d: any) => d.disease !== 'Unknown');
    }

    return {
      totalPatients,
      todayVisits,
      activeAdmissions,
      pendingBills,
      pendingClaims,
      lowStockItems,
      totalRevenue: revenue,
      scheduledAppointments,
      completedProcedures,
      topDiagnoses,
    };
  }
}