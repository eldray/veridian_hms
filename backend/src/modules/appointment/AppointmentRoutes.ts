/**
 * Appointment Module Routes
 * Defines all appointment-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppointmentController } from './AppointmentController';

export function createAppointmentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new AppointmentController(prisma);

  // Get all appointments with filtering and pagination
  router.get('/', controller.getAll as any);

  // Get appointment statistics
  router.get('/statistics', controller.getStatistics as any);

  // Get appointment by ID
  router.get('/:id', controller.getById as any);

  // Create new appointment
  router.post('/', ...controller.create);

  // Update appointment
  router.put('/:id', ...controller.update);

  // Delete appointment
  router.delete('/:id', controller.delete as any);

  return router;
}
