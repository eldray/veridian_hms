// modules/appointment/AppointmentRepository.ts

import { PrismaClient, AppointmentStatus, UserRole } from '@prisma/client';
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters } from './AppointmentTypes';
import { getCounterService } from '../../services/CounterService';

export class AppointmentRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filters: AppointmentFilters) {
    const {
      clinicianId,
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

    if (clinicianId) where.clinicianId = clinicianId;
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
          clinician: {
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
        clinician: {
          select: {
            id: true,
            fullName: true,
            role: true,
            phone: true,
            email: true
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
    const counterService = getCounterService();
    const appointmentNumber = `APT-${counterService.nextAppointmentNumber()}`;
    
    // Get clinician role
    const clinician = await this.prisma.user.findUnique({
      where: { id: data.clinicianId },
      select: { role: true }
    });
    
    return this.prisma.appointment.create({
      data: {
        appointmentNumber,
        patientId: data.patientId,
        clinicianId: data.clinicianId,
        clinicianRole: clinician?.role,
        departmentId: data.departmentId,
        title: data.title,
        description: data.description,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        duration: data.duration || 30,
        type: data.type,
        status: 'scheduled',
        createdBy: createdBy
      },
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
        clinician: {
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

  async update(id: string, data: UpdateAppointmentDTO) {
    const updateData: any = {
      ...data,
      updatedAt: new Date()
    };

    // If changing clinician, update role
    if (data.clinicianId) {
      const clinician = await this.prisma.user.findUnique({
        where: { id: data.clinicianId },
        select: { role: true }
      });
      if (clinician) {
        updateData.clinicianRole = clinician.role;
      }
    }

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
            id: true,
            surname: true,
            otherNames: true,
            folderNumber: true,
            contact: true
          }
        },
        clinician: {
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
        _count: { id: true }
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
      checked_in: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      today: todayStats
    };

    stats.forEach((stat: any) => {
      result[stat.status] = stat._count.id;
    });

    return result;
  }

  async getClinicianSchedule(clinicianId: string, date: Date) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.prisma.appointment.findMany({
      where: {
        clinicianId,
        appointmentDate: {
          gte: targetDate,
          lt: nextDay
        },
        status: { notIn: ['cancelled', 'no_show'] }
      },
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
        department: {
          select: {
            name: true
          }
        }
      },
      orderBy: { appointmentTime: 'asc' }
    });
  }

  async getAvailableClinicians(roles: UserRole[] = ['doctor', 'nurse', 'midwife']) {
    return this.prisma.user.findMany({
      where: {
        role: { in: roles },
        isActive: true
      },
      select: {
        id: true,
        fullName: true,
        role: true,
        specialization: true,
        phone: true,
        email: true
      },
      orderBy: { fullName: 'asc' }
    });
  }

  async findAttendanceByAppointmentId(appointmentId: string) {
    return this.prisma.attendance.findFirst({
      where: { appointmentId },
      include: { Patient: true }
    });
  }

  async createAttendanceFromAppointment(appointment: any, userId: string, paymentData: any) {
    const counterService = getCounterService();
    
    return this.prisma.attendance.create({
      data: {
        attendanceNumber: counterService.nextAttendanceNumber(),
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        dateTime: new Date(),
        attendanceType: this.mapAppointmentTypeToAttendanceType(appointment.type),
        paymentMode: paymentData.paymentMode,
        insuranceProviderId: paymentData.insuranceProviderId,
        nhisCCC: paymentData.nhisCCC,
        corporateAccountId: paymentData.corporateAccountId,
        status: 'pending',
        complaints: appointment.title,
        medicalNotes: appointment.description,
        createdById: userId,
        encounterCategory: 'opd',
        visitCategory: 'general',
        serviceCategory: 'opd'
      },
      include: {
        Patient: true,
        appointment: true
      }
    });
  }

  private mapAppointmentTypeToAttendanceType(type: string): string {
    const mapping: Record<string, string> = {
      'consultation': 'general_consultation',
      'antenatal': 'antenatal',
      'postnatal': 'postnatal',
      'procedure': 'surgery',
      'follow_up': 'chronic_followup',
      'vaccination': 'general_consultation',
      'lab_test': 'general_consultation',
      'scan': 'general_consultation',
      'other': 'general_consultation'
    };
    return mapping[type] || 'general_consultation';
  }

  async validatePatientExists(patientId: string) {
    return this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, surname: true, otherNames: true }
    });
  }

  async validateClinicianExists(clinicianId: string) {
    return this.prisma.user.findUnique({
      where: { 
        id: clinicianId,
        role: { in: ['doctor', 'nurse', 'midwife'] }
      },
      select: { id: true, fullName: true, role: true }
    });
  }

  async validateDepartmentExists(departmentId: string) {
    return this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, name: true }
    });
  }
}