/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

import { Request, Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { AuthService, getAuthService } from './AuthService';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  ChangePasswordRequestDTO,
  AuthenticatedRequest,
} from './AuthTypes';

export class AuthController extends BaseController {
  private authService: AuthService;

  constructor() {
    super('AuthController');
    this.authService = getAuthService();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // Public routes
    this.router.post('/login', this.login);
    this.router.post('/register', this.register);
    this.router.post('/refresh-token', this.refreshToken);
    this.router.post('/forgot-password', this.forgotPassword);
    
    // Protected routes
    this.router.post('/logout', this.authenticate, this.logout);
    this.router.post('/change-password', this.authenticate, this.changePassword);
    this.router.get('/me', this.authenticate, this.getCurrentUser);
    this.router.post('/verify-token', this.verifyToken);
  }

  /**
   * POST /auth/login
   * User login with email and password
   */
  private login = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: LoginRequestDTO = req.body;

      // Validate input
      if (!dto.email || !dto.password) {
        this.sendError(res, 'Email and password are required', 400);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        this.sendError(res, 'Invalid email format', 400);
        return;
      }

      // Validate password length
      if (dto.password.length < 6) {
        this.sendError(res, 'Password must be at least 6 characters', 400);
        return;
      }

      const result = await this.authService.login(dto);

      if (result.success && result.data) {
        this.sendSuccess(res, result.data, 'Login successful', 200);
      } else {
        this.sendError(res, result.error || 'Login failed', 401);
      }
    } catch (error) {
      this.handleError(res, error, 'Login');
    }
  };

  /**
   * POST /auth/register
   * Register a new user
   */
  private register = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: RegisterRequestDTO = req.body;

      // Validate required fields
      const requiredFields = ['email', 'password', 'firstName', 'lastName', 'role'];
      for (const field of requiredFields) {
        if (!dto[field as keyof RegisterRequestDTO]) {
          this.sendError(res, `${field} is required`, 400);
          return;
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        this.sendError(res, 'Invalid email format', 400);
        return;
      }

      // Validate password strength
      if (dto.password.length < 8) {
        this.sendError(res, 'Password must be at least 8 characters', 400);
        return;
      }

      // Validate role
      const validRoles = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
      if (!validRoles.includes(dto.role)) {
        this.sendError(res, 'Invalid role. Must be one of: ' + validRoles.join(', '), 400);
        return;
      }

      const result = await this.authService.register(dto);

      if (result.success && result.data) {
        this.sendSuccess(res, result.data, 'Registration successful', 201);
      } else {
        this.sendError(res, result.error || 'Registration failed', 400);
      }
    } catch (error) {
      this.handleError(res, error, 'Register');
    }
  };

  /**
   * POST /auth/refresh-token
   * Refresh access token using refresh token
   */
  private refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        this.sendError(res, 'Refresh token is required', 400);
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);

      if (result.success && result.data) {
        this.sendSuccess(res, result.data, 'Token refreshed successfully', 200);
      } else {
        this.sendError(res, result.error || 'Token refresh failed', 401);
      }
    } catch (error) {
      this.handleError(res, error, 'Refresh Token');
    }
  };

  /**
   * POST /auth/logout
   * Logout user and invalidate refresh token
   */
  private logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        this.sendError(res, 'Refresh token is required', 400);
        return;
      }

      const result = await this.authService.logout(refreshToken);

      if (result.success) {
        this.sendSuccess(res, null, 'Logout successful', 200);
      } else {
        this.sendError(res, 'Logout failed', 400);
      }
    } catch (error) {
      this.handleError(res, error, 'Logout');
    }
  };

  /**
   * POST /auth/change-password
   * Change user password
   */
  private changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        this.sendError(res, 'User not authenticated', 401);
        return;
      }

      const dto: ChangePasswordRequestDTO = req.body;

      // Validate required fields
      if (!dto.currentPassword || !dto.newPassword) {
        this.sendError(res, 'Current password and new password are required', 400);
        return;
      }

      // Validate new password length
      if (dto.newPassword.length < 8) {
        this.sendError(res, 'New password must be at least 8 characters', 400);
        return;
      }

      const result = await this.authService.changePassword(userId, dto);

      if (result.success) {
        this.sendSuccess(res, null, 'Password changed successfully', 200);
      } else {
        this.sendError(res, result.error || 'Password change failed', 400);
      }
    } catch (error) {
      this.handleError(res, error, 'Change Password');
    }
  };

  /**
   * GET /auth/me
   * Get current user profile
   */
  private getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        this.sendError(res, 'User not authenticated', 401);
        return;
      }

      const profile = await this.authService.getUserProfile(userId);

      if (profile) {
        this.sendSuccess(res, profile, 'Profile retrieved successfully', 200);
      } else {
        this.sendError(res, 'User not found', 404);
      }
    } catch (error) {
      this.handleError(res, error, 'Get Current User');
    }
  };

  /**
   * POST /auth/verify-token
   * Verify if a token is valid
   */
  private verifyToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        this.sendError(res, 'Token is required', 400);
        return;
      }

      const validation = this.authService.validateToken(token);

      if (validation.valid) {
        this.sendSuccess(res, { valid: true, payload: validation.payload }, 'Token is valid', 200);
      } else {
        this.sendError(res, validation.error || 'Token is invalid', 401);
      }
    } catch (error) {
      this.handleError(res, error, 'Verify Token');
    }
  };

  /**
   * POST /auth/forgot-password
   * Initiate password reset process
   */
  private forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        this.sendError(res, 'Email is required', 400);
        return;
      }

      // In a real application, this would send a reset email
      // For now, we just acknowledge the request
      this.logger.info(`Password reset requested for: ${email}`);
      
      this.sendSuccess(
        res, 
        { message: 'If an account exists with this email, a reset link will be sent' },
        'Password reset initiated',
        200
      );
    } catch (error) {
      this.handleError(res, error, 'Forgot Password');
    }
  };

  /**
   * Middleware to authenticate requests
   */
  private authenticate = async (req: AuthenticatedRequest, res: Response, next: Function): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.sendError(res, 'Authorization header missing or invalid', 401);
        return;
      }

      const token = authHeader.substring(7);
      const validation = this.authService.validateToken(token);

      if (!validation.valid) {
        this.sendError(res, 'Invalid or expired token', 401);
        return;
      }

      req.user = validation.payload;
      next();
    } catch (error) {
      this.sendError(res, 'Authentication failed', 401);
    }
  };
}

// Singleton instance
let authControllerInstance: AuthController | null = null;

export function getAuthController(): AuthController {
  if (!authControllerInstance) {
    authControllerInstance = new AuthController();
  }
  return authControllerInstance;
}

export default getAuthController;
