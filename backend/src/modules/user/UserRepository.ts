import { PrismaClient, LeaveStatus, ShiftType } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { UserFilters, UserResponse, ShiftFilters, ShiftResponse, LeaveFilters, LeaveResponse } from './UserTypes';

export class UserRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  // ==========================================
  // USER QUERIES
  // ==========================================

  async findAll(filters: UserFilters = {}): Promise<{ users: UserResponse[]; total: number }> {
    const { role, departmentId, isActive, search, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (role) where.role = role;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true, username: true, fullName: true, email: true, phone: true,
          imageUrl: true, licenseNumber: true, specialization: true,
          role: true, seniority: true, isActive: true, departmentId: true, version: true,
          department: { select: { id: true, name: true } },
          headedDepartment: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users: users as UserResponse[], total };
  }

  async findById(userId: string): Promise<UserResponse | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        imageUrl: true, licenseNumber: true, specialization: true,
        role: true, seniority: true, isActive: true, departmentId: true, version: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } },
        createdAt: true, updatedAt: true,
      },
    });
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Returns the flattened set of dynamic-RBAC permission names for a user,
   * derived from User -> roles (Role) -> permissions (RolePermission) -> permission (Permission).
   * Mirrors AuthRepository.mapUserPermissions.
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          include: {
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!user?.roles) return [];

    const perms = new Set<string>();
    user.roles.forEach((role: any) => {
      role.permissions.forEach((rp: any) => {
        perms.add(rp.permission.name);
      });
    });
    return Array.from(perms);
  }

  async update(userId: string, data: any): Promise<UserResponse> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...data, updatedAt: new Date() },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        imageUrl: true, licenseNumber: true, specialization: true,
        role: true, seniority: true, isActive: true, departmentId: true, version: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } },
        createdAt: true, updatedAt: true,
      },
    });
  }

  async deactivateUser(userId: string): Promise<UserResponse> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, updatedAt: new Date() },
      select: {
        id: true, username: true, fullName: true, email: true,
        role: true, seniority: true, isActive: true, updatedAt: true,
      },
    });
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  }

  // ==========================================
  // SHIFT QUERIES
  // ==========================================

  async findAllShifts(filters: ShiftFilters = {}): Promise<{ shifts: ShiftResponse[]; total: number }> {
    const { userId, departmentId, shiftDate, fromDate, toDate, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (userId) where.userId = userId;

    if (departmentId) {
      where.user = { departmentId };
    }

    if (shiftDate) {
      const start = new Date(shiftDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(shiftDate);
      end.setHours(23, 59, 59, 999);
      where.shiftDate = { gte: start, lte: end };
    }

    if (fromDate || toDate) {
      where.shiftDate = {};
      if (fromDate) where.shiftDate.gte = fromDate;
      if (toDate) where.shiftDate.lte = toDate;
    }

    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      this.prisma.staffShift.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { shiftDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.staffShift.count({ where }),
    ]);

    return { shifts: shifts as ShiftResponse[], total };
  }

  async findShiftById(shiftId: string): Promise<ShiftResponse | null> {
    return this.prisma.staffShift.findUnique({
      where: { id: shiftId },
      include: { user: { select: { id: true, fullName: true, role: true } } },
    });
  }

  async createShift(data: {
    userId: string;
    shiftDate: Date;
    startTime: Date;
    endTime: Date;
    shiftType: ShiftType;
    notes?: string | null;
  }): Promise<ShiftResponse> {
    return this.prisma.staffShift.create({
      data: {
        userId: data.userId,
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        shiftType: data.shiftType,
        notes: data.notes || null,
      },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async updateShift(shiftId: string, data: any): Promise<ShiftResponse> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.shiftDate !== undefined) updateData.shiftDate = new Date(data.shiftDate);
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    return this.prisma.staffShift.update({
      where: { id: shiftId },
      data: updateData,
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async deleteShift(shiftId: string): Promise<void> {
    await this.prisma.staffShift.delete({ where: { id: shiftId } });
  }

  // ==========================================
  // LEAVE QUERIES
  // ==========================================


async findAllLeaves(filters: LeaveFilters = {}): Promise<{ leaves: LeaveResponse[]; total: number }> {
  const { userId, departmentId, status, fromDate, toDate, page = 1, limit = 50 } = filters;
  const where: any = {};

  if (userId) where.userId = userId;
  if (status) where.status = status;

  if (departmentId) {
    where.user = { departmentId };
  }

  if (fromDate || toDate) {
    where.startDate = {};
    if (fromDate) where.startDate.gte = fromDate;
    if (toDate) where.startDate.lte = toDate;
  }

  const skip = (page - 1) * limit;

  const [leaves, total] = await Promise.all([
    this.prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, role: true, department: { select: { id: true, name: true } } } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { startDate: 'desc' },  // ✅ FIXED: Use 'startDate' instead of 'createdAt'
      skip,
      take: limit,
    }),
    this.prisma.leaveRequest.count({ where }),
  ]);

  return { leaves: leaves as LeaveResponse[], total };
}

  async findLeaveById(leaveId: string): Promise<LeaveResponse | null> {
    return this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        user: { select: { id: true, fullName: true, role: true, department: { select: { id: true, name: true } } } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async createLeave(data: {
    userId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    status?: LeaveStatus;
    reason?: string | null;
    approvedById?: string | null;
  }): Promise<LeaveResponse> {
    return this.prisma.leaveRequest.create({
      data: {
        userId: data.userId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        status: data.status || 'pending',
        reason: data.reason || null,
        approvedById: data.approvedById || null,
      },
      include: {
        user: { select: { id: true, fullName: true, role: true, department: { select: { id: true, name: true } } } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async updateLeave(leaveId: string, data: any): Promise<LeaveResponse> {
    const updateData: any = { updatedAt: new Date() };
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.approvedById !== undefined) updateData.approvedById = data.approvedById;
    
    return this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: updateData,
      include: {
        user: { select: { id: true, fullName: true, role: true, department: { select: { id: true, name: true } } } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async deleteLeave(leaveId: string): Promise<void> {
    await this.prisma.leaveRequest.delete({ where: { id: leaveId } });
  }
}