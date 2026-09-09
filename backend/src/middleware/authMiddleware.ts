// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, Seniority } from '@prisma/client';

// ✅ ADD THIS - AuthRequest interface for typed authenticated requests
export interface AuthRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: UserRole;
    seniority: Seniority;
    username: string;
    fullName: string;
    email?: string;
    permissions?: string[];
  };
}

interface DecodedToken {
  userId: string;
  role: UserRole;
  seniority: Seniority;
  username: string;
  fullName: string;
  email?: string;
  permissions?: string[];
}

// ✅ Core JWT Protection (No DB hits)
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ success: false, message: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    
    // Attach user directly from JWT payload
    (req as AuthRequest).user = {
      id: decoded.userId,
      userId: decoded.userId,
      role: decoded.role,
      seniority: decoded.seniority,
      username: decoded.username,
      fullName: decoded.fullName,
      email: decoded.email,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ✅ Role Checks
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user || !allowedRoles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: 'Access denied. Insufficient role.' });
      return;
    }
    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireMedicalStaff = requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer']);

// ✅ NEW: Patient Management Roles
export const requirePatientManagement = requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']);

// ✅ NEW: Clinical Staff Roles
export const requireClinicalStaff = requireRole(['admin', 'doctor', 'nurse', 'midwife']);

// ✅ NEW: Records Staff Roles
export const requireRecordsStaff = requireRole(['admin', 'records']);

// ✅ NEW: Laboratory Staff Roles
export const requireLabStaff = requireRole(['admin', 'lab_tech', 'doctor']);

// ✅ NEW: Pharmacy Staff Roles
export const requirePharmacyStaff = requireRole(['admin', 'pharmacist']);

// ✅ NEW: Accounts Staff Roles
export const requireAccountsStaff = requireRole(['admin', 'accounts']);

// ✅ NEW: Management Staff Roles
export const requireManagement = requireRole(['admin', 'accounts', 'records']);

// ✅ Dynamic RBAC
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (user.role === 'ADMIN' || user.permissions?.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ success: false, message: `Missing permission: ${permission}` });
  };
};

// ✅ Seniority Logic & Shortcuts
export const seniorityLevels: Record<Seniority, number> = { 
  TRAINEE: 0, 
  JUNIOR: 1, 
  SENIOR: 2, 
  PRINCIPAL: 3 
};

export const requireMinSeniority = (minSeniority: Seniority) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user || seniorityLevels[user.seniority] < seniorityLevels[minSeniority]) {
      res.status(403).json({ success: false, message: `Access denied. Requires ${minSeniority} seniority.` });
      return;
    }
    next();
  };
};

// Pre-configured seniority shortcuts
export const requireTraineeOrHigher = requireMinSeniority('TRAINEE');
export const requireJuniorOrHigher = requireMinSeniority('JUNIOR');
export const requireSeniorOrHigher = requireMinSeniority('SENIOR');
export const requirePrincipalOnly = requireMinSeniority('PRINCIPAL');

// Combined Role + Seniority checks
export const requireRoleWithMinSeniority = (role: UserRole, minSeniority: Seniority) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (user.role !== role || seniorityLevels[user.seniority] < seniorityLevels[minSeniority]) {
      res.status(403).json({ 
        success: false, 
        message: `Access denied. Requires ${role} with ${minSeniority} seniority.` 
      });
      return;
    }
    next();
  };
};

export const requireSeniorDoctor = requireRoleWithMinSeniority('DOCTOR', 'SENIOR');
export const requireSeniorNurse = requireRoleWithMinSeniority('NURSE', 'SENIOR');
export const requireSeniorPharmacist = requireRoleWithMinSeniority('PHARMACIST', 'SENIOR');
export const requirePrincipalDoctor = requireRoleWithMinSeniority('DOCTOR', 'PRINCIPAL');

// ✅ NEW: Combined Role + Permission checks
export const requireRoleOrPermission = (role: UserRole, permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (user.role === role || user.role === 'ADMIN' || user.permissions?.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ 
      success: false, 
      message: `Access denied. Requires ${role} role or ${permission} permission.` 
    });
  };
};

// ✅ NEW: Any of multiple roles
export const requireAnyRole = (...roles: UserRole[]) => {
  return requireRole(roles);
};

// ✅ NEW: All of multiple roles (for complex scenarios)
export const requireAllRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    // Note: This is a simplified check - in practice, a user can only have one role
    // This would be more useful with the dynamic RBAC system
    if (roles.includes(user.role)) {
      next();
      return;
    }
    res.status(403).json({ 
      success: false, 
      message: `Access denied. Requires one of: ${roles.join(', ')}` 
    });
  };
};