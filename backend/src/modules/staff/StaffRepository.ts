/**
 * Staff Repository
 * Data access layer for unified staff profile management
 */

import { PrismaClient, StaffProfile } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  IStaffProfile,
  CreateStaffDTO,
  UpdateStaffDTO,
  StaffListQueryDTO,
  StaffStatisticsDTO,
  StaffRoleType,
  StaffStatus,
  EmploymentType,
} from './StaffTypes';

export class StaffRepository extends BaseRepository<StaffProfile, string> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'staffProfile');
  }

  /**
   * Find staff by user ID with relations
   */
  async findByUserId(userId: string): Promise<IStaffProfile | null> {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile | null;
  }

  /**
   * Find staff by employee ID with relations
   */
  async findByEmployeeId(employeeId: string): Promise<IStaffProfile | null> {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { employeeId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile | null;
  }

  /**
   * Find staff by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<IStaffProfile | null> {
    const staff = await this.prisma.staffProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile | null;
  }

  /**
   * Create staff profile
   */
  async create(dto: CreateStaffDTO): Promise<IStaffProfile> {
    // Generate unique employee ID if not provided
    const employeeId = dto.userId.substring(0, 8).toUpperCase() + '-' + Date.now().toString().slice(-6);

    const staff = await this.prisma.staffProfile.create({
      data: {
        ...dto,
        employeeId,
        status: StaffStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile;
  }

  /**
   * Update staff profile
   */
  async update(id: string, dto: UpdateStaffDTO): Promise<IStaffProfile> {
    const staff = await this.prisma.staffProfile.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile;
  }

  /**
   * Get paginated staff list with filters
   */
  async findAllWithFilters(query: StaffListQueryDTO): Promise<{
    data: IStaffProfile[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      roleType,
      status,
      departmentId,
      employmentType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (roleType) {
      where.roleType = roleType;
    }

    if (status) {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (employmentType) {
      where.employmentType = employmentType;
    }

    if (search) {
      where.OR = [
        { employeeId: { contains: search, mode: 'insensitive' } },
        { specialization: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        {
          user: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              role: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.staffProfile.count({ where }),
    ]);

    return {
      data: data as IStaffProfile[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get staff statistics
   */
  async getStatistics(): Promise<StaffStatisticsDTO> {
    const [totalStaff, byRoleType, byStatus, byEmploymentType, onLeaveCount, newHiresThisMonth] = await Promise.all([
      this.prisma.staffProfile.count(),

      // Count by role type
      Promise.all(Object.values(StaffRoleType).map(async (roleType) => {
        const count = await this.prisma.staffProfile.count({ where: { roleType } });
        return { roleType, count };
      })).then(results => {
        const acc: any = {};
        results.forEach(({ roleType, count }) => {
          acc[roleType] = count;
        });
        return acc;
      }),

      // Count by status
      Promise.all(Object.values(StaffStatus).map(async (status) => {
        const count = await this.prisma.staffProfile.count({ where: { status } });
        return { status, count };
      })).then(results => {
        const acc: any = {};
        results.forEach(({ status, count }) => {
          acc[status] = count;
        });
        return acc;
      }),

      // Count by employment type
      Promise.all(Object.values(EmploymentType).map(async (type) => {
        const count = await this.prisma.staffProfile.count({ where: { employmentType: type } });
        return { type, count };
      })).then(results => {
        const acc: any = {};
        results.forEach(({ type, count }) => {
          acc[type] = count;
        });
        return acc;
      }),

      // On leave count
      this.prisma.staffProfile.count({ where: { status: StaffStatus.ON_LEAVE } }),

      // New hires this month
      this.prisma.staffProfile.count({
        where: {
          joinDate: {
            gte: new Date(new Date().setDate(1)),
          },
        },
      }),
    ]);

    // Calculate average experience
    const avgExperience = await this.prisma.staffProfile.aggregate({
      _avg: { experienceYears: true },
    });

    return {
      totalStaff,
      byRoleType: byRoleType as any,
      byStatus: byStatus as any,
      byEmploymentType: byEmploymentType as any,
      byDepartment: {}, // Would need department aggregation
      onLeaveCount,
      newHiresThisMonth,
      averageExperienceYears: avgExperience._avg.experienceYears || 0,
    };
  }

  /**
   * Find available doctors by specialty and date
   */
  async findAvailableDoctors(specialization?: string, date?: Date): Promise<IStaffProfile[]> {
    const where: any = {
      roleType: StaffRoleType.DOCTOR,
      status: StaffStatus.ACTIVE,
    };

    if (specialization) {
      where.specialization = specialization;
    }

    // Note: Real availability checking would require integration with Appointment module
    const staff = await this.prisma.staffProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            role: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return staff as IStaffProfile[];
  }

  /**
   * Check if employee ID exists
   */
  async employeeIdExists(employeeId: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.staffProfile.count({
      where: {
        employeeId,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return count > 0;
  }
}
