import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import VitalsModel, { IVitals } from '../models/Vitals';
import AttendanceModel from '../models/Attendance';

export const getVitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const vitals = await VitalsModel.find()
      .populate('attendanceId')
      .populate('patientId', 'fullName folderNumber')
      .populate('recordedBy', 'fullName role')
      .sort({ recordedAt: -1 });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vitals', error });
  }
};

export const getVitalsByAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const vitals = await VitalsModel.find({ attendanceId: req.params.attendanceId })
      .populate('patientId', 'fullName folderNumber')
      .populate('recordedBy', 'fullName role')
      .sort({ recordedAt: -1 });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vitals', error });
  }
};

export const getVitalsByPatient = async (req: Request, res: Response): Promise<void> => {
  try {
    const vitals = await VitalsModel.find({ patientId: req.params.patientId })
      .populate('attendanceId', 'attendanceNumber dateTime')
      .populate('recordedBy', 'fullName role')
      .sort({ recordedAt: -1 })
      .limit(50);
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient vitals', error });
  }
};

export const createVitals = [
  body('attendanceId').notEmpty().withMessage('Attendance ID is required'),
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('recordedBy').notEmpty().withMessage('Recorded by is required'),

  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const attendance = await AttendanceModel.findById(req.body.attendanceId);
      if (!attendance) {
        res.status(404).json({ message: 'Attendance not found' });
        return;
      }

      const vitals = await VitalsModel.create(req.body);
      
      await AttendanceModel.findByIdAndUpdate(req.body.attendanceId, {
        $push: {
          vitals: {
            vitalId: vitals._id,
            recordedAt: vitals.recordedAt,
            recordedBy: vitals.recordedBy
          }
        }
      });

      const populatedVitals = await VitalsModel.findById(vitals._id)
        .populate('attendanceId')
        .populate('patientId', 'fullName folderNumber')
        .populate('recordedBy', 'fullName role');

      res.status(201).json(populatedVitals);
    } catch (error) {
      console.error('Error creating vitals:', error);
      res.status(500).json({ message: 'Error creating vitals', error });
    }
  }
];

export const updateVitals = async (req: Request, res: Response): Promise<void> => {
  try {
    const vitals = await VitalsModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('attendanceId')
    .populate('patientId', 'fullName folderNumber')
    .populate('recordedBy', 'fullName role');

    if (!vitals) {
      res.status(404).json({ message: 'Vitals record not found' });
      return;
    }

    res.json(vitals);
  } catch (error) {
    res.status(500).json({ message: 'Error updating vitals', error });
  }
};
