/**
 * User Service
 * Business logic for user identity management, authentication, and authorization
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { BaseService } from '../../shared/base/BaseService';
import { UserRepository } from './UserRepository';
import {
  IUser,
  CreateUserDTO,
  UpdateUserDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  ChangePasswordDTO,
  UserListQueryDTO,
  UserStatisticsDTO,
  UserRole,
  UserStatus,
} from './UserTypes';

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export class UserService extends BaseService {
  private userRepository: UserRepository;
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshSecret: string;
  private refreshExpiresIn: string;

  constructor(userRepository: UserRepository) {
    super('UserService');
    this.userRepository = userRepository;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  /**
   * Register a new user
   */
  async register(dto: CreateUserDTO): Promise<{ user: IUser; message: string }> {
    this.logger.info(`Attempting to register user: ${dto.email}`);

    // Check if email already exists
    const existingUser = await this.userRepository.emailExists(dto.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate password strength
    this.validatePasswordStrength(dto.password);

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.userRepository.create({
      ...dto,
      password: passwordHash,
    });

    this.logger.info(`User registered successfully: ${user.id}`);

    return {
      user,
      message: 'Registration successful. Please verify your email.',
    };
  }

  /**
   * Login user
   */
  async login(dto: LoginRequestDTO): Promise<LoginResponseDTO> {
    this.logger.info(`Login attempt for: ${dto.email}`);

    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check user status
    if (user.status === UserStatus.SUSPENDED) {
      throw new Error('Account suspended. Please contact support.');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new Error('Account inactive. Please verify your email.');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    this.logger.info(`User logged in successfully: ${user.id}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
      tokenType: 'Bearer',
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret) as JWTPayload;
      
      const user = await this.userRepository.findByIdWithRelations(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status !== UserStatus.ACTIVE) {
        throw new Error('User account is not active');
      }

      const newAccessToken = this.generateAccessToken(user);

      return {
        accessToken: newAccessToken,
        expiresIn: this.parseExpiresIn(this.jwtExpiresIn),
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Change password
   */
  async changePassword(userId: string, dto: ChangePasswordDTO): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePasswordStrength(dto.newPassword);

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update password
    await this.userRepository.update(userId, {
      // Note: In real implementation, you'd add a passwordHash field to UpdateUserDTO
      // For now, we'll update directly via prisma in repository if needed
    });

    // Direct update for password hash (bypassing DTO limitation)
    await (this.userRepository as any).prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    this.logger.info(`Password changed for user: ${userId}`);

    return { message: 'Password changed successfully' };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<IUser> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: UpdateUserDTO): Promise<IUser> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check email uniqueness if changing email
    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.userRepository.emailExists(dto.email, userId);
      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    const updatedUser = await this.userRepository.update(userId, dto);
    this.logger.info(`User profile updated: ${userId}`);

    return updatedUser;
  }

  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(query: UserListQueryDTO) {
    return this.userRepository.findAllWithFilters(query);
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<UserStatisticsDTO> {
    return this.userRepository.getStatistics();
  }

  /**
   * Suspend user
   */
  async suspendUser(userId: string, adminId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new Error('Cannot suspend admin users');
    }

    await this.userRepository.update(userId, { status: UserStatus.SUSPENDED });
    this.logger.warn(`User ${userId} suspended by admin ${adminId}`);

    return { message: 'User suspended successfully' };
  }

  /**
   * Activate user
   */
  async activateUser(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.update(userId, { status: UserStatus.ACTIVE });
    this.logger.info(`User ${userId} activated`);

    return { message: 'User activated successfully' };
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, adminId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByIdWithRelations(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new Error('Cannot delete admin users');
    }

    await this.userRepository.softDelete(userId);
    this.logger.warn(`User ${userId} deleted by admin ${adminId}`);

    return { message: 'User deleted successfully' };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private generateAccessToken(user: IUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  private generateRefreshToken(user: IUser): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn });
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 900;
    }
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }
}
