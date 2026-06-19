import { PrismaClient, UserRole } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { AppointmentRepository } from './AppointmentRepository';
import { CreateAppointmentDTO, UpdateAppointmentDTO, AppointmentFilters } from './AppointmentTypes';
import { getCounterService } from '../../services/CounterService';

export class AppointmentService extends BaseService {
  private repository: AppointmentRepository;
  private prisma: PrismaClient; // ✅ FIXED: Added prisma instance

  constructor(prisma: PrismaClient) {
    super('AppointmentService');
    this.prisma = prisma;
    this.repository = new AppointmentRepository(prisma);
  }

  async getAppointments(filters: AppointmentFilters) { return this.repository.findAll(filters); }
  
  async getAppointmentById(id: string) {
    const appt = await this.repository.findById(id);
    if (!appt) throw new Error('Appointment not found');
    return appt;
  }

  async createAppointment(data: CreateAppointmentDTO, createdBy: string) {
    this.logInfo('Creating appointment', { patientId: data.patientId, clinicianId: data.clinicianId });
    if (!(await this.repository.validatePatientExists(data.patientId))) throw new Error('Patient not found');
    if (!(await this.repository.validateClinicianExists(data.clinicianId))) throw new Error('Clinician not found');
    if (!(await this.repository.validateDepartmentExists(data.departmentId))) throw new Error('Department not found');
    return this.repository.create(data, createdBy);
  }

  async updateAppointment(id: string, data: UpdateAppointmentDTO) {
    const appt = await this.repository.findById(id);
    if (!appt) throw new Error('Appointment not found');
    if (data.clinicianId && data.clinicianId !== appt.clinicianId) {
      if (!(await this.repository.validateClinicianExists(data.clinicianId))) throw new Error('Clinician not found');
    }
    return this.repository.update(id, data);
  }

  async deleteAppointment(id: string) {
    if (!(await this.repository.findById(id))) throw new Error('Appointment not found');
    return this.repository.delete(id);
  }

  async getStatistics(dateFrom?: Date) { return this.repository.getStatistics(dateFrom); }
  async getClinicianSchedule(clinicianId: string, date: Date) {
    if (!(await this.repository.validateClinicianExists(clinicianId))) throw new Error('Clinician not found');
    return this.repository.getClinicianSchedule(clinicianId, date);
  }
  async getAvailableClinicians(roles?: UserRole[]) { return this.repository.getAvailableClinicians(roles || ['doctor', 'nurse', 'midwife']); }

  // Generates the day's bookable time slots (08:00–17:00, 30-min each) for a
  // clinician and marks each as available/unavailable based on existing appointments.
  async getAvailableSlots(clinicianId: string, date: Date) {
    if (!(await this.repository.validateClinicianExists(clinicianId))) throw new Error('Clinician not found');

    const WORK_START = 8;   // 08:00
    const WORK_END = 17;    // 17:00
    const SLOT_MINUTES = 30;

    const booked = await this.repository.getBookedSlots(clinicianId, date);
    // Build a set of occupied [start, end) intervals (ms since midnight) honoring duration.
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const occupied = booked.map(b => {
      const start = new Date(b.scheduledAt).getTime();
      const end = start + (b.duration || SLOT_MINUTES) * 60000;
      return { start, end };
    });

    const slots: Array<{ startTime: string; endTime: string; available: boolean }> = [];
    for (let h = WORK_START; h < WORK_END; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        const slotStart = new Date(dayStart); slotStart.setHours(h, m, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + SLOT_MINUTES * 60000);
        const s = slotStart.getTime(), e = slotEnd.getTime();
        const isTaken = occupied.some(o => s < o.end && e > o.start);
        slots.push({ startTime: slotStart.toISOString(), endTime: slotEnd.toISOString(), available: !isTaken });
      }
    }

    return { clinicianId, date: dayStart.toISOString(), slotMinutes: SLOT_MINUTES, slots };
  }

  // ✅ FIXED: Completely refactored to prevent crashes and use correct CounterService
  async convertToAttendance(appointmentId: string, userId: string, paymentData: any) {
    this.logInfo('Converting appointment to attendance', { appointmentId });
    
    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId }, include: { patient: true } });
    if (!appointment) throw new Error('Appointment not found');

    const existingAttendance = await this.prisma.attendance.findFirst({ where: { appointmentId } });
    if (existingAttendance) throw new Error('Appointment already converted to attendance');

    const counterService = getCounterService();

    return this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.create({
        data: {
          attendanceNumber: counterService.nextAttendanceNumber(),
          patientId: appointment.patientId,
          attendanceType: this.mapAppointmentType(appointment.type),
          dateTime: new Date(),
          paymentMode: paymentData.paymentMode,
          insuranceProviderId: paymentData.insuranceProviderId,
          nhisCCC: paymentData.nhisCCC,
          corporateAccountId: paymentData.corporateAccountId,
          complaints: appointment.title,
          medicalNotes: appointment.description,
          status: 'pending',
          createdById: userId,
          appointmentId: appointment.id,
          encounterCategory: 'opd',
          visitCategory: 'general'
        }
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'checked_in', checkedIn: true, checkedInAt: new Date() }
      });

      // ✅ FIXED: Uses nextBillNumber() and passes insurance/corporate IDs
      const bill = await tx.bill.create({
        data: {
          billNumber: counterService.nextBillNumber(),
          patientId: appointment.patientId,
          attendanceId: attendance.id,
          paymentMode: paymentData.paymentMode,
          insuranceProviderId: paymentData.insuranceProviderId,
          corporateAccountId: paymentData.corporateAccountId,
          status: 'pending',
          createdById: userId,
          billDate: new Date(),
          subtotal: 0, totalAmount: 0, patientPayable: 0, paidAmount: 0, balance: 0
        }
      });

      return { attendance, bill };
    });
  }

  private mapAppointmentType(type: string): string {
    const mapping: Record<string, string> = {
      'consultation': 'general_consultation', 'antenatal': 'antenatal', 'postnatal': 'postnatal',
      'procedure': 'surgery', 'follow_up': 'chronic_followup', 'vaccination': 'general_consultation',
      'lab_test': 'general_consultation', 'scan': 'general_consultation', 'other': 'general_consultation'
    };
    return mapping[type] || 'general_consultation';
  }
}