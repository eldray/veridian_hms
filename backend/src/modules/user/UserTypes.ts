import { Seniority, LeaveStatus, ShiftType, EmploymentType } from '@prisma/client';

// ==========================================
// USER DTOs
// ==========================================

/**
 * Admin-only account creation DTO.
 * Password is hashed inside UserService before it reaches the repository.
 * No tokens are issued by this path — the admin is creating someone else's account.
 */
export interface CreateUserDTO {
  username: string;
  password: string;
  fullName: string;
  role: string;
  seniority?: Seniority;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  departmentId?: string;
}

export interface UpdateUserDTO {
  fullName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  specialization?: string;
  role?: string;
  seniority?: Seniority;
  isActive?: boolean;
  departmentId?: string | null;
  imageUrl?: string;
  headedDepartmentId?: string | null;
}

export interface UserFilters {
  role?: string;
  departmentId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserResponse {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  imageUrl: string | null;
  licenseNumber: string | null;
  specialization: string | null;
  role: string;
  seniority: Seniority;
  isActive: boolean;
  departmentId: string | null;
  department: { id: string; name: string } | null;
  headedDepartment: { id: string; name: string } | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface UserUpdateResult {
  user: UserResponse;
  tokensRefreshed?: boolean;
  accessToken?: string;
  refreshToken?: string;
}

// ==========================================
// SHIFT DTOs
// ==========================================

export interface CreateShiftDTO {
  userId: string;
  shiftDate: Date | string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  shiftType?: ShiftType;
  notes?: string;
}

export interface UpdateShiftDTO {
  shiftDate?: Date | string;
  startTime?: string;
  endTime?: string;
  shiftType?: ShiftType;
  notes?: string;
}

export interface ShiftResponse {
  id: string;
  userId: string;
  user: { id: string; fullName: string; role: string };
  shiftDate: Date;
  startTime: Date;
  endTime: Date;
  shiftType: ShiftType;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShiftFilters {
  userId?: string;
  departmentId?: string;
  shiftDate?: Date;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

// ==========================================
// LEAVE DTOs
//
// API boundary uses lowercase ('annual', 'sick', ...).
// UserService maps these to the Prisma enum (ANNUAL, SICK, ...).
// ==========================================

export type LeaveTypeInput =
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'emergency'
  | 'unpaid';

export interface CreateLeaveDTO {
  leaveType: LeaveTypeInput;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}

export interface UpdateLeaveDTO {
  status?: LeaveStatus;
  reason?: string;
  approvedById?: string;
}

export interface LeaveResponse {
  id: string;
  userId: string;
  user: { id: string; fullName: string; role: string; department: { id: string; name: string } | null };
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  status: LeaveStatus;
  reason: string | null;
  approvedById: string | null;
  approvedBy: { id: string; fullName: string } | null;
  approver?: { id: string; fullName: string } | null; // alias used by UI
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveFilters {
  userId?: string;
  departmentId?: string;
  status?: LeaveStatus;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

// ==========================================
// HR / FULL PROFILE DTOs
// ==========================================

export interface FullProfileUserDTO {
  fullName?: string;
  email?: string;
  phone?: string;
  imageUrl?: string;
  role?: string;
  seniority?: Seniority;
  departmentId?: string | null;
  licenseNumber?: string | null;
  specialization?: string | null;
  isActive?: boolean;
}

export interface FullProfileHrDTO {
  employeeId?: string;
  employmentType?: EmploymentType;
  dateJoined?: Date | string;
  jobGradeId?: string | null;
  salaryStepId?: string | null;
  bio?: string | null;
  nextOfKinName?: string | null;
  nextOfKinPhone?: string | null;
}

export interface UpdateFullProfileDTO {
  user?: FullProfileUserDTO;
  hr?: FullProfileHrDTO;
}

export interface PayslipFilters {
  month?: number;
  year?: number;
  userId?: string;
  isPaid?: boolean;
  page?: number;
  limit?: number;
}

export interface GeneratePayslipDTO {
  month: number;
  year: number;
}

export interface RunPayrollDTO {
  month: number;
  year: number;
}

// ==========================================
// VALIDATION CONSTANTS
// ==========================================

export const VALID_ROLES = [
  'admin', 'hr_officer', 'doctor', 'nurse', 'midwife',
  'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer',
] as const;

export const VALID_SENIORITY = ['TRAINEE', 'JUNIOR', 'SENIOR', 'PRINCIPAL'] as const;

export const MEDICAL_STAFF_ROLES = ['doctor', 'nurse', 'midwife'] as const;

export const VALID_LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'unpaid'] as const;

export const VALID_SHIFT_TYPES = ['morning', 'afternoon', 'night', 'on_call'] as const;

// Lowercase API value → Prisma LeaveType enum value
export const LEAVE_TYPE_TO_PRISMA: Record<LeaveTypeInput, string> = {
  annual: 'ANNUAL',
  sick: 'SICK',
  maternity: 'MATERNITY',
  paternity: 'PATERNITY',
  emergency: 'EMERGENCY',
  unpaid: 'UNPAID',
};