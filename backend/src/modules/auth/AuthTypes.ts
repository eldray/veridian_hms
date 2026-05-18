/**
 * Authentication Module Types
 * Enterprise-grade type definitions for authentication
 */

import { Request } from 'express';
import { UserRole } from '@prisma/client';

// DTOs
export interface LoginRequestDTO {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequestDTO {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  departmentId?: string;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface ChangePasswordRequestDTO {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequestDTO {
  username: string;
}

export interface VerifyTokenRequestDTO {
  token: string;
}

// Response Types
export interface AuthResponse {
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    email?: string;
    phone?: string;
    departmentId?: string;
    isActive: boolean;
    createdAt: Date;
    lastLogin?: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Token Payload
export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Extended Request
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// Service Results
export interface LoginResult {
  success: boolean;
  data?: AuthResponse;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  data?: AuthResponse;
  error?: string;
}

export interface ValidateTokenResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}