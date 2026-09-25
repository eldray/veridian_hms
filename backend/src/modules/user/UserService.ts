import { PrismaClient, Seniority, LeaveStatus, ShiftType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { BaseService } from '../../shared/base/BaseService';
import { UserRepository } from './UserRepository';
import { 
  UpdateUserDTO, UserFilters, UserResponse, TokenRefreshResult,
  UserUpdateResult, MEDICAL_STAFF_ROLES,
  CreateShiftDTO, UpdateShiftDTO, ShiftFilters,
  CreateLeaveDTO, UpdateLeaveDTO, LeaveFilters
} from './UserTypes';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export class UserService extends BaseService {
  private repository: UserRepository;

  constructor(prisma: PrismaClient) {
    super('UserService');
    this.repository = new UserRepository(prisma);
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getAllUsers(filters: UserFilters = {}) {
    this.logInfo('Fetching all users', { filters });
    return this.repository.findAll(filters);
  }

// Add to UserService.ts after getAllUsers:

async getUserById(userId: string): Promise<UserResponse> {
  this.logInfo('Fetching user by id', { userId });
  const user = await this.repository.findById(userId);
  if (!user) throw new Error('User not found');
  return user;
}

async getShiftById(shiftId: string): Promise<ShiftResponse> {
  this.logInfo('Fetching shift by id', { shiftId });
  const shift = await this.repository.findShiftById(shiftId);
  if (!shift) throw new Error('Shift not found');
  return shift;
}

async getLeaveById(leaveId: string): Promise<LeaveResponse> {
  this.logInfo('Fetching leave by id', { leaveId });
  const leave = await this.repository.findLeaveById(leaveId);
  if (!leave) throw new Error('Leave request not found');
  return leave;
}

  async updateUser(userId: string, updateData: UpdateUserDTO, currentUserId: string): Promise<UserUpdateResult> {
    this.logInfo('Updating user', { userId, updateData });

    const existingUser = await this.repository.findById(userId);
    if (!existingUser) throw new Error('User not found');

    this.validateMedicalStaffRequirements(updateData, existingUser);

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.repository.findByEmail(updateData.email);
      if (emailExists && emailExists.id !== userId) throw new Error('Email already exists');
    }

    const dataToUpdate: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof UpdateUserDTO] !== undefined) {
        dataToUpdate[key] = updateData[key as keyof UpdateUserDTO];
      }
    });

    const updatedUser = await this.repository.update(userId, dataToUpdate);

    const isOwnProfile = currentUserId === userId;
    const roleChanged = updateData.role !== undefined && updateData.role !== existingUser.role;
    const seniorityChanged = updateData.seniority !== undefined && updateData.seniority !== existingUser.seniority;

    if (isOwnProfile && (roleChanged || seniorityChanged)) {
      this.logInfo('User updated own role/seniority - refreshing tokens', { userId });
      const tokens = await this.refreshUserTokens(userId);
      return { user: tokens.user, tokensRefreshed: true, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    return { user: updatedUser };
  }

  async deactivateUser(userId: string): Promise<UserResponse> {
    this.logInfo('Deactivating user', { userId });
    const existing = await this.repository.findById(userId);
    if (!existing) throw new Error('User not found');
    return this.repository.deactivateUser(userId);
  }

  /**
   * Returns the effective permission strings for a user.
   * Admins implicitly hold all permissions ('*'). Other users derive their
   * permissions from the dynamic RBAC roles relation (Role -> RolePermission -> Permission).
   */
  async getUserPermissions(userId: string, role?: string): Promise<{ role: string; permissions: string[] }> {
    this.logInfo('Fetching permissions for current user', { userId });

    const permissions = await this.repository.getUserPermissions(userId);
    const effectiveRole = role || (await this.repository.findById(userId))?.role || 'unknown';

    // Admins implicitly hold all permissions.
    if (effectiveRole === 'admin' && !permissions.includes('*')) {
      permissions.unshift('*');
    }

    return { role: effectiveRole, permissions };
  }

  async refreshUserTokens(userId: string): Promise<TokenRefreshResult> {
    this.logInfo('Refreshing user tokens', { userId });

    const user = await this.repository.findById(userId);
    if (!user) throw new Error('User not found');

    await this.repository.deleteAllRefreshTokens(userId);

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, seniority: user.seniority },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await this.repository.createRefreshToken(userId, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return { accessToken, refreshToken, user };
  }

  private validateMedicalStaffRequirements(updateData: UpdateUserDTO, existingUser: UserResponse): void {
    const roleBeingSet = updateData.role || existingUser.role;
    const licenseBeingSet = updateData.licenseNumber ?? existingUser.licenseNumber;
    const specializationBeingSet = updateData.specialization ?? existingUser.specialization;

    if (MEDICAL_STAFF_ROLES.includes(roleBeingSet as any) && !licenseBeingSet) {
      throw new Error(`License number is required for ${roleBeingSet} role`);
    }

    if (roleBeingSet === 'doctor' && !specializationBeingSet) {
      throw new Error('Specialization is required for doctor role');
    }
  }

  // ==========================================
  // SHIFT MANAGEMENT
  // ==========================================

  async getAllShifts(filters: ShiftFilters = {}) {
    this.logInfo('Fetching all shifts', { filters });
    return this.repository.findAllShifts(filters);
  }

  
  async createShift(data: CreateShiftDTO) {
    this.logInfo('Creating shift', { userId: data.userId, shiftDate: data.shiftDate });

    const user = await this.repository.findById(data.userId);
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('Cannot create shift for inactive user');

    // Resolve userId → staffId via StaffProfile
    const staffProfile = await this.repository.prisma.staffProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true },
    });
    if (!staffProfile) throw new Error('Staff profile not found for this user. Create a staff profile first.');

    // ✅ FIX: Convert shiftDate to Date if string
    const shiftDate = data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate);
    
    // Parse time strings (HH:mm) into DateTime
    const startDateTime = new Date(shiftDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(shiftDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // If end time is earlier than start time (e.g., night shift crossing midnight)
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    return this.repository.createShift({
      staffId: staffProfile.id,
      shiftDate: shiftDate,
      startTime: startDateTime,
      endTime: endDateTime,
      shiftType: data.shiftType || 'morning',
      notes: data.notes || null,
    });
  }

  async updateShift(shiftId: string, data: UpdateShiftDTO) {
    this.logInfo('Updating shift', { shiftId });
    const existing = await this.repository.findShiftById(shiftId);
    if (!existing) throw new Error('Shift not found');
    
    const updateData: any = {};
    
    if (data.shiftDate !== undefined) {
      updateData.shiftDate = data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate);
    }
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // Parse time strings if provided
    if (data.startTime) {
      const baseDate = data.shiftDate ? (data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate)) : existing.shiftDate;
      const startDateTime = new Date(baseDate);
      const [hour, minute] = data.startTime.split(':').map(Number);
      startDateTime.setHours(hour, minute, 0, 0);
      updateData.startTime = startDateTime;
    }
    
    if (data.endTime) {
      const baseDate = data.shiftDate ? (data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate)) : existing.shiftDate;
      const endDateTime = new Date(baseDate);
      const [hour, minute] = data.endTime.split(':').map(Number);
      endDateTime.setHours(hour, minute, 0, 0);
      updateData.endTime = endDateTime;
    }
    
    return this.repository.updateShift(shiftId, updateData);
  }

  async deleteShift(shiftId: string) {
    this.logInfo('Deleting shift', { shiftId });
    const existing = await this.repository.findShiftById(shiftId);
    if (!existing) throw new Error('Shift not found');
    await this.repository.deleteShift(shiftId);
  }

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================

  async getAllLeaves(filters: LeaveFilters = {}) {
    this.logInfo('Fetching all leaves', { filters });
    return this.repository.findAllLeaves(filters);
  }

// In UserService.ts, fix the createLeave method:

async createLeave(userId: string, data: CreateLeaveDTO) {
  this.logInfo('Creating leave request', { userId, leaveType: data.leaveType });

  const user = await this.repository.findById(userId);
  if (!user) throw new Error('User not found');
  if (!user.isActive) throw new Error('Cannot create leave for inactive user');

  // Resolve userId → staffId via StaffProfile
  const staffProfile = await this.repository.prisma.staffProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!staffProfile) throw new Error('Staff profile not found for this user. Create a staff profile first.');

  // ✅ FIX: Convert string dates to Date objects if needed
  const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format');
  }
  
  if (startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }

  // Calculate total days
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return this.repository.createLeave({
    staffId: staffProfile.id,
    leaveType: data.leaveType,
    startDate: startDate,
    endDate: endDate,
    totalDays,
    status: 'pending',
    reason: data.reason || null,
  });
}

  async updateLeave(leaveId: string, data: UpdateLeaveDTO, approverId?: string) {
    this.logInfo('Updating leave request', { leaveId, status: data.status });

    const existing = await this.repository.findLeaveById(leaveId);
    if (!existing) throw new Error('Leave request not found');

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    
    if (data.status && data.status !== 'pending') {
      if (!approverId) throw new Error('Approver ID required for approval/rejection');
      updateData.approvedById = approverId;
    }

    return this.repository.updateLeave(leaveId, updateData);
  }

  async deleteLeave(leaveId: string) {
    this.logInfo('Deleting leave request', { leaveId });
    const existing = await this.repository.findLeaveById(leaveId);
    if (!existing) throw new Error('Leave request not found');
    if (existing.status !== 'pending') throw new Error('Can only delete pending leave requests');
    await this.repository.deleteLeave(leaveId);
  }
}