// controllers/adminController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// Update user (admin only)
export const updateUser = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  body('licenseNumber').optional().trim(),
  body('specialization').optional().trim(),
  body('role').optional().isIn(['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts']),
  body('isActive').optional().isBoolean(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, phone, licenseNumber, specialization, role, isActive } = req.body;
      const userId = req.params.id;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prepare update data
      const updateData: any = { updatedAt: new Date() };
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
      if (specialization !== undefined) updateData.specialization = specialization;
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Validate medical staff requirements
      if (role && ['doctor', 'nurse', 'midwife'].includes(role) && !updateData.licenseNumber) {
        return res.status(400).json({ 
          message: `License number is required for ${role} role` 
        });
      }

      if (role === 'doctor' && !updateData.specialization) {
        return res.status(400).json({ 
          message: 'Specialization is required for doctor role' 
        });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          licenseNumber: true,
          specialization: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        return res.status(400).json({ 
          message: 'Email already exists' 
        });
      }
      
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
];

// Deactivate user (admin only)
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: false,
        updatedAt: new Date()
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error deactivating user' });
  }
};

// Get hospital details
export const getHospitalDetails = async (req: Request, res: Response) => {
  try {
    // Since we only have one hospital, get the first one
    const hospital = await prisma.hospital.findFirst();
    
    res.json(hospital);
  } catch (error) {
    console.error('Get hospital details error:', error);
    res.status(500).json({ message: 'Server error fetching hospital details' });
  }
};

// Update hospital details
export const updateHospitalDetails = [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, address, phone, email, imageUrl } = req.body;

      // Since we only have one hospital, update the first one or create if doesn't exist
      let hospital = await prisma.hospital.findFirst();
      
      if (hospital) {
        hospital = await prisma.hospital.update({
          where: { id: hospital.id },
          data: { 
            name, 
            address, 
            phone, 
            email, 
            imageUrl,
            updatedAt: new Date()
          }
        });
      } else {
        hospital = await prisma.hospital.create({
          data: {
            name,
            address,
            phone,
            email,
            imageUrl
          }
        });
      }

      res.json(hospital);
    } catch (error) {
      console.error('Update hospital details error:', error);
      res.status(500).json({ message: 'Server error updating hospital details' });
    }
  }
];