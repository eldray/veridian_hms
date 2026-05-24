// modules/admission/AdmissionController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AdmissionService } from './AdmissionService';
import { AuthRequest } from '../../middleware/authMiddleware';

export function createAdmissionController(prisma: any) {
  const admissionService = new AdmissionService(prisma);

  return {
    // ==============================
    // CREATE FORMAL ADMISSION
    // ==============================
    createAdmission: [
      body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
      body('admissionType').optional().isIn(['emergency', 'elective', 'transfer']),
      body('admissionSource').optional().isIn(['home', 'referral', 'another_facility', 'opd', 'emergency']),

      async (req: AuthRequest, res: Response): Promise<void> => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
          }

          const user = req.user;
          if (!user || !user.id) {
            res.status(401).json({ success: false, message: 'User authentication required' });
            return;
          }

          const result = await admissionService.createFormalAdmission(req.body, user.id);

          res.status(201).json({
            success: true,
            message: 'Formal admission created successfully',
            data: result
          });
        } catch (error) {
          console.error('Error creating admission:', error);
          res.status(500).json({
            success: false,
            message: 'Error creating admission',
            error: (error as Error).message
          });
        }
      }
    ],

    // ==============================
    // GET ALL ADMISSIONS
    // ==============================
    getAllAdmissions: async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const {
          status,
          wardId,
          patientId,
          dateFrom,
          dateTo,
          page = 1,
          limit = 50
        } = req.query;

        const result = await admissionService.getAllAdmissions({
          status: status as any,
          wardId: wardId as string,
          patientId: patientId as string,
          dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
          dateTo: dateTo ? new Date(dateTo as string) : undefined,
          page: parseInt(page as string),
          limit: parseInt(limit as string)
        });

        res.json({
          success: true,
          data: result.data,
          pagination: result.pagination
        });
      } catch (error) {
        console.error('Error fetching admissions:', error);
        res.status(500).json({
          success: false,
          message: 'Error fetching admissions',
          error: (error as Error).message
        });
      }
    },

    // ==============================
    // GET ADMISSION BY ID
    // ==============================
    getAdmissionById: async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const admission = await admissionService.getAdmissionById(req.params.id);

        res.json({
          success: true,
          data: admission
        });
      } catch (error) {
        console.error('Error fetching admission:', error);
        if ((error as Error).message === 'Admission not found') {
          res.status(404).json({ success: false, message: 'Admission not found' });
          return;
        }
        res.status(500).json({
          success: false,
          message: 'Error fetching admission',
          error: (error as Error).message
        });
      }
    },

    // ==============================
    // DISCHARGE ADMISSION
    // ==============================
    dischargeAdmission: [
      body('dischargeStatus').optional().isIn(['home', 'transfer', 'expired', 'against_medical_advice']),
      body('dischargeDate').optional().isISO8601(),

      async (req: AuthRequest, res: Response): Promise<void> => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
          }

          const user = req.user;
          if (!user || !user.id) {
            res.status(401).json({ success: false, message: 'User authentication required' });
            return;
          }

          const result = await admissionService.dischargeAdmission(req.params.id, req.body, user.id);

          res.json({
            success: true,
            message: result.message,
            dischargeDate: result.dischargeDate
          });
        } catch (error) {
          console.error('Error discharging admission:', error);
          const errorMessage = (error as Error).message;
          if (errorMessage.includes('already discharged')) {
            res.status(400).json({ success: false, message: errorMessage });
            return;
          }
          res.status(500).json({
            success: false,
            message: 'Error discharging admission',
            error: errorMessage
          });
        }
      }
    ],

    // ==============================
    // ADD DAILY NOTES
    // ==============================
    addDailyNotes: [
      body('notes').notEmpty().withMessage('Notes are required'),
      body('noteType').optional().isString(),

      async (req: AuthRequest, res: Response): Promise<void> => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
          }

          const user = req.user;
          if (!user || !user.id) {
            res.status(401).json({ success: false, message: 'User authentication required' });
            return;
          }

          const result = await admissionService.addDailyNotes(req.params.id, req.body, user.id);

          res.status(201).json({
            success: true,
            message: 'Daily notes added successfully',
            data: result.note
          });
        } catch (error) {
          console.error('Error adding daily notes:', error);
          res.status(500).json({
            success: false,
            message: 'Error adding daily notes',
            error: (error as Error).message
          });
        }
      }
    ],

    // ==============================
    // GET ADMISSION STATS
    // ==============================
    getAdmissionStats: async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const stats = await admissionService.getAdmissionStats();

        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        console.error('Error fetching admission stats:', error);
        res.status(500).json({
          success: false,
          message: 'Error fetching admission stats',
          error: (error as Error).message
        });
      }
    },

    // ==============================
    // DELETE ADMISSION
    // ==============================
    deleteAdmission: async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const result = await admissionService.deleteAdmission(req.params.id);

        res.json({
          success: true,
          message: result.message
        });
      } catch (error) {
        console.error('Error deleting admission:', error);
        const errorMessage = (error as Error).message;

        if (errorMessage.includes('Cannot delete active admission')) {
          res.status(400).json({ success: false, message: errorMessage });
          return;
        }
        if (errorMessage.includes('not found')) {
          res.status(404).json({ success: false, message: errorMessage });
          return;
        }

        res.status(500).json({
          success: false,
          message: 'Error deleting admission',
          error: errorMessage
        });
      }
    }
  };
}