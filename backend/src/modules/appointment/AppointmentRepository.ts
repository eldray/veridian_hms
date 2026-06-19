import { PrismaClient, UserRole } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters } from './AppointmentTypes';
import { getCounterService } from '../../services/CounterService';

export class AppointmentRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'appointment');
  }

  async findAll(filters: AppointmentFilters) {
    const { clinicianId, patientId, departmentId, status, date, dateFrom, dateTo, page = 1, limit = 50 } = filters;
    const where: any = {};

    if (clinicianId) where.clinicianId = clinicianId;
    if (patientId) where.patientId = patientId;
    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    // ✅ FIXED: Uses scheduledAt instead of appointmentDate
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.scheduledAt = { gte: targetDate, lt: nextDay };
    }

    if (dateFrom || dateTo) {
      where.scheduledAt = { ...where.scheduledAt };
      if (dateFrom) where.scheduledAt.gte = new Date(dateFrom);
      if (dateTo) where.scheduledAt.lte = new Date(dateTo);
    }

    return this.findManyWithPagination({
      where, page, limit, orderBy: { scheduledAt: 'asc' },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        clinician: { select: { id: true, fullName: true, role: true } },
        department: { select: { id: true, name: true } }
      }
    }).then(res => ({ appointments: res.data, total: res.total, page: res.page, limit: res.limit }));
  }

  async findById(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        clinician: { select: { id: true, fullName: true, role: true, phone: true, email: true } },
        department: { select: { id: true, name: true } }
      }
    });
  }

  async create(data: CreateAppointmentDTO, createdBy: string) {
    const clinician = await this.prisma.user.findUnique({ where: { id: data.clinicianId }, select: { role: true } });
    
    return this.getModel().create({
      data: {
        appointmentNumber: `APT-${getCounterService().nextAppointmentNumber()}`,
        patientId: data.patientId, clinicianId: data.clinicianId, clinicianRole: clinician?.role,
        departmentId: data.departmentId, title: data.title, description: data.description,
        scheduledAt: data.scheduledAt, // ✅ FIXED
        duration: data.duration || 30, type: data.type, status: 'scheduled', createdBy
      },
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        clinician: { select: { id: true, fullName: true, role: true } },
        department: { select: { id: true, name: true } }
      }
    });
  }

  async update(id: string, data: UpdateAppointmentDTO) {
    const updateData: any = { ...data, updatedAt: new Date() };

    if (data.clinicianId) {
      const clinician = await this.prisma.user.findUnique({ where: { id: data.clinicianId }, select: { role: true } });
      if (clinician) updateData.clinicianRole = clinician.role;
    }

    if (data.status === 'checked_in') {
      const existing = await this.getModel().findUnique({ where: { id }, select: { checkedIn: true } });
      if (existing && !existing.checkedIn) {
        updateData.checkedIn = true;
        updateData.checkedInAt = new Date();
      }
    }

    return this.getModel().update({
      where: { id }, data: updateData,
      include: {
        patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } },
        clinician: { select: { id: true, fullName: true, role: true } },
        department: { select: { id: true, name: true } }
      }
    });
  }

  async getStatistics(dateFrom?: Date) {
    const whereClause: any = {};
    if (dateFrom) whereClause.scheduledAt = { gte: new Date(dateFrom) };

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [stats, todayStats] = await Promise.all([
      this.prisma.appointment.groupBy({ by: ['status'], where: whereClause, _count: { id: true } }),
      this.prisma.appointment.count({ where: { scheduledAt: { gte: today }, status: { in: ['scheduled', 'confirmed'] } } })
    ]);

    const result: any = { scheduled: 0, confirmed: 0, checked_in: 0, in_progress: 0, completed: 0, cancelled: 0, no_show: 0, today: todayStats };
    stats.forEach((stat: any) => { result[stat.status] = stat._count.id; });
    return result;
  }

  async getClinicianSchedule(clinicianId: string, date: Date) {
    const targetDate = new Date(date); targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

    return this.getModel().findMany({
      where: { clinicianId, scheduledAt: { gte: targetDate, lt: nextDay }, status: { notIn: ['cancelled', 'no_show'] } },
      include: { patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true, contact: true } }, department: { select: { name: true } } },
      orderBy: { scheduledAt: 'asc' }
    });
  }

  // Returns existing (non-cancelled) appointments for a clinician on a given day,
  // used to compute which time slots are still free.
  async getBookedSlots(clinicianId: string, date: Date) {
    const targetDate = new Date(date); targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

    return this.getModel().findMany({
      where: { clinicianId, scheduledAt: { gte: targetDate, lt: nextDay }, status: { notIn: ['cancelled', 'no_show'] } },
      select: { scheduledAt: true, duration: true },
      orderBy: { scheduledAt: 'asc' }
    });
  }

  async getAvailableClinicians(roles: UserRole[] = ['doctor', 'nurse', 'midwife']) {
    return this.prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true, fullName: true, role: true, specialization: true, phone: true, email: true }, orderBy: { fullName: 'asc' } });
  }

  async validatePatientExists(patientId: string) { return this.prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }); }
  async validateClinicianExists(clinicianId: string) { return this.prisma.user.findUnique({ where: { id: clinicianId, role: { in: ['doctor', 'nurse', 'midwife'] } }, select: { id: true, fullName: true, role: true } }); }
  async validateDepartmentExists(departmentId: string) { return this.prisma.department.findUnique({ where: { id: departmentId }, select: { id: true, name: true } }); }
}