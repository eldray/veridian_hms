// controllers/diagnosisController.ts
import { Request, Response } from 'express';
import DiagnosisModel from '../models/Diagnosis';
import { body, validationResult } from 'express-validator';

export const getDiagnoses = async (req: Request, res: Response) => {
  try {
    const diagnoses = await DiagnosisModel.find();
    res.json(diagnoses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diagnoses', error });
  }
};

export const getDiagnosisById = async (req: Request, res: Response) => {
  try {
    const diagnosis = await DiagnosisModel.findById(req.params.id);
    if (!diagnosis) return res.status(404).json({ message: 'Diagnosis not found' });
    res.json(diagnosis);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching diagnosis', error });
  }
};

export const createDiagnosis = [
  body('name').notEmpty().withMessage('Diagnosis name is required'),
  body('icdCode').notEmpty().withMessage('ICD code is required'),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').isNumeric().withMessage('Cost price must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const diagnosisData = {
        ...req.body,
        vatRate: req.body.vatRate || 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        requiresAuthorization: req.body.requiresAuthorization || false
      };

      const diagnosis = await DiagnosisModel.create(diagnosisData);
      res.status(201).json(diagnosis);
    } catch (error) {
      console.error('Error creating diagnosis:', error);
      res.status(500).json({ message: 'Error creating diagnosis', error });
    }
  }
];

export const updateDiagnosis = [
  body('name').optional().notEmpty().withMessage('Diagnosis name cannot be empty'),
  body('cashPrice').optional().isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').optional().isNumeric().withMessage('Cost price must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const diagnosis = await DiagnosisModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!diagnosis) {
        return res.status(404).json({ message: 'Diagnosis not found' });
      }

      res.json(diagnosis);
    } catch (error) {
      console.error('Error updating diagnosis:', error);
      res.status(500).json({ message: 'Error updating diagnosis', error });
    }
  }
];

export const deleteDiagnosis = async (req: Request, res: Response) => {
  try {
    const diagnosis = await DiagnosisModel.findByIdAndDelete(req.params.id);
    if (!diagnosis) {
      return res.status(404).json({ message: 'Diagnosis not found' });
    }

    res.json({ message: 'Diagnosis deleted successfully' });
  } catch (error) {
    console.error('Error deleting diagnosis:', error);
    res.status(500).json({ message: 'Error deleting diagnosis', error });
  }
};
