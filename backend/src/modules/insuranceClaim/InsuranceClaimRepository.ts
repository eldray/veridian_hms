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

  // ==========================================
  // BATCH QUERIES
  // ==========================================
  async findBatchesWithFilters(filters: any) {
    const { status, startDate, endDate, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (status) where.status = status;
    if (startDate || endDate) {
      where.batchDate = {};
      if (startDate) where.batchDate.gte = startDate;
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        where.batchDate.lte = d;
      }
    }

    const skip = (page - 1) * limit;

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
        orderBy: { batchDate: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.claimBatch.count({ where })
    ]);

    return {
      data: batches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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
            attendance: true,
            Bill: true
          }
        },
        createdBy: { select: { id: true, fullName: true, username: true } }
      }
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