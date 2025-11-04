// controllers/patientController.ts
import { Request, Response } from 'express';
import PatientModel from '../models/Patient';
import { body, validationResult } from 'express-validator';

export const getPatients = async (req: Request, res: Response) => {
  try {
    const patients = await PatientModel.find().sort({ registeredAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patients', error });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  try {
    const patient = await PatientModel.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching patient', error });
  }
};

export const createPatient = [
  // Validation rules for BASIC INFO (required) - paymentMode is now optional
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('dateOfBirth').isDate().withMessage('Valid date of birth is required'),
  body('contact').notEmpty().withMessage('Contact number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('paymentMode').optional().isIn(['cash', 'nhis', 'private_insurance']).withMessage('Valid payment mode is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Validation errors:', errors.array());
        return res.status(400).json({ 
          errors: errors.array(),
          message: 'Validation failed' 
        });
      }

      // Parse additional info if provided
      let additionalInfo = {};
      if (req.body.additionalInfo) {
        additionalInfo = typeof req.body.additionalInfo === 'string' 
          ? JSON.parse(req.body.additionalInfo) 
          : req.body.additionalInfo;
      }

      // Parse insurance details if provided
      let insuranceDetails = undefined;
      if (req.body.insuranceDetails) {
        insuranceDetails = typeof req.body.insuranceDetails === 'string' 
          ? JSON.parse(req.body.insuranceDetails) 
          : req.body.insuranceDetails;
      }

      // Validate insurance details ONLY if payment mode is provided and is insurance
      if (req.body.paymentMode && req.body.paymentMode !== 'cash') {
        if (!insuranceDetails) {
          return res.status(400).json({ 
            message: 'Insurance details are required for insurance payment mode' 
          });
        }

        if (!insuranceDetails.insuranceNumber || !insuranceDetails.startDate || !insuranceDetails.endDate) {
          return res.status(400).json({ 
            message: 'Insurance number, start date, and end date are required for insurance patients' 
          });
        }

        // Validate insurance dates
        const startDate = new Date(insuranceDetails.startDate);
        const endDate = new Date(insuranceDetails.endDate);
        if (endDate <= startDate) {
          return res.status(400).json({ 
            message: 'Insurance end date must be after start date' 
          });
        }

        // Validate insurance provider for private insurance
        if (req.body.paymentMode === 'private_insurance' && !insuranceDetails.providerId) {
          return res.status(400).json({ 
            message: 'Insurance provider is required for private insurance' 
          });
        }
      }

      // Validate email format if provided
      if (additionalInfo.email && !isValidEmail(additionalInfo.email)) {
        return res.status(400).json({ 
          message: 'Please provide a valid email address' 
        });
      }

      const patientData = {
        ...req.body,
        additionalInfo,
        insuranceDetails,
        age: calculateAge(req.body.dateOfBirth),
        registeredBy: req.user?.fullName || req.user?.username || 'System',
        // Ensure dateOfBirth is properly converted
        dateOfBirth: new Date(req.body.dateOfBirth)
      };

      const patient = await PatientModel.create(patientData);
      res.status(201).json(patient);
    } catch (error) {
      console.error('❌ Error creating patient:', error);
      res.status(500).json({ 
        message: 'Error creating patient', 
        error: (error as Error).message 
      });
    }
  }
];

export const updatePatient = async (req: Request, res: Response) => {
  try {
    const patient = await PatientModel.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error updating patient', error });
  }
};

// Helper function to calculate age
function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age; 
}

// Helper function to validate email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
