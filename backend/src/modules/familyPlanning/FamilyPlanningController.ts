// modules/familyPlanning/FamilyPlanningController.ts

import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../../middleware/authMiddleware';
import { FamilyPlanningService } from './FamilyPlanningService';

export class FamilyPlanningController {
  private service: FamilyPlanningService;

  constructor(prisma: any) {
    this.service = new FamilyPlanningService(prisma);
  }

  // ===================== CREATE FP SERVICE =====================
  createFPService = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('method').notEmpty().withMessage('FP method is required'),
    body('methodCategory').notEmpty().withMessage('FP method category is required'),
    async (req: AuthRequest, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, errors: errors.array() });
        }

        const user = req.user;
        if (!user) {
          return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const data = {
          ...req.body,
          providedById: user.id,
        };

        const record = await this.service.createFPService(data);
        res.status(201).json({
          success: true,
          message: 'Family planning service recorded successfully',
          data: record,
        });
      } catch (error: any) {
        console.error('Error creating FP service:', error);
        res.status(500).json({
          success: false,
          message: error.message || 'Error creating FP service',
        });
      }
    },
  ];

  // ===================== GET ALL FP SERVICES =====================
  getFPServices = async (req: AuthRequest, res: Response) => {
    try {
      const {
        patientId,
        method,
        methodCategory,
        startDate,
        endDate,
        isNewAcceptor,
        page = 1,
        limit = 50,
      } = req.query;

      const filters = {
        patientId: patientId as string,
        method: method as string,
        methodCategory: methodCategory as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        isNewAcceptor: isNewAcceptor === 'true' ? true : isNewAcceptor === 'false' ? false : undefined,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      };

      const result = await this.service.getFPServices(filters);
      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit),
        },
      });
    } catch (error: any) {
      console.error('Error fetching FP services:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching FP services',
      });
    }
  };

  // ===================== GET FP SERVICE BY ID =====================
  getFPServiceById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.service.getFPServiceById(id);
      res.json({ success: true, data: record });
    } catch (error: any) {
      console.error('Error fetching FP service:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'FP service not found',
      });
    }
  };

  // ===================== GET CURRENT METHOD =====================
  getCurrentMethod = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const currentMethod = await this.service.getCurrentMethodForPatient(patientId);
      res.json({ success: true, data: currentMethod });
    } catch (error: any) {
      console.error('Error fetching current method:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching current method',
      });
    }
  };

  // ===================== GET FP HISTORY =====================
  getFPHistory = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const history = await this.service.getFPHistoryForPatient(patientId);
      res.json({ success: true, data: history });
    } catch (error: any) {
      console.error('Error fetching FP history:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching FP history',
      });
    }
  };

  // ===================== UPDATE FP SERVICE =====================
  updateFPService = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const record = await this.service.updateFPService(id, req.body);
      res.json({
        success: true,
        message: 'FP service updated successfully',
        data: record,
      });
    } catch (error: any) {
      console.error('Error updating FP service:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating FP service',
      });
    }
  };

  // ===================== DELETE FP SERVICE =====================
  deleteFPService = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.service.deleteFPService(id);
      res.json({
        success: true,
        message: 'FP service deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting FP service:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting FP service',
      });
    }
  };

  // ===================== STATISTICS =====================
  getStatistics = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await this.service.getFPStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching statistics',
      });
    }
  };

  // ===================== METHOD MIX =====================
  getMethodMix = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const methodMix = await this.service.getMethodMix(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json({ success: true, data: methodMix });
    } catch (error: any) {
      console.error('Error fetching method mix:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching method mix',
      });
    }
  };

  // ===================== CLIENT DETAILS =====================
  getClientDetails = async (req: AuthRequest, res: Response) => {
    try {
      const { patientId } = req.params;
      const details = await this.service.getFPClientDetails(patientId);
      res.json({ success: true, data: details });
    } catch (error: any) {
      console.error('Error fetching client details:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Client not found',
      });
    }
  };

  // ===================== GHS FP REPORT =====================
  getGHSReport = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await this.service.getGHSFPReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json({ success: true, data: report });
    } catch (error: any) {
      console.error('Error generating GHS report:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generating report',
      });
    }
  };
}