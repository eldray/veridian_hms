// controllers/scanTemplateController.ts
import { Request, Response } from 'express';
import ScanTemplateModel from '../models/ScanTemplate';
import { body, validationResult } from 'express-validator';

export const getScanTemplates = async (req: Request, res: Response) => {
  try {
    const { isActive, category, bodyPart } = req.query;
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (bodyPart) {
      filter.bodyPart = bodyPart;
    }

    const templates = await ScanTemplateModel.find(filter);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching scan templates:', error);
    res.status(500).json({ message: 'Error fetching scan templates', error });
  }
};

export const getScanTemplateById = async (req: Request, res: Response) => {
  try {
    const template = await ScanTemplateModel.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Scan template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Error fetching scan template:', error);
    res.status(500).json({ message: 'Error fetching scan template', error });
  }
};

export const createScanTemplate = [
  body('name').notEmpty().withMessage('Scan name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isIn(['xray', 'ultrasound', 'ct-scan', 'mri', 'fluoroscopy', 'mammography', 'other']).withMessage('Invalid category'),
  body('bodyPart').isIn(['head', 'chest', 'abdomen', 'pelvis', 'spine', 'extremities', 'other']).withMessage('Invalid body part'),
  body('cashPrice').isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').isNumeric().withMessage('Cost price must be a number'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
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
        requiresAuthorization: req.body.requiresAuthorization || false,
        contrastRequired: req.body.contrastRequired || false
      };

      const template = await ScanTemplateModel.create(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error('Error creating scan template:', error);
      res.status(500).json({ message: 'Error creating scan template', error });
    }
  }
];

export const updateScanTemplate = [
  body('name').optional().notEmpty().withMessage('Scan name cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isIn(['xray', 'ultrasound', 'ct-scan', 'mri', 'fluoroscopy', 'mammography', 'other']).withMessage('Invalid category'),
  body('bodyPart').optional().isIn(['head', 'chest', 'abdomen', 'pelvis', 'spine', 'extremities', 'other']).withMessage('Invalid body part'),
  body('cashPrice').optional().isNumeric().withMessage('Cash price must be a number'),
  body('insurancePrice').optional().isNumeric().withMessage('Insurance price must be a number'),
  body('costPrice').optional().isNumeric().withMessage('Cost price must be a number'),
  body('duration').optional().isNumeric().withMessage('Duration must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const template = await ScanTemplateModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!template) {
        return res.status(404).json({ message: 'Scan template not found' });
      }

      res.json(template);
    } catch (error) {
      console.error('Error updating scan template:', error);
      res.status(500).json({ message: 'Error updating scan template', error });
    }
  }
];

export const deleteScanTemplate = async (req: Request, res: Response) => {
  try {
    const template = await ScanTemplateModel.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Scan template not found' });
    }

    res.json({ message: 'Scan template deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan template:', error);
    res.status(500).json({ message: 'Error deleting scan template', error });
  }
};

export const getScanCategories = async (req: Request, res: Response) => {
  try {
    const categories = await ScanTemplateModel.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error('Error fetching scan categories:', error);
    res.status(500).json({ message: 'Error fetching scan categories', error });
  }
};

export const getScanBodyParts = async (req: Request, res: Response) => {
  try {
    const bodyParts = await ScanTemplateModel.distinct('bodyPart');
    res.json(bodyParts);
  } catch (error) {
    console.error('Error fetching scan body parts:', error);
    res.status(500).json({ message: 'Error fetching scan body parts', error });
  }
};
