import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class DashboardRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'patient');
  }

  async getTotalPatients() {
    return this.prisma.patient.count().catch(() => 0);
  }

  async getTodayVisits(start: Date, end: Date) {
    return this.prisma.attendance.count({
      where: { dateTime: { gte: start, lte: end } }
    }).catch(() => 0);
  }

  async getActiveAdmissions() {
    return this.prisma.admission.count({
      where: { dischargeStatus: null }
    }).catch(() => 0);
  }

  async getPendingBills() {
    return this.prisma.bill.count({
      where: { status: { in: ['pending', 'partial'] } }
    }).catch(() => 0);
  }

  async getPendingClaims() {
    return this.prisma.insuranceClaim.count({
      where: { status: { in: ['draft', 'submitted', 'pending'] } }
    }).catch(() => 0);
  }

  async getLowStockItems() {
    return this.prisma.stockItem.findMany({
      where: { isActive: true },
      select: { currentStock: true, reorderLevel: true }
    }).catch(() => []);
  }

  async getScheduledAppointments(start: Date, end: Date) {
    return this.prisma.appointment.count({
      where: {
        scheduledAt: { gte: start, lte: end },
        status: { in: ['scheduled', 'confirmed'] }
      }
    }).catch(() => 0);
  }

  async getRevenue(start: Date, end: Date) {
    const result = await this.prisma.bill.aggregate({
      where: { billDate: { gte: start, lte: end }, status: 'paid' },
      _sum: { paidAmount: true }
    }).catch(() => ({ _sum: { paidAmount: null } }));
    return result._sum.paidAmount
      ? parseFloat(result._sum.paidAmount.toString())
      : 0;
  }

  async getCompletedProcedures(start: Date, end: Date) {
    return this.prisma.procedure.count({
      where: { status: 'completed', performedAt: { gte: start, lte: end } }
    }).catch(() => 0);
  }

  async getTopDiagnoses(start: Date, end: Date) {
    return this.prisma.attendanceDiagnosis.groupBy({
      by: ['diagnosisId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { diagnosisId: true },
      orderBy: { _count: { diagnosisId: 'desc' } },
      take: 10
    }).catch(() => []);
  }

  async getDiagnosisDetails(ids: string[]) {
    return this.prisma.diagnosis.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, icdCode: true }
    }).catch(() => []);
  }
}