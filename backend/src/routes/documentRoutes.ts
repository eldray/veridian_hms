// routes/documentRoutes.ts
import express from 'express';
import { protect, requireClinicalStaff, requireAdmin } from '../middleware/authMiddleware';
import {
  generateReceipt,
  generateReferralLetter,
  generateDischargeSummary,
  generateLabResult,
  generatePrescription,
  downloadDocument,
  getDocumentsByEntity,
  reprintDocument,
  getDocumentTemplates,
  createDocumentTemplate,
  updateDocumentTemplate,
  deleteDocumentTemplate,
  generateBillStatement
} from '../controllers/documentController';

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==============================================
// DOCUMENT GENERATION
// ==============================================
router.post('/receipt/:billId', requireClinicalStaff, generateReceipt);
router.post('/referral/:referralId', requireClinicalStaff, generateReferralLetter);
router.post('/discharge/:admissionId', requireClinicalStaff, generateDischargeSummary);
router.post('/lab-result/:labTestId', requireClinicalStaff, generateLabResult);
router.post('/prescription/:attendanceId', requireClinicalStaff, generatePrescription);
router.post('/bill-statement/:billId', protect, generateBillStatement);

// ==============================================
// DOCUMENT RETRIEVAL
// ==============================================
router.get('/entity/:entityType/:entityId', getDocumentsByEntity);
router.get('/download/:documentId', downloadDocument);
router.post('/reprint/:documentId', reprintDocument);

// ==============================================
// TEMPLATE MANAGEMENT (Admin only)
// ==============================================
router.get('/templates', requireAdmin, getDocumentTemplates);
router.post('/templates', requireAdmin, createDocumentTemplate);
router.put('/templates/:id', requireAdmin, updateDocumentTemplate);
router.delete('/templates/:id', requireAdmin, deleteDocumentTemplate);

export default router;