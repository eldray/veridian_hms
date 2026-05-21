/**
 * Clinical Reports Repository
 * Data access layer for clinical reports
 */

import { PrismaClient } from '@prisma/client';

export class ClinicalReportsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getLabTests(filters: ClinicalReportFilters) {
    return this.prisma.labTest.findMany({
      where: {
        requestedAt: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        LabTestTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        performedBy: {
          select: { fullName: true, username: true }
        },
        verifiedBy: {
          select: { fullName: true, username: true }
        },
        createdBy: {
          select: { fullName: true, username: true }
        }
      }
    });
  }

  async getScans(filters: ClinicalReportFilters) {
    return this.prisma.scan.findMany({
      where: {
        requestedAt: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        ScanTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        performedBy: {
          select: { fullName: true, username: true }
        },
        verifiedBy: {
          select: { fullName: true, username: true }
        },
        createdBy: {
          select: { fullName: true, username: true }
        }
      }
    });
  }

  async getProcedures(filters: ClinicalReportFilters) {
    return this.prisma.procedure.findMany({
      where: {
        scheduledDate: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        ProcedureTemplate: true,
        performedBy: {
          select: { fullName: true, username: true }
        },
        assistant: {
          select: { fullName: true, username: true }
        },
        createdBy: {
          select: { fullName: true, username: true }
        }
      }
    });
  }

  async getMedications(filters: ClinicalReportFilters) {
    return this.prisma.medication.findMany({
      where: {
        prescribedAt: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        Attendance: true,
        StockItem: true,
        prescribedBy: {
          select: { fullName: true, username: true }
        },
        dispensedBy: {
          select: { fullName: true, username: true }
        },
        administeredBy: {
          select: { fullName: true, username: true }
        }
      }
    });
  }

  async getVitals(filters: ClinicalReportFilters) {
    return this.prisma.vitals.findMany({
      where: {
        recordedAt: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        Attendance: true,
        Patient: true,
        User: {
          select: { fullName: true, username: true }
        }
      }
    });
  }
}