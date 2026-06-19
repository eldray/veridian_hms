import { Seniority, LeaveStatus, ShiftType } from '@prisma/client';

// ==========================================
// USER DTOs
// ==========================================

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
// SHIFT DTOs (Simple HMS Scheduling)
// ==========================================

export interface CreateShiftDTO {
  userId: string;
  shiftDate: Date;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  shiftType?: ShiftType;
  notes?: string;
}

export interface UpdateShiftDTO {
  shiftDate?: Date;
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
// LEAVE DTOs (Simple HMS Leave Management)
// ==========================================

export interface CreateLeaveDTO {
  leaveType: 'annual' | 'sick' | 'maternity' | 'paternity' | 'emergency' | 'unpaid';
  startDate: Date;
  endDate: Date;
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
// VALIDATION CONSTANTS
// ==========================================

export const VALID_ROLES = [
  'admin', 'doctor', 'nurse', 'midwife',
  'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer',
] as const;

export const VALID_SENIORITY = ['TRAINEE', 'JUNIOR', 'SENIOR', 'PRINCIPAL'] as const;

export const MEDICAL_STAFF_ROLES = ['doctor', 'nurse', 'midwife'] as const;

export const VALID_LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'unpaid'] as const;

export const VALID_SHIFT_TYPES = ['morning', 'afternoon', 'night', 'on_call'] as const; // ✅ FIXED: Removed leading space