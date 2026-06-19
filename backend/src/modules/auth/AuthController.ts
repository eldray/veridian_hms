import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './AuthService';
import { LoginRequestDTO, RegisterRequestDTO, ChangePasswordRequestDTO, AuthenticatedRequest } from './AuthTypes';

// ✅ Import global middlewares
import { protect } from '../../middleware/authMiddleware'; 
import { uploadUserImage, handleUploadError } from '../../middleware/uploadMiddleware';

export class AuthController {
  public router: Router;
  private authService: AuthService;

  constructor(prisma: PrismaClient) {
    this.authService = new AuthService(prisma);
    this.router = Router();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    // Public routes
    this.router.post('/login', this.login.bind(this));
    this.router.post('/register', this.register.bind(this));
    this.router.post('/refresh-token', this.refreshToken.bind(this));
    this.router.post('/forgot-password', this.forgotPassword.bind(this));
    
    // ✅ Protected routes using global 'protect' middleware
    this.router.post('/logout', protect, this.logout.bind(this));
    this.router.post('/change-password', protect, this.changePassword.bind(this));
    this.router.get('/profile', protect, this.getCurrentUser.bind(this));
    
    // ✅ NEW: Profile update with Image Upload support
    // Note: Frontend must send the image file with the field name 'image'
    this.router.put('/profile', protect, uploadUserImage, handleUploadError, this.updateProfile.bind(this)); 
  }

  getRouter(): Router { return this.router; }

  private login = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.login(req.body);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) { res.status(500).json({ success: false, message: 'Login failed' }); }
  };

  private register = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.register(req.body);
      res.status(result.success ? 201 : 400).json(result);
    } catch (error) { res.status(500).json({ success: false, message: 'Registration failed' }); }
  };

  private refreshToken = async (req: Request, res: Response) => {
    try {
      const result = await this.authService.refreshToken(req.body.refreshToken);
      res.status(result.success ? 200 : 401).json(result);
    } catch (error) { res.status(500).json({ success: false, message: 'Token refresh failed' }); }
  };

  private logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.authService.logout(req.body.refreshToken);
      res.status(200).json(result);
    } catch (error) { res.status(500).json({ success: false, message: 'Logout failed' }); }
  };

  private changePassword = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await this.authService.changePassword(req.user!.userId, req.body);
      res.status(result.success ? 200 : 400).json(result);
    } catch (error) { res.status(500).json({ success: false, message: 'Password change failed' }); }
  };

  private getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
      // We can just use the user data from the JWT, or fetch fresh from DB if needed
      res.status(200).json({ success: true, data: req.user }); 
    } catch (error) { res.status(500).json({ success: false, message: 'Failed to get profile' }); }
  };

  // ✅ FIXED: Delegates entirely to Service, handles file upload
  private updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { fullName, email, phone, licenseNumber, specialization, seniority } = req.body;
      
      // ✅ Get image URL if file was uploaded
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
    } catch (error) { res.status(500).json({ success: false, message: 'Password reset failed' }); }
  };
}