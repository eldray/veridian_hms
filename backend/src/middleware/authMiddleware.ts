// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, Seniority } from '@prisma/client';
import prisma from '../core/database/prisma.client';

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
    departmentId?: string;
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
  type?: string;
}

const isSuperAdminOrAdmin = (role?: string) => role === 'super_admin' || role === 'admin';

// JWT verification is followed by a database check so deactivated accounts and
// changed roles/permissions take effect without waiting for token expiry.
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
      return;
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      res.status(500).json({ success: false, message: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, secret) as DecodedToken;
    // Refresh tokens are long-lived and must only be exchanged at /auth/refresh-token.
    if (!decoded.userId || decoded.type === 'refresh') {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        departmentId: true,
        role: true,
        seniority: true,
        isActive: true,
        roles: {
          include: {
            permissions: {
              select: { permission: { select: { name: true } } }
            }
          }
        }
      }
    });

    if (!currentUser || !currentUser.isActive) {
      res.status(401).json({ success: false, message: 'Account is inactive or no longer exists' });
      return;
    }

    const currentPermissions = new Set<string>();
    currentUser.roles.forEach((role: any) => {
      role.permissions.forEach((rp: any) => currentPermissions.add(rp.permission.name));
    });

    (req as AuthRequest).user = {
      id: currentUser.id,
      userId: currentUser.id,
      role: currentUser.role,
      seniority: currentUser.seniority,
      username: currentUser.username,
      fullName: currentUser.fullName,
      email: currentUser.email ?? undefined,
      departmentId: currentUser.departmentId ?? undefined,
      permissions: Array.from(currentPermissions)
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid token' });
      return;
    }
    // Fail closed if the database-backed authentication check is unavailable.
    console.error('Authentication state check failed');
    res.status(503).json({ success: false, message: 'Authentication service temporarily unavailable' });
  }
};

// ✅ Role Checks
export const requireRole = (roles: string[]) =>
  (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ success: false, status: 'fail', message: 'Authentication required' });
    }
    // Normalize role casing consistently so Super Admin inherits all ordinary roles.
    const userRole = String(req.user.role || '').toLowerCase();
    const allowedRoles = roles.map((role) => String(role).toLowerCase());
    if (userRole === 'super_admin') return next();
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        status: 'fail',
        message: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }
    next();
  };

// Super admins inherit every administrator capability; super-admin-only safeguards are enforced separately.
export const requireAdmin = requireRole(['admin', 'super_admin']);

// Use for platform-level or destructive operations reserved for super admins.
export const requireSuperAdmin = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (String(req.user.role).toLowerCase() !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Admin access required' });
  }
  return next();
};
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
    if (isSuperAdminOrAdmin(user.role) || user.permissions?.includes(permission)) {
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

export const requireSeniorDoctor = requireRoleWithMinSeniority('doctor', 'SENIOR');
export const requireSeniorNurse = requireRoleWithMinSeniority('nurse', 'SENIOR');
export const requireSeniorPharmacist = requireRoleWithMinSeniority('pharmacist', 'SENIOR');
export const requirePrincipalDoctor = requireRoleWithMinSeniority('doctor', 'PRINCIPAL');

// ✅ NEW: Combined Role + Permission checks
export const requireRoleOrPermission = (role: UserRole, permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    if (user.role === role || isSuperAdminOrAdmin(user.role) || user.permissions?.includes(permission)) {
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
    if (isSuperAdminOrAdmin(user.role) || roles.includes(user.role)) {
      next();
      return;
    }
    res.status(403).json({ 
      success: false, 
      message: `Access denied. Requires one of: ${roles.join(', ')}` 
    });
  };
};