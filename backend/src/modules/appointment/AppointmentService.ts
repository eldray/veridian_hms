// modules/appointment/AppointmentService.ts

import { PrismaClient, UserRole } from '@prisma/client';
import { AppointmentRepository } from './AppointmentRepository';
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters } from './AppointmentTypes';

export class AppointmentService {
  private repository: AppointmentRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new AppointmentRepository(prisma);
  }

  async getAppointments(filters: AppointmentFilters) {
    return this.repository.findAll(filters);
  }

  async getAppointmentById(id: string) {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    return appointment;
  }

  async createAppointment(data: CreateAppointmentDTO, createdBy: string) {
    const patient = await this.repository.validatePatientExists(data.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    const clinician = await this.repository.validateClinicianExists(data.clinicianId);
    if (!clinician) {
      throw new Error('Clinician not found. Must be a doctor, nurse, or midwife.');
    }

    const department = await this.repository.validateDepartmentExists(data.departmentId);
    if (!department) {
      throw new Error('Department not found');
    }

    return this.repository.create(data, createdBy);
  }

  async updateAppointment(id: string, data: UpdateAppointmentDTO) {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (data.clinicianId && data.clinicianId !== appointment.clinicianId) {
      const clinician = await this.repository.validateClinicianExists(data.clinicianId);
      if (!clinician) {
        throw new Error('Clinician not found. Must be a doctor, nurse, or midwife.');
      }
    }

    return this.repository.update(id, data);
  }

  async deleteAppointment(id: string) {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    return this.repository.delete(id);
  }

  async getStatistics(dateFrom?: Date) {
    return this.repository.getStatistics(dateFrom);
  }

  async getClinicianSchedule(clinicianId: string, date: Date) {
    const clinician = await this.repository.validateClinicianExists(clinicianId);
    if (!clinician) {
      throw new Error('Clinician not found');
    }
    return this.repository.getClinicianSchedule(clinicianId, date);
  }

  async getAvailableClinicians(roles?: UserRole[]) {
    const allowedRoles = roles || ['doctor', 'nurse', 'midwife'];
    return this.repository.getAvailableClinicians(allowedRoles);
  }

// modules/appointment/AppointmentService.ts - Add this method

async convertToAttendance(appointmentId: string, paymentData: any, userId: string) {
  const appointment = await this.prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true }
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status === 'completed') {
    throw new Error('Appointment already converted to attendance');
  }

  const counterService = getCounterService();
  const attendanceNumber = counterService.nextAttendanceNumber();

  // Create attendance from appointment
  const attendance = await this.prisma.attendance.create({
    data: {
      attendanceNumber,
      patientId: appointment.patientId,
      attendanceType: appointment.type === 'antenatal' ? 'antenatal' : 'general_consultation',
      dateTime: new Date(),
      paymentMode: paymentData.paymentMode,
      nhisCCC: paymentData.nhisCCC,
      complaints: appointment.title,
      status: 'pending',
      createdById: userId,
      appointmentId: appointment.id,  // ✅ Link back to appointment
      // Copy over relevant fields
      medicalNotes: appointment.description
    }
  });

  // Update appointment status
  await this.prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'completed' }
  });

  // Create bill
  const billNumber = counterService.getBillNumberFromAttendance(attendanceNumber);
  const bill = await this.prisma.bill.create({
    data: {
      billNumber,
      patientId: appointment.patientId,
      attendanceId: attendance.id,
      paymentMode: paymentData.paymentMode,
      status: 'pending',
      createdById: userId,
      billDate: new Date(),
      subtotal: 0,
      totalAmount: 0,
      patientPayable: 0,
      paidAmount: 0,
      balance: 0
    }
  });

  return { attendance, bill };
}
}