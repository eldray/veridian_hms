/**
 * Clinical Reports Repository
 * Data access layer for clinical reports
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { ClinicalReportFilters } from './ClinicalReportsTypes';

export class ClinicalReportsRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
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
        User_LabTest_performedByIdToUser: true,
        User_LabTest_verifiedByIdToUser: true,
        User_LabTest_createdByIdToUser: true
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
        User_Scan_performedByIdToUser: true,
        User_Scan_verifiedByIdToUser: true,
        User_Scan_createdByIdToUser: true
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
        User_Procedure_performedByIdToUser: true,
        User_Procedure_assistantIdToUser: true,
        User_Procedure_createdByIdToUser: true
      }
    });
  }

  async getMedications(filters: ClinicalReportFilters) {
    return this.prisma.medication.findMany({
      where: {
        prescribedDate: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        Attendance: true,
        Drug: true,
        User_Medication_prescribedByIdToUser: true
      }
    });
  }

  async getVitals(filters: ClinicalReportFilters) {
    return this.prisma.vitalSign.findMany({
      where: {
        recordedAt: { gte: filters.startDate, lte: filters.endDate }
      },
      include: {
        Attendance: true,
        User_VitalSign_recordedByIdToUser: true
      }
    });
  }
}
