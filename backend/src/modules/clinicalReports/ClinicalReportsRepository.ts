import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ClinicalReportFilters } from './ClinicalReportsTypes';

export class ClinicalReportsRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'labTest'); // Default model, though we query specific models below
  }

  async getLabTests(filters: ClinicalReportFilters) {
    return this.prisma.labTest.findMany({
      where: { requestedAt: { gte: filters.startDate, lte: filters.endDate } },
      include: {
        LabTestTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        User_LabTest_performedByIdToUser: { select: { fullName: true, username: true } },
        User_LabTest_verifiedByIdToUser: { select: { fullName: true, username: true } },
        User_LabTest_createdByIdToUser: { select: { fullName: true, username: true } },
      },
    });
  }

  async getScans(filters: ClinicalReportFilters) {
    return this.prisma.scan.findMany({
      where: { requestedAt: { gte: filters.startDate, lte: filters.endDate } },
      include: {
        ScanTemplate: true,
        Attendance: true,
        ServiceCatalog: true,
        User_Scan_performedByIdToUser: { select: { fullName: true, username: true } },
        User_Scan_verifiedByIdToUser: { select: { fullName: true, username: true } },
        User_Scan_createdByIdToUser: { select: { fullName: true, username: true } },
      },
    });
  }

  async getProcedures(filters: ClinicalReportFilters) {
    return this.prisma.procedure.findMany({
      // Filter on createdAt because scheduledDate is nullable
      where: { createdAt: { gte: filters.startDate, lte: filters.endDate } },
      include: {
        ProcedureTemplate: true,
        User_Procedure_performedByIdToUser: { select: { fullName: true, username: true } },
        User_Procedure_assistantIdToUser: { select: { fullName: true, username: true } },
        User_Procedure_createdByIdToUser: { select: { fullName: true, username: true } },
      },
    });
  }

  async getMedications(filters: ClinicalReportFilters) {
    return this.prisma.medication.findMany({
      where: { prescribedAt: { gte: filters.startDate, lte: filters.endDate } },
      include: {
        Attendance: true,
        StockItem: true,
        User_Medication_prescribedByIdToUser: { select: { fullName: true, username: true } },
        User_Medication_dispensedByIdToUser: { select: { fullName: true, username: true } },
        User_Medication_administeredByIdToUser: { select: { fullName: true, username: true } },
      },
    });
  }

  async getVitals(filters: ClinicalReportFilters) {
    return this.prisma.vitals.findMany({
      where: { recordedAt: { gte: filters.startDate, lte: filters.endDate } },
      include: {
        Attendance: true,
        Patient: true,
        User: { select: { fullName: true, username: true } },
      },
    });
  }
}