// types/appointment.ts - Type definitions for appointment module

export interface AppointmentFilters {
  patientId?: string;
  providerId?: string;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentStatistics {
  totalAppointments: number;
  scheduledAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  upcomingAppointments: number;
}

export interface AppointmentCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  patientName?: string;
  providerName?: string;
}
