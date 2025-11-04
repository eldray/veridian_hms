import { Request, Response } from 'express';
import BedModel from '../models/Bed';
import { body, validationResult } from 'express-validator';

export const getBeds = async (req: Request, res: Response) => {
  const beds = await BedModel.find();
  res.json(beds);
};

export const getBedById = async (req: Request, res: Response) => {
  const bed = await BedModel.findById(req.params.id);
  if (!bed) return res.status(404).json({ message: 'Bed not found' });
  res.json(bed);
};

export const createBed = [
  body('wardId').notEmpty(),
  body('bedNumber').notEmpty(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const bed = await BedModel.create(req.body);
    res.status(201).json(bed);
  }
];

export const updateBed = [
  body('isOccupied').optional().isBoolean(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const bed = await BedModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    res.json(bed);
  }
];

export const deleteBed = async (req: Request, res: Response) => {
  const bed = await BedModel.findByIdAndDelete(req.params.id);
  if (!bed) return res.status(404).json({ message: 'Bed not found' });

  if (bed.isOccupied) {
    return res.status(400).json({ message: 'Cannot delete occupied bed' });
  }

  res.json({ message: 'Bed deleted' });
};
