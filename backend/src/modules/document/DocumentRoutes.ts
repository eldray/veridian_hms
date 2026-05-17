import { Router } from 'express';
import { DocumentController } from './DocumentController';
import { authenticate, authorize } from '../../middleware/authMiddleware';

const documentController = new DocumentController();
const router = Router();

// All routes require authentication
router.use(authenticate);

// Document generation routes
router.post('/receipt/:billId', authorize(['admin', 'staff']), documentController.generateReceipt);
router.post('/referral/:referralId', authorize(['admin', 'staff']), documentController.generateReferralLetter);
router.post('/discharge/:encounterId', authorize(['admin', 'staff']), documentController.generateDischargeSummary);
router.post('/lab-result/:encounterId', authorize(['admin', 'staff']), documentController.generateLabResult);
router.post('/prescription/:encounterId', authorize(['admin', 'staff']), documentController.generatePrescription);
router.post('/statement/:billId', authorize(['admin', 'staff']), documentController.generateBillStatement);

// Document retrieval routes
router.get('/entity/:entityType/:entityId', authorize(['admin', 'staff']), documentController.getDocumentsByEntity);
router.get('/:id/download', authorize(['admin', 'staff']), documentController.downloadDocument);

// Document template routes
router.get('/templates', authorize(['admin', 'staff']), documentController.getDocumentTemplates);
router.post('/templates', authorize(['admin']), documentController.createDocumentTemplate);
router.put('/templates/:id', authorize(['admin']), documentController.updateDocumentTemplate);
router.delete('/templates/:id', authorize(['admin']), documentController.deleteDocumentTemplate);

export default router;
