// modules/diagnosis/DiagnosisRoutes.ts - FIXED
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DiagnosisController } from './DiagnosisController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createDiagnosisRoutes(prisma: PrismaClient): Router {  // ✅ Accept prisma
  const router = Router();
  const controller = new DiagnosisController(prisma);  // ✅ Pass to controller

  // All routes require authentication
  router.use(protect);

  // GET /api/diagnoses - Get all diagnoses with filters and pagination
  router.get('/', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.getAll);

  // GET /api/diagnoses/search - Search diagnoses
  router.get('/search', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.search);

  // GET /api/diagnoses/stats - Get diagnosis statistics (Admin only)
  router.get('/stats', requireRole(['admin']), controller.getStats);

  // GET /api/diagnoses/morbidity-groups - Get all morbidity groups
  router.get('/morbidity-groups', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.getMorbidityGroups);

  // GET /api/diagnoses/morbidity-group/:morbidityGroup - Get diagnoses by morbidity group
  router.get('/morbidity-group/:morbidityGroup', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.getByMorbidityGroup);

  // GET /api/diagnoses/:id - Get diagnosis by ID
  router.get('/:id', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.getById);

  // POST /api/diagnoses - Create a new diagnosis (Admin only)
  router.post('/', requireRole(['admin']), controller.create);

  // PUT /api/diagnoses/:id - Update a diagnosis (Admin only)
  router.put('/:id', requireRole(['admin']), controller.update);

  // DELETE /api/diagnoses/:id - Delete a diagnosis (Admin only)
  router.delete('/:id', requireRole(['admin']), controller.delete);

  return router;
}

export default createDiagnosisRoutes;  // ✅ Export as function