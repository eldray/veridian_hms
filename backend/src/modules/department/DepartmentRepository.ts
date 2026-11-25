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
    const { isActive, hasHead, page = 1, limit = 1000 } = filters;

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
          users: { select: { id: true } },
          additionalMembers: { select: { id: true } },
          _count: { select: { users: true } }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      this.prisma.department.count({ where })
    ]);

    const normalizedDepartments = departments.map((department: any) => {
      const memberIds = new Set([...(department.users || []).map((user: any) => user.id), ...(department.additionalMembers || []).map((user: any) => user.id)]);
      return { ...department, _count: { ...department._count, users: memberIds.size } };
    });
    return { departments: normalizedDepartments, total };
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
        additionalMembers: {
          select: { id: true, fullName: true, role: true, email: true, phone: true, isActive: true, specialization: true, createdAt: true },
          orderBy: { fullName: 'asc' },
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

    if (!department) return null;
    const combinedUsers = new Map<string, any>();
    for (const user of [...(department.users || []), ...(department.additionalMembers || [])]) combinedUsers.set(user.id, user);
    const users = Array.from(combinedUsers.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { ...department, users, _count: { ...department._count, users: users.length } } as any;
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
    return this.prisma.user.count({ where: { OR: [{ departmentId }, { departments: { some: { id: departmentId } } }] } });
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

    const [departmentUsers, totalAppointments, upcomingAppointments] = await Promise.all([
      this.prisma.user.findMany({ where: { OR: [{ departmentId }, { departments: { some: { id: departmentId } } }] }, select: { id: true, role: true, isActive: true } }),
      this.prisma.appointment.count({ where: { departmentId } }),
      this.prisma.appointment.count({ where: { departmentId, scheduledAt: { gte: now } } }),
    ]);

    const totalStaff = departmentUsers.length;
    const activeStaff = departmentUsers.filter((user: any) => user.isActive).length;
    const staffByRole: Record<string, number> = {};
    departmentUsers.forEach((user: any) => { staffByRole[user.role] = (staffByRole[user.role] || 0) + 1; });

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
    return this.prisma.user.update({ where: { id: userId }, data: { departments: { connect: { id: departmentId } } } });
  }

  async removeUserFromDepartment(departmentId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { departmentId: true } });
    if (!user) return;
    if (user.departmentId === departmentId) {
      await this.prisma.user.update({ where: { id: userId }, data: { departmentId: null } });
    } else {
      await this.prisma.user.update({ where: { id: userId }, data: { departments: { disconnect: { id: departmentId } } } });
    }
  }

  async getUsersByDepartment(departmentId: string): Promise<any[]> {
    return this.prisma.user.findMany({
      where: { OR: [{ departmentId }, { departments: { some: { id: departmentId } } }] },
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
        OR: [{ departmentId }, { departments: { some: { id: departmentId } } }]
      }
    });
    return !!user;
  }
}