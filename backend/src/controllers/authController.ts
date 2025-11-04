import { Request, Response } from 'express';
import UserModel from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    // Input validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await UserModel.findOne({ username, isActive: true });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Include role and additional info in the JWT token payload
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        username: user.username,
        fullName: user.fullName
      }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '1d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        isActive: user.isActive
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { 
      username, 
      password, 
      fullName, 
      role, 
      email, 
      phone, 
      licenseNumber, 
      specialization 
    } = req.body;
    
    // Input validation
    if (!username || !password || !fullName || !role) {
      return res.status(400).json({ message: 'Username, password, full name, and role are required' });
    }

    // Validate role
    const validRoles = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Validate license number for medical staff
    const medicalRoles = ['doctor', 'nurse', 'midwife'];
    if (medicalRoles.includes(role) && !licenseNumber) {
      return res.status(400).json({ 
        message: `License number is required for ${role} role` 
      });
    }

    // Validate specialization for doctors
    if (role === 'doctor' && !specialization) {
      return res.status(400).json({ 
        message: 'Specialization is required for doctor role' 
      });
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ 
      username, 
      password: hashedPassword, 
      fullName, 
      role, 
      email,
      phone,
      licenseNumber,
      specialization
    });

    // Generate token for the new user
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        username: user.username,
        fullName: user.fullName
      }, 
      process.env.JWT_SECRET as string, 
      { expiresIn: '1d' }
    );

    res.status(201).json({ 
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        isActive: user.isActive
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await UserModel.findById((req as any).user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      licenseNumber: user.licenseNumber,
      specialization: user.specialization,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

export const updateProfile = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  body('licenseNumber').optional().trim(),
  body('specialization').optional().trim(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, phone, licenseNumber, specialization } = req.body;
      const userId = (req as any).user.userId;
      
      const updateData: any = { updatedAt: new Date() };
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (licenseNumber) updateData.licenseNumber = licenseNumber;
      if (specialization) updateData.specialization = specialization;

      const user = await UserModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        isActive: user.isActive
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error updating profile' });
    }
  }
];

export const changePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user.userId;

      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      user.password = hashedNewPassword;
      user.updatedAt = new Date();
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error changing password' });
    }
  }
];
