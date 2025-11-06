// backend/middleware/authMiddleware.ts - ADD DEBUGGING
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
    console.log('🔐 Auth Middleware - Headers:', req.headers);
    
    const authHeader = req.headers.authorization;
    console.log('🔐 Auth Header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 Token received (first 50 chars):', token.substring(0, 50) + '...');
    
    if (!token) {
      console.log('❌ No token found after Bearer');
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    console.log('✅ Token decoded successfully:', decoded);
    
    // Verify user still exists and is active
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      console.log('❌ User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'User no longer exists' });
    }

    if (!user.isActive) {
      console.log('❌ User account inactive:', user.username);
      return res.status(401).json({ message: 'User account is inactive' });
    }

    console.log('✅ User authenticated:', user.username, 'Role:', user.role);
    
    (req as any).user = {
      userId: decoded.userId,
      role: decoded.role,
      username: decoded.username,
      fullName: decoded.fullName,
      _id: user._id // Add this for compatibility
    };
    
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    res.status(401).json({ message: 'Authentication failed' });
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
