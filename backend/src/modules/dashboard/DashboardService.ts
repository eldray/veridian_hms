// modules/dashboard/DashboardService.ts
import { PrismaClient } from '@prisma/client';
import { IDashboardStats } from './DashboardTypes';

export class DashboardService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getDashboardStats(): Promise<IDashboardStats> {
    const today        = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Single Promise.all — all queries run in parallel, nothing waits on anything else
    const [
      totalPatients,
      todayVisits,
      activeAdmissions,
      pendingBills,
      pendingClaims,
      lowStockRaw,
      scheduledAppointments,
      revenueData,
      completedProcedures,
      // groupBy in the DB — never pull raw rows into JS just to count them
      diagnosisGroups,
    ] = await Promise.all([

      this.prisma.patient.count()
        .catch(() => 0),

      this.prisma.attendance.count({
        where: { dateTime: { gte: startOfToday, lte: endOfToday } },
      }).catch(() => 0),

      // Admission has no 'status' field — active means dischargeStatus is null
      this.prisma.admission.count({
        where: { dischargeStatus: null },
      }).catch(() => 0),

      this.prisma.bill.count({
        where: { status: { in: ['pending', 'partial'] } },
      }).catch(() => 0),

      this.prisma.insuranceClaim.count({
        where: { status: { in: ['draft', 'submitted', 'pending'] } },
      }).catch(() => 0),

      this.prisma.stockItem.findMany({
        where:  { isActive: true },
        select: { currentStock: true, reorderLevel: true },
      }).catch(() => []),

      this.prisma.appointment.count({
        where: {
          appointmentDate: { gte: startOfToday, lte: endOfToday },
          status: { in: ['scheduled', 'confirmed'] },
        },
      }).catch(() => 0),

      this.prisma.bill.aggregate({
        where: { billDate: { gte: startOfToday, lte: endOfToday }, status: 'paid' },
        _sum:  { paidAmount: true },
      }).catch(() => ({ _sum: { paidAmount: 0 } })),

      this.prisma.procedure.count({
        where: {
          status:      'completed',
          performedAt: { gte: startOfToday, lte: endOfToday },
        },
      }).catch(() => 0),

      // SQL groupBy — one row per diagnosisId with a count, sorted, top 10
      this.prisma.attendanceDiagnosis.groupBy({
        by:      ['diagnosisId'],
        where:   { createdAt: { gte: thirtyDaysAgo, lte: endOfToday } },
        _count:  { diagnosisId: true },
        orderBy: { _count: { diagnosisId: 'desc' } },
        take:    10,
      }).catch(() => []),
    ]);

    const lowStockItems = (lowStockRaw as any[])
      .filter((i: any) => (i.currentStock ?? 0) <= (i.reorderLevel ?? 0))
      .length;

    // Resolve names with a single small IN query — only runs if we have results
    let topDiagnoses: IDashboardStats['topDiagnoses'] = [];
    const groups = diagnosisGroups as any[];

    if (groups.length > 0) {
      const ids = groups.map((g: any) => g.diagnosisId);

      const details = await this.prisma.diagnosis.findMany({
        where:  { id: { in: ids } },
        select: { id: true, name: true, icdCode: true },
      }).catch(() => []);

      const detailMap = new Map((details as any[]).map((d: any) => [d.id, d]));

      topDiagnoses = groups
        .map((g: any) => {
          const d = detailMap.get(g.diagnosisId) as any;
          return {
            disease:  d?.name    ?? 'Unknown',
            icdCode:  d?.icdCode ?? '—',
            patients: g._count.diagnosisId,
          };
        })
        .filter((d: any) => d.disease !== 'Unknown');
    }

    return {
      totalPatients:         (totalPatients         as number) ?? 0,
      todayVisits:           (todayVisits           as number) ?? 0,
      activeAdmissions:      (activeAdmissions      as number) ?? 0,
      pendingBills:          (pendingBills          as number) ?? 0,
      pendingClaims:         (pendingClaims         as number) ?? 0,
      lowStockItems,
      totalRevenue:          (revenueData as any)?._sum?.paidAmount ?? 0,
      scheduledAppointments: (scheduledAppointments as number) ?? 0,
      completedProcedures:   (completedProcedures   as number) ?? 0,
      topDiagnoses,
    };
  }

  async getWeeklyStats() {
    const today       = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const [revenue, visits, admissions] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { billDate: { gte: startOfWeek, lte: endOfWeek }, status: 'paid' },
        _sum:  { paidAmount: true },
      }).catch(() => ({ _sum: { paidAmount: 0 } })),
      this.prisma.attendance.count({ where: { dateTime: { gte: startOfWeek, lte: endOfWeek } } }).catch(() => 0),
      this.prisma.admission.count({ where: { admissionDate: { gte: startOfWeek, lte: endOfWeek } } }).catch(() => 0),
    ]);

    return {
      period:     { start: startOfWeek, end: endOfWeek },
      revenue:    (revenue as any)._sum?.paidAmount ?? 0,
      visits,
      admissions,
    };
  }

  async getMonthlyStats() {
    const today        = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [revenue, visits, admissions] = await Promise.all([
      this.prisma.bill.aggregate({
        where: { billDate: { gte: startOfMonth, lte: endOfMonth }, status: 'paid' },
        _sum:  { paidAmount: true },
      }).catch(() => ({ _sum: { paidAmount: 0 } })),
      this.prisma.attendance.count({ where: { dateTime: { gte: startOfMonth, lte: endOfMonth } } }).catch(() => 0),
      this.prisma.admission.count({ where: { admissionDate: { gte: startOfMonth, lte: endOfMonth } } }).catch(() => 0),
    ]);

    return {
      period:     { start: startOfMonth, end: endOfMonth },
      revenue:    (revenue as any)._sum?.paidAmount ?? 0,
      visits,
      admissions,
    };
  }
}