/**
 * Clinical Reports Routes
 * Route definitions for clinical report operations
 */

import { Router } from 'express';
import { protect } from '../../middleware/authMiddleware';
import { ClinicalReportsController } from './ClinicalReportsController';

const clinicalReportsController = new ClinicalReportsController();

export function createClinicalReportsRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const clinicalReportsController = new ClinicalReportsController(prisma);
  
  router.use(protect);
  
  router.get('/lab', clinicalReportsController.generateLabReport);
  router.get('/scan', clinicalReportsController.generateScanReport);
  router.get('/procedure', clinicalReportsController.generateProcedureReport);
  router.get('/medication', clinicalReportsController.generateMedicationReport);
  router.get('/vitals', clinicalReportsController.generateVitalsReport);
  
  return router;
}