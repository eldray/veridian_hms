import { loginLimiter } from '../../middleware/apiLimits';
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './AuthService';
import { LoginRequestDTO, ChangePasswordRequestDTO, AuthenticatedRequest } from './AuthTypes';

import { protect } from '../../middleware/authMiddleware';
import { uploadUserImage, handleUploadError } from '../../middleware/uploadMiddleware';
import { clearFileAccessCookie, setFileAccessCookie } from '../../middleware/fileAccess';

export class AuthController {
  public router: Router;
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // ── Public ─────────────────────────────────────────────
    this.router.post('/login', loginLimiter, this.login.bind(this));
    this.router.post('/refresh-token', this.refreshToken.bind(this));
    this.router.post('/forgot-password', this.forgotPassword.bind(this));

    // ── Protected ──────────────────────────────────────────
    this.router.post('/logout', protect, this.logout.bind(this));
    this.router.post('/change-password', protect, this.changePassword.bind(this));
    this.router.get('/profile', protect, this.getCurrentUser.bind(this));
    this.router.put(
      '/profile',
      protect,
      uploadUserImage,
      handleUploadError,
      this.updateProfile.bind(this),
    );
  }

  getRouter(): Router { return this.router; }

  private login = async (req: Request, res: Response) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Username and password are required' });
        return;
      }

      const result: any = await this.authService.login({ username, password });
      if (result.success && result.data?.user?.id) {
        setFileAccessCookie(res, result.data.user.id);
      }
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      // Keep internal details in the backend console only. Without this log,
      // Prisma/configuration errors are masked as an unexplained HTTP 500.
      console.error('[AUTH] Login failed:', error);
      res.status(500).json({ success: false, message: 'Login failed. Check the backend logs for the underlying error.' });
    }
  };

  private refreshToken = async (req: Request, res: Response) => {
    try {
      const result: any = await this.authService.refreshToken(req.body.refreshToken);
      if (result.success && result.data?.user?.id) {
        setFileAccessCookie(res, result.data.user.id);
      }
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Token refresh failed' });
    }
  };

  private logout = async (req: AuthenticatedRequest, res: Response) => {
    clearFileAccessCookie(res);
    try {
      const result = await this.authService.logout(req.body.refreshToken);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  };

  private changePassword = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.authService.changePassword(req.user!.userId, req.body);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Password change failed' });
    }
  };

  private getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.status(200).json({ success: true, data: req.user });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get profile' });
    }
  };

  private updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { fullName, email, phone, licenseNumber, specialization, seniority } = req.body;
      const imageUrl = req.file ? `/api/uploads/users/${req.file.filename}` : undefined;

      const updateData = { fullName, email, phone, licenseNumber, specialization, seniority };
      const result = await this.authService.updateProfile(userId, updateData, imageUrl);
      res.status(200).json(result);
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  };

  private forgotPassword = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.forgotPassword(req.body.username);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: 'Password reset failed' });
    }
  };
}