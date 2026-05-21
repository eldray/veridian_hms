// modules/patient/PatientRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController();

  // Search and list patients
  router.get('/', controller.searchPatients.bind(controller));

  // Get patient statistics
  router.get('/stats', controller.getStats.bind(controller));

  // Get recent patients
  router.get('/recent', controller.getRecentPatients.bind(controller));

  // ✅ NEW: Get patients by corporate account
  router.get('/corporate/:corporateAccountId', controller.getPatientsByCorporateAccount.bind(controller));

  // Get patient by NHIS number
  router.get('/nhis/:nhisNumber', controller.getPatientByNHIS.bind(controller));

  // ✅ NEW: Get patient corporate summary
  router.get('/:id/corporate-summary', controller.getPatientCorporateSummary.bind(controller));

  // Get patient by ID
  router.get('/:id', controller.getPatientById.bind(controller));

  // Create new patient
  router.post('/', controller.createPatient.bind(controller));

  // Update patient
  router.put('/:id', controller.updatePatient.bind(controller));

  // Delete patient
  router.delete('/:id', controller.deletePatient.bind(controller));

  return router;
}