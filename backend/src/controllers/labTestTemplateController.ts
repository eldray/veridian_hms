// controllers/labTestTemplateController.ts
import { Request, Response } from 'express';
import LabTestTemplateModel from '../models/LabTestTemplate';
import { body, validationResult } from 'express-validator';

export const getLabTestTemplates = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const templates = await LabTestTemplateModel.find(filter);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab test templates', error });
  }
};

export const getLabTestTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await LabTestTemplateModel.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Lab test template not found' });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab test template', error });
  }
};

export const createLabTestTemplate = [
  body('name').notEmpty().withMessage('Test name is required'),
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

      const templateData = {
        ...req.body,
        vatRate: req.body.vatRate || 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        requiresAuthorization: req.body.requiresAuthorization || false
      };

      const template = await LabTestTemplateModel.create(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating lab test template:', error);
      res.status(500).json({ message: 'Error creating lab test template', error });
    }
  }
];

export const updateLabTestTemplate = [
  body('name').optional().notEmpty().withMessage('Test name cannot be empty'),
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

      const template = await LabTestTemplateModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!template) {
        return res.status(404).json({ message: 'Lab test template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error updating lab test template:', error);
      res.status(500).json({ message: 'Error updating lab test template', error });
    }
  }
];

export const deleteLabTestTemplate = async (req: Request, res: Response) => {
  try {
    const template = await LabTestTemplateModel.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Lab test template not found' });
    }

    res.json({ message: 'Lab test template deleted successfully' });
  } catch (error) {
    console.error('Error deleting lab test template:', error);
    res.status(500).json({ message: 'Error deleting lab test template', error });
  }
};
