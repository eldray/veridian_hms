// modules/admission/AdmissionController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AdmissionService } from './AdmissionService';
import { AdmissionRequest } from './types';

const admissionService = new AdmissionService();

// ==============================
// GET ALL ADMISSIONS
// ==============================
export const getAdmissions = async (req: Request, res: Response) => {
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

    const result = await admissionService.getAdmissions(
      where,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching admissions:', error);
    res.status(500).json({
      message: 'Error fetching admissions',
      error: (error as Error).message,
    });
  }
};

// ==============================
// CREATE NEW ADMISSION
// ==============================
export const createAdmission = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admittingDoctor').notEmpty().withMessage('Admitting doctor is required'),
  body('reasonForAdmission').notEmpty().withMessage('Reason for admission is required'),
  body('primaryDiagnosisId').notEmpty().withMessage('Primary diagnosis ID is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ message: 'User authentication required' });
      }

      const result = await admissionService.createAdmission(req.body, user);

      res.status(201).json({
        message: 'Admission created successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error creating admission:', error);
      const errorMessage = (error as Error).message;

      if (
        errorMessage.includes('not available') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('already has an active admission')
      ) {
        return res.status(400).json({ message: errorMessage });
      }

      res.status(500).json({
        message: 'Error creating admission',
        error: errorMessage,
      });
    }
  },
];

// ==============================
// GET ADMISSION BY ID
// ==============================
export const getAdmissionById = async (req: Request, res: Response) => {
  try {
    const admission = await admissionService.getAdmissionById(req.params.id);
    res.json(admission);
  } catch (error) {
    console.error('Error fetching admission:', error);
    if ((error as Error).message === 'Admission not found') {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.status(500).json({
      message: 'Error fetching admission',
      error: (error as Error).message,
    });
  }
};

// ==============================
// ADD SECONDARY DIAGNOSIS TO ADMISSION
// ==============================
export const addSecondaryDiagnosis = [
  body('diagnosisId').notEmpty().withMessage('Diagnosis ID is required'),
  body('diagnosisType')
    .isIn(['additional', 'provisional'])
    .withMessage('Diagnosis type must be additional or provisional'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;
      const result = await admissionService.addSecondaryDiagnosis(req.params.id, req.body, user);

      res.status(201).json({
        message: 'Secondary diagnosis added successfully',
        ...result,
      });
    } catch (error) {
      console.error('Error adding secondary diagnosis:', error);
      res.status(500).json({
        message: 'Error adding secondary diagnosis',
        error: (error as Error).message,
      });
    }
  },
];

// ==============================
// REMOVE DIAGNOSIS FROM ADMISSION
// ==============================
export const removeDiagnosis = async (req: Request, res: Response) => {
  try {
    const { diagnosisRecordId } = req.params;
    const result = await admissionService.removeDiagnosis(req.params.id, diagnosisRecordId);

    res.json(result);
  } catch (error) {
    console.error('Error removing diagnosis:', error);
    res.status(500).json({
      message: 'Error removing diagnosis',
      error: (error as Error).message,
    });
  }
};

// ==============================
// UPDATE PRIMARY DIAGNOSIS
// ==============================
export const updatePrimaryDiagnosis = [
  body('primaryDiagnosisId').notEmpty().withMessage('Primary diagnosis ID is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;
      const result = await admissionService.updatePrimaryDiagnosis(req.params.id, req.body, user);

      res.json(result);
    } catch (error) {
      console.error('Error updating primary diagnosis:', error);
      res.status(500).json({
        message: 'Error updating primary diagnosis',
        error: (error as Error).message,
      });
    }
  },
];

// ==============================
// DISCHARGE PATIENT
// ==============================
export const dischargePatient = [
  body('dischargeStatus').optional().isString(),
  body('conditionAtDischarge').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;
      const result = await admissionService.dischargePatient(req.params.id, req.body, user);

      res.json(result);
    } catch (error) {
      console.error('Error discharging patient:', error);
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('already discharged')) {
        return res.status(400).json({ message: errorMessage });
      }

      res.status(500).json({
        message: 'Error discharging patient',
        error: errorMessage,
      });
    }
  },
];

// ==============================
// ADD DAILY NOTES
// ==============================
export const addDailyNotes = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = (req as any).user;
    const result = await admissionService.addDailyNotes(req.params.id, req.body, user);

    res.status(201).json(result);
  } catch (error) {
    console.error('Error adding daily notes:', error);
    res.status(500).json({
      message: 'Error adding daily notes',
      error: (error as Error).message,
    });
  }
};

// ==============================
// GET ADMISSION STATS
// ==============================
export const getAdmissionStats = async (req: Request, res: Response) => {
  try {
    const stats = await admissionService.getAdmissionStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({
      message: 'Error fetching admission stats',
      error: (error as Error).message,
    });
  }
};

// ==============================
// GET ADMISSIONS BY PATIENT ID
// ==============================
export const getAdmissionsByPatientId = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const admissions = await admissionService.getAdmissionsByPatientId(patientId);
    res.json(admissions);
  } catch (error) {
    console.error('Error fetching admissions by patient ID:', error);
    res.status(500).json({
      message: 'Error fetching admissions by patient ID',
      error: (error as Error).message,
    });
  }
};

// ==============================
// DELETE ADMISSION
// ==============================
export const deleteAdmission = async (req: Request, res: Response) => {
  try {
    const result = await admissionService.deleteAdmission(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting admission:', error);
    const errorMessage = (error as Error).message;

    if (errorMessage.includes('Cannot delete an active admission')) {
      return res.status(400).json({ message: errorMessage });
    }
    if (errorMessage.includes('not found')) {
      return res.status(404).json({ message: errorMessage });
    }

    res.status(500).json({
      message: 'Error deleting admission',
      error: errorMessage,
    });
  }
};

// ==============================
// UPDATE ADMISSION
// ==============================
export const updateAdmission = [
  body('wardId').optional().isString(),
  body('bedId').optional().isString(),
  body('admittingDoctor').optional().isString(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = (req as any).user;
      const result = await admissionService.updateAdmission(req.params.id, req.body, user);

      res.json(result);
    } catch (error) {
      console.error('Error updating admission:', error);
      res.status(500).json({
        message: 'Error updating admission',
        error: (error as Error).message,
      });
    }
  },
];
