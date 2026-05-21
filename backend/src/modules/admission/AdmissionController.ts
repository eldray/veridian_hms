// modules/admission/AdmissionController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { AdmissionService } from './AdmissionService';
import { AuthRequest } from '../../middleware/authMiddleware';

export function createAdmissionController(prisma: PrismaClient) {
  const admissionService = new AdmissionService(prisma);

  return {
    // ==============================
    // GET ALL ADMISSIONS WITH PAGINATION
    // ==============================
    getAdmissions: async (req: AuthRequest, res: Response) => {
      try {
        const {
          status,
          wardId,
          patientId,
          dateFrom,
          dateTo,
          page = 1,
          limit = 50,
        } = req.query;

        const where: any = {};

        if (status) where.status = status as string;
        if (wardId) where.wardId = wardId as string;
        if (patientId) where.patientId = patientId as string;

        if (dateFrom || dateTo) {
          where.admissionDate = {} as any;
          if (dateFrom) (where.admissionDate as any).gte = new Date(dateFrom as string);
          if (dateTo) (where.admissionDate as any).lte = new Date(dateTo as string);
        }

        const pageNum = Math.max(1, parseInt(page as string));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));

        const result = await admissionService.getAdmissions(where, pageNum, limitNum);

        res.json({
          success: true,
          data: result.admissions,
          pagination: result.pagination,
        });
      } catch (error) {
        console.error('Error fetching admissions:', error);
        res.status(500).json({
          success: false,
          message: 'Error fetching admissions',
          error: (error as Error).message,
        });
      }
    },

    // ==============================
    // CREATE NEW ADMISSION
    // ==============================
    createAdmission: [
      body('patientId').notEmpty().withMessage('Patient ID is required'),
      body('wardId').notEmpty().withMessage('Ward ID is required'),
      body('bedId').notEmpty().withMessage('Bed ID is required'),
      body('admittingDoctor').notEmpty().withMessage('Admitting doctor is required'),
      body('reasonForAdmission').notEmpty().withMessage('Reason for admission is required'),
      body('primaryDiagnosisId').notEmpty().withMessage('Primary diagnosis ID is required'),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          if (!user || !user.id) {
            return res.status(401).json({ success: false, message: 'User authentication required' });
          }

          const result = await admissionService.createAdmission(req.body, user);

          res.status(201).json({
            success: true,
            message: 'Admission created successfully',
            data: result.admission,
            relationship: result.relationship,
          });
        } catch (error) {
          console.error('Error creating admission:', error);
          const errorMessage = (error as Error).message;

          if (
            errorMessage.includes('not available') ||
            errorMessage.includes('not found') ||
            errorMessage.includes('already has an active admission')
          ) {
            return res.status(400).json({ success: false, message: errorMessage });
          }

          res.status(500).json({
            success: false,
            message: 'Error creating admission',
            error: errorMessage,
          });
        }
      },
    ],

    // ==============================
    // GET ADMISSION BY ID
    // ==============================
    getAdmissionById: async (req: AuthRequest, res: Response) => {
      try {
        const admission = await admissionService.getAdmissionById(req.params.id);
        res.json({
          success: true,
          data: admission,
        });
      } catch (error) {
        console.error('Error fetching admission:', error);
        if ((error as Error).message === 'Admission not found') {
          return res.status(404).json({ success: false, message: 'Admission not found' });
        }
        res.status(500).json({
          success: false,
          message: 'Error fetching admission',
          error: (error as Error).message,
        });
      }
    },

    // ==============================
    // ADD SECONDARY DIAGNOSIS TO ADMISSION
    // ==============================
    addSecondaryDiagnosis: [
      body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
      body('diagnosisType')
        .isIn(['additional', 'provisional'])
        .withMessage('Diagnosis type must be additional or provisional'),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          const result = await admissionService.addSecondaryDiagnosis(req.params.id, req.body, user);

          res.status(201).json({
            success: true,
            message: 'Secondary diagnosis added successfully',
            data: result.diagnosis,
          });
        } catch (error) {
          console.error('Error adding secondary diagnosis:', error);
          res.status(500).json({
            success: false,
            message: 'Error adding secondary diagnosis',
            error: (error as Error).message,
          });
        }
      },
    ],

    // ==============================
    // REMOVE DIAGNOSIS FROM ADMISSION
    // ==============================
    removeDiagnosis: async (req: AuthRequest, res: Response) => {
      try {
        const { diagnosisRecordId } = req.params;
        const result = await admissionService.removeDiagnosis(req.params.id, diagnosisRecordId);

        res.json({
          success: true,
          message: result.message,
        });
      } catch (error) {
        console.error('Error removing diagnosis:', error);
        res.status(500).json({
          success: false,
          message: 'Error removing diagnosis',
          error: (error as Error).message,
        });
      }
    },

    // ==============================
    // UPDATE PRIMARY DIAGNOSIS
    // ==============================
    updatePrimaryDiagnosis: [
      body('primaryDiagnosisId').notEmpty().withMessage('Primary diagnosis ID is required'),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          const result = await admissionService.updatePrimaryDiagnosis(req.params.id, req.body, user);

          res.json({
            success: true,
            message: result.message,
          });
        } catch (error) {
          console.error('Error updating primary diagnosis:', error);
          res.status(500).json({
            success: false,
            message: 'Error updating primary diagnosis',
            error: (error as Error).message,
          });
        }
      },
    ],

    // ==============================
    // DISCHARGE PATIENT
    // ==============================
    dischargePatient: [
      body('dischargeStatus').optional().isString(),
      body('conditionAtDischarge').optional().isString(),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          const result = await admissionService.dischargePatient(req.params.id, req.body, user);

          res.json({
            success: true,
            message: result.message,
          });
        } catch (error) {
          console.error('Error discharging patient:', error);
          const errorMessage = (error as Error).message;

          if (errorMessage.includes('already discharged')) {
            return res.status(400).json({ success: false, message: errorMessage });
          }

          res.status(500).json({
            success: false,
            message: 'Error discharging patient',
            error: errorMessage,
          });
        }
      },
    ],

    // ==============================
    // ADD DAILY NOTES
    // ==============================
    addDailyNotes: [
      body('notes').notEmpty().withMessage('Notes are required'),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          const result = await admissionService.addDailyNotes(req.params.id, req.body, user);

          res.status(201).json({
            success: true,
            message: 'Daily notes added successfully',
            data: result.note,
          });
        } catch (error) {
          console.error('Error adding daily notes:', error);
          res.status(500).json({
            success: false,
            message: 'Error adding daily notes',
            error: (error as Error).message,
          });
        }
      },
    ],

    // ==============================
    // GET ADMISSION STATS
    // ==============================
    getAdmissionStats: async (req: AuthRequest, res: Response) => {
      try {
        const stats = await admissionService.getAdmissionStats();
        res.json({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error('Error fetching admission stats:', error);
        res.status(500).json({
          success: false,
          message: 'Error fetching admission stats',
          error: (error as Error).message,
        });
      }
    },

    // ==============================
    // GET ADMISSIONS BY PATIENT ID
    // ==============================
    getAdmissionsByPatientId: async (req: AuthRequest, res: Response) => {
      try {
        const { patientId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        
        const result = await admissionService.getAdmissionsByPatientId(
          patientId,
          parseInt(page as string),
          parseInt(limit as string)
        );
        
        res.json({
          success: true,
          data: result.admissions,
          pagination: result.pagination,
        });
      } catch (error) {
        console.error('Error fetching admissions by patient ID:', error);
        res.status(500).json({
          success: false,
          message: 'Error fetching admissions by patient ID',
          error: (error as Error).message,
        });
      }
    },

    // ==============================
    // DELETE ADMISSION
    // ==============================
    deleteAdmission: async (req: AuthRequest, res: Response) => {
      try {
        const result = await admissionService.deleteAdmission(req.params.id);
        res.json({
          success: true,
          message: result.message,
        });
      } catch (error) {
        console.error('Error deleting admission:', error);
        const errorMessage = (error as Error).message;

        if (errorMessage.includes('Cannot delete an active admission')) {
          return res.status(400).json({ success: false, message: errorMessage });
        }
        if (errorMessage.includes('not found')) {
          return res.status(404).json({ success: false, message: errorMessage });
        }

        res.status(500).json({
          success: false,
          message: 'Error deleting admission',
          error: errorMessage,
        });
      }
    },

    // ==============================
    // UPDATE ADMISSION
    // ==============================
    updateAdmission: [
      body('wardId').optional().isString(),
      body('bedId').optional().isString(),
      body('admittingDoctor').optional().isString(),

      async (req: AuthRequest, res: Response) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
          }

          const user = req.user;
          const result = await admissionService.updateAdmission(req.params.id, req.body, user);

          res.json({
            success: true,
            message: 'Admission updated successfully',
            data: result.admission,
          });
        } catch (error) {
          console.error('Error updating admission:', error);
          res.status(500).json({
            success: false,
            message: 'Error updating admission',
            error: (error as Error).message,
          });
        }
      },
    ],
  };
}

// ✅ Default export for backward compatibility
export default function AdmissionRoutes(prisma: PrismaClient) {
  const controller = createAdmissionController(prisma);
  const router = require('express').Router();
  
  router.get('/', controller.getAdmissions);
  router.get('/stats', controller.getAdmissionStats);
  router.get('/patient/:patientId', controller.getAdmissionsByPatientId);
  router.get('/:id', controller.getAdmissionById);
  router.post('/', controller.createAdmission);
  router.put('/:id', controller.updateAdmission);
  router.delete('/:id', controller.deleteAdmission);
  router.post('/:id/discharge', controller.dischargePatient);
  router.post('/:id/diagnoses/secondary', controller.addSecondaryDiagnosis);
  router.delete('/:id/diagnoses/:diagnosisRecordId', controller.removeDiagnosis);
  router.put('/:id/diagnoses/primary', controller.updatePrimaryDiagnosis);
  router.post('/:id/notes', controller.addDailyNotes);
  
  return router;
}