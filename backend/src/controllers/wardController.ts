// controllers/wardController.ts
import { Request, Response } from 'express';
import WardModel from '../models/Ward';
import BedModel from '../models/Bed';
import { body, validationResult } from 'express-validator';

export const getWards = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const filter: any = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const wards = await WardModel.find(filter);
    res.json(wards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wards', error });
  }
};

export const getWardById = async (req: Request, res: Response) => {
  try {
    const ward = await WardModel.findById(req.params.id);
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }
    res.json(ward);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ward', error });
  }
};

export const createWard = [
  body('wardName').notEmpty().withMessage('Ward name is required'),
  body('wardType').notEmpty().withMessage('Ward type is required'),
  body('totalBeds').isNumeric().withMessage('Total beds must be a number'),
  body('cashDailyRate').isNumeric().withMessage('Cash daily rate must be a number'),
  body('insuranceDailyRate').isNumeric().withMessage('Insurance daily rate must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const wardData = {
        ...req.body,
        vatRate: req.body.vatRate || 0,
        occupiedBeds: 0,
        isTaxable: req.body.isTaxable !== undefined ? req.body.isTaxable : true,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        requiresAuthorization: req.body.requiresAuthorization || false
      };

      const ward = await WardModel.create(wardData);
      res.status(201).json(ward);
    } catch (error) {
      console.error('Error creating ward:', error);
      res.status(500).json({ message: 'Error creating ward', error });
    }
  }
];

export const updateWard = [
  body('wardName').optional().notEmpty().withMessage('Ward name cannot be empty'),
  body('totalBeds').optional().isNumeric().withMessage('Total beds must be a number'),
  body('cashDailyRate').optional().isNumeric().withMessage('Cash daily rate must be a number'),
  body('insuranceDailyRate').optional().isNumeric().withMessage('Insurance daily rate must be a number'),
  body('vatRate').optional().isNumeric().withMessage('VAT rate must be a number'),
  
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const ward = await WardModel.findByIdAndUpdate(
        req.params.id, 
        req.body, 
        { new: true, runValidators: true }
      );
      
      if (!ward) {
        return res.status(404).json({ message: 'Ward not found' });
      }

      res.json(ward);
    } catch (error) {
      console.error('Error updating ward:', error);
      res.status(500).json({ message: 'Error updating ward', error });
    }
  }
];

export const deleteWard = async (req: Request, res: Response) => {
  try {
    const ward = await WardModel.findById(req.params.id);
    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Check if ward has beds
    const bedCount = await BedModel.countDocuments({ wardId: req.params.id });
    if (bedCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete ward with assigned beds. Please reassign or delete beds first.' 
      });
    }

    await WardModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ward deleted successfully' });
  } catch (error) {
    console.error('Error deleting ward:', error);
    res.status(500).json({ message: 'Error deleting ward', error });
  }
};
