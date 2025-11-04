import { Request, Response } from 'express';
import UserModel from '../models/User';
import HospitalModel from '../models/Hospital';
import { body, validationResult } from 'express-validator';

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select('-password').sort({ createdAt: -1 });
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

      const user = await UserModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
];

// Deactivate user (admin only)
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error deactivating user' });
  }
};

// Get hospital details
export const getHospitalDetails = async (req: Request, res: Response) => {
  try {
    const hospital = await HospitalModel.findOne();
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
      let hospital = await HospitalModel.findOne();
      
      if (hospital) {
        hospital = await HospitalModel.findByIdAndUpdate(
          hospital._id,
          { 
            name, 
            address, 
            phone, 
            email, 
            imageUrl,
            updatedAt: new Date()
          },
          { new: true, runValidators: true }
        );
      } else {
        hospital = await HospitalModel.create({
          name,
          address,
          phone,
          email,
          imageUrl
        });
      }

      res.json(hospital);
    } catch (error) {
      console.error('Update hospital details error:', error);
      res.status(500).json({ message: 'Server error updating hospital details' });
    }
  }
];
