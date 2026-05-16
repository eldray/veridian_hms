/**
 * Staff Module Types
 * Unified staff profile management for all hospital personnel
 */

import { Request } from 'express';

// ============================================================================
// Enums
// ============================================================================

export enum StaffRoleType {
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PHARMACIST = 'PHARMACIST',
  ADMIN_STAFF = 'ADMIN_STAFF',
  CLEANING_STAFF = 'CLEANING_STAFF',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  LOCUM = 'LOCUM',
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  PENDING = 'PENDING',
}

export enum ShiftType {
  MORNING = 'MORNING',      // 6AM - 2PM
  AFTERNOON = 'AFTERNOON',  // 2PM - 10PM
  NIGHT = 'NIGHT',          // 10PM - 6AM
  ROTATING = 'ROTATING',
  FLEXIBLE = 'FLEXIBLE',
}

// ============================================================================
// Database Models (Prisma aligned)
// ============================================================================

export interface IStaffProfile {
  id: string;
  userId: string;
  employeeId: string;
  roleType: StaffRoleType;
  employmentType: EmploymentType;
  status: StaffStatus;
  departmentId?: string;
  specialization?: string;
  licenseNumber?: string;
  licenseExpiryDate?: Date;
  qualification?: string;
  experienceYears?: number;
  shiftType?: ShiftType;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hourlyRate?: number;
  annualSalary?: number;
  joinDate: Date;
  endDate?: Date;
  bio?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs - Data Transfer Objects
// ============================================================================

// Create Staff Profile
export interface CreateStaffDTO {
  userId: string;
  roleType: StaffRoleType;
  employmentType: EmploymentType;
  departmentId?: string;
  specialization?: string;
  licenseNumber?: string;
  licenseExpiryDate?: Date;
  qualification?: string;
  experienceYears?: number;
  shiftType?: ShiftType;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hourlyRate?: number;
  annualSalary?: number;
  joinDate: Date;
  bio?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// Update Staff Profile
export interface UpdateStaffDTO {
  roleType?: StaffRoleType;
  employmentType?: EmploymentType;
  status?: StaffStatus;
  departmentId?: string;
  specialization?: string;
  licenseNumber?: string;
  licenseExpiryDate?: Date;
  qualification?: string;
  experienceYears?: number;
  shiftType?: ShiftType;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hourlyRate?: number;
  annualSalary?: number;
  endDate?: Date;
  bio?: string;
  photoUrl?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// Staff List Query
export interface StaffListQueryDTO {
  page?: number;
  limit?: number;
  roleType?: StaffRoleType;
  status?: StaffStatus;
  departmentId?: string;
  employmentType?: EmploymentType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Staff Statistics
export interface StaffStatisticsDTO {
  totalStaff: number;
  byRoleType: Record<StaffRoleType, number>;
  byStatus: Record<StaffStatus, number>;
  byEmploymentType: Record<EmploymentType, number>;
  byDepartment: Record<string, number>;
  onLeaveCount: number;
  newHiresThisMonth: number;
  averageExperienceYears: number;
}

// Staff Availability
export interface StaffAvailabilityDTO {
  staffId: string;
  date: string;
  isAvailable: boolean;
  shiftType?: ShiftType;
  reason?: string;
}

// ============================================================================
// Extended Types with Relations
// ============================================================================

export interface StaffWithRelations extends IStaffProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
    role: any;
  };
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  appointments?: any[]; // Reference to appointment module
  attendances?: any[];  // Reference to attendance module
}

// ============================================================================
// Doctor-Specific Extensions (for backward compatibility)
// ============================================================================

export interface DoctorProfileDTO extends IStaffProfile {
  roleType: StaffRoleType.DOCTOR;
  specialization: string;
  licenseNumber: string;
  licenseExpiryDate: Date;
}

// ============================================================================
// Express Request Extensions
// ============================================================================

export interface StaffAuthenticatedRequest extends Request {
  staff?: StaffWithRelations;
}
