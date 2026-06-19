import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';
// ✅ ADDED: Security Middleware
import { protect, requirePatientManagement } from '../../middleware/authMiddleware';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController();

  // ✅ ADDED: Apply authentication and authorization to ALL patient routes
  router.use(protect, requirePatientManagement);

  // Search and list patients
  router.get('/', controller.searchPatients);
  router.get('/stats', controller.getStats);
  router.get('/recent', controller.getRecentPatients);
  router.get('/corporate/:corporateAccountId', controller.getPatientsByCorporateAccount);
  router.get('/nhis/:nhisNumber', controller.getPatientByNHIS);
  router.get('/:id/corporate-summary', controller.getPatientCorporateSummary);
  router.get('/:id', controller.getPatientById);
  router.post('/', controller.createPatient);
  router.put('/:id', controller.updatePatient);
  router.delete('/:id', controller.deletePatient);

  // ==========================================
  // NEW: EMR (Allergies & Histories) Routes
  // ==========================================
  router.post('/:id/allergies', controller.addAllergy);
  router.get('/:id/allergies', controller.getAllergies);
  router.post('/:id/medical-history', controller.addMedicalHistory);
  router.get('/:id/medical-history', controller.getMedicalHistories);

  return router;
}