/**
 * Appointment Module
 * Exports all appointment module components
 */

export { AppointmentController } from './AppointmentController';
export { AppointmentService } from './AppointmentService';
export { AppointmentRepository } from './AppointmentRepository';
export { createAppointmentRoutes } from './AppointmentRoutes';

export type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
  AppointmentFilters,
  AppointmentSummary,
  AppointmentResponse
} from './AppointmentTypes';
