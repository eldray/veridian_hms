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

  async convertToAttendance(appointmentId: string, userId: string, paymentData: any) {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (appointment.status !== 'completed') {
      throw new Error('Appointment must be completed before converting to attendance');
    }

    const existingAttendance = await this.repository.findAttendanceByAppointmentId(appointmentId);
    if (existingAttendance) {
      throw new Error('Attendance already created for this appointment');
    }

    const attendance = await this.repository.createAttendanceFromAppointment(appointment, userId, paymentData);

    return attendance;
  }
}