import { PrismaClient, EmploymentType } from '@prisma/client';

export class StaffProfileService {
  constructor(private prisma: PrismaClient) { }

  async getAllProfiles(filters: {
    departmentId?: string;
    employmentType?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { departmentId, employmentType, search, skip = 0, take = 50 } = filters;

    const where: any = { isActive: true };
    if (departmentId) where.departmentId = departmentId;
    if (employmentType) where.employmentType = employmentType;

    if (search) {
      where.OR = [
        { employeeId: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { username: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [profiles, total] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true, username: true, fullName: true, email: true,
              phone: true, role: true, seniority: true,
              specialization: true, licenseNumber: true,
            },
          },
          department: { select: { id: true, name: true } },
          jobGrade: { select: { id: true, name: true, code: true, level: true } },
          salaryStep: { select: { id: true, stepNumber: true, amount: true } },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.staffProfile.count({ where }),
    ]);

    return { profiles, total };
  }

  async getProfileById(id: string) {
    return this.prisma.staffProfile.findUnique({
      where: { id },
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
        shifts: { orderBy: { shiftDate: 'desc' }, take: 30 },
        leaveRequests: { orderBy: { startDate: 'desc' }, take: 20 },
      },
    });
  }

  async createProfile(data: {
    userId: string;
    employeeId?: string;
    dateJoined: Date;
    employmentType: EmploymentType;
    departmentId?: string;
    jobGradeId?: string;
    salaryStepId?: string;
    bio?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
  }) {
    // Verify the User exists and doesn't already have a StaffProfile
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      include: { staffProfile: true },
    });
    if (!user) throw new Error('User not found');
    if (user.staffProfile) throw new Error('User already has a staff profile');

    const employeeId = data.employeeId ?? (await this.generateEmployeeId());

    return this.prisma.staffProfile.create({
      data: {
        userId: data.userId,
        employeeId,
        dateJoined: data.dateJoined,
        employmentType: data.employmentType,
        departmentId: data.departmentId ?? null,
        jobGradeId: data.jobGradeId ?? null,
        salaryStepId: data.salaryStepId ?? null,
        bio: data.bio ?? null,
        nextOfKinName: data.nextOfKinName ?? null,
        nextOfKinPhone: data.nextOfKinPhone ?? null,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        department: true,
        jobGrade: true,
        salaryStep: true,
      },
    });
  }

  async updateProfile(id: string, data: Partial<{
    departmentId: string | null;
    jobGradeId: string | null;
    salaryStepId: string | null;
    bio: string | null;
    nextOfKinName: string | null;
    nextOfKinPhone: string | null;
    employmentType: EmploymentType;
  }>) {
    // Filter undefined so PATCH semantics are preserved
    const updateData: any = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) updateData[k] = v;
    }

    return this.prisma.staffProfile.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        department: true,
        jobGrade: true,
        salaryStep: true,
      },
    });
  }

  calculateYearsOfService(dateJoined: Date): { years: number; months: number } {
    const now = new Date();
    const joined = new Date(dateJoined);
    let years = now.getFullYear() - joined.getFullYear();
    let months = now.getMonth() - joined.getMonth();
    if (months < 0) { years--; months += 12; }
    return { years, months };
  }

  async getEligibleForPromotion() {
    const profiles = await this.prisma.staffProfile.findMany({
      where: { isActive: true },
      include: {
        user: { select: { fullName: true, role: true } },
        jobGrade: { select: { id: true, name: true, level: true } },
        salaryStep: { select: { id: true, stepNumber: true } },
      },
    });

    return profiles
      .map((p) => {
        const { years, months } = this.calculateYearsOfService(p.dateJoined);
        return { ...p, yearsOfService: years, monthsOfService: months };
      })
      .filter((p) => p.yearsOfService >= 2 && p.user.role !== 'admin');
  }

  private async generateEmployeeId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GHS-${year}-`;

    const last = await this.prisma.staffProfile.findFirst({
      where: { employeeId: { startsWith: prefix } },
      orderBy: { employeeId: 'desc' },
      select: { employeeId: true },
    });

    const lastNumber = last ? parseInt(last.employeeId.slice(prefix.length), 10) : 0;
    const nextNumber = (isNaN(lastNumber) ? 0 : lastNumber) + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }
}