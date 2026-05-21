// modules/admission/AdmissionRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAdmissionController } from './AdmissionController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAdmissionRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = createAdmissionController(prisma);

  router.use(protect);
  router.use(requireRole(['admin', 'doctor', 'nurse']));

  router.get('/', controller.getAdmissions);
  router.get('/stats', controller.getAdmissionStats);
  router.get('/patient/:patientId', controller.getAdmissionsByPatientId);
  router.get('/:id', controller.getAdmissionById);
  router.post('/', controller.createAdmission);
  router.put('/:id', controller.updateAdmission);
  router.delete('/:id', controller.deleteAdmission);
  router.post('/:id/discharge', controller.dischargePatient);
  router.post('/:id/diagnoses/secondary', controller.addSecondaryDiagnosis);
  router.delete('/:id/diagnoses/:diagnosisRecordId', controller.removeDiagnosis);
  router.put('/:id/diagnoses/primary', controller.updatePrimaryDiagnosis);
  router.post('/:id/notes', controller.addDailyNotes);

  return router;
}