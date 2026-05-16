/**
 * User Module Types
 * Core identity management for all system users (Staff, Patients, Admins)
 */

import { Request } from 'express';

// ============================================================================
// Enums
// ============================================================================

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  PATIENT = 'PATIENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

// ============================================================================
// Database Models (Prisma aligned)
// ============================================================================

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  lastLoginAt?: Date;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// DTOs - Data Transfer Objects
// ============================================================================

// Create User
export interface CreateUserDTO {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  emailVerified?: boolean;
}

// Update User
export interface UpdateUserDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  status?: UserStatus;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

// Change Password
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

// Login Request
export interface LoginRequestDTO {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Login Response
export interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

// Token Refresh
export interface RefreshTokenDTO {
  refreshToken: string;
}

// User List Query
export interface UserListQueryDTO {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface UserWithRelations extends IUser {
  staffProfile?: import('./../staff/StaffTypes').IStaffProfile;
  patientProfile?: any; // Reference to patient module
}

// ============================================================================
// Express Request Extensions
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
  };
}

// ============================================================================
// Statistics
// ============================================================================

export interface UserStatisticsDTO {
  totalUsers: number;
  byRole: Record<UserRole, number>;
  byStatus: Record<UserStatus, number>;
  newUsersThisMonth: number;
  activeUsersLast7Days: number;
}
