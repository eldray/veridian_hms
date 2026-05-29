/**
 * Clinical Reports Repository
 * Data access layer for clinical reports
 */

import { PrismaClient } from '@prisma/client';
// FIXED: was missing — ClinicalReportFilters used in method signatures but never imported
import { ClinicalReportFilters } from './ClinicalReportsTypes';

export class ClinicalReportsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getLabTests(filters: ClinicalReportFilters) {
    return this.prisma.labTest.findMany({
      where: {
        requestedAt: { gte: filters.startDate, lte: filters.endDate },
      },
      include: {
        LabTestTemplate: true,
        Attendance:      true,
        ServiceCatalog:  true,
        // FIXED: schema relation names — shorthand aliases don't exist on Prisma client
        User_LabTest_performedByIdToUser: { select: { fullName: true, username: true } },
        User_LabTest_verifiedByIdToUser:  { select: { fullName: true, username: true } },
        User_LabTest_createdByIdToUser:   { select: { fullName: true, username: true } },
      },
    });
  }

  async getScans(filters: ClinicalReportFilters) {
    return this.prisma.scan.findMany({
      where: {
        requestedAt: { gte: filters.startDate, lte: filters.endDate },
      },
      include: {
        ScanTemplate:    true,
        Attendance:      true,
        ServiceCatalog:  true,
        // FIXED: schema relation names
        User_Scan_performedByIdToUser: { select: { fullName: true, username: true } },
        User_Scan_verifiedByIdToUser:  { select: { fullName: true, username: true } },
        User_Scan_createdByIdToUser:   { select: { fullName: true, username: true } },
      },
    });
  }

  async getProcedures(filters: ClinicalReportFilters) {
    return this.prisma.procedure.findMany({
      where: {
        // FIXED: scheduledDate is nullable — many procedures won't have one.
        // Filter on createdAt instead so all procedures in the period are captured.
        createdAt: { gte: filters.startDate, lte: filters.endDate },
      },
      include: {
        ProcedureTemplate: true,
        // FIXED: schema relation names
        User_Procedure_performedByIdToUser: { select: { fullName: true, username: true } },
        User_Procedure_assistantIdToUser:   { select: { fullName: true, username: true } },
        User_Procedure_createdByIdToUser:   { select: { fullName: true, username: true } },
      },
    });
  }

  async getMedications(filters: ClinicalReportFilters) {
    return this.prisma.medication.findMany({
      where: {
        prescribedAt: { gte: filters.startDate, lte: filters.endDate },
      },
      include: {
        Attendance: true,
        StockItem:  true,
        // FIXED: schema relation names
        User_Medication_prescribedByIdToUser:   { select: { fullName: true, username: true } },
        User_Medication_dispensedByIdToUser:    { select: { fullName: true, username: true } },
        User_Medication_administeredByIdToUser: { select: { fullName: true, username: true } },
      },
    });
  }

  async getVitals(filters: ClinicalReportFilters) {
    return this.prisma.vitals.findMany({
      where: {
        recordedAt: { gte: filters.startDate, lte: filters.endDate },
      },
      include: {
        Attendance: true,
        Patient:    true,
        // User is the correct relation name on Vitals per schema (single user relation, no ambiguity)
        User: { select: { fullName: true, username: true } },
      },
    });
  }
}