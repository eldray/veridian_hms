// controllers/hospitalController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, validationResult } from 'express-validator';

const prisma = new PrismaClient();

// ==============================
// GET ALL HOSPITALS
// ==============================
export const getHospitals = async (req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(hospitals);
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ message: 'Error fetching hospitals', error });
  }
};

// ==============================
// GET HOSPITAL BY ID
// ==============================
export const getHospitalById = async (req: Request, res: Response) => {
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id }
    });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.json(hospital);
  } catch (error) {
    console.error('Error fetching hospital:', error);
    res.status(500).json({ message: 'Error fetching hospital', error });
  }
};

// ==============================
// CREATE HOSPITAL
// ==============================
export const createHospital = [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('nhisFacilityCode').notEmpty().withMessage('NHIS facility code is required'),
  body('nhisFacilityType')
    .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
    .withMessage('Valid NHIS facility type is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hospitalData = {
        ...req.body,
        nhisFacilityCode: req.body.nhisFacilityCode.toUpperCase(),
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      const hospital = await prisma.hospital.create({
         hospitalData
      });

      res.status(201).json(hospital);
    } catch (error: any) {
      console.error('Error creating hospital:', error);

      // Handle duplicate NHIS facility code (Prisma unique constraint violation)
      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ message: 'Error creating hospital', error: error.message });
    }
  }
];

// ==============================
// UPDATE HOSPITAL
// ==============================
export const updateHospital = [
  body('name').optional().notEmpty().withMessage('Hospital name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('nhisFacilityType')
    .optional()
    .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
    .withMessage('Valid NHIS facility type is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updateData = { ...req.body };
      if (req.body.nhisFacilityCode) {
        updateData.nhisFacilityCode = req.body.nhisFacilityCode.toUpperCase();
      }

      const hospital = await prisma.hospital.update({
        where: { id: req.params.id },
        data: updateData
      });

      res.json(hospital);
    } catch (error: any) {
      console.error('Error updating hospital:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Hospital not found' });
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ message: 'Error updating hospital', error: error.message });
    }
  }
];

// ==============================
// DELETE HOSPITAL
// ==============================
export const deleteHospital = async (req: Request, res: Response) => {
  try {
    const hospital = await prisma.hospital.delete({
      where: { id: req.params.id }
    });

    res.json({
      message: 'Hospital deleted successfully',
      deletedHospital: {
        id: hospital.id,
        name: hospital.name,
        nhisFacilityCode: hospital.nhisFacilityCode
      }
    });
  } catch (error: any) {
    console.error('Error deleting hospital:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    res.status(500).json({ message: 'Error deleting hospital', error: error.message });
  }
};

// ==============================
// GET NHIS SETTINGS (Active Hospital)
// ==============================
export const getHospitalNHISSettings = async (req: Request, res: Response) => {
  try {
    const hospital = await prisma.hospital.findFirst({
      where: { isActive: true }
    });

    if (!hospital) {
      return res.status(404).json({ message: 'No active hospital found' });
    }

    const nhisSettings = {
      name: hospital.name,
      nhisFacilityCode: hospital.nhisFacilityCode,
      nhisFacilityType: hospital.nhisFacilityType,
      nhisAccreditationNumber: hospital.nhisAccreditationNumber,
      nhisAccreditationDate: hospital.nhisAccreditationDate,
      nhisAccreditationExpiry: hospital.nhisAccreditationExpiry,
      nhisContactPerson: hospital.nhisContactPerson,
      nhisContactPhone: hospital.nhisContactPhone,
      nhisContactEmail: hospital.nhisContactEmail,
      address: hospital.address,
      phone: hospital.phone,
      email: hospital.email
    };

    res.json(nhisSettings);
  } catch (error) {
    console.error('Error fetching hospital NHIS settings:', error);
    res.status(500).json({ message: 'Error fetching hospital NHIS settings', error });
  }
};

// ==============================
// UPDATE NHIS SETTINGS (Active Hospital)
// ==============================
export const updateHospitalNHISSettings = [
  body('nhisFacilityCode').notEmpty().withMessage('NHIS facility code is required'),
  body('nhisFacilityType')
    .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
    .withMessage('Valid facility type is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const hospital = await prisma.hospital.update({
        where: { isActive: true },
        data: {
          ...req.body,
          nhisFacilityCode: req.body.nhisFacilityCode.toUpperCase()
        }
      });

      res.json({
        message: 'Hospital NHIS settings updated successfully',
        hospital: {
          name: hospital.name,
          nhisFacilityCode: hospital.nhisFacilityCode,
          nhisFacilityType: hospital.nhisFacilityType,
          nhisAccreditationNumber: hospital.nhisAccreditationNumber,
          nhisAccreditationDate: hospital.nhisAccreditationDate,
          nhisAccreditationExpiry: hospital.nhisAccreditationExpiry
        }
      });
    } catch (error: any) {
      console.error('Error updating hospital NHIS settings:', error);

      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'No active hospital found' });
      }

      if (error.code === 'P2002' && error.meta?.target?.includes('nhisFacilityCode')) {
        return res.status(400).json({
          message: 'NHIS facility code already exists'
        });
      }

      res.status(500).json({ message: 'Error updating hospital NHIS settings', error: error.message });
    }
  }
];