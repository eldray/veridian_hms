import { Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

const CLAIM_LIST_INCLUDE = {
  InsuranceProvider: {
    select: { id: true, name: true, type: true, coveragePercentage: true },
  },
  Patient: {
    select: {
      id: true,
      folderNumber: true,
      surname: true,
      otherNames: true,
      dateOfBirth: true,
      gender: true,
      nhisNumber: true,
      nhisExpiryDate: true,
      insuranceDetails: true,
      contact: true,
      phoneNumber: true,
    },
  },
  Attendance: {
    select: {
      id: true,
      attendanceNumber: true,
      dateTime: true,
      status: true,
      nhisCCC: true,
      attendanceType: true,
      encounterCategory: true,
      corporateEmployeeId: true,
      preAuthNumber: true,
    },
  },
  Bill: { select: { id: true, billNumber: true, totalAmount: true } },
  CorporateAccount: { select: { id: true, companyName: true } },
} as const;

const CLAIM_DETAIL_INCLUDE = {
  InsuranceProvider: true,
  Patient: true,
  Bill: { include: { BillLineItem: { include: { serviceCatalog: true } } } },
  CorporateAccount: { include: { employees: { where: { isActive: true } } } },
  finalizedBy: { select: { id: true, fullName: true, username: true, licenseNumber: true } },
  Attendance: {
    include: {
      Patient: true,
      Admission: true,
      AttendanceDiagnosis: { include: { Diagnosis: true, User: { select: { id: true, fullName: true, licenseNumber: true } } } },
      LabTest: { include: { LabTestTemplate: true, ServiceCatalog: true } },
      Scan: { include: { ScanTemplate: true, ServiceCatalog: true } },
      Medication: { include: { StockItem: true, ServiceCatalog: true } },
      Procedure: { include: { ProcedureTemplate: true, ServiceCatalog: true } },
      ServiceRendered: { include: { ServiceCatalog: true } },
      WardChargeRecord: true,
      referral: true,
    },
  },
  items: {
    include: {
      diagnosis: true,
      gdrgTariff: true,
      labTest: { include: { LabTestTemplate: true } },
      scan: { include: { ScanTemplate: true } },
      procedure: { include: { ProcedureTemplate: true } },
      medication: { include: { StockItem: true } },
      serviceCatalog: true,
    },
    orderBy: { itemNumber: 'asc' },
  },
} as const;

export interface ClaimListFilters {
  status?: string | string[];
  insuranceProviderId?: string;
  corporateAccountId?: string;
  patientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface BatchListFilters {
  insuranceType?: string;
  insuranceProviderId?: string;
  corporateAccountId?: string;
  status?: string;
  periodYear?: number;
  periodMonth?: number;
  page?: number;
  limit?: number;
}

export class InsuranceClaimRepository extends BaseRepository<unknown, unknown, unknown> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'insuranceClaim');
  }

  // ==========================================
  // CLAIM — LIST & DETAIL
  // ==========================================
  async findClaimsPaginated(filters: ClaimListFilters) {
    const {
      status,
      insuranceProviderId,
      corporateAccountId,
      patientId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.InsuranceClaimWhereInput = {};
    if (status) {
      where.status = Array.isArray(status) ? { in: status as any } : (status as any);
    }
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (patientId) where.patientId = patientId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as any).gte = dateFrom;
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        (where.createdAt as any).lte = d;
      }
    }

    return this.findManyWithPagination({
      where,
      page,
      limit,
      orderBy: { createdAt: 'desc' },
      include: CLAIM_LIST_INCLUDE,
    });
  }

  async findClaimsByProviderType(
    providerType: 'nhis' | 'private' | 'corporate',
    filters: Omit<ClaimListFilters, 'insuranceProviderId'>,
  ) {
    const {
      status,
      patientId,
      corporateAccountId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.InsuranceClaimWhereInput = {
      InsuranceProvider: { is: { type: providerType as any } },
    };
    if (status) where.status = status as any;
    if (patientId) where.patientId = patientId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (dateFrom || dateTo) {
      where.Attendance = {};
      const att: any = where.Attendance;
      if (dateFrom) att.dateTime = { ...att.dateTime, gte: dateFrom };
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        att.dateTime = { ...att.dateTime, lte: d };
      }
    }

    return this.findManyWithPagination({
      where,
      page,
      limit,
      orderBy: { createdAt: 'desc' },
      include: CLAIM_LIST_INCLUDE,
    });
  }

  async findClaimById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: CLAIM_DETAIL_INCLUDE,
    });
  }

  async findClaimByAttendanceId(attendanceId: string) {
    return this.getModel().findFirst({
      where: { attendanceId },
      include: CLAIM_DETAIL_INCLUDE,
    });
  }

  async findEligibleClaimsForBatch(
    insuranceType: 'nhis' | 'private' | 'corporate',
    periodYear: number,
    periodMonth: number,
    insuranceProviderId?: string | null,
    corporateAccountId?: string | null,
  ) {
    const start = new Date(periodYear, periodMonth - 1, 1, 0, 0, 0, 0);
    const end = new Date(periodYear, periodMonth, 1, 0, 0, 0, 0);

    const where: Prisma.InsuranceClaimWhereInput = {
      status: 'finalized',
      batchId: null,
      Attendance: { dateTime: { gte: start, lt: end } },
      InsuranceProvider: { is: { type: insuranceType as any } },
    };
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;

    return this.getModel().findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        Patient: true,
        Attendance: { include: { Admission: true } },
        InsuranceProvider: true,
        CorporateAccount: true,
        items: { orderBy: { itemNumber: 'asc' } },
      },
    });
  }

  async countClaimsByStatus(status: 'draft' | 'finalized') {
    return this.getModel().count({ where: { status } });
  }

  // ==========================================
  // BATCH
  // ==========================================
  async findBatchesPaginated(filters: BatchListFilters) {
    const {
      insuranceType,
      insuranceProviderId,
      corporateAccountId,
      status,
      periodYear,
      periodMonth,
      page = 1,
      limit = 20,
    } = filters;

    const where: Prisma.ClaimBatchWhereInput = {};
    if (insuranceType) where.insuranceType = insuranceType as any;
    if (insuranceProviderId) where.insuranceProviderId = insuranceProviderId;
    if (corporateAccountId) where.corporateAccountId = corporateAccountId;
    if (status) where.status = status as any;
    if (periodYear) where.periodYear = periodYear;
    if (periodMonth) where.periodMonth = periodMonth;

    return this.findManyWithPagination({
      where,
      page,
      limit,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { generatedAt: 'desc' }],
      include: {
        insuranceProvider: { select: { id: true, name: true, type: true } },
        corporateAccount: { select: { id: true, companyName: true } },
        createdBy: { select: { id: true, fullName: true, username: true } },
        finalizedBy: { select: { id: true, fullName: true, username: true } },
        _count: { select: { claims: true } },
      },
    });
  }

  async findBatchById(batchId: string) {
    return this.prisma.claimBatch.findUnique({
      where: { id: batchId },
      include: {
        insuranceProvider: true,
        corporateAccount: true,
        createdBy: { select: { id: true, fullName: true, username: true } },
        finalizedBy: { select: { id: true, fullName: true, username: true } },
        claims: {
          include: {
            Patient: true,
            Attendance: { include: { Admission: true } },
            InsuranceProvider: true,
            CorporateAccount: true,
            items: { orderBy: { itemNumber: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findExistingBatch(
    insuranceType: 'nhis' | 'private' | 'corporate',
    periodYear: number,
    periodMonth: number,
    insuranceProviderId: string | null,
    corporateAccountId: string | null,
  ) {
    return this.prisma.claimBatch.findFirst({
      where: {
        insuranceType,
        periodYear,
        periodMonth,
        insuranceProviderId: insuranceProviderId ?? null,
        corporateAccountId: corporateAccountId ?? null,
      },
    });
  }
}