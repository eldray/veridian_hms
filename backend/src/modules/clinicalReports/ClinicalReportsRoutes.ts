import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect } from '../../middleware/authMiddleware';
import { ClinicalReportsController } from './ClinicalReportsController';

export function createClinicalReportsRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ClinicalReportsController(prisma);

  router.use(protect);
  // Read-only clinical summaries are available to authenticated staff.
  // Result entry, verification and clinical record mutations remain separately guarded.

  router.get('/lab', controller.generateLabReport);
  router.get('/scan', controller.generateScanReport);
  router.get('/procedure', controller.generateProcedureReport);
  router.get('/medication', controller.generateMedicationReport);
  router.get('/vitals', controller.generateVitalsReport);

  return router;
}