// controllers/patientController.ts - UPDATED
import { Request, Response } from 'express';
import PatientModel from '../models/Patient';
import { body, validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

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

// NEW: Image upload endpoint
export const uploadPatientImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const patientId = req.params.id;
    
    // Find the patient first
    const patient = await PatientModel.findById(patientId);
    if (!patient) {
      // Delete the uploaded file if patient not found
      await unlinkAsync(req.file.path);
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Generate the image URL (relative path)
    const imageUrl = `/uploads/patients/${req.file.filename}`;

    // Update patient with new image URL
    const updatedPatient = await PatientModel.findByIdAndUpdate(
      patientId,
      { imageUrl },
      { new: true }
    );

    // If patient had a previous image, delete it
    if (patient.imageUrl && patient.imageUrl.startsWith('/uploads/patients/')) {
      const oldFilename = path.basename(patient.imageUrl);
      const oldPath = path.join(process.cwd(), 'uploads', 'patients', oldFilename);
      
      try {
        await unlinkAsync(oldPath);
      } catch (error) {
        console.warn('Could not delete old image:', error);
      }
    }

    res.json({
      imageUrl,
      patient: updatedPatient
    });

  } catch (error) {
    console.error('❌ Error uploading patient image:', error);
    
    // Delete the uploaded file if there was an error
    if (req.file) {
      try {
        await unlinkAsync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      message: 'Error uploading image', 
      error: (error as Error).message 
    });
  }
};

// NEW: Base64 image upload endpoint (alternative method)
export const uploadPatientImageBase64 = async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    const patientId = req.params.id;

    if (!image) {
      return res.status(400).json({ message: 'No image data provided' });
    }

    // Find the patient first
    const patient = await PatientModel.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Extract base64 data and extension
    const matches = image.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Invalid base64 image data' });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (5MB max)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'Image too large. Maximum size is 5MB.' });
    }

    // Generate filename
    const timestamp = Date.now();
    const filename = `patient-${patientId}-${timestamp}.${extension}`;
    const filePath = path.join(process.cwd(), 'uploads', 'patients', filename);

    // Save file
    await writeFileAsync(filePath, buffer);

    // Generate the image URL
    const imageUrl = `/uploads/patients/${filename}`;

    // Update patient with new image URL
    const updatedPatient = await PatientModel.findByIdAndUpdate(
      patientId,
      { imageUrl },
      { new: true }
    );

    // If patient had a previous image, delete it
    if (patient.imageUrl && patient.imageUrl.startsWith('/uploads/patients/')) {
      const oldFilename = path.basename(patient.imageUrl);
      const oldPath = path.join(process.cwd(), 'uploads', 'patients', oldFilename);
      
      try {
        await unlinkAsync(oldPath);
      } catch (error) {
        console.warn('Could not delete old image:', error);
      }
    }

    res.json({
      imageUrl,
      patient: updatedPatient
    });

  } catch (error) {
    console.error('❌ Error uploading patient image (base64):', error);
    res.status(500).json({ 
      message: 'Error uploading image', 
      error: (error as Error).message 
    });
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