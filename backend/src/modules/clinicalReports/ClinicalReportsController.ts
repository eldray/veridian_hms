import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { ClinicalReportsService } from './ClinicalReportsService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class ClinicalReportsController extends BaseController {
  private service: ClinicalReportsService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new ClinicalReportsService(prisma);
  }

  private parseDates(req: AuthRequest, res: Response): { start: Date; end: Date } | null {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      this.badRequest(res, 'startDate and endDate are required');
      return null;
    }
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  generateLabReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dates = this.parseDates(req, res);
    if (!dates) return;

    const report = await this.service.generateLabReport({ startDate: dates.start, endDate: dates.end });
    return this.ok(res, report, 'Lab report generated successfully');
  });

  generateScanReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dates = this.parseDates(req, res);
    if (!dates) return;

    const report = await this.service.generateScanReport({ startDate: dates.start, endDate: dates.end });
    return this.ok(res, report, 'Scan report generated successfully');
  });

  generateProcedureReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dates = this.parseDates(req, res);
    if (!dates) return;

    const report = await this.service.generateProcedureReport({ startDate: dates.start, endDate: dates.end });
    return this.ok(res, report, 'Procedure report generated successfully');
  });

  generateMedicationReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dates = this.parseDates(req, res);
    if (!dates) return;

    const report = await this.service.generateMedicationReport({ startDate: dates.start, endDate: dates.end });
    return this.ok(res, report, 'Medication report generated successfully');
  });

  generateVitalsReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const dates = this.parseDates(req, res);
    if (!dates) return;

    const report = await this.service.generateVitalsReport({ startDate: dates.start, endDate: dates.end });
    return this.ok(res, report, 'Vitals report generated successfully');
  });
}