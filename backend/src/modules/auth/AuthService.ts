import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, Seniority } from '@prisma/client';
import { AuthRepository } from './AuthRepository';
import {
  LoginRequestDTO, ChangePasswordRequestDTO,
  AuthResponse, TokenPayload,
} from './AuthTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

/**
 * Fields that a user may change on their own profile via PUT /auth/profile.
 * role / seniority / department / license / specialization are all excluded —
 * those are managed by admin via UserService.updateFullProfile.
 */
const SELF_PROFILE_EDITABLE = ['fullName', 'email', 'phone', 'imageUrl'] as const;

export class AuthService {
  private repository: AuthRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.repository = new AuthRepository(prisma);
    this.prisma = prisma;
  }

  private parseExpiresIn(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return 86400;
    const val = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return val;
      case 'm': return val * 60;
      case 'h': return val * 3600;
      case 'd': return val * 86400;
      default:  return 86400;
    }
  }

  /**
   * Signs both access and refresh tokens.
   * The access token carries departmentId so downstream guards
   * (e.g. department-scoped shift queries) don't need a DB round-trip.
   */
  private async generateTokens(
    userId: string,
    username: string,
    role: string,
    seniority: Seniority,
    permissions: string[],
    departmentId: string | null = null,
  ) {
    const payload: TokenPayload = {
      userId,
      username,
      role: role as any,
      seniority,
      permissions,
      departmentId,
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
    return { accessToken, refreshToken, expiresIn: this.parseExpiresIn(JWT_EXPIRES_IN) };
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id, username: user.username, fullName: user.fullName, role: user.role,
      seniority: user.seniority, email: user.email, phone: user.phone, imageUrl: user.imageUrl,
      departmentId: user.departmentId, department: user.department, isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async login(data: LoginRequestDTO) {
    const user = await this.repository.findByUsername(data.username);
    if (!user || !user.isActive) return { success: false, error: 'Invalid credentials or inactive account' };

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) return { success: false, error: 'Invalid credentials' };

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role,
      user.seniority,
      permissions,
      user.departmentId ?? null,
    );

    await this.repository.updateLastLogin(user.id);
    await this.repository.storeRefreshToken(
      user.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000),
    );

    return {
      success: true,
      data: { user: this.mapUserResponse(user), ...tokens, tokenType: 'Bearer' },
    };
  }

  /**
   * Self-service profile update. Only SELF_PROFILE_EDITABLE fields are honored.
   * Anything else sent by the client is silently dropped.
   */
  async updateProfile(userId: string, updateData: any, imageUrl?: string) {
    const safeUpdate: any = {};
    for (const key of SELF_PROFILE_EDITABLE) {
      if (updateData[key] !== undefined) safeUpdate[key] = updateData[key];
    }
    if (imageUrl) safeUpdate.imageUrl = imageUrl;

    if (Object.keys(safeUpdate).length === 0) {
      // Nothing to update — return current state without erroring
      const current = await this.repository.findById(userId);
      return { success: true, data: { user: this.mapUserResponse(current) } };
    }

    const updatedUser = await this.repository.updateUser(userId, safeUpdate);
    const permissions = this.repository.mapUserPermissions(updatedUser);
    const tokens = await this.generateTokens(
      updatedUser.id,
      updatedUser.username,
      updatedUser.role,
      updatedUser.seniority,
      permissions,
      updatedUser.departmentId ?? null,
    );
    await this.repository.storeRefreshToken(
      updatedUser.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000),
    );

    return { success: true, data: { user: this.mapUserResponse(updatedUser), ...tokens, tokenType: 'Bearer' } };
  }

  async forgotPassword(username: string) {
    const user = await this.repository.findByUsername(username);
    if (!user) return { success: true, message: 'If the account exists, a reset link was sent.' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000);

    await this.repository.updateUser(user.id, { resetToken, resetExpiry });
    console.log(`🔑 Password reset token for ${username}: ${resetToken}`);

    return { success: true, message: 'If the account exists, a reset link was sent.' };
  }

  async refreshToken(refreshToken: string) {
    const validation = await this.repository.validateRefreshToken(refreshToken);
    if (!validation.valid) return { success: false, error: 'Invalid refresh token' };

    const user = await this.repository.findById(validation.userId);
    if (!user || !user.isActive) return { success: false, error: 'User not found' };

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role,
      user.seniority,
      permissions,
      user.departmentId ?? null,
    );

    await this.repository.storeRefreshToken(
      user.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000),
    );
    await this.repository.deleteRefreshToken(refreshToken);

    return { success: true, data: { user: this.mapUserResponse(user), ...tokens, tokenType: 'Bearer' } };
  }

  async changePassword(userId: string, data: ChangePasswordRequestDTO) {
    const user = await this.repository.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) return { success: false, error: 'Current password is incorrect' };

    const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await this.repository.updateUser(userId, { password: newPasswordHash });
    return { success: true };
  }

  async logout(refreshToken: string) {
    await this.repository.deleteRefreshToken(refreshToken);
    return { success: true };
  }
}