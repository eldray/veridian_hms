/**
 * Report Controller
 * HTTP request handlers for report operations
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { BaseController } from '../../utils/baseController';

// Import legacy service functions
const legacyController = require('../../controllers/reportController');

export class ReportController extends BaseController {
  
  async getFamilyPlanningReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getFamilyPlanningReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating family planning report');
    }
  }

  async getDemographicReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getDemographicReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating demographic report');
    }
  }

  async getFinancialReport(req: Request, res: Response): Promise<void> {
    try {
      await legacyController.getFinancialReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating financial report');
    }
  }

  async getInsuranceClaimsReport(req: Request, res: Response): Promise<void> {
    try {
      await legacyController.getInsuranceClaimsReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating insurance claims report');
    }
  }

  async getClinicalReport(req: Request, res: Response): Promise<void> {
    try {
      await legacyController.getClinicalReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating clinical report');
    }
  }

  async getMorbidityMortalityReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getMorbidityMortalityReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating morbidity/mortality report');
    }
  }

  async getAttendanceReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getAttendanceReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating attendance report');
    }
  }

  async getRevenueReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getRevenueReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating revenue report');
    }
  }

  async exportReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.exportReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error exporting report');
    }
  }

  async getLabReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getLabReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating lab report');
    }
  }

  async getScanReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getScanReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating scan report');
    }
  }

  async getProcedureReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getProcedureReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating procedure report');
    }
  }

  async getMedicationReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getMedicationReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating medication report');
    }
  }

  async getVitalsReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      await legacyController.getVitalsReport(req, res);
    } catch (error) {
      this.handleError(res, error, 'Error generating vitals report');
    }
  }
}

export const reportController = new ReportController();
