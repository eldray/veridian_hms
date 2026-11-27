import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { auditSensitiveAccess } from '../../middleware/audit';
import { ClinicalReportsController } from './ClinicalReportsController';

export function createClinicalReportsRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ClinicalReportsController(prisma);

  router.use(protect);
  router.use(auditSensitiveAccess('ClinicalReport'));

  // These aggregate service reports follow the same role matrix as the Reports UI.
  // They contain department workload and result-derived aggregates, not patient rows.
  const serviceReportReaders = ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer'];

  router.get('/lab', requireRole(serviceReportReaders), controller.generateLabReport);
  router.get('/scan', requireRole(serviceReportReaders), controller.generateScanReport);
  router.get('/procedure', requireRole(serviceReportReaders), controller.generateProcedureReport);
  router.get('/medication', requireRole(serviceReportReaders), controller.generateMedicationReport);
  router.get('/vitals', requireRole(serviceReportReaders), controller.generateVitalsReport);

  return router;
}
