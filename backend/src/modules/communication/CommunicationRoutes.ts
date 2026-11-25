import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { CommunicationController } from './CommunicationController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import {
  createTemplateSchema,
  sendBulkMessageSchema,
  sendMessageSchema,
  updateTemplateSchema,
} from './CommunicationSchemas';

export function createCommunicationRoutes(prisma: PrismaClient): Router {
  const router = Router();
  // ✅ Pass prisma to controller to maintain shared connection pool
  const controller = new CommunicationController(prisma);

  router.use(protect);

  // Provider readiness (is real delivery active?)
  router.get('/provider-status', controller.getProviderStatus);

  // SMS & WhatsApp Routes
  router.post('/sms', requireRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']), validateBody(sendMessageSchema), controller.sendSMS);
  router.post('/whatsapp', requireRole(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']), validateBody(sendMessageSchema), controller.sendWhatsApp);

  // Bulk Messaging
  router.post('/bulk', requireRole(['admin', 'accounts']), validateBody(sendBulkMessageSchema), controller.sendBulkMessage);

  // Template Management
  router.get('/templates', requireRole(['admin', 'accounts']), controller.getTemplates);
  router.post('/templates', requireRole(['admin', 'accounts']), validateBody(createTemplateSchema), controller.createTemplate);
  router.put('/templates/:id', requireRole(['admin', 'accounts']), validateBody(updateTemplateSchema), controller.updateTemplate);
  router.delete('/templates/:id', requireRole(['admin', 'accounts']), controller.deleteTemplate);

  // History & Statistics
  router.get('/history', requireRole(['admin', 'accounts', 'doctor', 'nurse', 'midwife']), controller.getMessageHistory);
  router.get('/stats', requireRole(['admin', 'accounts', 'doctor', 'nurse', 'midwife']), controller.getMessageStats);

  return router;
}