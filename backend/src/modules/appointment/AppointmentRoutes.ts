import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { appointmentController } from './AppointmentController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createAppointmentRoutes = () => {
  const router = Router();
  router.use(protect);

  // Read access for clinical and records staff
  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records'];
  // Write access restricted to clinical and records staff
  const writeRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records'];

  // Static routes first
  router.get('/statistics', requireRole(readRoles), appointmentController.getStatistics);
  router.get('/stats', requireRole(readRoles), appointmentController.getStatistics);
  router.get('/schedule', requireRole(readRoles), appointmentController.getClinicianSchedule);
  router.get('/available-slots', requireRole(readRoles), appointmentController.getAvailableSlots);
  router.get('/clinicians', requireRole(readRoles), appointmentController.getAvailableClinicians);

  // Dynamic routes
  router.get('/', requireRole(readRoles), appointmentController.getAll);
  router.get('/:id', requireRole(readRoles), appointmentController.getById);
  router.post('/', requireRole(writeRoles), appointmentController.create);
  router.put('/:id', requireRole(writeRoles), appointmentController.update);
  router.delete('/:id', requireRole(['admin']), appointmentController.delete);

  // Check-in / Conversion
  router.post('/:id/convert-to-attendance', requireRole(writeRoles), appointmentController.convertToAttendance);

  return router;
};