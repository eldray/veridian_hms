import { PrismaClient, Seniority, LeaveStatus, ShiftType, UserRole, AuditAction } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { BaseService } from '../../shared/base/BaseService';
import { UserRepository } from './UserRepository';
import {
  CreateUserDTO, UpdateUserDTO, UserFilters, UserResponse, TokenRefreshResult,
  UserUpdateResult, MEDICAL_STAFF_ROLES, VALID_ROLES, LEAVE_TYPE_TO_PRISMA,
  CreateShiftDTO, UpdateShiftDTO, ShiftFilters, ShiftResponse,
  CreateLeaveDTO, UpdateLeaveDTO, LeaveFilters, LeaveResponse,
  PayslipFilters,
} from './UserTypes';
import { AuditLogger } from '../audit/AuditLogger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 12;

/**
 * Roles that can perform "admin-like" operations: manage users, edit profiles,
 * approve leaves, generate payslips, manage shifts.
 */
const ADMIN_LIKE_ROLES = ['admin', 'super_admin', 'hr_officer'];

export class UserService extends BaseService {
  private repository: UserRepository;
  private auditLogger: AuditLogger;

  constructor(prisma: PrismaClient) {
    super('UserService');
    this.repository = new UserRepository(prisma);
    this.auditLogger = new AuditLogger(prisma);
  }

  private isAdminLike(role: string | undefined | null): boolean {
    return !!role && ADMIN_LIKE_ROLES.includes(role);
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getAllUsers(filters: UserFilters = {}) {
    return this.repository.findAll(filters);
  }

  async createUser(
    dto: CreateUserDTO,
    actor: { userId: string; ipAddress?: string; userAgent?: string },
  ): Promise<UserResponse> {
    this.logInfo('Creating user', { username: dto.username, role: dto.role, actor: actor.userId });

    if (!VALID_ROLES.includes(dto.role as any)) {
      throw new Error(`Invalid role: ${dto.role}`);
    }

    if (MEDICAL_STAFF_ROLES.includes(dto.role as any) && !dto.licenseNumber) {
      throw new Error(`License number is required for ${dto.role} role`);
    }
    if (dto.role === 'doctor' && !dto.specialization) {
      throw new Error('Specialization is required for doctor role');
    }

    if (await this.repository.usernameExists(dto.username)) {
      const err: any = new Error('Username already exists');
      err.statusCode = 409;
      throw err;
    }
    if (dto.email) {
      const emailExists = await this.repository.findByEmail(dto.email);
      if (emailExists) {
        const err: any = new Error('Email already exists');
        err.statusCode = 409;
        throw err;
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.repository.createUser({
      username: dto.username,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      seniority: (dto.seniority ?? 'JUNIOR') as Seniority,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      licenseNumber: dto.licenseNumber ?? null,
      specialization: dto.specialization ?? null,
      departmentId: dto.departmentId ?? null,
    });

    // Fire-and-forget audit
    await this.auditLogger.log({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.create,
      performedById: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
        departmentId: user.departmentId,
        seniority: user.seniority,
      },
    });

    return user;
  }

  async getUserById(userId: string): Promise<UserResponse> {
    const user = await this.repository.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  async getShiftById(shiftId: string): Promise<ShiftResponse> {
    const shift = await this.repository.findShiftById(shiftId);
    if (!shift) throw new Error('Shift not found');
    return shift;
  }

  async getLeaveById(leaveId: string): Promise<LeaveResponse> {
    const leave = await this.repository.findLeaveById(leaveId);
    if (!leave) throw new Error('Leave request not found');
    return leave;
  }

  async updateUser(
    userId: string,
    updateData: UpdateUserDTO,
    actor: { userId: string; role: string; ipAddress?: string; userAgent?: string },
  ): Promise<UserUpdateResult> {
    this.logInfo('Updating user', { userId, actor: actor.userId });

    const existingUser = await this.repository.findById(userId);
    if (!existingUser) throw new Error('User not found');

    // Only super_admin can assign the super_admin role
    if (updateData.role === 'super_admin' && actor.role !== 'super_admin') {
      throw new Error('Only super_admins can assign the super_admin role');
    }

    // Nobody can change their own role via this endpoint — role changes
    // for self must go through the full-profile HR path (still admin-gated).
    if (actor.userId === userId && updateData.role && updateData.role !== existingUser.role) {
      throw new Error('Cannot change your own role through this endpoint');
    }

    this.validateMedicalStaffRequirements(updateData, existingUser);

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await this.repository.findByEmail(updateData.email);
      if (emailExists && emailExists.id !== userId) throw new Error('Email already exists');
    }

    const dataToUpdate: any = {};
    if (updateData.fullName !== undefined)       dataToUpdate.fullName = updateData.fullName;
    if (updateData.email !== undefined)          dataToUpdate.email = updateData.email;
    if (updateData.phone !== undefined)          dataToUpdate.phone = updateData.phone;
    if (updateData.licenseNumber !== undefined)  dataToUpdate.licenseNumber = updateData.licenseNumber;
    if (updateData.specialization !== undefined) dataToUpdate.specialization = updateData.specialization;
    if (updateData.role !== undefined)           dataToUpdate.role = updateData.role as UserRole;
    if (updateData.seniority !== undefined)      dataToUpdate.seniority = updateData.seniority;
    if (updateData.isActive !== undefined)       dataToUpdate.isActive = updateData.isActive;
    if (updateData.imageUrl !== undefined)       dataToUpdate.imageUrl = updateData.imageUrl;

    if (updateData.departmentId !== undefined) {
      dataToUpdate.department = updateData.departmentId
        ? { connect: { id: updateData.departmentId } }
        : { disconnect: true };
    }
    if (updateData.headedDepartmentId !== undefined) {
      dataToUpdate.headedDepartment = updateData.headedDepartmentId
        ? { connect: { id: updateData.headedDepartmentId } }
        : { disconnect: true };
    }

    const updatedUser = await this.repository.update(userId, dataToUpdate);

    await this.auditLogger.log({
      entityType: 'User',
      entityId: userId,
      action: AuditAction.update,
      performedById: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: {
        fullName: existingUser.fullName,
        role: existingUser.role,
        seniority: existingUser.seniority,
        isActive: existingUser.isActive,
        departmentId: existingUser.departmentId,
      },
      newState: {
        fullName: updatedUser.fullName,
        role: updatedUser.role,
        seniority: updatedUser.seniority,
        isActive: updatedUser.isActive,
        departmentId: updatedUser.departmentId,
      },
    });

    const isOwnProfile = actor.userId === userId;
    const roleChanged = updateData.role !== undefined && updateData.role !== existingUser.role;
    const seniorityChanged = updateData.seniority !== undefined && updateData.seniority !== existingUser.seniority;

    if (isOwnProfile && (roleChanged || seniorityChanged)) {
      const tokens = await this.refreshUserTokens(userId);
      return {
        user: tokens.user,
        tokensRefreshed: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    }

    return { user: updatedUser };
  }

  async deactivateUser(userId: string, actor: { userId: string; role: string; ipAddress?: string; userAgent?: string }): Promise<UserResponse> {
    const existing = await this.repository.findById(userId);
    if (!existing) throw new Error('User not found');

    if (existing.role === 'super_admin' && actor.role !== 'super_admin') {
      throw new Error('Only super_admins can deactivate a super_admin');
    }

    const deactivated = await this.repository.deactivateUser(userId);

    await this.auditLogger.log({
      entityType: 'User',
      entityId: userId,
      action: AuditAction.delete,
      performedById: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: { isActive: true, role: existing.role },
      newState: { isActive: false },
      metadata: { note: 'User deactivated (soft delete)' },
    });

    return deactivated;
  }

  async getUserPermissions(userId: string, role?: string): Promise<{ role: string; permissions: string[] }> {
    const permissions = await this.repository.getUserPermissions(userId);
    const effectiveRole = role || (await this.repository.findById(userId))?.role || 'unknown';

    if ((effectiveRole === 'admin' || effectiveRole === 'super_admin') && !permissions.includes('*')) {
      permissions.unshift('*');
    }
    return { role: effectiveRole, permissions };
  }

  async refreshUserTokens(userId: string): Promise<TokenRefreshResult> {
    const user = await this.repository.findById(userId);
    if (!user) throw new Error('User not found');

    const permissions = await this.repository.getUserPermissions(userId);
    await this.repository.deleteAllRefreshTokens(userId);

    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, seniority: user.seniority, permissions },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    await this.repository.createRefreshToken(
      userId, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

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

  /**
   * Returns shifts for the caller.
   *
   * If the caller is admin / hr_officer / super_admin, they see every department
   * and can filter by departmentId explicitly.
   *
   * For everyone else, the result is forced to their own department — they cannot
   * see the wider hospital rota regardless of the query string.
   */
  async getAllShifts(
    filters: ShiftFilters = {},
    actor?: { userId: string; role: string; departmentId?: string | null },
  ) {
    const scoped: ShiftFilters = { ...filters };

    if (actor) {
      const isAdminLike = ADMIN_LIKE_ROLES.includes(actor.role);
      if (!isAdminLike) {
        // Force to the caller's own department. If they have no department,
        // they see nothing — an empty department is safer than leaking.
        scoped.departmentId = actor.departmentId ?? '__none__';
      }
    }

    return this.repository.findAllShifts(scoped);
  }

  
  async createShift(data: CreateShiftDTO, actor: { userId: string; ipAddress?: string; userAgent?: string }) {
    const user = await this.repository.findById(data.userId);
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('Cannot create shift for inactive user');

    const staffProfile = await this.repository.prisma.staffProfile.findUnique({
      where: { userId: data.userId },
      select: { id: true },
    });
    if (!staffProfile) {
      throw new Error(
        'This user has no staff profile yet. Ask an admin to open their HR profile and save it first.',
      );
    }

    const shiftDate = data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate);
    if (isNaN(shiftDate.getTime())) throw new Error('Invalid shift date');

    const startDateTime = new Date(shiftDate);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(shiftDate);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    if (endDateTime <= startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

    const shift = await this.repository.createShift({
      staffId: staffProfile.id,
      shiftDate,
      startTime: startDateTime,
      endTime: endDateTime,
      shiftType: data.shiftType || 'morning',
      notes: data.notes || null,
    });

    await this.auditLogger.log({
      entityType: 'Shift',
      entityId: shift.id,
      action: AuditAction.create,
      performedById: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      newState: {
        userId: data.userId,
        shiftDate: shiftDate.toISOString(),
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        shiftType: data.shiftType,
      },
    });

    return shift;
  }

  async updateShift(shiftId: string, data: UpdateShiftDTO, actor?: { userId: string }) {
    const existing = await this.repository.findShiftById(shiftId);
    if (!existing) throw new Error('Shift not found');

    const updateData: any = {};
    if (data.shiftDate !== undefined) {
      updateData.shiftDate = data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate);
    }
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.startTime) {
      const baseDate = data.shiftDate
        ? (data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate))
        : existing.shiftDate;
      const startDateTime = new Date(baseDate);
      const [hour, minute] = data.startTime.split(':').map(Number);
      startDateTime.setHours(hour, minute, 0, 0);
      updateData.startTime = startDateTime;
    }
    if (data.endTime) {
      const baseDate = data.shiftDate
        ? (data.shiftDate instanceof Date ? data.shiftDate : new Date(data.shiftDate))
        : existing.shiftDate;
      const endDateTime = new Date(baseDate);
      const [hour, minute] = data.endTime.split(':').map(Number);
      endDateTime.setHours(hour, minute, 0, 0);
      updateData.endTime = endDateTime;
    }

    const updated = await this.repository.updateShift(shiftId, updateData);

    if (actor) {
      await this.auditLogger.log({
        entityType: 'Shift',
        entityId: shiftId,
        action: AuditAction.update,
        performedById: actor.userId,
        previousState: existing,
        newState: updated,
      });
    }

    return updated;
  }

  async deleteShift(shiftId: string, actor?: { userId: string }) {
    const existing = await this.repository.findShiftById(shiftId);
    if (!existing) throw new Error('Shift not found');
    await this.repository.deleteShift(shiftId);

    if (actor) {
      await this.auditLogger.log({
        entityType: 'Shift',
        entityId: shiftId,
        action: AuditAction.delete,
        performedById: actor.userId,
        previousState: existing,
      });
    }
  }

  // ==========================================
  // STAFF PROFILE
  // ==========================================

  async getStaffProfile(userId: string) {
    return this.repository.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true, username: true, fullName: true, email: true, phone: true,
            role: true, seniority: true, specialization: true, licenseNumber: true,
            imageUrl: true, isActive: true,
          },
        },
        department: true,
        jobGrade: true,
        salaryStep: true,
        documents: { orderBy: { createdAt: 'desc' } },
        payrollRecords: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 24 },
      },
    });
  }

  async updateStaffProfile(userId: string, data: any) {
    const updateData: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v;
    }
    return this.repository.prisma.staffProfile.update({
      where: { userId },
      data: updateData,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        department: true, jobGrade: true, salaryStep: true,
      },
    });
  }

  // ==========================================
  // FULL PROFILE
  // ==========================================

  private readonly SELF_EDITABLE_USER_FIELDS = ['fullName', 'email', 'phone', 'imageUrl'];

  async getFullProfile(userId: string) {
    const profile = await this.repository.findFullProfile(userId);
    if (!profile) throw new Error('User not found');
    return profile;
  }

  async updateFullProfile(
    userId: string,
    payload: { user?: any; hr?: any },
    actor: { userId: string; role: string; ipAddress?: string; userAgent?: string },
  ) {
    const isAdminLike = this.isAdminLike(actor.role);
    const isSelf = actor.userId === userId;
    if (!isAdminLike && !isSelf) throw new Error('Not authorized to update this profile');

    // Fetch previous state for audit
    const before = await this.repository.findFullProfile(userId);

    if (payload.user && Object.keys(payload.user).length > 0) {
      const userUpdate: any = {};
      for (const [k, v] of Object.entries(payload.user)) {
        if (v === undefined) continue;
        if (!isAdminLike && !this.SELF_EDITABLE_USER_FIELDS.includes(k)) continue;

        // Nobody but super_admin can escalate role to super_admin
        if (k === 'role' && v === 'super_admin' && actor.role !== 'super_admin') continue;

        if (k === 'departmentId') {
          if (!isAdminLike) continue;
          userUpdate.department = v ? { connect: { id: v as string } } : { disconnect: true };
          continue;
        }
        if (k === 'headedDepartmentId') {
          if (!isAdminLike) continue;
          userUpdate.headedDepartment = v ? { connect: { id: v as string } } : { disconnect: true };
          continue;
        }
        userUpdate[k] = v;
      }
      if (Object.keys(userUpdate).length > 0) {
        await this.repository.updateUserFields(userId, userUpdate);
      }
    }

    if (payload.hr && Object.keys(payload.hr).length > 0 && isAdminLike) {
      await this.repository.updateStaffProfileFields(userId, payload.hr);
    }

    const after = await this.repository.findFullProfile(userId);

    await this.auditLogger.log({
      entityType: 'User',
      entityId: userId,
      action: AuditAction.update,
      performedById: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      previousState: before
        ? {
            fullName: before.fullName,
            role: before.role,
            seniority: before.seniority,
            isActive: before.isActive,
            departmentId: before.departmentId,
            staffProfile: before.staffProfile
              ? {
                  employeeId: before.staffProfile.employeeId,
                  employmentType: before.staffProfile.employmentType,
                  jobGradeId: before.staffProfile.jobGradeId,
                  salaryStepId: before.staffProfile.salaryStepId,
                }
              : null,
          }
        : null,
      newState: after
        ? {
            fullName: after.fullName,
            role: after.role,
            seniority: after.seniority,
            isActive: after.isActive,
            departmentId: after.departmentId,
            staffProfile: after.staffProfile
              ? {
                  employeeId: after.staffProfile.employeeId,
                  employmentType: after.staffProfile.employmentType,
                  jobGradeId: after.staffProfile.jobGradeId,
                  salaryStepId: after.staffProfile.salaryStepId,
                }
              : null,
          }
        : null,
    });

    return after;
  }

  // ==========================================
  // PAYROLL
  // ==========================================

  async getPayslipsForUser(userId: string) {
    return this.repository.findPayslipsForUser(userId);
  }

  async getPayslips(filters: PayslipFilters) {
    return this.repository.findPayslips(filters);
  }

  async generatePayslipForUser(userId: string, month: number, year: number) {
    const profile = await this.repository.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new Error(
        'This user has no staff profile yet. Save their HR details first, then generate a payslip.',
      );
    }
    return this.repository.upsertPayslipForStaff(profile.id, month, year);
  }

  async runPayrollForMonth(month: number, year: number) {
    return this.repository.runPayrollForAllActive(month, year);
  }

  async updatePayslip(
    payslipId: string,
    data: { isPaid?: boolean; payslipUrl?: string | null; notes?: string | null },
    actor?: { userId: string },
  ) {
    const updated = await this.repository.updatePayslip(payslipId, data);

    if (actor && data.isPaid !== undefined) {
      await this.auditLogger.log({
        entityType: 'PayrollRecord',
        entityId: payslipId,
        action: data.isPaid ? AuditAction.approve : AuditAction.update,
        performedById: actor.userId,
        newState: { isPaid: data.isPaid },
      });
    }
    return updated;
  }

  async getPayslipById(payslipId: string) {
    const record = await this.repository.findPayslipById(payslipId);
    if (!record) throw new Error('Payslip not found');
    return record;
  }

  async addPayslipLineItem(payslipId: string, data: any, actor?: { userId: string }) {
    const updated = await this.repository.addPayslipLineItem(payslipId, data);
    if (actor) {
      await this.auditLogger.log({
        entityType: 'PayrollRecord',
        entityId: payslipId,
        action: AuditAction.update,
        performedById: actor.userId,
        metadata: { op: 'addLineItem', ...data },
      });
    }
    return updated;
  }

  async updatePayslipLineItem(payslipId: string, lineItemId: string, data: any, actor?: { userId: string }) {
    const updated = await this.repository.updatePayslipLineItem(payslipId, lineItemId, data);
    if (actor) {
      await this.auditLogger.log({
        entityType: 'PayrollRecord',
        entityId: payslipId,
        action: AuditAction.update,
        performedById: actor.userId,
        metadata: { op: 'updateLineItem', lineItemId, ...data },
      });
    }
    return updated;
  }

  async deletePayslipLineItem(payslipId: string, lineItemId: string, actor?: { userId: string }) {
    const updated = await this.repository.deletePayslipLineItem(payslipId, lineItemId);
    if (actor) {
      await this.auditLogger.log({
        entityType: 'PayrollRecord',
        entityId: payslipId,
        action: AuditAction.update,
        performedById: actor.userId,
        metadata: { op: 'deleteLineItem', lineItemId },
      });
    }
    return updated;
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================

  async getDocumentsForUser(userId: string) { return this.repository.findDocumentsForUser(userId); }
  async getDocumentsForAll() { return this.repository.findDocumentsForAll(); }
  async getDocumentById(documentId: string) {
    const doc = await this.repository.findDocumentById(documentId);
    if (!doc) throw new Error('Document not found');
    return doc;
  }
  async createDocument(userId: string, data: any) { return this.repository.createDocument(userId, data); }
  async updateDocument(documentId: string, data: any) {
    const doc = await this.repository.findDocumentById(documentId);
    if (!doc) throw new Error('Document not found');
    return this.repository.updateDocument(documentId, data);
  }
  async verifyDocument(documentId: string, verifierId: string) {
    const doc = await this.repository.findDocumentById(documentId);
    if (!doc) throw new Error('Document not found');
    return this.repository.verifyDocument(documentId, verifierId);
  }
  async unverifyDocument(documentId: string) { return this.repository.unverifyDocument(documentId); }
  async deleteDocument(documentId: string) { return this.repository.deleteDocument(documentId); }

  // ==========================================
  // LEAVE MANAGEMENT
  // ==========================================

  async getAllLeaves(filters: LeaveFilters = {}) {
    return this.repository.findAllLeaves(filters);
  }

  async createLeave(userId: string, data: CreateLeaveDTO) {
    const user = await this.repository.findById(userId);
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('Cannot create leave for inactive user');

    const staffProfile = await this.repository.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!staffProfile) {
      throw new Error(
        'You have no staff profile yet. Ask HR to complete your HR details before requesting leave.',
      );
    }

    const startDate = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
    const endDate = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error('Invalid date format');
    if (startDate > endDate) throw new Error('Start date cannot be after end date');

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const prismaLeaveType = LEAVE_TYPE_TO_PRISMA[data.leaveType];
    if (!prismaLeaveType) throw new Error(`Invalid leave type: ${data.leaveType}`);

    const leave = await this.repository.createLeave({
      staffId: staffProfile.id,
      leaveType: prismaLeaveType,
      startDate,
      endDate,
      totalDays,
      status: 'pending',
      reason: data.reason || null,
    });

    await this.auditLogger.log({
      entityType: 'LeaveRequest',
      entityId: leave.id,
      action: AuditAction.create,
      performedById: userId,
      newState: {
        leaveType: prismaLeaveType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
        reason: data.reason ?? null,
      },
    });

    return leave;
  }

  async updateLeave(
    leaveId: string,
    data: UpdateLeaveDTO,
    actor: { userId: string; role: string },
  ) {
    const existing = await this.repository.findLeaveById(leaveId);
    if (!existing) throw new Error('Leave request not found');

    const isAdminLike = this.isAdminLike(actor.role);
    const isOwner = existing.userId === actor.userId;

    // Rule: approving / rejecting requires admin-like role.
    //       Self-service is limited to cancelling your own pending leave.
    const isDecision = data.status === 'approved' || data.status === 'rejected';
    const isCancel = data.status === 'cancelled';

    if (isDecision && !isAdminLike) {
      throw new Error('Only admins and HR can approve or reject leave requests');
    }
    if (isCancel && !isOwner && !isAdminLike) {
      throw new Error('You can only cancel your own leave requests');
    }
    if (isCancel && isOwner && existing.status !== 'pending') {
      throw new Error('You can only cancel a pending leave request');
    }

    const updateData: any = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;

    if (isDecision) {
      updateData.approvedById = actor.userId;
    }

    const updated = await this.repository.updateLeave(leaveId, updateData);

    await this.auditLogger.log({
      entityType: 'LeaveRequest',
      entityId: leaveId,
      action: data.status === 'approved'
        ? AuditAction.approve
        : data.status === 'rejected'
          ? AuditAction.reject
          : AuditAction.update,
      performedById: actor.userId,
      previousState: { status: existing.status },
      newState: { status: updated.status },
      metadata: data.reason ? { reason: data.reason } : undefined,
    });

    return updated;
  }

  async deleteLeave(leaveId: string, actor: { userId: string; role: string }) {
    const existing = await this.repository.findLeaveById(leaveId);
    if (!existing) throw new Error('Leave request not found');

    const isAdminLike = this.isAdminLike(actor.role);
    const isOwner = existing.userId === actor.userId;

    if (!isOwner && !isAdminLike) {
      throw new Error('You can only delete your own leave requests');
    }
    if (!isAdminLike && existing.status !== 'pending') {
      throw new Error('You can only delete a pending leave request');
    }

    await this.repository.deleteLeave(leaveId);

    await this.auditLogger.log({
      entityType: 'LeaveRequest',
      entityId: leaveId,
      action: AuditAction.delete,
      performedById: actor.userId,
      previousState: {
        leaveType: existing.leaveType,
        startDate: existing.startDate,
        endDate: existing.endDate,
        status: existing.status,
      },
    });
  }
}