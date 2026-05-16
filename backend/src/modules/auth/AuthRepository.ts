/**
 * Authentication Repository
 * Handles all authentication-related database operations
 */

import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { 
  LoginRequestDTO, 
  RegisterRequestDTO,
  AuthResponse 
} from './AuthTypes';

export class AuthRepository extends BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find user by email with role and department
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Create new user
   */
  async createUser(data: RegisterRequestDTO & { passwordHash: string }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        departmentId: data.departmentId,
        isActive: true,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: new Date() },
    });
  }

  /**
   * Store refresh token
   */
  async storeRefreshToken(userId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.upsert({
      where: { userId },
      update: {
        token: refreshToken,
        expiresAt,
      },
      create: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });
  }

  /**
   * Validate refresh token
   */
  async validateRefreshToken(refreshToken: string): Promise<{ userId: string; valid: boolean }> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      return { userId: '', valid: false };
    }

    const isValid = tokenRecord.expiresAt > new Date() && tokenRecord.user.isActive;

    return {
      userId: tokenRecord.userId,
      valid: isValid,
    };
  }

  /**
   * Delete refresh token
   */
  async deleteRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token: refreshToken },
    }).catch(() => {
      // Token might not exist, ignore error
    });
  }

  /**
   * Change password
   */
  async changePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newPasswordHash },
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    return !!user;
  }
}
