/**
 * Patient Module Routes
 * Defines all patient-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController(prisma);

  // Search and list patients
  router.get('/', controller.searchPatients as any);

  // Get patient statistics
  router.get('/stats', controller.getStats as any);

  // Get recent patients
  router.get('/recent', controller.getRecentPatients as any);

  // Get patient by NHIS number (must be before /:id to avoid route conflict)
  router.get('/nhis/:nhisNumber', controller.getPatientByNHIS as any);

  // Get patient by ID
  router.get('/:id', controller.getPatientById as any);

  // Create new patient
  router.post('/', controller.createPatient as any);

  // Update patient
  router.put('/:id', controller.updatePatient as any);

  // Delete patient
  router.delete('/:id', controller.deletePatient as any);

  return router;
}
