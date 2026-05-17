/**
 * User Repository
 * Data access layer for user identity management
 */

import { PrismaClient, User, UserRole } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import {
  IUser,
  CreateUserDTO,
  UpdateUserDTO,
  UserListQueryDTO,
  UserStatisticsDTO,
} from './UserTypes';

// Define UserStatus locally since it doesn't exist in Prisma
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending',
}

export class UserRepository extends BaseRepository<User, string> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'user');
  }

  /**
   * Find user by email with optional relations
   */
  async findByEmail(email: string, includeRelations?: boolean): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: includeRelations ? {
        staffProfile: true,
        patientProfile: true,
      } : false,
    });

    return user as IUser | null;
  }

  /**
   * Find user by ID with optional relations
   */
  async findByIdWithRelations(id: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        staffProfile: true,
        patientProfile: true,
      },
    });

    return user as IUser | null;
  }

  /**
   * Create new user
   */
  async create(dto: CreateUserDTO): Promise<IUser> {
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: dto.password, // Already hashed by service
        role: dto.role,
        status: UserStatus.ACTIVE,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        emailVerified: dto.emailVerified ?? false,
        twoFactorEnabled: false,
      },
    });

    return user as IUser;
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDTO): Promise<IUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
    });

    return user as IUser;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Soft delete user
   */
  async softDelete(id: string): Promise<IUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false, // Use isActive instead of status
        deletedAt: new Date(),
      },
    });

    return user as IUser;
  }

  /**
   * Get paginated user list with filters
   */
  async findAllWithFilters(query: UserListQueryDTO): Promise<{
    data: IUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      role,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    // Convert status to isActive filter
    if (status === UserStatus.ACTIVE) {
      where.isActive = true;
    } else if (status === UserStatus.INACTIVE) {
      where.isActive = false;
    }
    // SUSPENDED and PENDING_VERIFICATION would need additional fields

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          staffProfile: {
            select: {
              id: true,
              roleType: true,
              departmentId: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data as IUser[],
      total,
      page,
      limit,
    };
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<UserStatisticsDTO> {
    const [totalUsers, byRole, byStatus, newUsersThisMonth, activeUsersLast7Days] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      
      // Count by role - use your actual UserRole enum
      Promise.all([
        this.prisma.user.count({ where: { role: UserRole.admin, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.doctor, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.nurse, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.midwife, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.records, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.lab_tech, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.pharmacist, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.accounts, deletedAt: null } }),
        this.prisma.user.count({ where: { role: UserRole.sonographer, deletedAt: null } }),
      ]).then(([admin, doctor, nurse, midwife, records, lab_tech, pharmacist, accounts, sonographer]) => ({
        admin,
        doctor,
        nurse,
        midwife,
        records,
        lab_tech,
        pharmacist,
        accounts,
        sonographer,
      })),

      // Count by active status
      Promise.all([
        this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
        this.prisma.user.count({ where: { isActive: false, deletedAt: null } }),
      ]).then(([active, inactive]) => ({
        active,
        inactive,
      })),

      // New users this month
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(1)),
          },
          deletedAt: null,
        },
      }),

      // Active users in last 7 days (based on updatedAt or lastLoginAt)
      this.prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          deletedAt: null,
          isActive: true,
        },
      }),
    ]);

    return {
      totalUsers,
      byRole: byRole as any,
      byStatus: byStatus as any,
      newUsersThisMonth,
      activeUsersLast7Days,
    };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: {
        email: email.toLowerCase(),
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return count > 0;
  }
}