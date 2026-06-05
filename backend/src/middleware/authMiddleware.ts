import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, UserRole, Seniority } from '@prisma/client';

const prisma = new PrismaClient();

// Extended Request interface
export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: UserRole;
    seniority: Seniority;  // ← ADD THIS
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
  seniority: Seniority;  // ← ADD THIS
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
      return;
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token found after Bearer');
      res.status(401).json({ 
        success: false,
        message: 'Access denied. Invalid token format.' 
      });
      return;
    }

    // Verify JWT token
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    console.log('✅ Token decoded successfully:', {
      userId: decoded.userId,
      role: decoded.role,
      seniority: decoded.seniority,  // ← ADD THIS
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
        seniority: true,  // ← ADD THIS
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
      return;
    }

    console.log('✅ User authenticated:', {
      username: user.username,
      role: user.role,
      seniority: user.seniority,  // ← ADD THIS
      fullName: user.fullName
    });
    
    // Attach user to request
    req.user = {
      id: user.id,
      userId: user.id,
      role: user.role,
      seniority: user.seniority,  // ← ADD THIS
      username: user.username,
      fullName: user.fullName,
      email: user.email || undefined,
      licenseNumber: user.licenseNumber || undefined,
      specialization: user.specialization || undefined
    };
    
    next();
    return;
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
      return;
    }
    
    res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
    return;
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
        return;
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
        return;
      }

      console.log('✅ Role check passed:', {
        user: req.user.username,
        role: userRole,
        required: allowedRoles
      });
      
      next();
      return;
    } catch (error) {
      console.error('❌ Role middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying user role' 
      });
      return;
    }
  };
};

// ============================================================
// NEW: SENIORITY-BASED MIDDLEWARE
// ============================================================

// Seniority level hierarchy
const seniorityLevels: Record<Seniority, number> = {
  TRAINEE: 0,
  JUNIOR: 1,
  SENIOR: 2,
  PRINCIPAL: 3
};

/**
 * Require minimum seniority level
 * @param minSeniority - The minimum seniority level required
 */
export const requireMinSeniority = (minSeniority: Seniority) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        console.log('❌ Seniority check failed: No user in request');
        res.status(403).json({ 
          success: false,
          message: 'Access denied. Authentication required.' 
        });
        return;
      }

      const userSeniority = req.user.seniority;
      const userLevel = seniorityLevels[userSeniority];
      const requiredLevel = seniorityLevels[minSeniority];

      if (userLevel < requiredLevel) {
        console.log('❌ Seniority check failed:', {
          user: req.user.username,
          required: minSeniority,
          actual: userSeniority,
          userLevel,
          requiredLevel
        });
        res.status(403).json({ 
          success: false,
          message: `Access denied. This action requires ${minSeniority} level or higher. Your level: ${userSeniority}` 
        });
        return;
      }

      console.log('✅ Seniority check passed:', {
        user: req.user.username,
        seniority: userSeniority,
        required: minSeniority
      });
      
      next();
    } catch (error) {
      console.error('❌ Seniority middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying seniority level' 
      });
    }
  };
};

// Convenience functions for common seniority requirements
export const requireTraineeOrHigher = requireMinSeniority('TRAINEE');  // Everyone
export const requireJuniorOrHigher = requireMinSeniority('JUNIOR');    // Blocks TRAINEE only
export const requireSeniorOrHigher = requireMinSeniority('SENIOR');    // SENIOR and PRINCIPAL only
export const requirePrincipalOnly = requireMinSeniority('PRINCIPAL');   // PRINCIPAL only

// Combined role AND seniority check
export const requireRoleWithMinSeniority = (allowedRoles: UserRole[], minSeniority: Seniority) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        console.log('❌ Combined check failed: No user in request');
        res.status(403).json({ 
          success: false,
          message: 'Access denied. Authentication required.' 
        });
        return;
      }

      const userRole = req.user.role;
      const userSeniority = req.user.seniority;
      const userLevel = seniorityLevels[userSeniority];
      const requiredLevel = seniorityLevels[minSeniority];

      // Check role
      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log('❌ Combined check - Role failed:', {
          required: allowedRoles,
          actual: userRole,
          user: req.user.username
        });
        res.status(403).json({ 
          success: false,
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}` 
        });
        return;
      }

      // Check seniority
      if (userLevel < requiredLevel) {
        console.log('❌ Combined check - Seniority failed:', {
          user: req.user.username,
          required: minSeniority,
          actual: userSeniority
        });
        res.status(403).json({ 
          success: false,
          message: `Access denied. This action requires ${minSeniority} level or higher. Your level: ${userSeniority}` 
        });
        return;
      }

      console.log('✅ Combined check passed:', {
        user: req.user.username,
        role: userRole,
        seniority: userSeniority,
        requiredRole: allowedRoles,
        requiredSeniority: minSeniority
      });
      
      next();
    } catch (error) {
      console.error('❌ Combined middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying access' 
      });
    }
  };
};

// Seniority-specific role requirements
export const requireSeniorDoctor = requireRoleWithMinSeniority(['doctor'], 'SENIOR');
export const requireSeniorNurse = requireRoleWithMinSeniority(['nurse'], 'SENIOR');
export const requireSeniorPharmacist = requireRoleWithMinSeniority(['pharmacist'], 'SENIOR');
export const requirePrincipalDoctor = requireRoleWithMinSeniority(['doctor'], 'PRINCIPAL');

// ============================================================
// EXISTING ROLE MIDDLEWARE (keep as is)
// ============================================================

export const requireAdmin = requireRole(['admin']);
export const requireMedicalStaff = requireRole([
  'admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer'
]);
export const requireClinicalStaff = requireRole([
  'admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer'
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
  
  // PRINCIPAL can modify anything in their department
  if (req.user.seniority === 'PRINCIPAL') return true;
  
  // SENIOR can modify records in their department
  if (req.user.seniority === 'SENIOR') return true;
  
  // Users can only modify their own records if owner ID is provided
  if (recordOwnerId && req.user.id === recordOwnerId) return true;
  
  return false;
};

// Middleware to check ownership or seniority access
export const requireOwnershipOrSeniority = (ownerIdField: string = 'userId') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({ 
          success: false,
          message: 'Access denied' 
        });
        return;
      }

      // Admin can access anything
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // PRINCIPAL can access anything
      if (req.user.seniority === 'PRINCIPAL') {
        next();
        return;
      }

      // Check if user owns the resource
      const resourceOwnerId = (req.params as any)[ownerIdField] || (req.body as any)[ownerIdField];
      
      if (resourceOwnerId && resourceOwnerId === req.user.id) {
        next();
        return;
      }

      console.log('❌ Ownership check failed:', {
        user: req.user.id,
        userSeniority: req.user.seniority,
        resourceOwner: resourceOwnerId,
        field: ownerIdField
      });

      res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only access your own records.' 
      });
      return;
    } catch (error) {
      console.error('❌ Ownership middleware error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error verifying access' 
      });
      return;
    }
  };
};