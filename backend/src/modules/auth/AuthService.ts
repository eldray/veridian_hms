import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { PrismaClient, Seniority } from '@prisma/client';
import { AuthRepository } from './AuthRepository';
import {
  LoginRequestDTO, ChangePasswordRequestDTO,
  AuthResponse, TokenPayload,
} from './AuthTypes';
import { bcryptRounds, refreshTokenExpiresAt, refreshTokenLifetime } from '../../utils/tokenConfig';
import { passwordPolicyError } from '../../utils/passwordPolicy';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters');
  }
  return secret;
};
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = refreshTokenLifetime();
const SALT_ROUNDS = bcryptRounds();

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
      departmentId: departmentId || '',
    };
    const accessToken = jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'] });
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
      user.id, tokens.refreshToken, refreshTokenExpiresAt(),
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
      updatedUser.id, tokens.refreshToken, refreshTokenExpiresAt(),
    );

    return { success: true, data: { user: this.mapUserResponse(updatedUser), ...tokens, tokenType: 'Bearer' } };
  }

  /**
   * The "forgot password" entry point on the login screen.
   *
   * It cannot hand out a reset link: this deployment runs inside the hospital
   * with no mail transport, and a token minted here was previously written to
   * the user row in plain text that nothing ever consumed. The working path is
   * an administrator (`PATCH /users/:id/password`), so this answers with that
   * instruction — and answers the same way whether or not the account exists,
   * so the endpoint stays a poor way to enumerate usernames.
   */
  async forgotPassword(username: string) {
    const message =
      'Password resets are handled by a system administrator at this facility. Please ask one to reset it for you.';
    const user = await this.repository.findByUsername(username);
    if (user) {
      // A reset is now an administrator decision, so no token from an earlier
      // release is left sitting on the account.
      await this.repository.updateUser(user.id, { resetToken: null, resetExpiry: null });
    }

    return { success: true, message };
  }

  async refreshToken(refreshToken: string) {
    const validation = await this.repository.validateRefreshToken(refreshToken);
    if (!validation.valid) {
      // A refresh token that verifies cryptographically but is absent from the
      // store has already been rotated: treat it as possible theft and revoke
      // every session for that user. Expired/invalid signatures are ignored.
      try {
        const decoded = jwt.verify(refreshToken, getJwtSecret()) as { userId?: string; type?: string };
        if (decoded.type === 'refresh' && decoded.userId) {
          await this.repository.deleteRefreshTokenForUser(decoded.userId);
        }
      } catch {
        /* expired or invalid token: nothing to revoke */
      }
      return { success: false, error: 'Invalid refresh token' };
    }

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
      user.id, tokens.refreshToken, refreshTokenExpiresAt(),
    );
    await this.repository.deleteRefreshToken(refreshToken);

    return { success: true, data: { user: this.mapUserResponse(user), ...tokens, tokenType: 'Bearer' } };
  }

  async changePassword(userId: string, data: ChangePasswordRequestDTO) {
    const user = await this.repository.findById(userId);
    if (!user) return { success: false, error: 'User not found' };

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) return { success: false, error: 'Current password is incorrect' };

    if (data.newPassword === data.currentPassword) {
      return { success: false, error: 'New password must be different from the current password' };
    }
    const policyError = passwordPolicyError(data.newPassword, {
      username: user.username,
      email: user.email,
    });
    if (policyError) return { success: false, error: policyError };

    const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    await this.repository.updateUser(userId, { password: newPasswordHash });
    // Changing a password must invalidate every other session for this account.
    await this.repository.deleteRefreshTokenForUser(userId);
    return { success: true };
  }

  async logout(refreshToken: string) {
    await this.repository.deleteRefreshToken(refreshToken);
    return { success: true };
  }
}