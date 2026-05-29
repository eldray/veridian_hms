/**
 * Clinical Reports Controller
 * HTTP request handlers for clinical report operations
 */

import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../middleware/authMiddleware';
import { ClinicalReportsService } from './ClinicalReportsService';

export class ClinicalReportsController {
  private service: ClinicalReportsService;

  // FIXED: accepts prisma so the connection pool is shared — was constructor() with no args
  constructor(prisma: PrismaClient) {
    this.service = new ClinicalReportsService(prisma);
  }

  /**
   * GET /clinical-reports/lab
   */
  generateLabReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
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
   */
  generateScanReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
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
   */
  generateProcedureReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
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
   */
  generateMedicationReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
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
   */
  generateVitalsReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'startDate and endDate are required' });
      }

      const start = new Date(startDate as string);
      const end   = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const report = await this.service.generateVitalsReport({ startDate: start, endDate: end });
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error generating vitals report:', error);
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  };
}
