/**
 * Appointment Module Repository
 * Data access layer for appointment management
 */

import { PrismaClient, AppointmentStatus } from '@prisma/client';
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters } from './AppointmentTypes';

export class AppointmentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: AppointmentFilters) {
    const {
      doctorId,
      patientId,
      departmentId,
      status,
      date,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = filters;

    const where: any = {};

    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.appointmentDate = {
        gte: targetDate,
        lt: nextDay
      };
    }

    if (dateFrom || dateTo) {
      where.appointmentDate = {
        ...where.appointmentDate,
        gte: dateFrom ? new Date(dateFrom) : undefined,
        lt: dateTo ? new Date(dateTo) : undefined
      };
    }

    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true,
              contact: true
            }
          },
          doctor: {
            select: {
              id: true,
              fullName: true,
              role: true
            }
          },
          department: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { appointmentDate: 'asc' },
        skip,
        take: limit
      }),
      this.prisma.appointment.count({ where })
    ]);

    return { appointments, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true
          }
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            role: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  async create(data: CreateAppointmentDTO, createdBy: string) {
    return this.prisma.appointment.create({
      data: {
        ...data,
        status: 'scheduled',
        createdBy
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        doctor: {
          select: {
            fullName: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      }
    });
  }

  async update(id: string, data: UpdateAppointmentDTO) {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // Handle check-in automatically when status changes to checked_in
    if (data.status === 'checked_in') {
      const existing = await this.prisma.appointment.findUnique({
        where: { id },
        select: { checkedIn: true }
      });

      if (existing && !existing.checkedIn) {
        updateData.checkedIn = true;
        updateData.checkedInAt = new Date();
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        doctor: {
          select: {
            fullName: true
          }
        }
      }
    });
  }

  async delete(id: string) {
    return this.prisma.appointment.delete({
      where: { id }
    });
  }

  async getStatistics(dateFrom?: Date) {
    const whereClause: any = {};

    if (dateFrom) {
      whereClause.appointmentDate = {
        gte: new Date(dateFrom)
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stats, todayStats] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          id: true
        }
      }),
      this.prisma.appointment.count({
        where: {
          appointmentDate: {
            gte: today
          },
          status: {
            in: ['scheduled', 'confirmed']
          }
        }
      })
    ]);

    const result: any = {
      scheduled: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      today: todayStats
    };

    stats.forEach((stat: any) => {
      result[stat.status] = stat._count.id;
    });

    return result;
  }

  async getDoctorSchedule(doctorId: string, date: Date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        appointmentDate: {
          gte: targetDate,
          lt: nextDay
        }
      },
      include: {
        patient: {
          select: {
            surname: true,
            otherNames: true,
            folderNumber: true
          }
        },
        department: {
          select: {
            name: true
          }
        }
      },
      orderBy: { appointmentDate: 'asc' }
    });
  }

  async validatePatientExists(patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId }
    });
  }

  async validateDoctorExists(doctorId: string) {
    return this.prisma.user.findUnique({
      where: { id: doctorId }
    });
  }

  async validateDepartmentExists(departmentId: string) {
    return this.prisma.department.findUnique({
      where: { id: departmentId }
    });
  }
}
