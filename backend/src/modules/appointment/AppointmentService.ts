/**
 * Appointment Module Service
 * Business logic for appointment management
 */

import { PrismaClient } from '@prisma/client';
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
    // Validate patient exists
    const patient = await this.repository.validatePatientExists(data.patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Validate doctor exists
    const doctor = await this.repository.validateDoctorExists(data.doctorId);
    if (!doctor) {
      throw new Error('Doctor not found');
    }

    // Validate department exists
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

  async getDoctorSchedule(doctorId: string, date: Date) {
    return this.repository.getDoctorSchedule(doctorId, date);
  }
}
