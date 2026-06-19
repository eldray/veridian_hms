import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { ClinicalReportsController } from './ClinicalReportsController';

export function createClinicalReportsRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ClinicalReportsController(prisma);

  router.use(protect);
  router.use(requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer']));

  router.get('/lab', controller.generateLabReport);
  router.get('/scan', controller.generateScanReport);
  router.get('/procedure', controller.generateProcedureReport);
  router.get('/medication', controller.generateMedicationReport);
  router.get('/vitals', controller.generateVitalsReport);

  return router;
}