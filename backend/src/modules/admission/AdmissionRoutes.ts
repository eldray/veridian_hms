// modules/admission/AdmissionRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAdmissionController } from './AdmissionController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAdmissionRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = createAdmissionController(prisma);

  // All admission routes require authentication
  router.use(protect);

  // Routes requiring higher privileges
  router.get('/', requireRole(['admin', 'doctor', 'records', 'accounts']), controller.getAllAdmissions);
  router.get('/stats', requireRole(['admin', 'doctor', 'accounts']), controller.getAdmissionStats);
  router.get('/:id', requireRole(['admin', 'doctor', 'nurse', 'records']), controller.getAdmissionById);
  
  // Write operations
  router.post('/', requireRole(['admin', 'doctor']), controller.createAdmission);
  router.post('/:id/notes', requireRole(['admin', 'doctor', 'nurse']), controller.addDailyNotes);
  router.post('/:id/discharge', requireRole(['admin', 'doctor']), controller.dischargeAdmission);
  router.delete('/:id', requireRole(['admin']), controller.deleteAdmission);

  return router;
}