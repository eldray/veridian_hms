/**
 * Department Repository
 * Handles data access for department operations
 */

import { PrismaClient, Department } from '@prisma/client';
import { CreateDepartmentDTO, UpdateDepartmentDTO, DepartmentFilters, DepartmentWithRelations, DepartmentStats } from './DepartmentTypes';

export class DepartmentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: DepartmentFilters): Promise<DepartmentWithRelations[]> {
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

    const skip = (page - 1) * limit;

    const departments = await this.prisma.department.findMany({
      where,
      include: {
        head: {
          select: {
            id: true,
            fullName: true,
            role: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            appointments: {
              where: {
                appointmentDate: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit
    });

    return departments;
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
            appointmentDate: {
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
            doctor: {
              select: {
                fullName: true,
                specialization: true
              }
            }
          },
          orderBy: {
            appointmentDate: 'asc'
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

  async findByName(name: string): Promise<Department | null> {
    return this.prisma.department.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' }
      }
    });
  }

  async getUserCount(departmentId: string): Promise<number> {
    const count = await this.prisma.departmentUser.count({
      where: { departmentId }
    });
    return count;
  }

  async getAppointmentCount(departmentId: string, fromDate?: Date): Promise<number> {
    const where: any = { departmentId };
    if (fromDate) {
      where.appointmentDate = { gte: fromDate };
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
      this.prisma.departmentUser.count()
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

  async addUserToDepartment(departmentId: string, userId: string): Promise<any> {
    return this.prisma.departmentUser.create({
      data: {
        departmentId,
        userId
      }
    });
  }

  async removeUserFromDepartment(departmentId: string, userId: string): Promise<void> {
    await this.prisma.departmentUser.delete({
      where: {
        departmentId_userId: {
          departmentId,
          userId
        }
      }
    });
  }

  async getUsersByDepartment(departmentId: string): Promise<any[]> {
    const departmentUsers = await this.prisma.departmentUser.findMany({
      where: { departmentId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            phone: true,
            isActive: true,
            specialization: true
          }
        }
      }
    });

    return departmentUsers.map(du => du.user);
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
}
