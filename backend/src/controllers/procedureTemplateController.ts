// controllers/procedureTemplateController.ts
import { Request, Response } from 'express';
import ProcedureTemplateModel from '../models/ProcedureTemplate';
import { body, validationResult } from 'express-validator';

export const getProcedureTemplates = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const templates = await ProcedureTemplateModel.find(filter);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procedure templates', error });
  }
};

export const getProcedureTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await ProcedureTemplateModel.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procedure template', error });
  }
};

export const createProcedureTemplate = [
  body('name').notEmpty().withMessage('Procedure name is required'),
  body('code').notEmpty().withMessage('Procedure code is required'),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').isNumeric().withMessage('Cost price must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const templateData = {
        ...req.body,
        vatRate: req.body.vatRate || 0,
        duration: req.body.duration || 30,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        requiresAuthorization: req.body.requiresAuthorization || false
      };

      const template = await ProcedureTemplateModel.create(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating procedure template:', error);
      res.status(500).json({ message: 'Error creating procedure template', error });
    }
  }
];

export const updateProcedureTemplate = [
  body('name').optional().notEmpty().withMessage('Procedure name cannot be empty'),
  body('cashPrice').optional().isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').optional().isNumeric().withMessage('Cost price must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await ProcedureTemplateModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!template) {
        return res.status(404).json({ message: 'Procedure template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error updating procedure template:', error);
      res.status(500).json({ message: 'Error updating procedure template', error });
    }
  }
];

export const deleteProcedureTemplate = async (req: Request, res: Response) => {
  try {
    const template = await ProcedureTemplateModel.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Procedure template not found' });
    }

    res.json({ message: 'Procedure template deleted successfully' });
  } catch (error) {
    console.error('Error deleting procedure template:', error);
    res.status(500).json({ message: 'Error deleting procedure template', error });
  }
};
