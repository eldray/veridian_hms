import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class StaffProfileService {
  /**
   * Get all staff profiles with optional filters
   */
  async getAllProfiles(filters: {
    departmentId?: string;
    employmentType?: string;
    search?: string;
    skip?: number;
    take?: number;
  }) {
    const { departmentId, employmentType, search, skip = 0, take = 50 } = filters;

    const where: any = {};

    if (departmentId) where.departmentId = departmentId;
    if (employmentType) where.employmentType = employmentType;
    if (search) {
      where.OR = [
        { employeeId: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [profiles, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              roles: true,
            },
          },
          department: { select: { id: true, name: true } },
          jobGrade: { select: { id: true, name: true, code: true } },
          salaryStep: { select: { id: true, stepNumber: true, amount: true } },
          documents: {
            where: { expiryDate: { gte: new Date() } },
            select: { id: true, type: true, title: true, expiryDate: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staffProfile.count({ where }),
    ]);

    return { profiles, total };
  }

  /**
   * Get a single staff profile by ID
   */
  async getProfileById(id: string) {
    return prisma.staffProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            roles: true,
            avatarUrl: true,
          },
        },
        department: true,
        jobGrade: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
        salaryStep: true,
        documents: { orderBy: { createdAt: 'desc' } },
        payrollRecords: {
          take: 12,
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
        shifts: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        leaveRequests: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Create a new staff profile
   */
  async createProfile(data: {
    userId: string;
    employeeId: string;
    dateJoined: Date;
    employmentType: string;
    departmentId?: string;
    jobGradeId?: string;
    salaryStepId?: string;
    bio?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
  }) {
    return prisma.staffProfile.create({
      data,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        department: true,
        jobGrade: true,
      },
    });
  }

  /**
   * Update a staff profile
   */
  async updateProfile(id: string, data: Partial<{
    departmentId?: string;
    jobGradeId?: string;
    salaryStepId?: string;
    bio?: string;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    employmentType?: string;
  }>) {
    return prisma.staffProfile.update({
      where: { id },
      data,
      include: {
        user: { select: { firstName: true, lastName: true } },
        jobGrade: true,
        salaryStep: true,
      },
    });
  }

  /**
   * Calculate years of service
   */
  calculateYearsOfService(dateJoined: Date): { years: number; months: number } {
    const now = new Date();
    const joined = new Date(dateJoined);
    
    let years = now.getFullYear() - joined.getFullYear();
    let months = now.getMonth() - joined.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months };
  }

  /**
   * Get staff eligible for promotion based on tenure
   */
  async getEligibleForPromotion() {
    const profiles = await prisma.staffProfile.findMany({
      where: {
        jobGradeId: { not: null },
        salaryStepId: { not: null },
      },
      include: {
        jobGrade: { include: { steps: { orderBy: { stepNumber: 'asc' } } } },
        salaryStep: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const eligible = profiles.filter((profile) => {
      if (!profile.jobGrade || !profile.salaryStep) return false;
      
      const { years } = this.calculateYearsOfService(profile.dateJoined);
      const currentStepIndex = profile.jobGrade.steps.findIndex(
        (s) => s.id === profile.salaryStepId
      );
      const nextStep = profile.jobGrade.steps[currentStepIndex + 1];
      
      return nextStep && years >= nextStep.yearsRequired;
    });

    return eligible;
  }
}
