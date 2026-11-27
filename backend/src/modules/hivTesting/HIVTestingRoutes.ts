import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { auditSensitiveAccess } from '../../middleware/audit';
import { HIVTestingController } from './HIVTestingController';

export function createHIVTestingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new HIVTestingController(prisma);
  router.use(protect);
  router.use(auditSensitiveAccess('HIVTesting'));
  const readers = ['admin', 'doctor', 'nurse', 'midwife'];
  const writers = ['admin', 'doctor', 'nurse', 'midwife'];
  router.get('/patient/:patientId', requireRole(readers), controller.listForPatient);
  router.post('/', requireRole(writers), controller.create);
  router.get('/reports/monthly', requireRole(['admin', 'doctor']), controller.monthlyReport);
  return router;
}
