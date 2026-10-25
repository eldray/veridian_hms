import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';
// ✅ ADDED: Security Middleware
import { protect, requirePatientManagement } from '../../middleware/authMiddleware';
import { uploadPatientPhoto, handleUploadError } from '../../middleware/uploadMiddleware';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController();
  // Create/update accept multipart form fields for legacy patient forms.
  // Image files are handled by the dedicated upload-image endpoint.
  const parseMultipartFields = multer().none();

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
  router.post('/', parseMultipartFields, controller.createPatient);
  router.post('/generate-ccc', controller.generateCCC);
  router.put('/:id', parseMultipartFields, controller.updatePatient);
  router.post('/:id/upload-image', uploadPatientPhoto, handleUploadError, controller.uploadImage);
  router.post('/:id/upload-image-base64', controller.uploadImageBase64);
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