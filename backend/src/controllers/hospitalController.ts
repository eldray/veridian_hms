import { Request, Response } from 'express';
import HospitalModel from '../models/Hospital';
import { body, validationResult } from 'express-validator';

export const getHospitals = async (req: Request, res: Response) => {
  const hospitals = await HospitalModel.find();
  res.json(hospitals);
};

export const createHospital = [
  body('name').notEmpty().withMessage('Name required'),
  body('address').notEmpty(),
  // ... other validations
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const hospital = await HospitalModel.create(req.body);
    res.status(201).json(hospital);
  }
];

export const updateHospital = async (req: Request, res: Response) => {
  const hospital = await HospitalModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  res.json(hospital);
};

// Similar for delete if needed
