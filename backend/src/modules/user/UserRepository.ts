import { PrismaClient, LeaveStatus, ShiftType, Seniority, UserRole } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  UserFilters, UserResponse,
  ShiftFilters, ShiftResponse,
  LeaveFilters, LeaveResponse,
  PayslipFilters,
} from './UserTypes';

export class UserRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  // ==========================================
  // USER QUERIES
  // ==========================================

  async findAll(filters: UserFilters = {}): Promise<{ users: UserResponse[]; total: number }> {
    const { role, departmentId, isActive, search, page = 1, limit = 1000 } = filters;
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

    return { users: users as unknown as UserResponse[], total };
  }

  async findById(userId: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findUnique({
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
    return user as unknown as UserResponse | null;
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.prisma.user.findFirst({ where: { email } });
  }

  async usernameExists(username: string): Promise<boolean> {
    return !!(await this.prisma.user.findUnique({ where: { username }, select: { id: true } }));
  }

  /**
   * Admin-only account creation. Creates the User row and immediately
   * auto-creates a StaffProfile with a generated employee ID (GHS-YYYY-NNNN).
   * No tokens are issued here — that's AuthService's job.
   */
  async createUser(data: {
    username: string;
    passwordHash: string;
    fullName: string;
    role: string;
    seniority?: Seniority;
    email?: string | null;
    phone?: string | null;
    licenseNumber?: string | null;
    specialization?: string | null;
    departmentId?: string | null;
  }) {
    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        password: data.passwordHash,
        fullName: data.fullName,
        role: data.role as UserRole,
        seniority: data.seniority ?? 'JUNIOR',
        email: data.email ?? null,
        phone: data.phone ?? null,
        licenseNumber: data.licenseNumber ?? null,
        specialization: data.specialization ?? null,
        departmentId: data.departmentId ?? null,
        isActive: true,
      },
      select: {
        id: true, username: true, fullName: true, email: true, phone: true,
        imageUrl: true, licenseNumber: true, specialization: true,
        role: true, seniority: true, isActive: true, departmentId: true, version: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } },
        createdAt: true, updatedAt: true,
      },
    });

    // Best-effort StaffProfile bootstrap. If it fails, the account still exists.
    try {
      const year = new Date().getFullYear();
      const prefix = `GHS-${year}-`;
      const last = await this.prisma.staffProfile.findFirst({
        where: { employeeId: { startsWith: prefix } },
        orderBy: { employeeId: 'desc' },
        select: { employeeId: true },
      });
      const lastNumber = last ? parseInt(last.employeeId.slice(prefix.length), 10) : 0;
      const nextNumber = (isNaN(lastNumber) ? 0 : lastNumber) + 1;
      const employeeId = `${prefix}${String(nextNumber).padStart(4, '0')}`;

      await this.prisma.staffProfile.create({
        data: {
          userId: user.id,
          employeeId,
          dateJoined: new Date(),
          employmentType: 'PERMANENT',
          departmentId: user.departmentId ?? null,
        },
      });
    } catch (err: any) {
      console.error('⚠️ Failed to auto-create StaffProfile for', user.username, err.message);
    }

    return user as unknown as UserResponse;
  }

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
      role.permissions.forEach((rp: any) => perms.add(rp.permission.name));
    });
    return Array.from(perms);
  }

  async update(userId: string, data: any): Promise<UserResponse> {
    const user = await this.prisma.user.update({
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
    return user as unknown as UserResponse;
  }

  // ==========================================
  // FULL PROFILE
  // ==========================================

  async findFullProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        imageUrl: true,
        licenseNumber: true,
        specialization: true,
        role: true,
        seniority: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } },
        createdAt: true,
        updatedAt: true,
        staffProfile: {
          include: {
            jobGrade: true,
            salaryStep: true,
            documents: { orderBy: { createdAt: 'desc' } },
            payrollRecords: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 24,
              include: { lineItems: true },
            },
          },
        },
      },
    });
  }

  async updateUserFields(userId: string, userData: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...userData, updatedAt: new Date() },
    });
  }

  async updateStaffProfileFields(userId: string, hrData: any) {
    const allowed: any = {};
    const allowedKeys = [
      'employeeId', 'employmentType', 'dateJoined', 'jobGradeId', 'salaryStepId',
      'bio', 'nextOfKinName', 'nextOfKinPhone', 'departmentId',
    ];
    for (const k of allowedKeys) {
      if (hrData[k] !== undefined) allowed[k] = hrData[k];
    }
    if (allowed.dateJoined) allowed.dateJoined = new Date(allowed.dateJoined);

    const existing = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!existing) {
      return this.prisma.staffProfile.create({
        data: {
          userId,
          employeeId: allowed.employeeId || `GHS-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
          dateJoined: allowed.dateJoined || new Date(),
          employmentType: allowed.employmentType || 'PERMANENT',
          jobGradeId: allowed.jobGradeId ?? null,
          salaryStepId: allowed.salaryStepId ?? null,
          departmentId: allowed.departmentId ?? null,
          bio: allowed.bio ?? null,
          nextOfKinName: allowed.nextOfKinName ?? null,
          nextOfKinPhone: allowed.nextOfKinPhone ?? null,
        },
      });
    }

    return this.prisma.staffProfile.update({
      where: { userId },
      data: allowed,
    });
  }

  // ==========================================
  // PAYROLL
  // ==========================================

  async findPayslips(filters: PayslipFilters = {}) {
    const { month, year, userId, isPaid, page = 1, limit = 500 } = filters;
    const where: any = {};
    if (month) where.month = month;
    if (year) where.year = year;
    if (isPaid !== undefined) where.isPaid = isPaid;
    if (userId) where.staff = { userId };

    const skip = (page - 1) * limit;

    const [records, total, totals] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where,
        include: {
          lineItems: true,
          staff: {
            include: {
              user: {
                select: {
                  id: true, fullName: true, role: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.payrollRecord.count({ where }),
      this.prisma.payrollRecord.aggregate({
        where,
        _sum: { baseSalary: true, allowances: true, deductions: true, netPay: true },
        _count: { _all: true },
      }),
    ]);

    const gross = Number(totals._sum.baseSalary ?? 0) + Number(totals._sum.allowances ?? 0);
    const net = Number(totals._sum.netPay ?? 0);
    const deductions = Number(totals._sum.deductions ?? 0);

    const paidCount = await this.prisma.payrollRecord.count({ where: { ...where, isPaid: true } });
    const pendingCount = await this.prisma.payrollRecord.count({ where: { ...where, isPaid: false } });

    return {
      records,
      total,
      totals: {
        count: totals._count._all,
        gross,
        net,
        deductions,
        paid: paidCount,
        pending: pendingCount,
      },
    };
  }

  async findPayslipsForUser(userId: string) {
    return this.prisma.payrollRecord.findMany({
      where: { staff: { userId } },
      include: { lineItems: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  private async recomputePayrollTotals(payrollRecordId: string) {
    const items = await this.prisma.payslipLineItem.findMany({
      where: { payrollRecordId },
    });

    const earnings = items.filter((i) => i.type === 'earning');
    const deductions = items.filter((i) => i.type === 'deduction');

    const base = earnings
      .filter((i) => i.category === 'base_salary')
      .reduce((s, i) => s + Number(i.amount), 0);
    const allowanceTotal = earnings
      .filter((i) => i.category !== 'base_salary')
      .reduce((s, i) => s + Number(i.amount), 0);
    const deductionTotal = deductions.reduce((s, i) => s + Number(i.amount), 0);

    const gross = base + allowanceTotal;
    const net = Math.max(0, gross - deductionTotal);

    return this.prisma.payrollRecord.update({
      where: { id: payrollRecordId },
      data: {
        baseSalary: base,
        allowances: allowanceTotal,
        deductions: deductionTotal,
        netPay: net,
      },
    });
  }

  private async seedDefaultLineItems(payrollRecordId: string, baseSalary: number) {
    const existing = await this.prisma.payslipLineItem.count({
      where: { payrollRecordId },
    });
    if (existing > 0) return;

    const RISK_ALLOWANCE = 450;
    const TRANSPORT_ALLOWANCE = 200;
    const ssnit = baseSalary * 0.055;
    const paye = baseSalary > 1000 ? 320 : 0;

    await this.prisma.payslipLineItem.createMany({
      data: [
        { payrollRecordId, type: 'earning',   category: 'base_salary', description: 'Base Salary', amount: baseSalary, taxable: true },
        { payrollRecordId, type: 'earning',   category: 'risk',        description: 'Risk Allowance', amount: RISK_ALLOWANCE, taxable: false },
        { payrollRecordId, type: 'earning',   category: 'transport',   description: 'Transport Allowance', amount: TRANSPORT_ALLOWANCE, taxable: false },
        { payrollRecordId, type: 'deduction', category: 'ssnit',       description: 'SSNIT (5.5%)', amount: ssnit, taxable: false },
        { payrollRecordId, type: 'deduction', category: 'paye',        description: 'PAYE', amount: paye, taxable: false },
      ],
    });
  }

  async upsertPayslipForStaff(staffId: string, month: number, year: number) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { id: staffId },
      include: { salaryStep: true },
    });
    if (!profile) throw new Error('Staff profile not found');

    const baseSalary = Number(profile.salaryStep?.amount ?? 0);

    const existing = await this.prisma.payrollRecord.findUnique({
      where: { staffId_month_year: { staffId, month, year } },
    });

    let record;
    if (existing) {
      record = existing;
      const baseItem = await this.prisma.payslipLineItem.findFirst({
        where: { payrollRecordId: existing.id, category: 'base_salary' },
      });
      if (baseItem && Number(baseItem.amount) !== baseSalary) {
        await this.prisma.payslipLineItem.update({
          where: { id: baseItem.id },
          data: { amount: baseSalary },
        });
        await this.recomputePayrollTotals(existing.id);
      }
    } else {
      record = await this.prisma.payrollRecord.create({
        data: {
          staffId, month, year,
          baseSalary, allowances: 0, deductions: 0, netPay: 0, isPaid: false,
        },
      });
      await this.seedDefaultLineItems(record.id, baseSalary);
      await this.recomputePayrollTotals(record.id);
    }

    return this.prisma.payrollRecord.findUnique({
      where: { id: record.id },
      include: { lineItems: true },
    });
  }

  async runPayrollForAllActive(month: number, year: number) {
    const profiles = await this.prisma.staffProfile.findMany({
      where: { isActive: true },
      select: { id: true, userId: true },
    });

    const results = [];
    for (const p of profiles) {
      try {
        const record = await this.upsertPayslipForStaff(p.id, month, year);
        results.push({ ok: true, staffId: p.id, recordId: record?.id });
      } catch (err: any) {
        results.push({ ok: false, staffId: p.id, error: err.message });
      }
    }
    return results;
  }

  async findPayslipById(payslipId: string) {
    return this.prisma.payrollRecord.findUnique({
      where: { id: payslipId },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        staff: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
            jobGrade: true,
            salaryStep: true,
          },
        },
      },
    });
  }

  async addPayslipLineItem(payslipId: string, data: {
    type: 'earning' | 'deduction';
    category: string;
    description?: string;
    amount: number;
    taxable?: boolean;
  }) {
    await this.prisma.payslipLineItem.create({
      data: {
        payrollRecordId: payslipId,
        type: data.type,
        category: data.category,
        description: data.description ?? null,
        amount: data.amount,
        taxable: data.taxable ?? true,
      },
    });
    return this.recomputePayrollTotals(payslipId);
  }

  async updatePayslipLineItem(payslipId: string, lineItemId: string, data: {
    category?: string;
    description?: string;
    amount?: number;
    taxable?: boolean;
  }) {
    await this.prisma.payslipLineItem.update({
      where: { id: lineItemId },
      data: {
        category: data.category,
        description: data.description,
        amount: data.amount,
        taxable: data.taxable,
      },
    });
    return this.recomputePayrollTotals(payslipId);
  }

  async deletePayslipLineItem(payslipId: string, lineItemId: string) {
    await this.prisma.payslipLineItem.delete({ where: { id: lineItemId } });
    return this.recomputePayrollTotals(payslipId);
  }

  async updatePayslip(recordId: string, data: { isPaid?: boolean; payslipUrl?: string | null; notes?: string | null }) {
    const updateData: any = {};
    if (data.isPaid !== undefined) {
      updateData.isPaid = data.isPaid;
      updateData.paidAt = data.isPaid ? new Date() : null;
    }
    if (data.payslipUrl !== undefined) updateData.payslipUrl = data.payslipUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.payrollRecord.update({
      where: { id: recordId },
      data: updateData,
      include: { lineItems: true },
    });
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================

  async findDocumentsForUser(userId: string) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];

    return this.prisma.document.findMany({
      where: { staffId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDocumentsForAll() {
    return this.prisma.document.findMany({
      include: {
        staff: {
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDocumentById(documentId: string) {
    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        staff: { select: { id: true, userId: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
    });
  }

  async createDocument(userId: string, data: {
    type: 'LICENSE' | 'CERTIFICATE' | 'ID_CARD' | 'DEGREE' | 'OTHER';
    title: string;
    fileUrl: string;
    expiryDate?: Date | null;
  }) {
    const profile = await this.prisma.staffProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new Error('User has no staff profile');

    return this.prisma.document.create({
      data: {
        staffId: profile.id,
        type: data.type,
        title: data.title,
        fileUrl: data.fileUrl,
        expiryDate: data.expiryDate ?? null,
        isVerified: false,
      },
    });
  }

  async updateDocument(documentId: string, data: {
    type?: 'LICENSE' | 'CERTIFICATE' | 'ID_CARD' | 'DEGREE' | 'OTHER';
    title?: string;
    fileUrl?: string;
    expiryDate?: Date | null;
  }) {
    const updateData: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v;
    }
    return this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });
  }

  async verifyDocument(documentId: string, verifierId: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        isVerified: true,
        verifiedById: verifierId,
        verifiedAt: new Date(),
      },
    });
  }

  async unverifyDocument(documentId: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { isVerified: false, verifiedById: null, verifiedAt: null },
    });
  }

  async deleteDocument(documentId: string) {
    return this.prisma.document.delete({ where: { id: documentId } });
  }

  async deactivateUser(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false, updatedAt: new Date() },
      select: {
        id: true, username: true, fullName: true, email: true,
        phone: true, imageUrl: true, licenseNumber: true, specialization: true,
        role: true, seniority: true, isActive: true, departmentId: true, version: true,
        department: { select: { id: true, name: true } },
        headedDepartment: { select: { id: true, name: true } },
        createdAt: true, updatedAt: true,
      },
    });
    return user as unknown as UserResponse;
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
    const { userId, departmentId, shiftDate, fromDate, toDate, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (userId) where.staff = { userId };
    if (departmentId) where.staff = { ...(where.staff || {}), departmentId };

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
      this.prisma.shift.findMany({
        where,
        include: {
          staff: {
            include: { user: { select: { id: true, fullName: true, role: true } } },
          },
        },
        orderBy: { shiftDate: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.shift.count({ where }),
    ]);

    const flat = shifts.map((s: any) => ({
      ...s,
      userId: s.staff?.user?.id ?? null,
      user: s.staff?.user ?? null,
    }));

    return { shifts: flat as ShiftResponse[], total };
  }

  async findShiftById(shiftId: string): Promise<ShiftResponse | null> {
    const s: any = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        staff: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    if (!s) return null;
    return { ...s, userId: s.staff?.user?.id ?? null, user: s.staff?.user ?? null };
  }

  async createShift(data: {
    staffId: string;
    shiftDate: Date;
    startTime: Date;
    endTime: Date;
    shiftType: ShiftType;
    notes?: string | null;
  }): Promise<ShiftResponse> {
    const s: any = await this.prisma.shift.create({
      data: {
        staffId: data.staffId,
        shiftDate: data.shiftDate,
        startTime: data.startTime,
        endTime: data.endTime,
        shiftType: data.shiftType,
        notes: data.notes || null,
      },
      include: {
        staff: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    return { ...s, userId: s.staff?.user?.id ?? null, user: s.staff?.user ?? null };
  }

  async updateShift(shiftId: string, data: any): Promise<ShiftResponse> {
    const updateData: any = { updatedAt: new Date() };
    if (data.shiftDate !== undefined) updateData.shiftDate = new Date(data.shiftDate);
    if (data.startTime !== undefined) updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined) updateData.endTime = new Date(data.endTime);
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const s: any = await this.prisma.shift.update({
      where: { id: shiftId },
      data: updateData,
      include: {
        staff: {
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    return { ...s, userId: s.staff?.user?.id ?? null, user: s.staff?.user ?? null };
  }

  async deleteShift(shiftId: string): Promise<void> {
    await this.prisma.shift.delete({ where: { id: shiftId } });
  }

  // ==========================================
  // LEAVE QUERIES
  // ==========================================

  async findAllLeaves(filters: LeaveFilters = {}): Promise<{ leaves: LeaveResponse[]; total: number }> {
    const { userId, departmentId, status, fromDate, toDate, page = 1, limit = 1000 } = filters;
    const where: any = {};

    if (userId) where.staff = { userId };
    if (status) where.status = status;
    if (departmentId) where.staff = { ...(where.staff || {}), departmentId };

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
          staff: {
            include: {
              user: {
                select: {
                  id: true, fullName: true, role: true,
                  department: { select: { id: true, name: true } },
                },
              },
            },
          },
          approvedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const flat = leaves.map((l: any) => ({
      ...l,
      userId: l.staff?.user?.id ?? null,
      user: l.staff?.user ?? null,
      approver: l.approvedBy ?? null,
    }));

    return { leaves: flat as LeaveResponse[], total };
  }

  async findLeaveById(leaveId: string): Promise<LeaveResponse | null> {
    const l: any = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true, fullName: true, role: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    if (!l) return null;
    return { ...l, userId: l.staff?.user?.id ?? null, user: l.staff?.user ?? null, approver: l.approvedBy ?? null };
  }

  async createLeave(data: {
    staffId: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    status?: LeaveStatus;
    reason?: string | null;
    approvedById?: string | null;
  }): Promise<LeaveResponse> {
    const l: any = await this.prisma.leaveRequest.create({
      data: {
        staffId: data.staffId,
        leaveType: data.leaveType as any,
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        status: data.status || 'pending',
        reason: data.reason || null,
        approvedById: data.approvedById || null,
      },
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true, fullName: true, role: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    return { ...l, userId: l.staff?.user?.id ?? null, user: l.staff?.user ?? null, approver: l.approvedBy ?? null };
  }

  async updateLeave(leaveId: string, data: any): Promise<LeaveResponse> {
    const updateData: any = { updatedAt: new Date() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.approvedById !== undefined) updateData.approvedById = data.approvedById;

    const l: any = await this.prisma.leaveRequest.update({
      where: { id: leaveId },
      data: updateData,
      include: {
        staff: {
          include: {
            user: {
              select: {
                id: true, fullName: true, role: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });
    return { ...l, userId: l.staff?.user?.id ?? null, user: l.staff?.user ?? null, approver: l.approvedBy ?? null };
  }

  async deleteLeave(leaveId: string): Promise<void> {
    await this.prisma.leaveRequest.delete({ where: { id: leaveId } });
  }
}