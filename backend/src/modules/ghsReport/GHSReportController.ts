// src/modules/ghsReport/GHSReportController.ts - FIXED
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuthRequest } from '../../middleware/authMiddleware';
import { GHSReportService } from './GHSReportService';
import { PrismaClient } from '@prisma/client';

export class GHSReportController extends BaseController {
  private reportService: GHSReportService;

  constructor(prisma: PrismaClient) {
    super();
    this.reportService = new GHSReportService(prisma);
  }

  // ── Standard Report Generators ────────────────────────────────────────────
  generateOPDReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateOPDReport(startDate, endDate);
    const csv = GHSReportService.exportOPDToCSV(report);
    const saved = await this.reportService.saveSubmission('opd_attendance', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, csv, submissionId: saved.id }, 'OPD report generated successfully');
  });

  generateIPDReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateIPDReport(startDate, endDate);
    const csv = GHSReportService.exportIPDToCSV(report);
    const saved = await this.reportService.saveSubmission('ipd_morbidity', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, csv, submissionId: saved.id }, 'IPD report generated successfully');
  });

  generateMorbidityMortalityReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateMorbidityReport(startDate, endDate);
    const csv = GHSReportService.exportMorbidityToCSV(report);
    const saved = await this.reportService.saveSubmission('form_a_morbidity', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, csv, submissionId: saved.id }, 'Morbidity report generated successfully');
  });

  generateMalariaReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateMalariaReport(startDate, endDate);
    const csv = GHSReportService.exportMalariaToCSV(report);
    const saved = await this.reportService.saveSubmission('malaria_data', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, csv, submissionId: saved.id }, 'Malaria report generated successfully');
  });

  generateFormAReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateFormAReport(startDate, endDate);
    const csv = GHSReportService.exportFormAToCSV(report);
    const saved = await this.reportService.saveSubmission('form_a_complete', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, csv, submissionId: saved.id }, 'Form A report generated successfully');
  });

  generateIDSRReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = this.reportService.parseDateParams(req.query);
    const report = await this.reportService.generateIDSRReport(startDate, endDate);
    const saved = await this.reportService.saveSubmission('idsr', startDate, endDate, report, req.user!.id);
    return this.ok(res, { data: report, submissionId: saved.id }, 'IDSR report generated successfully');
  });

  generateConsultingRoomRegister = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, period = 'daily' } = req.query;
    const result = await this.reportService.generateConsultingRoomRegister(
      startDate as string, endDate as string, period as 'daily' | 'weekly' | 'monthly', req.user!.id
    );
    const csv = GHSReportService.exportConsultingRoomRegisterToCSV(result);
    const saved = await this.reportService.saveSubmission('opd_attendance', result.period.startDate, result.period.endDate, result, req.user!.id);
    return this.ok(res, { data: result, csv, submissionId: saved.id }, 'Consulting room register generated successfully');
  });

  generateDeliveryReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.reportService.generateDeliveryReport(req.query);
    return this.ok(res, result, 'Delivery report generated successfully');
  });

  getFamilyPlanningReport = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.reportService.generateFamilyPlanningReport(req.query);
    return this.ok(res, result, 'Family planning report generated successfully');
  });

  // ✅ FIXED: Properly parse dates for getTopDiagnoses
  getTopDiagnoses = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate, limit } = req.query;
    
    // ✅ Convert string dates to Date objects
    let start: Date;
    let end: Date;
    
    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return this.error(res, 'Invalid startDate format. Use ISO-8601 (YYYY-MM-DD)', 400);
      }
    } else {
      start = new Date();
      start.setDate(start.getDate() - 30); // Default to last 30 days
    }
    
    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return this.error(res, 'Invalid endDate format. Use ISO-8601 (YYYY-MM-DD)', 400);
      }
    } else {
      end = new Date();
    }
    
    // Set time boundaries
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const result = await this.reportService.getTopDiagnoses(
      start, 
      end, 
      limit ? parseInt(limit as string, 10) : 10
    );
    
    return this.ok(res, { data: result }, 'Top diagnoses retrieved successfully');
  });

  // ── Report Submissions & Exports ──────────────────────────────────────────
  getReportSubmissions = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = this.getPaginationParams(req);
    const { reportType, year, month } = req.query;

    const result = await this.reportService.getReportSubmissions({
      reportType: reportType as string,
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      page, limit
    });

    return this.paginated(res, result.data, result.pagination, 'Report submissions retrieved successfully');
  });

  getReportById = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const submission = await this.reportService.getReportById(req.params.id);
    if (!submission) return this.notFound(res, 'Report submission');
    return this.ok(res, submission, 'Report retrieved successfully');
  });

  exportReportToCSV = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { csvContent, filename } = await this.reportService.exportReportToCSV(req.params.id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    return res.send(csvContent);
  });

  // ─── Family Planning Stats Endpoint ─────────────────────────────────────────
  getFamilyPlanningStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return this.badRequest(res, 'Start date and end date are required');
    }
    
    const stats = await this.reportService.getFamilyPlanningStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    return this.ok(res, stats, 'Family planning statistics retrieved successfully');
  });

  // ─── EPI Stats Endpoint ─────────────────────────────────────────────────────
  getEPIStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return this.badRequest(res, 'Start date and end date are required');
    }
    
    const stats = await this.reportService.getEPIStats(
      new Date(startDate as string),
      new Date(endDate as string)
    );
    
    return this.ok(res, stats, 'EPI statistics retrieved successfully');
  });
}