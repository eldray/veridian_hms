import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
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
// A process-wide dummy hash keeps unknown usernames on the same bcrypt-cost path
// as existing accounts, without storing or reusing a real user's password.
const DUMMY_PASSWORD_HASH = bcrypt.hash(randomBytes(32).toString('hex'), SALT_ROUNDS);

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
    version = 0,
  ) {
    const payload: TokenPayload = {
      userId,
      username,
      role: role as any,
      seniority,
      permissions,
      departmentId: departmentId || '',
      version,
    };
    const accessToken = jwt.sign(payload, getJwtSecret(), { algorithm: 'HS256', expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, getJwtSecret(), { algorithm: 'HS256', expiresIn: REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn'] });
    return { accessToken, refreshToken, expiresIn: this.parseExpiresIn(JWT_EXPIRES_IN) };
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id, username: user.username, fullName: user.fullName, role: user.role,
      seniority: user.seniority, email: user.email, phone: user.phone, imageUrl: user.imageUrl,
      departmentId: user.departmentId, department: user.department, isActive: user.isActive,
      version: user.version,
      createdAt: user.createdAt,
    };
  }

  async login(data: LoginRequestDTO) {
    const user = await this.repository.findByUsername(data.username);

    // Always perform one bcrypt comparison before rejecting a login. For an
    // unknown username use a random, process-local dummy hash; for inactive
    // accounts compare against their real hash. This reduces username
    // enumeration through both response text and obvious timing differences.
    const passwordHash = user ? user.password : await DUMMY_PASSWORD_HASH;
    const isValid = await bcrypt.compare(data.password, passwordHash);
    if (!user || !user.isActive || !isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role,
      user.seniority,
      permissions,
      user.departmentId ?? null,
      user.version,
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
      updatedUser.version,
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
    const message = 'If the account is eligible, a password reset request has been sent for administrator review.';
    const normalized = String(username || '').trim();
    if (!normalized) return { success: true, message };
    const user = await this.repository.findByUsername(normalized);
    if (!user || !user.isActive) return { success: true, message };

    const existing = await this.prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, status: 'pending' },
    });
    if (!existing) {
      await this.prisma.passwordResetRequest.create({ data: { userId: user.id } });
    }
    return { success: true, message };
  }

  async completePasswordReset(username: string, code: string, newPassword: string) {
    const user = await this.repository.findByUsername(String(username || '').trim());
    if (!user || !user.isActive) return { success: false, error: 'Invalid or expired reset code' };
    const request = await this.prisma.passwordResetRequest.findFirst({
      where: { userId: user.id, status: 'approved', expiresAt: { gt: new Date() } },
      orderBy: { reviewedAt: 'desc' },
    });
    const suppliedHash = createHash('sha256').update(String(code || '').trim()).digest('hex');
    if (!request?.codeHash || suppliedHash !== request.codeHash) {
      return { success: false, error: 'Invalid or expired reset code' };
    }
    const policyError = passwordPolicyError(newPassword, { username: user.username, email: user.email });
    if (policyError) return { success: false, error: policyError };
    const password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetRequest.updateMany({
        where: { id: request.id, status: 'approved', codeHash: suppliedHash, expiresAt: { gt: new Date() } },
        data: { status: 'completed', completedAt: new Date(), codeHash: null },
      });
      if (consumed.count !== 1) throw new Error('Invalid or expired reset code');
      await tx.user.update({ where: { id: user.id }, data: { password, resetToken: null, resetExpiry: null, version: { increment: 1 } } });
      await tx.refreshToken.deleteMany({ where: { userId: user.id } });
    });
    return { success: true };
  }

  async refreshToken(refreshToken: string) {
    const validation = await this.repository.validateRefreshToken(refreshToken);
    if (!validation.valid) {
      // A refresh token that verifies cryptographically but is absent from the
      // store has already been rotated: treat it as possible theft and revoke
      // every session for that user. Expired/invalid signatures are ignored.
      try {
        const decoded = jwt.verify(refreshToken, getJwtSecret(), { algorithms: ['HS256'] }) as { userId?: string; type?: string };
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
      user.version,
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
    // Change the password/version and revoke refresh sessions atomically. If
    // either write fails, neither takes effect, so an old refresh token cannot
    // survive a partially completed password change.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: newPasswordHash, version: { increment: 1 } },
      });
      await tx.refreshToken.deleteMany({ where: { userId } });
    });
    return { success: true };
  }

  async logout(refreshToken: string) {
    await this.repository.deleteRefreshToken(refreshToken);
    return { success: true };
  }
}