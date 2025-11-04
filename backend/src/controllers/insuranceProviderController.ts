import { Request, Response } from 'express';
import InsuranceProviderModel from '../models/InsuranceProvider';
import { body, validationResult } from 'express-validator';

export const getInsuranceProviders = async (req: Request, res: Response) => {
  try {
    const providers = await InsuranceProviderModel.find({ isActive: true }).sort({ name: 1 });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching insurance providers', error });
  }
};

export const getInsuranceProviderById = async (req: Request, res: Response) => {
  try {
    const provider = await InsuranceProviderModel.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Insurance provider not found' });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching insurance provider', error });
  }
};

export const createInsuranceProvider = [
  body('name').notEmpty().withMessage('Name is required'),
  body('type').isIn(['nhis', 'private']).withMessage('Valid type is required'),
  body('coveragePercentage').isNumeric().withMessage('Coverage percentage must be a number'),
  body('startDate').isDate().withMessage('Valid start date is required'),
  body('expiryDate').isDate().withMessage('Valid expiry date is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate dates
      const startDate = new Date(req.body.startDate);
      const expiryDate = new Date(req.body.expiryDate);
      
      if (expiryDate <= startDate) {
        return res.status(400).json({ 
          message: 'Expiry date must be after start date' 
        });
      }

      const provider = await InsuranceProviderModel.create(req.body);
      res.status(201).json(provider);
    } catch (error) {
      res.status(500).json({ message: 'Error creating insurance provider', error });
    }
  }
];

export const updateInsuranceProvider = async (req: Request, res: Response) => {
  try {
    const provider = await InsuranceProviderModel.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!provider) return res.status(404).json({ message: 'Insurance provider not found' });
    res.json(provider);
  } catch (error) {
    res.status(500).json({ message: 'Error updating insurance provider', error });
  }
};

export const deleteInsuranceProvider = async (req: Request, res: Response) => {
  try {
    const provider = await InsuranceProviderModel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!provider) return res.status(404).json({ message: 'Insurance provider not found' });
    res.json({ message: 'Insurance provider deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating insurance provider', error });
  }
};
