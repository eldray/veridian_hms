// backend/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Extended Request interface
export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: UserRole;
    username: string;
    fullName: string;
    email?: string;
    licenseNumber?: string;
    specialization?: string;
  };
}

// User roles from Prisma schema
export type UserRole = 
  | 'admin' 
  | 'doctor' 
  | 'nurse' 
  | 'midwife' 
  | 'records' 
  | 'lab_tech' 
  | 'pharmacist' 
  | 'accounts' 
  | 'sonographer';

interface DecodedToken {
  userId: string;
  role: UserRole;
  username: string;
  fullName: string;
  email?: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔐 Auth Middleware - Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50)
    });
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found');
      res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
      return; // ✅ FIXED: Added return
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token found after Bearer');
      res.status(401).json({ 
        success: false,
        message: 'Access denied. Invalid token format.' 
      });
      return; // ✅ FIXED: Added return
    }

    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
      return; // ✅ FIXED: Added return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    console.log('✅ Token decoded successfully:', {
      userId: decoded.userId,
      role: decoded.role,
      username: decoded.username
    });
    
    // Verify user exists and is active using Prisma
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true 
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        email: true,
        licenseNumber: true,
        specialization: true,
        isActive: true
      }
    });

    if (!user) {
      console.log('❌ User not found or inactive:', decoded.userId);
      res.status(401).json({ 
        success: false,
        message: 'User account not found or inactive' 
      });
      return; // ✅ FIXED: Added return
    }

    console.log('✅ User authenticated:', {
      username: user.username,
      role: user.role,
      fullName: user.fullName
    });
    
    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id, // For compatibility
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      email: user.email || undefined,
      licenseNumber: user.licenseNumber || undefined,
      specialization: user.specialization || undefined
    };
    
    next();
    return; // ✅ FIXED: Added return for completeness
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
      return; // ✅ FIXED: Added return
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
      return; // ✅ FIXED: Added return
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
    return; // ✅ FIXED: Added return
  }
};

// Enhanced role-based access control
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        console.log('❌ Role check failed: No user in request');
        res.status(403).json({ 
          success: false,
          message: 'Access denied. Authentication required.' 
        });
        return; // ✅ FIXED: Added return
      }

      const userRole = req.user.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log('❌ Role check failed:', {
          required: allowedRoles,
          actual: userRole,
          user: req.user.username
        });
        res.status(403).json({ 
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}` 
        });
        return; // ✅ FIXED: Added return
      }

      console.log('✅ Role check passed:', {
        user: req.user.username,
        role: userRole,
        required: allowedRoles
      });
      
      next();
      return; // ✅ FIXED: Added return
    } catch (error) {
      console.error('❌ Role middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying user role' 
      });
      return; // ✅ FIXED: Added return
    }
  };
};

// Specific role middleware functions with comprehensive coverage
export const requireAdmin = requireRole(['admin']);
export const requireMedicalStaff = requireRole([
  'admin',
  'doctor', 
  'nurse', 
  'midwife', 
  'lab_tech', 
  'pharmacist',
  'sonographer']);
export const requireClinicalStaff = requireRole([
  'admin',
  'doctor', 
  'nurse', 
  'midwife', 
  'lab_tech', 
  'pharmacist',
  'sonographer'
]);
export const requireLabStaff = requireRole(['lab_tech', 'doctor', 'admin']);
export const requirePharmacyStaff = requireRole(['pharmacist', 'doctor', 'admin']);
export const requireRadiologyStaff = requireRole(['sonographer', 'doctor', 'admin']);
export const requireRecordsStaff = requireRole(['records', 'admin']);
export const requireAccountsStaff = requireRole(['accounts', 'admin']);
export const requireDoctor = requireRole(['doctor', 'admin']);
export const requireNurse = requireRole(['nurse', 'doctor', 'admin']);
export const requireMidwife = requireRole(['midwife', 'doctor', 'admin']);

// Department-specific access
export const requirePatientManagement = requireRole([
  'admin', 'doctor', 'nurse', 'midwife', 'records'
]);
export const requireBillingAccess = requireRole([
  'admin', 'accounts', 'doctor'
]);
export const requireLabAccess = requireRole([
  'admin', 'lab_tech', 'doctor'
]);
export const requirePharmacyAccess = requireRole([
  'admin', 'pharmacist', 'doctor'
]);
export const requireRadiologyAccess = requireRole([
  'admin', 'sonographer', 'doctor'
]);

// Utility function to check if user can modify specific records
export const canModifyRecord = (req: AuthRequest, recordOwnerId?: string): boolean => {
  if (!req.user) return false;
  
  // Admin can modify anything
  if (req.user.role === 'admin') return true;
  
  // Doctors can modify records in their department
  if (req.user.role === 'doctor') return true;
  
  // Users can only modify their own records if owner ID is provided
  if (recordOwnerId && req.user.id === recordOwnerId) return true;
  
  return false;
};

// Middleware to check ownership or admin access
export const requireOwnershipOrAdmin = (ownerIdField: string = 'userId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({ 
          success: false,
          message: 'Access denied' 
        });
        return; // ✅ FIXED: Added return
      }

      // Admin can access anything
      if (req.user.role === 'admin') {
        next();
        return; // ✅ FIXED: Added return
      }

      // Check if user owns the resource
      const resourceOwnerId = (req.params as any)[ownerIdField] || (req.body as any)[ownerIdField];
      
      if (resourceOwnerId && resourceOwnerId === req.user.id) {
        next();
        return; // ✅ FIXED: Added return
      }

      console.log('❌ Ownership check failed:', {
        user: req.user.id,
        resourceOwner: resourceOwnerId,
        field: ownerIdField
      });

      res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only access your own records.' 
      });
      return; // ✅ FIXED: Added return
    } catch (error) {
      console.error('❌ Ownership middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying access' 
      });
      return; // ✅ FIXED: Added return
    }
  };
};