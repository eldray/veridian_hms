import { Router } from 'express';
import { ProformaInvoiceController } from './ProformaInvoiceController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createProformaInvoiceRoutes = (prisma: PrismaClient) => {
  const router = Router();
  const controller = new ProformaInvoiceController(prisma);

  // All routes require authentication
  router.use(protect);

  // GET all proforma invoices with filters
  router.get('/', requireRole(['admin', 'accounts', 'doctor']), controller.getAll);

  // GET proforma invoice statistics
  router.get('/statistics', requireRole(['admin', 'accounts']), controller.getStatistics);

  // GET expiring estimates
  router.get('/expiring', requireRole(['admin', 'accounts']), controller.getExpiring);

  // GET estimates by patient
  router.get('/patient/:patientId', requireRole(['admin', 'accounts', 'doctor']), controller.getByPatient);

  // GET estimates by corporate account
  router.get('/corporate/:accountId', requireRole(['admin', 'accounts']), controller.getByCorporateAccount);

  // GET proforma invoice by ID
  router.get('/:id', protect, controller.getById);

  // POST create new proforma invoice
  router.post('/', requireRole(['admin', 'accounts']), controller.create);

  // PUT update proforma invoice (DRAFT only)
  router.put('/:id', requireRole(['admin', 'accounts']), controller.update);

  // POST send proforma invoice
  router.post('/:id/send', requireRole(['admin', 'accounts']), controller.send);

  // POST accept proforma invoice
  router.post('/:id/accept', protect, controller.accept);

  // POST reject proforma invoice
  router.post('/:id/reject', protect, controller.reject);

  // POST convert to bill
  router.post('/:id/convert', requireRole(['admin', 'accounts']), controller.convertToBill);

  // DELETE proforma invoice (DRAFT only)
  router.delete('/:id', requireRole(['admin']), controller.delete);

  return router;
}