import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, Seniority } from '@prisma/client';
import { AuthRepository } from './AuthRepository';
import { LoginRequestDTO, RegisterRequestDTO, ChangePasswordRequestDTO, AuthResponse, TokenPayload } from './AuthTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

export class AuthService {
  private repository: AuthRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.repository = new AuthRepository(prisma);
    this.prisma = prisma;
  }

  // ✅ FIX: Properly parse '24h', '7d' into seconds for the frontend
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
      default: return 86400;
    }
  }

  private async generateTokens(userId: string, username: string, role: string, seniority: Seniority, permissions: string[]) {
    const payload: TokenPayload = { userId, username, role: role as any, seniority, permissions };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

    return { accessToken, refreshToken, expiresIn: this.parseExpiresIn(JWT_EXPIRES_IN) };
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id, username: user.username, fullName: user.fullName, role: user.role,
      seniority: user.seniority, email: user.email, phone: user.phone, imageUrl: user.imageUrl,
      departmentId: user.departmentId, department: user.department, isActive: user.isActive, createdAt: user.createdAt
    };
  }

  async login(data: LoginRequestDTO) {
    const user = await this.repository.findByUsername(data.username);
    if (!user || !user.isActive) return { success: false, error: 'Invalid credentials or inactive account' };

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) return { success: false, error: 'Invalid credentials' };

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(user.id, user.username, user.role, user.seniority, permissions);

    await this.repository.updateLastLogin(user.id);
    await this.repository.storeRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000));

    return {
      success: true,
      data: { user: this.mapUserResponse(user), ...tokens, tokenType: 'Bearer' }
    };
  }

  async register(data: RegisterRequestDTO) {
    if (await this.repository.usernameExists(data.username)) return { success: false, error: 'Username already exists' };

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await this.repository.createUser({ ...data, passwordHash });

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(user.id, user.username, user.role, user.seniority, permissions);
    await this.repository.storeRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000));

    return { success: true, data: { user: this.mapUserResponse(user), ...tokens, tokenType: 'Bearer' } };
  }

  // ✅ NEW: Moved from Controller
  async updateProfile(userId: string, updateData: any, imageUrl?: string) {
    if (imageUrl) updateData.imageUrl = imageUrl;
    
    const updatedUser = await this.repository.updateUser(userId, updateData);
    const permissions = this.repository.mapUserPermissions(updatedUser);
    
    const tokens = await this.generateTokens(updatedUser.id, updatedUser.username, updatedUser.role, updatedUser.seniority, permissions);
    await this.repository.storeRefreshToken(updatedUser.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000));

    return { success: true, data: { user: this.mapUserResponse(updatedUser), ...tokens, tokenType: 'Bearer' } };
  }

  // ✅ NEW: Moved from Controller & Fixed Schema Crash
  async forgotPassword(username: string) {
    const user = await this.repository.findByUsername(username);
    if (!user) return { success: true, message: 'If the account exists, a reset link was sent.' }; // Security best practice

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour

    await this.repository.updateUser(user.id, { resetToken, resetExpiry });
    
    // TODO: Send email/SMS with resetToken here
    console.log(`🔑 Password reset token for ${username}: ${resetToken}`);

    return { success: true, message: 'If the account exists, a reset link was sent.' };
  }

  async refreshToken(refreshToken: string) {
    const validation = await this.repository.validateRefreshToken(refreshToken);
    if (!validation.valid) return { success: false, error: 'Invalid refresh token' };

    const user = await this.repository.findById(validation.userId);
    if (!user || !user.isActive) return { success: false, error: 'User not found' };

    const permissions = this.repository.mapUserPermissions(user);
    const tokens = await this.generateTokens(user.id, user.username, user.role, user.seniority, permissions);
    
    await this.repository.storeRefreshToken(user.id, tokens.refreshToken, new Date(Date.now() + 7 * 86400000));
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