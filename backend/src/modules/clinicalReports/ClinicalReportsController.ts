/**
 * Clinical Reports Controller
 * HTTP request handlers for clinical report operations
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ClinicalReportsService } from './ClinicalReportsService';

export class ClinicalReportsController {
  private service: ClinicalReportsService;

  constructor() {
    this.service = new ClinicalReportsService();
  }

  /**
   * GET /clinical-reports/lab
   * Generate lab report
   */
  generateLabReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateLabReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating lab report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };

  /**
   * GET /clinical-reports/scan
   * Generate scan report
   */
  generateScanReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateScanReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating scan report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };

  /**
   * GET /clinical-reports/procedure
   * Generate procedure report
   */
  generateProcedureReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateProcedureReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating procedure report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };

  /**
   * GET /clinical-reports/medication
   * Generate medication report
   */
  generateMedicationReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateMedicationReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating medication report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };

  /**
   * GET /clinical-reports/vitals
   * Generate vitals report
   */
  generateVitalsReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'startDate and endDate are required' 
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateVitalsReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating vitals report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };
}

// Only one export - remove the duplicate if present
export const clinicalReportsController = new ClinicalReportsController();