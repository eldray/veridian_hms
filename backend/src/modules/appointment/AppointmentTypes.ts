/**
 * Appointment Module Types
 * Type definitions for appointment management
 */

import { AppointmentType, AppointmentStatus } from '@prisma/client';

export interface CreateAppointmentDTO {
  patientId: string;
  doctorId: string;
  departmentId: string;
  title: string;
  description?: string;
  appointmentDate: Date;
  appointmentTime: string;
  duration?: number;
  type: AppointmentType;
}

export interface UpdateAppointmentDTO {
  status?: AppointmentStatus;
  type?: AppointmentType;
  appointmentDate?: Date;
  appointmentTime?: string;
  duration?: number;
  title?: string;
  description?: string;
}

export interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  departmentId?: string;
  status?: AppointmentStatus;
  date?: Date;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface AppointmentSummary {
  id: string;
  title: string;
  appointmentDate: Date;
  appointmentTime: string;
  status: AppointmentStatus;
  type: AppointmentType;
  patient: {
    id: string;
    surname: string;
    otherNames: string;
    folderNumber: string;
  };
  doctor: {
    id: string;
    fullName: string;
  };
  department: {
    id: string;
    name: string;
  };
}

export interface AppointmentResponse {
  success: boolean;
  data?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
