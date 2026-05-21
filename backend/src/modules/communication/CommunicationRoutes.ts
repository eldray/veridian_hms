// modules/communication/CommunicationRoutes.ts
import { Router } from 'express';
import { CommunicationController } from './CommunicationController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createCommunicationRoutes(): Router {
  const router = Router();
  const controller = new CommunicationController();

  // All routes require authentication
  router.use(protect);

  // SMS Routes
  router.post(
    '/sms',
    requireRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']),
    controller.sendSMS
  );

  // WhatsApp Routes
  router.post(
    '/whatsapp',
    requireRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']),
    controller.sendWhatsApp
  );

  // Bulk Messaging - restricted to admin and accounts
  router.post(
    '/bulk',
    requireRole(['admin', 'accounts']),
    controller.sendBulkMessage
  );

  // Template Management - restricted to admin and accounts
  router.get('/templates', requireRole(['admin', 'accounts']), controller.getTemplates);
  router.post('/templates', requireRole(['admin', 'accounts']), controller.createTemplate);
  router.put('/templates/:id', requireRole(['admin', 'accounts']), controller.updateTemplate);
  router.delete('/templates/:id', requireRole(['admin', 'accounts']), controller.deleteTemplate);

  // History & Statistics
  router.get('/history', requireRole(['admin', 'accounts', 'doctor', 'nurse', 'midwife']), controller.getMessageHistory);
  router.get('/stats', requireRole(['admin', 'accounts', 'doctor', 'nurse', 'midwife']), controller.getMessageStats);

  return router;
}