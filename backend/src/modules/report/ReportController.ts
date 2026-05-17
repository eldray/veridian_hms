// modules/report/ReportController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ReportService } from './ReportService';
import { BaseController } from '../../shared/base/BaseController';

export class ReportController extends BaseController {
  private reportService: ReportService;

  constructor() {
    super();
    this.reportService = new ReportService();
  }
  
  async getFamilyPlanningReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getFamilyPlanningReport(req.query);
      this.ok(res, result, 'Family planning report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating family planning report');
    }
  }

  async getDemographicReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getDemographicReport(req.query);
      this.ok(res, result, 'Demographic report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating demographic report');
    }
  }

  async getFinancialReport(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getFinancialReport(req.query);
      this.ok(res, result, 'Financial report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating financial report');
    }
  }

  async getInsuranceClaimsReport(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getInsuranceClaimsReport(req.query);
      this.ok(res, result, 'Insurance claims report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating insurance claims report');
    }
  }

  async getClinicalReport(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getClinicalReport(req.query);
      this.ok(res, result, 'Clinical report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating clinical report');
    }
  }

  async getMorbidityMortalityReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getMorbidityMortalityReport(req.query);
      this.ok(res, result, 'Morbidity and mortality report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating morbidity/mortality report');
    }
  }

  async getAttendanceReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getAttendanceReport(req.query);
      this.ok(res, result, 'Attendance report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating attendance report');
    }
  }

  async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getRevenueReport(req.query);
      this.ok(res, result, 'Revenue report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating revenue report');
    }
  }

  async exportReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { reportType, format, ...filters } = req.query;
      const result = await this.reportService.exportReport({
        reportType: reportType as string,
        format: format as string,
        filters
      });
      
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (error) {
      this.handleError(res, error, 'Error exporting report');
    }
  }

  async getLabReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getLabReport(req.query);
      this.ok(res, result, 'Lab report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating lab report');
    }
  }

  async getScanReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getScanReport(req.query);
      this.ok(res, result, 'Scan report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating scan report');
    }
  }

  async getProcedureReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getProcedureReport(req.query);
      this.ok(res, result, 'Procedure report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating procedure report');
    }
  }

  async getMedicationReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getMedicationReport(req.query);
      this.ok(res, result, 'Medication report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating medication report');
    }
  }

  async getVitalsReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const result = await this.reportService.getVitalsReport(req.query);
      this.ok(res, result, 'Vitals report generated successfully');
    } catch (error) {
      this.handleError(res, error, 'Error generating vitals report');
    }
  }
}

export const reportController = new ReportController();