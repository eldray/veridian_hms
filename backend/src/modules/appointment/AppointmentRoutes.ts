// modules/appointment/AppointmentRoutes.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppointmentController } from './AppointmentController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAppointmentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new AppointmentController(prisma);

  router.use(protect);

  // Static routes first
  router.get('/statistics', controller.getStatistics.bind(controller));
  router.get('/stats', controller.getStatistics.bind(controller));
  router.get('/schedule', controller.getClinicianSchedule.bind(controller));
  router.get('/clinicians', controller.getAvailableClinicians.bind(controller));
  router.get('/', controller.getAll.bind(controller));
  router.get('/:id', controller.getById.bind(controller));
  router.post('/', controller.create);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.delete.bind(controller));
  router.post('/:id/convert-to-attendance', controller.convertToAttendance);

  return router;
}