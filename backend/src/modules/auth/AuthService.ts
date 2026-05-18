// modules/auth/AuthService.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRepository } from './AuthRepository';
import { logger } from '../../core/logger';
import { BaseService } from '../../shared/base/BaseService';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  ChangePasswordRequestDTO,
  AuthResponse,
  TokenPayload,
  LoginResult,
  RegisterResult,
  ValidateTokenResult,
} from './AuthTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const SALT_ROUNDS = 12;

const prisma = new PrismaClient();  // ✅ Create prisma instance directly

export class AuthService extends BaseService {
  private repository: AuthRepository;

  constructor() {
    super('AuthService');
    this.repository = new AuthRepository(prisma);
  }

  /**
   * User login with username and password
   */
  async login(data: LoginRequestDTO): Promise<LoginResult> {
    try {
      this.logger.info(`Login attempt for username: ${data.username}`);

      // Find user by username
      const user = await this.repository.findByUsername(data.username);
      
      if (!user) {
        this.logger.warn(`Login failed - user not found: ${data.username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      // Check if user is active
      if (!user.isActive) {
        this.logger.warn(`Login failed - account inactive: ${data.username}`);
        return { success: false, error: 'Account is deactivated' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(data.password, user.password);
      
      if (!isValidPassword) {
        this.logger.warn(`Login failed - invalid password: ${data.username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.username, user.role);

      // Update last login
      await this.repository.updateLastLogin(user.id);

      // Store refresh token
      await this.repository.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      );

      const response: AuthResponse = {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email || undefined,
          phone: user.phone || undefined,
          departmentId: user.departmentId || undefined,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.updatedAt || undefined,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: parseInt(JWT_EXPIRES_IN),
        tokenType: 'Bearer',
      };

      this.logger.info(`Login successful: ${data.username}`);
      return { success: true, data: response };
    } catch (error) {
      this.logger.error('Login error', { error, username: data.username });
      return { 
        success: false, 
        error: 'Authentication service unavailable' 
      };
    }
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequestDTO): Promise<RegisterResult> {
    try {
      this.logger.info(`Registration attempt for username: ${data.username}`);

      // Check if username already exists
      const exists = await this.repository.usernameExists(data.username);
      if (exists) {
        this.logger.warn(`Registration failed - username exists: ${data.username}`);
        return { success: false, error: 'Username already registered' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      // Create user
      const user = await this.repository.createUser({
        ...data,
        passwordHash,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.username, user.role);

      // Store refresh token
      await this.repository.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      const response: AuthResponse = {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email || undefined,
          phone: user.phone || undefined,
          departmentId: user.departmentId || undefined,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: parseInt(JWT_EXPIRES_IN),
        tokenType: 'Bearer',
      };

      this.logger.info(`Registration successful: ${data.username}`);
      return { success: true, data: response };
    } catch (error) {
      this.logger.error('Registration error', { error, username: data.username });
      return { 
        success: false, 
        error: 'Registration service unavailable' 
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      // Validate refresh token
      const validation = await this.repository.validateRefreshToken(refreshToken);
      
      if (!validation.valid) {
        this.logger.warn('Refresh token invalid or expired');
        return { success: false, error: 'Invalid refresh token' };
      }

      // Get user
      const user = await this.repository.findById(validation.userId);
      
      if (!user || !user.isActive) {
        this.logger.warn('User not found or inactive during refresh');
        return { success: false, error: 'User not found' };
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.username, user.role);

      // Update stored refresh token
      await this.repository.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Delete old refresh token
      await this.repository.deleteRefreshToken(refreshToken);

      const response: AuthResponse = {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email || undefined,
          phone: user.phone || undefined,
          departmentId: user.departmentId || undefined,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.updatedAt || undefined,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: parseInt(JWT_EXPIRES_IN),
        tokenType: 'Bearer',
      };

      return { success: true, data: response };
    } catch (error) {
      this.logger.error('Token refresh error', { error });
      return { 
        success: false, 
        error: 'Token refresh failed' 
      };
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, data: ChangePasswordRequestDTO): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user
      const user = await this.repository.findById(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

      // Update password
      await this.repository.changePassword(userId, newPasswordHash);

      this.logger.info(`Password changed successfully for user: ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Password change error', { error, userId });
      return { success: false, error: 'Password change failed' };
    }
  }

  /**
   * Logout (invalidate refresh token)
   */
  async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await this.repository.deleteRefreshToken(refreshToken);
      this.logger.info('User logged out successfully');
      return { success: true };
    } catch (error) {
      this.logger.error('Logout error', { error });
      return { success: false };
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): ValidateTokenResult {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
      return { valid: true, payload };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Token validation failed' 
      };
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, username: string, role: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: TokenPayload = { userId, username, role: role as any };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Get current user profile
   */
  async getUserProfile(userId: string) {
    try {
      const user = await this.repository.findById(userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.updatedAt,
      };
    } catch (error) {
      this.logger.error('Get user profile error', { error, userId });
      throw error;
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

export default getAuthService;