import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { PatientController } from './PatientController';
// ✅ ADDED: Security Middleware
import { protect, requirePatientManagement } from '../../middleware/authMiddleware';
import { uploadPatientPhoto } from '../../middleware/uploadMiddleware';

export function createPatientRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new PatientController();
  // Patient image uploads use the dedicated /:id/upload-image route. For create/update
  // multipart requests, parse ordinary form fields only so FormData is not silently ignored.
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
  router.post('/:id/upload-image', uploadPatientPhoto, controller.uploadImage);
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