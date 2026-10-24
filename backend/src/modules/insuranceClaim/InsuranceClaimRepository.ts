import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class InsuranceClaimRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'insuranceClaim');
  }

  // ==========================================
  // GENERAL CLAIM QUERIES
  // ==========================================
  async findAllWithFilters(filters: any) {
    const { status, insuranceProviderId, patientId, dateFrom, dateTo, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (patientId) where.patientId = patientId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    return this.findManyWithPagination({
      where,
      page,
      limit,
      orderBy: { createdAt: 'desc' },
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true, coveragePercentage: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true, contact: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, status: true, nhisCCC: true } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } }
      }
    });
  }

  async findByIdWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        InsuranceProvider: true,
        Patient: true,
        // Include the encounter's clinical sub-records so claim forms can
        // auto-populate diagnoses / investigations / medicines / procedures.
        Attendance: {
          include: {
            AttendanceDiagnosis: { include: { Diagnosis: true } },
            LabTest: { include: { LabTestTemplate: true, ServiceCatalog: true } },
            Scan: { include: { ScanTemplate: true, ServiceCatalog: true } },
            Medication: { include: { StockItem: true, ServiceCatalog: true } },
            Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: true } },
            referral: true,
            Admission: true,
          }
        },
        Bill: true,
        CorporateAccount: true
      }
    });
  }

  async findByAttendanceId(attendanceId: string, providerType?: string) {
    const where: any = { attendanceId };
    if (providerType) {
      where.InsuranceProvider = { type: providerType };
    }
    
    return this.getModel().findFirst({
      where,
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: true,
        Bill: true
      }
    });
  }

  /**
   * Historical claims without item rows are surfaced for controlled reconciliation.
   * This is read-only: it deliberately never reconstructs or changes submitted claim history.
   */
  async findClaimsMissingItems(filters: { insuranceType?: string; status?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 25));
    const where: any = { items: { none: {} } };
    if (filters.status) where.status = filters.status;
    if (filters.insuranceType) where.InsuranceProvider = { type: filters.insuranceType };

    const [data, total] = await Promise.all([
      this.prisma.insuranceClaim.findMany({
        where,
        include: {
          InsuranceProvider: { select: { id: true, name: true, type: true } },
          Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, status: true } },
          Bill: { select: { id: true, billNumber: true, totalAmount: true, paidAmount: true, balance: true } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.insuranceClaim.count({ where }),
    ]);

    return { data, page, limit, total, pages: Math.ceil(total / limit) };
  }

  // ==========================================
  // BATCH QUERIES
  // ==========================================
  async findBatchesWithFilters(filters: any) {
    const { status, startDate, endDate, page = 1, limit = 1000 } = filters;
    const where: any = {};
    if (status) where.status = status;
    if (filters.insuranceType) where.insuranceType = filters.insuranceType;
    if (filters.periodYear) where.periodYear = Number(filters.periodYear);
    if (filters.periodMonth) where.periodMonth = Number(filters.periodMonth);

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(2000, 0, 1);
      const end = endDate ? new Date(endDate) : new Date();
      const firstMonth = start.getFullYear() * 12 + start.getMonth();
      const lastMonth = end.getFullYear() * 12 + end.getMonth();
      const periods: Array<{ periodYear: number; periodMonth: number }> = [];
      for (let month = firstMonth; month <= lastMonth && periods.length < 2400; month += 1) {
        periods.push({ periodYear: Math.floor(month / 12), periodMonth: (month % 12) + 1 });
      }
      where.OR = periods;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [batches, total] = await Promise.all([
      this.prisma.claimBatch.findMany({
        where,
        include: {
          claims: {
            select: {
              id: true,
              claimNumber: true,
              totalClaimAmount: true,
              status: true,
              Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } }
            }
          },
          createdBy: { select: { id: true, fullName: true, username: true } }
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        skip,
        take: safeLimit
      }),
      this.prisma.claimBatch.count({ where })
    ]);

    return {
      data: batches,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      }
    };
  }

  async findBatchById(batchId: string) {
    return this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        claims: {
          include: {
            InsuranceProvider: true,
            Patient: true,
            Attendance: true,
            Bill: true
          }
        },
        createdBy: { select: { id: true, fullName: true, username: true } }
      }
    });
  }

  async findClaimById(id: string) {
    return this.findByIdWithDetails(id);
  }

  async findBatchesPaginated(filters: any) {
    return this.findBatchesWithFilters(filters);
  }

  async findExistingBatch(
    insuranceType: string,
    periodYear: number,
    periodMonth: number,
    insuranceProviderId?: string | null,
    corporateAccountId?: string | null,
  ) {
    return this.prisma.claimBatch.findFirst({
      where: {
        insuranceType: insuranceType as any,
        periodYear,
        periodMonth,
        insuranceProviderId: insuranceProviderId ?? null,
        corporateAccountId: corporateAccountId ?? null,
      },
    });
  }

  async findEligibleClaimsForBatch(
    insuranceType: string,
    periodYear: number,
    periodMonth: number,
    insuranceProviderId?: string | null,
    corporateAccountId?: string | null,
  ) {
    const start = new Date(periodYear, periodMonth - 1, 1);
    const end = new Date(periodYear, periodMonth, 1);
    const where: any = {
      status: 'finalized',
      batchId: null,
      Attendance: { dateTime: { gte: start, lt: end } },
    };
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (insuranceType === 'nhis') where.InsuranceProvider = { type: 'nhis' };
    if (insuranceType === 'private') where.InsuranceProvider = { type: 'private' };
    if (insuranceType === 'corporate') {
      if (corporateAccountId) where.corporateAccountId = corporateAccountId;
      else where.InsuranceProvider = { type: 'corporate' };
    }

    return this.prisma.insuranceClaim.findMany({
      where,
      include: {
        InsuranceProvider: true,
        Patient: true,
        Attendance: true,
        Bill: true,
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================
  // SPECIFIC PROVIDER QUERIES (Helper methods for Service)
  // ==========================================
  async findNHISClaims(filters: any) {
    const where: any = { InsuranceProvider: { type: 'nhis' } };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    
    if (filters.startDate || filters.endDate) {
      where.Attendance = {};
      if (filters.startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: filters.startDate };
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        d.setHours(23, 59, 59, 999);
        where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d };
      }
    }

    return this.findManyWithPagination({
      where,
      page: filters.page,
      limit: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, nhisCCC: true } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } }
      }
    });
  }

  async findPrivateClaims(filters: any) {
    const where: any = { InsuranceProvider: { type: 'private' } };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    
    if (filters.startDate || filters.endDate) {
      where.Attendance = {};
      if (filters.startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: filters.startDate };
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        d.setHours(23, 59, 59, 999);
        where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d };
      }
    }

    return this.findManyWithPagination({
      where,
      page: filters.page,
      limit: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } }
      }
    });
  }

  async findCorporateClaims(filters: any) {
    const where: any = { InsuranceProvider: { type: 'corporate' } };
    if (filters.status) where.status = filters.status;
    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.corporateAccountId) where.corporateAccountId = filters.corporateAccountId;
    
    if (filters.startDate || filters.endDate) {
      where.Attendance = {};
      if (filters.startDate) where.Attendance.dateTime = { ...where.Attendance.dateTime, gte: filters.startDate };
      if (filters.endDate) {
        const d = new Date(filters.endDate);
        d.setHours(23, 59, 59, 999);
        where.Attendance.dateTime = { ...where.Attendance.dateTime, lte: d };
      }
    }

    return this.findManyWithPagination({
      where,
      page: filters.page,
      limit: filters.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        InsuranceProvider: { select: { id: true, name: true, type: true } },
        CorporateAccount: { select: { id: true, companyName: true } },
        Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } },
        Attendance: { select: { id: true, attendanceNumber: true, dateTime: true, corporateEmployeeId: true } },
        Bill: { select: { id: true, billNumber: true, totalAmount: true } }
      }
    });
  }
}