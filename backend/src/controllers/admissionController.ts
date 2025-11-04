// controllers/admissionController.ts
import { Request, Response } from 'express';
import AdmissionModel from '../models/Admission';
import { body, validationResult } from 'express-validator';

export const getAdmissions = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    
    if (status) filter.status = status;

    const admissions = await AdmissionModel.find(filter)
      .populate('patientId', 'fullName folderNumber contact')
      .populate('wardId', 'wardName wardType cashDailyRate insuranceDailyRate')
      .populate('bedId', 'bedNumber')
      .sort({ admissionDate: -1 });
      
    res.json(admissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admissions', error });
  }
};

export const getAdmissionById = async (req: Request, res: Response) => {
  try {
    const admission = await AdmissionModel.findById(req.params.id)
      .populate('patientId')
      .populate('wardId')
      .populate('bedId');
      
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }
    res.json(admission);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admission', error });
  }
};

export const createAdmission = [
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('wardId').notEmpty().withMessage('Ward ID is required'),
  body('bedId').notEmpty().withMessage('Bed ID is required'),
  body('admittingDoctor').notEmpty().withMessage('Admitting doctor is required'),
  body('reasonForAdmission').notEmpty().withMessage('Reason for admission is required'),
  body('diagnosis').notEmpty().withMessage('Diagnosis is required'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const admissionData = {
        ...req.body,
        createdBy: (req as any).user._id
      };

      const admission = await AdmissionModel.create(admissionData);
      
      const populatedAdmission = await AdmissionModel.findById(admission._id)
        .populate('patientId', 'fullName folderNumber contact')
        .populate('wardId', 'wardName wardType')
        .populate('bedId', 'bedNumber');
        
      res.status(201).json(populatedAdmission);
    } catch (error) {
      console.error('Error creating admission:', error);
      res.status(500).json({ message: 'Error creating admission', error });
    }
  }
];

export const updateAdmission = [
  body('status').optional().isIn(['admitted', 'discharged', 'transferred']).withMessage('Invalid status'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const admission = await AdmissionModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      )
      .populate('patientId', 'fullName folderNumber contact')
      .populate('wardId', 'wardName wardType')
      .populate('bedId', 'bedNumber');
      
      if (!admission) {
        return res.status(404).json({ message: 'Admission not found' });
      }

      res.json(admission);
    } catch (error) {
      console.error('Error updating admission:', error);
      res.status(500).json({ message: 'Error updating admission', error });
    }
  }
];

export const deleteAdmission = async (req: Request, res: Response) => {
  try {
    const admission = await AdmissionModel.findByIdAndDelete(req.params.id);
    if (!admission) {
      return res.status(404).json({ message: 'Admission not found' });
    }

    res.json({ message: 'Admission deleted successfully' });
  } catch (error) {
    console.error('Error deleting admission:', error);
    res.status(500).json({ message: 'Error deleting admission', error });
  }
};
