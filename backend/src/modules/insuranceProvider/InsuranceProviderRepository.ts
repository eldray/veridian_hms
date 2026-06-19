import { PrismaClient, InsuranceType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class InsuranceProviderRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'insuranceProvider');
  }

  async findAll(filters: { isActive?: boolean; type?: InsuranceType }) {
    const where: any = {};
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.type) where.type = filters.type;

    return this.getModel().findMany({
      where, orderBy: { name: 'asc' },
      select: {
        id: true, name: true, type: true, coveragePercentage: true, contactInfo: true, isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { Patient: true, Attendance: true, Bill: true, InsuranceClaim: true } }
      }
    });
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true }, take: 10, orderBy: { surname: 'asc' } },
        Attendance: { select: { id: true, attendanceNumber: true, attendanceType: true, status: true, dateTime: true }, take: 10, orderBy: { dateTime: 'desc' } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true, status: true, billDate: true }, take: 10, orderBy: { billDate: 'desc' } },
        InsuranceClaim: { select: { id: true, claimNumber: true, totalClaimAmount: true, status: true, submissionDate: true }, take: 10, orderBy: { submissionDate: 'desc' } },
        _count: { select: { Patient: true, Attendance: true, Bill: true, InsuranceClaim: true } }
      }
    });
  }

  async create(data: any) {
    return this.getModel().create({
      data,
      include: { _count: { select: { Patient: true, Attendance: true, Bill: true, InsuranceClaim: true } } }
    });
  }

  async update(id: string, data: any) {
    return this.getModel().update({
      where: { id }, data,
      include: { _count: { select: { Patient: true, Attendance: true, Bill: true, InsuranceClaim: true } } }
    });
  }

  async toggleStatus(id: string) {
    const provider = await this.getModel().findUnique({ where: { id }, select: { isActive: true } });
    
    // ✅ FIXED: Throw a properly formatted 404 error so BaseController handles it correctly
    if (!provider) {
      const err = new Error('Insurance provider not found') as any;
      err.status = 404; 
      throw err;
    }
    
    return this.getModel().update({ where: { id }, data: { isActive: !provider.isActive } });
  }

  // ✅ Database-level aggregation prevents memory leaks and Decimal math crashes
  async getProviderStats(id: string) {
    const provider = await this.getModel().findUnique({ where: { id } });
    if (!provider) return null;

    const [counts, billAggs, claimAggs, billStatuses, claimStatuses] = await Promise.all([
      this.getModel().findUnique({ where: { id }, select: { _count: { select: { Patient: true, Attendance: true, Bill: true, InsuranceClaim: true } } } }),
      this.prisma.bill.aggregate({ where: { insuranceProviderId: id }, _sum: { totalAmount: true, balance: true } }),
      this.prisma.insuranceClaim.aggregate({ where: { insuranceProviderId: id, status: { in: ['approved', 'paid'] } }, _sum: { totalClaimAmount: true, approvedAmount: true } }),
      this.prisma.bill.groupBy({ by: ['status'], where: { insuranceProviderId: id }, _count: true }),
      this.prisma.insuranceClaim.groupBy({ by: ['status'], where: { insuranceProviderId: id }, _count: true })
    ]);

    const billStatusMap: Record<string, number> = {};
    billStatuses.forEach(s => { billStatusMap[s.status] = s._count; });

    const claimStatusMap: Record<string, number> = {};
    claimStatuses.forEach(s => { claimStatusMap[s.status] = s._count; });

    return {
      provider: { id: provider.id, name: provider.name, type: provider.type, coveragePercentage: toNumber(provider.coveragePercentage), isActive: provider.isActive },
      counts: counts?._count || { Patient: 0, Attendance: 0, Bill: 0, InsuranceClaim: 0 },
      financials: {
        totalBilling: toNumber(billAggs._sum.totalAmount),
        pendingBalance: toNumber(billAggs._sum.balance),
        totalClaims: toNumber(claimAggs._sum.totalClaimAmount),
        approvedClaims: toNumber(claimAggs._sum.approvedAmount)
      },
      billStatus: billStatusMap,
      claimStatus: claimStatusMap
    };
  }
}