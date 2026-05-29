/**
 * Clinical Reports Routes
 * Route definitions for clinical report operations
 */

import { Router } from 'express';
// FIXED: was missing — PrismaClient used as a type but never imported
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { ClinicalReportsController } from './ClinicalReportsController';


export function createClinicalReportsRoutes(prisma: PrismaClient): Router {
  const router     = Router();
  // FIXED: now passes prisma through so the connection pool is shared
  const controller = new ClinicalReportsController(prisma);

  router.use(protect);

  // FIXED: added role guard — clinical data is sensitive; was accessible to any authenticated user
  router.use(requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer']));

  router.get('/lab',       controller.generateLabReport);
  router.get('/scan',      controller.generateScanReport);
  router.get('/procedure', controller.generateProcedureReport);
  router.get('/medication', controller.generateMedicationReport);
  router.get('/vitals',    controller.generateVitalsReport);

  return router;
}