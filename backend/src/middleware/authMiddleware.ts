import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/User';

interface DecodedToken {
  userId: string;
  role: string;
  username: string;
  fullName: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    
    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User no longer active' });
    }

    (req as any).user = {
      userId: decoded.userId,
      role: decoded.role,
      username: decoded.username,
      fullName: decoded.fullName
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // If role is not in token, fetch from database
      let userRole = user.role;
      if (!userRole) {
        const userData = await UserModel.findById(user.userId);
        if (!userData) {
          return res.status(403).json({ message: 'User not found' });
        }
        userRole = userData.role;
        (req as any).user.role = userRole;
      }

      if (!userRole || !roles.includes(userRole)) {
        return res.status(403).json({ 
          message: `Access denied. Required roles: ${roles.join(', ')}` 
        });
      }
      
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ message: 'Error verifying user role' });
    }
  };
};

// Specific role middleware functions for common use cases
export const requireMedicalStaff = requireRole(['doctor', 'nurse', 'midwife']);
export const requireClinicalStaff = requireRole(['doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist']);
export const requireAdmin = requireRole(['admin']);
export const requireRecords = requireRole(['records', 'admin']);
