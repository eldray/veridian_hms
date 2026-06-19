// modules/document/DocumentRoutes.ts
import { Router } from 'express';
import { DocumentController } from './DocumentController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createDocumentRoutes = () => {
  const documentController = new DocumentController();
  const router = Router();

  // All routes require authentication
  router.use(protect);

  // Document generation routes
  router.post('/receipt/:billId', requireRole(['admin', 'records', 'accounts']), documentController.generateReceipt);
  router.post('/referral/:referralId', requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife']), documentController.generateReferralLetter);
  router.post('/discharge/:encounterId', requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife']), documentController.generateDischargeSummary);
  router.post('/lab-result/:encounterId', requireRole(['admin', 'records', 'lab_tech', 'doctor']), documentController.generateLabResult);
  router.post('/prescription/:encounterId', requireRole(['admin', 'records', 'pharmacist', 'doctor']), documentController.generatePrescription);
  router.post('/statement/:billId', requireRole(['admin', 'records', 'accounts']), documentController.generateBillStatement);

  // Document retrieval routes
  router.get('/entity/:entityType/:entityId', requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts']), documentController.getDocumentsByEntity);
  router.get('/:id/download', requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts']), documentController.downloadDocument);

  // Document template routes
  router.get('/templates', requireRole(['admin', 'records']), documentController.getDocumentTemplates);
  router.post('/templates', requireRole(['admin']), documentController.createDocumentTemplate);
  router.put('/templates/:id', requireRole(['admin']), documentController.updateDocumentTemplate);
  router.delete('/templates/:id', requireRole(['admin']), documentController.deleteDocumentTemplate);

  return router;
};