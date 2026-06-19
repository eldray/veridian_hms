/**
 * Department Repository
 * Handles data access for department operations
 */

import { PrismaClient, Department } from '@prisma/client';
import { CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters, DepartmentWithRelations, DepartmentStats, SingleDepartmentStats } from './DepartmentTypes';

export class DepartmentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: DepartmentFilters): Promise<{ departments: DepartmentWithRelations[]; total: number }> {
    const { isActive, hasHead, page = 1, limit = 50 } = filters;

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (hasHead === true) {
      where.headId = { not: null };
    } else if (hasHead === false) {
      where.headId = null;
    }

    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (pageNum - 1) * limitNum;

    const [departments, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        include: {
          head: {
            select: {
              id: true,
              fullName: true,
              role: true,
              email: true,
              phone: true,
              specialization: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      this.prisma.department.count({ where })
    ]);

    return { departments, total };
  }

  async findById(id: string): Promise<DepartmentWithRelations | null> {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        head: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            specialization: true
          }
        },
        users: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true,
            phone: true,
            isActive: true,
            specialization: true,
            createdAt: true
          },
          orderBy: { fullName: 'asc' }
        },
        appointments: {
          where: {
            // ✅ FIXED: Changed from appointmentDate to scheduledAt
            scheduledAt: {
              gte: new Date()
            }
          },
          include: {
            patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true,
                contact: true
              }
            },
            clinician: {
              select: {
                fullName: true,
                specialization: true
              }
            }
          },
          orderBy: {
            // ✅ FIXED: Changed from appointmentDate to scheduledAt
            scheduledAt: 'asc'
          },
          take: 20
        },
        _count: {
          select: {
            users: true,
            appointments: true
          }
        }
      }
    });

    return department;
  }

  async create(data: CreateDepartmentDTO): Promise<Department> {
    const { name, description, headId, color, icon } = data;

    return this.prisma.department.create({
      data: {
        name,
        description,
        headId,
        color,
        icon
      }
    });
  }

  async update(id: string, data: UpdateDepartmentDTO): Promise<Department> {
    return this.prisma.department.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.department.delete({
      where: { id }
    });
  }

  async findByName(name: string, excludeId?: string): Promise<Department | null> {
    return this.prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId && { id: { not: excludeId } })
      }
    });
  }

  async getUserCount(departmentId: string): Promise<number> {
    const count = await this.prisma.user.count({
      where: { departmentId }
    });
    return count;
  }

  async getAppointmentCount(departmentId: string, fromDate?: Date): Promise<number> {
    const where: any = { departmentId };
    if (fromDate) {
      // ✅ FIXED: Changed from appointmentDate to scheduledAt
      where.scheduledAt = { gte: fromDate };
    }
    const count = await this.prisma.appointment.count({ where });
    return count;
  }

  async getStatistics(): Promise<DepartmentStats> {
    const [
      totalDepartments,
      activeDepartments,
      inactiveDepartments,
      departmentsWithHeads,
      departmentsWithoutHeads,
      totalStaff
    ] = await Promise.all([
      this.prisma.department.count(),
      this.prisma.department.count({ where: { isActive: true } }),
      this.prisma.department.count({ where: { isActive: false } }),
      this.prisma.department.count({ where: { headId: { not: null } } }),
      this.prisma.department.count({ where: { headId: null } }),
      this.prisma.user.count({ where: { departmentId: { not: null } } })
    ]);

    return {
      totalDepartments,
      activeDepartments,
      inactiveDepartments,
      departmentsWithHeads,
      departmentsWithoutHeads,
      totalStaff,
      averageStaffPerDepartment: totalDepartments > 0 ? Math.round(totalStaff / totalDepartments) : 0
    };
  }

  async getDepartmentStats(departmentId: string): Promise<SingleDepartmentStats | null> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        isActive: true,
        head: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    if (!department) return null;

    const now = new Date();

    const [totalStaff, activeStaff, staffGroups, totalAppointments, upcomingAppointments] = await Promise.all([
      this.prisma.user.count({ where: { departmentId } }),
      this.prisma.user.count({ where: { departmentId, isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        where: { departmentId },
        _count: { _all: true },
      }),
      this.prisma.appointment.count({ where: { departmentId } }),
      this.prisma.appointment.count({ where: { departmentId, scheduledAt: { gte: now } } }),
    ]);

    const staffByRole: Record<string, number> = {};
    staffGroups.forEach((group: any) => {
      staffByRole[group.role] = group._count._all;
    });

    return {
      departmentId: department.id,
      name: department.name,
      isActive: department.isActive,
      totalStaff,
      activeStaff,
      inactiveStaff: totalStaff - activeStaff,
      staffByRole,
      totalAppointments,
      upcomingAppointments,
      head: department.head,
    };
  }

  async assignUserToDepartment(departmentId: string, userId: string): Promise<any> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { departmentId }
    });
  }

  async removeUserFromDepartment(departmentId: string, userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { 
        id: userId,
        departmentId 
      },
      data: { departmentId: null }
    });
  }

  async getUsersByDepartment(departmentId: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { departmentId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        specialization: true,
        createdAt: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  async bulkUpdate(departmentIds: string[], data: UpdateDepartmentDTO): Promise<number> {
    const result = await this.prisma.department.updateMany({
      where: {
        id: { in: departmentIds }
      },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
    return result.count;
  }

  async checkUserInDepartment(departmentId: string, userId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        departmentId
      }
    });
    return !!user;
  }
}