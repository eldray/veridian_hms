// modules/auth/AuthController.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './AuthService';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  ChangePasswordRequestDTO,
  AuthenticatedRequest,
  TokenPayload,
} from './AuthTypes';

export class AuthController {
  public router: Router;
  private authService: AuthService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    console.log('🏗️ AuthController constructor START');
    this.prisma = prisma;
    this.authService = new AuthService(prisma);
    this.router = Router();
    console.log('🏗️ Router created');
    this.registerRoutes();
    console.log('🏗️ registerRoutes completed, router stack length:', this.router.stack?.length);
  }

  private registerRoutes(): void {
    console.log('📝 Registering auth routes...');
    
    // Test route to verify router is working
    this.router.get('/test', (req: Request, res: Response) => {
      console.log('✅ TEST ROUTE HIT!');
      res.json({ success: true, message: 'Auth test route works!', timestamp: new Date().toISOString() });
    });
    
    // Public routes
    this.router.post('/login', this.login.bind(this));
    this.router.post('/register', this.register.bind(this));
    this.router.post('/refresh-token', this.refreshToken.bind(this));
    this.router.post('/forgot-password', this.forgotPassword.bind(this));
    
    // Protected routes
    this.router.post('/logout', this.authenticate.bind(this), this.logout.bind(this));
    this.router.post('/change-password', this.authenticate.bind(this), this.changePassword.bind(this));
    this.router.get('/profile', this.authenticate.bind(this), this.getCurrentUser.bind(this));
    this.router.put('/profile', this.authenticate.bind(this), this.updateProfile.bind(this)); // ✅ ADD THIS LINE
    this.router.post('/verify-token', this.verifyToken.bind(this));
    
    console.log('   - GET /test registered');
    console.log('   - POST /login registered');
    console.log('   - POST /register registered');
    console.log('   - POST /refresh-token registered');
    console.log('   - POST /forgot-password registered');
    console.log('   - POST /logout registered');
    console.log('   - POST /change-password registered');
    console.log('   - GET /profile registered');
    console.log('   - POST /verify-token registered');
  }

  getRouter(): Router {
    console.log('🔧 getRouter called, returning router with stack length:', this.router.stack?.length);
    // Log all routes for debugging
    this.router.stack?.forEach((layer: any) => {
      if (layer.route) {
        console.log(`   Route: ${Object.keys(layer.route.methods)} ${layer.route.path}`);
      }
    });
    return this.router;
  }

  private login = async (req: Request, res: Response): Promise<void> => {
    console.log('🔐 Login endpoint hit!', req.body);
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      const result = await this.authService.login({ username, password });

      if (result.success && result.data) {
        res.status(200).json({ success: true, data: result.data, message: 'Login successful' });
      } else {
        res.status(401).json({ success: false, message: result.error || 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  };

// In the register method, update to accept seniority:
  private register = async (req: Request, res: Response): Promise<void> => {
    console.log('📝 Register endpoint hit!', req.body);
    try {
      const dto: RegisterRequestDTO = req.body;

      const requiredFields = ['username', 'password', 'fullName', 'role'];
      for (const field of requiredFields) {
        if (!dto[field as keyof RegisterRequestDTO]) {
          res.status(400).json({ success: false, message: `${field} is required` });
          return;
        }
      }

      if (dto.password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }

      const validRoles = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer'];
      if (!validRoles.includes(dto.role)) {
        res.status(400).json({ success: false, message: 'Invalid role' });
        return;
      }

      // Validate seniority if provided
      const validSeniority = ['TRAINEE', 'JUNIOR', 'SENIOR', 'PRINCIPAL'];
      if (dto.seniority && !validSeniority.includes(dto.seniority)) {
        res.status(400).json({ success: false, message: 'Invalid seniority level' });
        return;
      }

      const result = await this.authService.register(dto);

      if (result.success && result.data) {
        res.status(201).json({ success: true, data: result.data, message: 'Registration successful' });
      } else {
        res.status(400).json({ success: false, message: result.error || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  };

  private refreshToken = async (req: Request, res: Response): Promise<void> => {
    console.log('🔄 Refresh token endpoint hit!');
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token is required' });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      if (result.success && result.data) {
        res.status(200).json({ success: true, data: result.data, message: 'Token refreshed successfully' });
      } else {
        res.status(401).json({ success: false, message: result.error || 'Token refresh failed' });
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ success: false, message: 'Token refresh failed' });
    }
  };

  private logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('🚪 Logout endpoint hit!');
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ success: false, message: 'Refresh token is required' });
        return;
      }

      const result = await this.authService.logout(refreshToken);

      if (result.success) {
        res.status(200).json({ success: true, message: 'Logout successful' });
      } else {
        res.status(400).json({ success: false, message: 'Logout failed' });
      }
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  };

  private changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('🔑 Change password endpoint hit!');
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ success: false, message: 'Current password and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        return;
      }

      const result = await this.authService.changePassword(userId, { currentPassword, newPassword });

      if (result.success) {
        res.status(200).json({ success: true, message: 'Password changed successfully' });
      } else {
        res.status(400).json({ success: false, message: result.error || 'Password change failed' });
      }
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Password change failed' });
    }
  };

  private getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('👤 Get profile endpoint hit!');
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      const profile = await this.authService.getUserProfile(userId);

      if (profile) {
        res.status(200).json({ success: true, data: profile, message: 'Profile retrieved successfully' });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  };

  private verifyToken = async (req: Request, res: Response): Promise<void> => {
    console.log('✅ Verify token endpoint hit!');
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ success: false, message: 'Token is required' });
        return;
      }

      const validation = this.authService.validateToken(token);

      if (validation.valid) {
        res.status(200).json({ success: true, data: { valid: true }, message: 'Token is valid' });
      } else {
        res.status(401).json({ success: false, message: validation.error || 'Token is invalid' });
      }
    } catch (error) {
      console.error('Verify token error:', error);
      res.status(500).json({ success: false, message: 'Token verification failed' });
    }
  };

  private forgotPassword = async (req: Request, res: Response): Promise<void> => {
    console.log('🔐 Forgot password endpoint hit!');
    try {
      const { username } = req.body;
  
      if (!username) {
        res.status(400).json({ success: false, message: 'Username is required' });
        return;
      }
  
      const user = await this.prisma.user.findUnique({ where: { username } });
      
      if (!user) {
        // Don't reveal that user doesn't exist for security
        res.status(200).json({ 
          success: true, 
          message: 'If an account exists with this username, a reset link will be sent' 
        });
        return;
      }
  
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour
      
      // Store in database (add resetToken and resetExpiry fields to User model)
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetExpiry
        }
      });
      
      // Send email/SMS with reset link
      // ...
      
      res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this username, a reset link will be sent' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Password reset failed' });
    }
  };

  private authenticate = async (req: AuthenticatedRequest, res: Response, next: any): Promise<void> => {
    console.log('🔐 Authentication middleware running');
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Authorization header missing or invalid' });
        return;
      }

      const token = authHeader.substring(7);
      const validation = this.authService.validateToken(token);

      if (!validation.valid || !validation.payload) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
        return;
      }

      req.user = validation.payload;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ success: false, message: 'Authentication failed' });
    }
  };
  private updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    console.log('📝 Update profile endpoint hit!');
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
  
      const { fullName, email, phone, licenseNumber, specialization, seniority } = req.body;
  
      const updateData: any = {};
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
      if (specialization !== undefined) updateData.specialization = specialization;
      if (seniority !== undefined) updateData.seniority = seniority;
  
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          fullName: true,
          role: true,
          seniority: true,
          email: true,
          phone: true,
          licenseNumber: true,
          specialization: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        }
      });
  
      // ✅ Generate NEW tokens with updated seniority
      const tokens = await this.generateTokens(
        updatedUser.id,
        updatedUser.username,
        updatedUser.role,
        updatedUser.seniority
      );
  
      // ✅ Store the new refresh token
      await this.repository.storeRefreshToken(
        updatedUser.id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );
  
      console.log(`✅ Profile updated and new tokens generated for user: ${userId}`);
      res.status(200).json({ 
        success: true, 
        data: {
          user: updatedUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
        message: 'Profile updated successfully' 
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  };
}