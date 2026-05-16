/**
 * Authentication Module Types
 * Enterprise-grade type definitions for authentication
 */

import { Request } from 'express';

// DTOs
export interface LoginRequestDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequestDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST';
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
  email: string;
}

export interface VerifyTokenRequestDTO {
  token: string;
}

// Response Types
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
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
  email: string;
  role: string;
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
