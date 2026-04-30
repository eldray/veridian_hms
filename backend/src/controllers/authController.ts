// controllers/authController.ts - UPDATED FOR PRISMA
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { AuthRequest, UserRole } from '../middleware/authMiddleware';
import prisma from '../lib/prisma.js';

// Valid user roles from Prisma schema
const VALID_ROLES: UserRole[] = [
  'admin', 'doctor', 'nurse', 'midwife', 'records', 
  'lab_tech', 'pharmacist', 'accounts', 'sonographer'
];

// Roles that require license numbers
const LICENSE_REQUIRED_ROLES: UserRole[] = [
  'doctor', 'nurse', 'midwife', 'pharmacist', 'sonographer'
];

// Medical staff roles
const MEDICAL_STAFF_ROLES: UserRole[] = [
  'doctor', 'nurse', 'midwife'
];

// Clinical staff roles
const CLINICAL_STAFF_ROLES: UserRole[] = [
  'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer'
];

export const login = [
  // Validation rules
  body('username')
    .notEmpty().withMessage('Username is required')
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Login validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      const { username, password } = req.body;
      
      console.log('🔐 Login attempt:', { username });

      // Find user with Prisma
      const user = await prisma.user.findFirst({
        where: { 
          username: username.toLowerCase().trim(),
          isActive: true 
        },
        select: {
          id: true,
          username: true,
          password: true,
          fullName: true,
          role: true,
          email: true,
          phone: true,
          licenseNumber: true,
          specialization: true,
          isActive: true,
          createdAt: true
        }
      });

      if (!user) {
        console.log('❌ User not found or inactive:', username);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', username);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check JWT secret
      if (!process.env.JWT_SECRET) {
        console.error('❌ JWT_SECRET not configured');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          username: user.username,
          fullName: user.fullName
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' } // 24 hours
      );

      console.log('✅ Login successful:', { 
        username: user.username, 
        role: user.role,
        userId: user.id 
      });

      // Return user data (excluding password)
      const userResponse = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        isActive: user.isActive,
        createdAt: user.createdAt
      };

      res.json({
        success: true,
        token,
        user: userResponse,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

export const register = [
  // Validation rules
  body('username')
    .notEmpty().withMessage('Username is required')
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .isAlphanumeric().withMessage('Username must contain only letters and numbers'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('fullName')
    .notEmpty().withMessage('Full name is required')
    .trim()
    .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  body('email')
    .optional()
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s-()]+$/).withMessage('Valid phone number required'),
  body('licenseNumber')
    .optional()
    .trim(),
  body('specialization')
    .optional()
    .trim(),

  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Registration validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

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

      console.log('👤 Registration attempt:', { 
        username, 
        role,
        fullName 
      });

      // Validate license number for roles that require it
      if (LICENSE_REQUIRED_ROLES.includes(role as UserRole) && !licenseNumber) {
        return res.status(400).json({
          success: false,
          message: `License number is required for ${role} role`
        });
      }

      // Validate specialization for doctors
      if (role === 'doctor' && !specialization) {
        return res.status(400).json({
          success: false,
          message: 'Specialization is required for doctor role'
        });
      }

      // Check if user already exists using transaction
      const existingUser = await prisma.$transaction(async (tx) => {
        const userByUsername = await tx.user.findUnique({
          where: { username: username.toLowerCase().trim() }
        });

        const userByEmail = email ? await tx.user.findUnique({
          where: { email: email.toLowerCase().trim() }
        }) : null;

        return userByUsername || userByEmail;
      });

      if (existingUser) {
        console.log('❌ User already exists:', { username, email });
        return res.status(400).json({
          success: false,
          message: 'User with this username or email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user with transaction
      const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            fullName: fullName.trim(),
            role: role as UserRole,
            email: email ? email.toLowerCase().trim() : null,
            phone: phone ? phone.trim() : null,
            licenseNumber: licenseNumber ? licenseNumber.trim() : null,
            specialization: specialization ? specialization.trim() : null,
            isActive: true
          },
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            licenseNumber: true,
            specialization: true,
            isActive: true,
            createdAt: true
          }
        });

        return newUser;
      });

      // Generate JWT token
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET not configured');
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          username: user.username,
          fullName: user.fullName
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '24h' }
      );

      console.log('✅ User registered successfully:', {
        username: user.username,
        role: user.role,
        userId: user.id
      });

      res.status(201).json({
        success: true,
        token,
        user,
        message: 'User registered successfully'
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('📋 Fetching profile for user:', req.user.username);

    const user = await prisma.user.findUnique({
      where: { 
        id: req.user.id,
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ Profile fetched successfully:', user.username);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const updateProfile = [
  // UPDATED VALIDATION RULES - Make everything optional for updates
  body('fullName')
    .optional()
    .trim()
    .notEmpty().withMessage('Full name cannot be empty')
    .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('email')
    .optional({ checkFalsy: true }) // Allow empty strings
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('phone')
    .optional({ checkFalsy: true }) // Allow empty strings
    .trim()
    .matches(/^[+]?[\d\s-()]*$/).withMessage('Valid phone number required'), // Allow empty with *
  body('licenseNumber')
    .optional({ checkFalsy: true }) // Allow empty strings
    .trim(),
  body('specialization')
    .optional({ checkFalsy: true }) // Allow empty strings
    .trim(),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Profile update validation errors:', errors.array());
        console.log('🔍 Request body received:', req.body);
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed',
          receivedData: req.body // Add this for debugging
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { fullName, email, phone, licenseNumber, specialization } = req.body;
      const userId = req.user.id;

      console.log('📝 Updating profile for user:', req.user.username);
      console.log('📝 Update data received:', { fullName, email, phone, licenseNumber, specialization });

      // Prepare update data - handle empty strings
      const updateData: any = { 
        updatedAt: new Date() 
      };

      if (fullName !== undefined) updateData.fullName = fullName.trim();
      if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber ? licenseNumber.trim() : null;
      if (specialization !== undefined) updateData.specialization = specialization ? specialization.trim() : null;

      console.log('📝 Processed update data:', updateData);

      // Remove license validation for updates - users might want to remove it
      // Remove specialization validation for updates

      const user = await prisma.user.update({
        where: { 
          id: userId,
          isActive: true 
        },
        data: updateData,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          email: true,
          phone: true,
          licenseNumber: true,
          specialization: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('✅ Profile updated successfully:', user.username);

      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating profile',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

export const changePassword = [
  // Validation rules
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),

  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('🔍 Password change validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array(),
          message: 'Validation failed'
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      console.log('🔑 Changing password for user:', req.user.username);

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { 
          id: userId,
          isActive: true 
        },
        select: {
          id: true,
          username: true,
          password: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        console.log('❌ Current password incorrect for user:', user.username);
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        }
      });

      console.log('✅ Password changed successfully for user:', user.username);

      res.json({
        success: true,
        message: 'Password updated successfully'
      });

    } catch (error) {
      console.error('❌ Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error changing password',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  }
];

// Additional utility endpoints
export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('📋 Fetching users list by admin:', req.user.username);

    const { 
      page = 1, 
      limit = 50, 
      role, 
      isActive,
      search = '' 
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        phone: true,
        licenseNumber: true,
        specialization: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.user.count({ where });

    console.log(`✅ Fetched ${users.length} users`);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalUsers: total,
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching users'
    });
  }
};

export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    console.log('📊 Getting user statistics by admin:', req.user.username);

    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true
    });
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole,
      recent: recentUsers
    };

    console.log('✅ User statistics fetched');

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user statistics'
    });
  }
};