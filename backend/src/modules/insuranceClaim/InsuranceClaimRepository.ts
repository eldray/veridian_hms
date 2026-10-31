import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { money, monthRange, toNum } from '../../utils/reportDates';

/**
 * Everything a claim needs to be turned into a payer document: the encounter's clinical records
 * behind the itemised lines, and the lines themselves with the GDRG tariff and diagnosis attached.
 *
 * Single-claim and batch reads share this so a batch cannot submit a claim in a looser shape than
 * the one the single-claim route would have built.
 */
const CLAIM_DETAIL_INCLUDE = {
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
  CorporateAccount: true,
  // The itemised lines ARE the claim: the XML builder, the print view and the CLAIM-it payload
  // all read claim.items, and without them a claim downloads as "has no itemized lines" and
  // prints an empty table with a zero total. `gdrgTariff` and `diagnosis` are what the payer's
  // GDRG code and ICD-10 come from.
  items: {
    orderBy: { itemNumber: 'asc' },
    include: { gdrgTariff: true, diagnosis: true },
  },
} as const;

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
      include: CLAIM_DETAIL_INCLUDE,
    });
  }

  /** The same detail as one claim, for a whole batch at once, in claim-number order. */
  async findClaimsForSubmission(claimIds: string[]) {
    if (!claimIds.length) return [];
    return this.prisma.insuranceClaim.findMany({
      where: { id: { in: claimIds } },
      include: CLAIM_DETAIL_INCLUDE,
      orderBy: { claimNumber: 'asc' },
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
    // Two filters that each need their own OR block — search terms and the month
    // expansion — so they go into AND instead of clobbering one another.
    const and: any[] = [];
    if (status) where.status = status;
    if (filters.insuranceType) where.insuranceType = filters.insuranceType;
    if (filters.periodYear) where.periodYear = Number(filters.periodYear);
    if (filters.periodMonth) where.periodMonth = Number(filters.periodMonth);
    if (filters.insuranceProviderId) where.insuranceProviderId = String(filters.insuranceProviderId);
    if (filters.corporateAccountId) where.corporateAccountId = String(filters.corporateAccountId);

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(2000, 0, 1);
      const end = endDate ? new Date(endDate) : new Date();
      const firstMonth = start.getFullYear() * 12 + start.getMonth();
      const lastMonth = end.getFullYear() * 12 + end.getMonth();
      const periods: Array<{ periodYear: number; periodMonth: number }> = [];
      for (let month = firstMonth; month <= lastMonth && periods.length < 2400; month += 1) {
        periods.push({ periodYear: Math.floor(month / 12), periodMonth: (month % 12) + 1 });
      }
      and.push({ OR: periods });
    }

    const search = typeof filters.search === 'string' ? filters.search.trim() : '';
    if (search) {
      and.push({
        OR: [
          { batchNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(1000, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [batches, total, totals] = await Promise.all([
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
          // The list screen shows a Provider / Account column; without these the
          // cell had nothing to render and every row showed an em dash.
          insuranceProvider: { select: { id: true, name: true, type: true } },
          corporateAccount: { select: { id: true, companyName: true } },
          createdBy: { select: { id: true, fullName: true, username: true } }
        },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { batchNumber: 'desc' }],
        skip,
        take: safeLimit
      }),
      this.prisma.claimBatch.count({ where }),
      // The cards describe the whole filter, not the rows on this page: a month with
      // more batches than the page size used to report a smaller total than it held.
      this.prisma.claimBatch.aggregate({
        where,
        _count: { _all: true },
        _sum: { totalAmount: true, totalClaims: true },
      }),
    ]);

    return {
      data: batches,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit)
      },
      summary: {
        batches: totals._count._all,
        claims: toNum(totals._sum.totalClaims),
        amount: money(totals._sum.totalAmount),
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
    return this.prisma.insuranceClaim.findMany({
      where: this.batchableWhere(insuranceType, periodYear, periodMonth, {
        insuranceProviderId,
        corporateAccountId,
      }),
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

  /**
   * The single definition of "a claim from this month that a batch may take".
   *
   * The month is the VISIT's month — a claim belongs to the period of its attendance, which is
   * the period the payer is billed for. A batch is scoped by insurance type and, when one was
   * chosen, by provider or corporate account.
   *
   * Every count shown before a batch is generated has to come through here. There used to be two
   * copies of this rule and they disagreed — the preview bucketed by corporateAccountId while the
   * query that fills a batch filtered by provider type — so the number on screen was not the
   * batch that got built.
   */
  private batchableWhere(
    insuranceType: string,
    periodYear: number,
    periodMonth: number,
    scope: { insuranceProviderId?: string | null; corporateAccountId?: string | null } = {},
  ): any {
    const where: any = {
      status: 'finalized',
      batchId: null,
      Attendance: { dateTime: monthRange(periodYear, periodMonth) },
    };
    if (scope.insuranceProviderId) where.insuranceProviderId = scope.insuranceProviderId;
    if (scope.corporateAccountId) where.corporateAccountId = scope.corporateAccountId;
    // A corporate batch named by its account is already narrow enough; otherwise the provider
    // type is the only thing left to group by.
    if (insuranceType !== 'corporate' || !scope.corporateAccountId) {
      where.InsuranceProvider = { type: insuranceType };
    }
    return where;
  }

  /** Per-type counts and amounts for one month — the numbers behind the Generate button. */
  async summarizeBatchableByType(
    periodYear: number,
    periodMonth: number,
    scope: { insuranceProviderId?: string | null; corporateAccountId?: string | null } = {},
  ) {
    const types = ['nhis', 'private', 'corporate'] as const;
    const rows = await Promise.all(
      types.map((type) =>
        this.prisma.insuranceClaim.aggregate({
          where: this.batchableWhere(type, periodYear, periodMonth, scope),
          _count: { _all: true },
          _sum: { totalClaimAmount: true },
        }),
      ),
    );
    return types.reduce((acc, type, index) => {
      acc[type] = {
        count: rows[index]._count._all,
        amount: money(rows[index]._sum.totalClaimAmount),
      };
      return acc;
    }, {} as Record<(typeof types)[number], { count: number; amount: number }>);
  }

  /**
   * Every claim whose visit falls in the month, batched or not, drafted or finalized.
   * This is what the batching screen lists when a period is picked: the claims of that month
   * and their total, whether or not a batch has been generated for them yet.
   */
  async findClaimsForPeriod(
    periodYear: number,
    periodMonth: number,
    options: { insuranceType?: string; batched?: string; page: number; limit: number },
  ) {
    const range = monthRange(periodYear, periodMonth);
    const where: any = { Attendance: { dateTime: range } };
    const type = options.insuranceType && options.insuranceType !== 'all' ? options.insuranceType : null;
    if (type) where.InsuranceProvider = { type };
    if (options.batched === 'batched') where.batchId = { not: null };
    if (options.batched === 'unbatched') where.batchId = null;

    const safePage = Math.max(1, options.page || 1);
    const safeLimit = Math.min(200, Math.max(1, options.limit || 50));
    const skip = (safePage - 1) * safeLimit;

    // What generating a batch over this period would take, using the same rule as the batch.
    const batchableWhere = type
      ? this.batchableWhere(type, periodYear, periodMonth)
      : { status: 'finalized', batchId: null, Attendance: { dateTime: range } };

    const [rows, total, summed, byStatus, batchable] = await Promise.all([
      this.prisma.insuranceClaim.findMany({
        where,
        include: {
          Patient: { select: { folderNumber: true, surname: true, otherNames: true } },
          Attendance: { select: { attendanceNumber: true, dateTime: true } },
          InsuranceProvider: { select: { name: true, type: true } },
          CorporateAccount: { select: { companyName: true } },
          batch: { select: { id: true, batchNumber: true, status: true } },
        },
        orderBy: { Attendance: { dateTime: 'asc' } },
        skip,
        take: safeLimit,
      }),
      this.prisma.insuranceClaim.count({ where }),
      this.prisma.insuranceClaim.aggregate({ where, _sum: { totalClaimAmount: true } }),
      this.prisma.insuranceClaim.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { totalClaimAmount: true },
      }),
      this.prisma.insuranceClaim.aggregate({
        where: batchableWhere,
        _count: { _all: true },
        _sum: { totalClaimAmount: true },
      }),
    ]);

    const statusTotals: Record<string, { count: number; amount: number }> = {
      draft: { count: 0, amount: 0 },
      finalized: { count: 0, amount: 0 },
    };
    for (const row of byStatus) {
      statusTotals[String(row.status)] = {
        count: row._count._all,
        amount: money(row._sum.totalClaimAmount),
      };
    }

    return {
      data: rows.map((c: any) => ({
        claimId: c.id,
        claimNumber: c.claimNumber,
        status: c.status,
        amount: money(c.totalClaimAmount),
        visitDate: c.Attendance?.dateTime ?? null,
        attendanceNumber: c.Attendance?.attendanceNumber ?? null,
        folderNumber: c.Patient?.folderNumber ?? null,
        patient: c.Patient ? `${c.Patient.surname ?? ''} ${c.Patient.otherNames ?? ''}`.trim() : '',
        insuranceType: c.InsuranceProvider?.type ?? null,
        provider: c.InsuranceProvider?.name ?? null,
        corporateAccount: c.CorporateAccount?.companyName ?? null,
        batch: c.batch
          ? { batchId: c.batch.id, batchNumber: c.batch.batchNumber, status: c.batch.status }
          : null,
      })),
      pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) },
      totals: {
        claims: total,
        amount: money(summed._sum.totalClaimAmount),
        byStatus: statusTotals,
        batchable: { count: batchable._count._all, amount: money(batchable._sum.totalClaimAmount) },
      },
    };
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