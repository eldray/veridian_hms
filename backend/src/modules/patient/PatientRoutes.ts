import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';
// ✅ ADDED: Security Middleware
import { protect, requireAdmin, requirePatientManagement } from '../../middleware/authMiddleware';
import { auditPatientAccess } from '../../middleware/audit';
import { uploadPatientPhoto, handleUploadError } from '../../middleware/uploadMiddleware';
import { validateBody } from '../../middleware/validate';
import { createAllergySchema, createMedicalHistorySchema } from './PatientSchemas';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController();
  // Create/update accept multipart form fields for legacy patient forms.
  // Image files are handled by the dedicated upload-image endpoint.
  const parseMultipartFields = multer().none();

  // Patient demographics and EMR context are limited to the roles authorised for the
  // Patients area (admin/super_admin are inherited by requirePatientManagement).
  // Other departments use their own scoped worklists instead of this patient-wide API.
  router.use(protect);
  // Keep facility-wide clinical access while recording authenticated patient read attempts.
  router.use(auditPatientAccess);

  // Search and list patients
  router.get('/', requirePatientManagement, controller.searchPatients);
  router.get('/stats', requirePatientManagement, controller.getStats);
  router.get('/recent', requirePatientManagement, controller.getRecentPatients);
  router.get('/corporate/:corporateAccountId', requirePatientManagement, controller.getPatientsByCorporateAccount);
  router.get('/nhis/:nhisNumber', requirePatientManagement, controller.getPatientByNHIS);
  router.get('/:id/corporate-summary', requirePatientManagement, controller.getPatientCorporateSummary);
  router.get('/:id', requirePatientManagement, controller.getPatientById);
  router.post('/', requirePatientManagement, parseMultipartFields, controller.createPatient);
  router.post('/generate-ccc', requirePatientManagement, controller.generateCCC);
  router.put('/:id', requirePatientManagement, parseMultipartFields, controller.updatePatient);
  router.post('/:id/upload-image', requirePatientManagement, uploadPatientPhoto, handleUploadError, controller.uploadImage);
  router.post('/:id/upload-image-base64', requirePatientManagement, controller.uploadImageBase64);
  // Hard delete removes the whole record; docs and clinical history go with it,
  // so it is reserved for administrators even though records staff may edit patients.
  router.delete('/:id', requireAdmin, controller.deletePatient);

  // ==========================================
  // NEW: EMR (Allergies & Histories) Routes
  // ==========================================
  router.post('/:id/allergies', requirePatientManagement, validateBody(createAllergySchema), controller.addAllergy);
  router.get('/:id/allergies', requirePatientManagement, controller.getAllergies);
  router.post('/:id/medical-history', requirePatientManagement, validateBody(createMedicalHistorySchema), controller.addMedicalHistory);
  router.get('/:id/medical-history', requirePatientManagement, controller.getMedicalHistories);

  return router;
}