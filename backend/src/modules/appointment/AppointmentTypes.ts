import { AppointmentType, AppointmentStatus, UserRole } from '@prisma/client';

export interface CreateAppointmentDTO {
  patientId: string;
  clinicianId: string;
  departmentId: string;
  title: string;
  description?: string;
  scheduledAt: Date; // ✅ FIXED: Combined date and time to match schema
  duration?: number;
  type: AppointmentType;
}

export interface UpdateAppointmentDTO {
  status?: AppointmentStatus;
  type?: AppointmentType;
  scheduledAt?: Date; // ✅ FIXED
  duration?: number;
  title?: string;
  description?: string;
  checkedIn?: boolean;
  checkedInAt?: Date;
  clinicianId?: string;
}

export interface AppointmentFilters {
  clinicianId?: string;
  patientId?: string;
  departmentId?: string;
  status?: AppointmentStatus;
  date?: Date;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}