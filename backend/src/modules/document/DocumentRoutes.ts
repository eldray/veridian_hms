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
  // A scan report is printed on the same sheet as a lab result, so the sonographer needs
  // this route too — a counter customer collects their own printed report at the desk.
  router.post('/lab-result/:encounterId', requireRole(['admin', 'records', 'lab_tech', 'sonographer', 'doctor']), documentController.generateLabResult);
  router.post('/prescription/:encounterId', requireRole(['admin', 'records', 'pharmacist', 'doctor']), documentController.generatePrescription);
  router.post('/bill-statement/:billId', requireRole(['admin', 'records', 'accounts']), documentController.generateBillStatement);
  router.post('/statement/:billId', requireRole(['admin', 'records', 'accounts']), documentController.generateBillStatement);

  // Reprint an existing generated document without creating a duplicate record.
  router.post('/reprint/:id', requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts']), documentController.reprintDocument);

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