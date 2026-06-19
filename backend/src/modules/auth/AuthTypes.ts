import { Request } from 'express';
import { UserRole, Seniority } from '@prisma/client';

export interface LoginRequestDTO { username: string; password: string; }
export interface RegisterRequestDTO {
  username: string; password: string; fullName: string; role: UserRole;
  seniority?: Seniority; email?: string; phone?: string; imageUrl?: string;
  licenseNumber?: string; specialization?: string; departmentId?: string;
}
export interface ChangePasswordRequestDTO { currentPassword: string; newPassword: string; }

export interface TokenPayload {
  userId: string; username: string; role: UserRole; seniority: Seniority;
  permissions: string[]; // ✅ NEW: For Dynamic RBAC
  iat?: number; exp?: number;
}

export interface AuthenticatedRequest extends Request { user?: TokenPayload; }