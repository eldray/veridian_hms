// modules/auth/AuthController.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService, getAuthService } from './AuthService';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  ChangePasswordRequestDTO,
  AuthenticatedRequest,
} from './AuthTypes';

export class AuthController {
  public router: Router;
  private authService: AuthService;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.authService = getAuthService();
    this.router = Router();
    this.registerRoutes();
    console.log('✅ AuthController initialized with routes');
  }

  private registerRoutes(): void {
    console.log('📝 Registering auth routes...');
    
    // Public routes
    this.router.post('/login', this.login);
    this.router.post('/register', this.register);
    this.router.post('/refresh-token', this.refreshToken);
    this.router.post('/forgot-password', this.forgotPassword);
    
    // Protected routes
    this.router.post('/logout', this.authenticate, this.logout);
    this.router.post('/change-password', this.authenticate, this.changePassword);
    this.router.get('/profile', this.authenticate, this.getCurrentUser);
    this.router.post('/verify-token', this.verifyToken);
    
    console.log('   - POST /login registered');
    console.log('   - POST /register registered');
    console.log('   - GET /profile registered');
  }

  getRouter(): Router {
    return this.router;
  }

  /**
   * POST /auth/login
   */
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

  /**
   * POST /auth/register
   */
  private register = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: RegisterRequestDTO = req.body;

      const requiredFields = ['username', 'password', 'fullName', 'role'];
      for (const field of requiredFields) {
        if (!dto[field as keyof RegisterRequestDTO]) {
          res.status(400).json({ success: false, message: `${field} is required` });
          return;
        }
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

  /**
   * POST /auth/refresh-token
   */
  private refreshToken = async (req: Request, res: Response): Promise<void> => {
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

  /**
   * POST /auth/logout
   */
  private logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  /**
   * POST /auth/change-password
   */
  private changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  /**
   * GET /auth/profile
   */
  private getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  /**
   * POST /auth/verify-token
   */
  private verifyToken = async (req: Request, res: Response): Promise<void> => {
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

  /**
   * POST /auth/forgot-password
   */
  private forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username } = req.body;

      if (!username) {
        res.status(400).json({ success: false, message: 'Username is required' });
        return;
      }

      console.log(`Password reset requested for: ${username}`);
      
      res.status(200).json({ 
        success: true, 
        message: 'If an account exists with this username, a reset link will be sent' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Password reset failed' });
    }
  };

  /**
   * Authentication middleware
   */
  private authenticate = async (req: AuthenticatedRequest, res: Response, next: any): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'Authorization header missing or invalid' });
        return;
      }

      const token = authHeader.substring(7);
      const validation = this.authService.validateToken(token);

      if (!validation.valid) {
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
}