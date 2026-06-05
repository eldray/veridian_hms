import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Seniority } from '@prisma/client';
import { AuthRepository } from './AuthRepository';
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

export class AuthService {
  private repository: AuthRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new AuthRepository(prisma);
  }

  async login(data: LoginRequestDTO): Promise<LoginResult> {
    try {
      console.log(`Login attempt for username: ${data.username}`);

      const user = await this.repository.findByUsername(data.username);
      
      if (!user) {
        console.log(`Login failed - user not found: ${data.username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      if (!user.isActive) {
        console.log(`Login failed - account inactive: ${data.username}`);
        return { success: false, error: 'Account is deactivated' };
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      
      if (!isValidPassword) {
        console.log(`Login failed - invalid password: ${data.username}`);
        return { success: false, error: 'Invalid credentials' };
      }

      const tokens = await this.generateTokens(
        user.id, 
        user.username, 
        user.role,
        user.seniority  // ← ADD THIS
      );

      await this.repository.updateLastLogin(user.id);

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
          seniority: user.seniority,  // ← ADD THIS
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

      console.log(`Login successful: ${data.username}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Authentication service unavailable' 
      };
    }
  }

  async register(data: RegisterRequestDTO): Promise<RegisterResult> {
    try {
      console.log(`Registration attempt for username: ${data.username}`);

      const exists = await this.repository.usernameExists(data.username);
      if (exists) {
        console.log(`Registration failed - username exists: ${data.username}`);
        return { success: false, error: 'Username already registered' };
      }

      const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

      const user = await this.repository.createUser({
        username: data.username,
        passwordHash,
        fullName: data.fullName,
        role: data.role,
        seniority: data.seniority || 'JUNIOR',  // ← ADD THIS (default JUNIOR)
        email: data.email,
        phone: data.phone,
        licenseNumber: data.licenseNumber,
        specialization: data.specialization,
        departmentId: data.departmentId,
      });

      const tokens = await this.generateTokens(
        user.id, 
        user.username, 
        user.role,
        user.seniority  // ← ADD THIS
      );

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
          seniority: user.seniority,  // ← ADD THIS
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

      console.log(`Registration successful: ${data.username}`);
      return { success: true, data: response };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Registration service unavailable' 
      };
    }
  }

  async refreshToken(refreshToken: string): Promise<LoginResult> {
    try {
      const validation = await this.repository.validateRefreshToken(refreshToken);
      
      if (!validation.valid) {
        console.log('Refresh token invalid or expired');
        return { success: false, error: 'Invalid refresh token' };
      }

      const user = await this.repository.findById(validation.userId);
      
      if (!user || !user.isActive) {
        console.log('User not found or inactive during refresh');
        return { success: false, error: 'User not found' };
      }

      const tokens = await this.generateTokens(
        user.id, 
        user.username, 
        user.role,
        user.seniority  // ← ADD THIS
      );

      await this.repository.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      await this.repository.deleteRefreshToken(refreshToken);

      const response: AuthResponse = {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          seniority: user.seniority,  // ← ADD THIS
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
      console.error('Token refresh error:', error);
      return { 
        success: false, 
        error: 'Token refresh failed' 
      };
    }
  }

  async changePassword(userId: string, data: ChangePasswordRequestDTO): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await this.repository.findById(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = await bcrypt.compare(data.currentPassword, user.password);
      
      if (!isValidPassword) {
        return { success: false, error: 'Current password is incorrect' };
      }

      const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
      await this.repository.changePassword(userId, newPasswordHash);

      console.log(`Password changed successfully for user: ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Password change failed' };
    }
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    try {
      await this.repository.deleteRefreshToken(refreshToken);
      console.log('User logged out successfully');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

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

  // UPDATED: Include seniority in token generation
  private async generateTokens(
    userId: string, 
    username: string, 
    role: string, 
    seniority: Seniority  // ← ADD THIS PARAMETER
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: TokenPayload = { 
      userId, 
      username, 
      role: role as any,
      seniority  // ← ADD THIS
    };

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
        seniority: user.seniority,  // ← ADD THIS
        email: user.email,
        phone: user.phone,
        department: user.department,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.updatedAt,
      };
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }
}