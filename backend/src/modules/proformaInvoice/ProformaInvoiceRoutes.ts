import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client'; // ✅ Import UserRole
import { ProformaInvoiceController } from './ProformaInvoiceController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createProformaInvoiceRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ProformaInvoiceController(prisma);

  router.use(protect);

  // ✅ FIXED: Explicitly type the arrays to prevent TypeScript underlines
  const readRoles: UserRole[] = ['admin', 'accounts', 'doctor'];
  const writeRoles: UserRole[] = ['admin', 'accounts'];
  const adminRoles: UserRole[] = ['admin'];

  // GET all proforma invoices with filters
  router.get('/', requireRole(readRoles), controller.getAll);

  // GET proforma invoice statistics
  router.get('/statistics', requireRole(writeRoles), controller.getStatistics);

  // GET expiring estimates
  router.get('/expiring', requireRole(writeRoles), controller.getExpiring);

  // GET estimates by patient
  router.get('/patient/:patientId', requireRole(readRoles), controller.getByPatient);

  // GET estimates by corporate account
  router.get('/corporate/:accountId', requireRole(writeRoles), controller.getByCorporateAccount);

  // GET proforma invoice by ID
  router.get('/:id', controller.getById);

  // POST create new proforma invoice
  router.post('/', requireRole(writeRoles), controller.create);

  // PUT update proforma invoice (DRAFT only)
  router.put('/:id', requireRole(writeRoles), controller.update);

  // POST send proforma invoice
  router.post('/:id/send', requireRole(writeRoles), controller.send);

  // POST accept proforma invoice
  router.post('/:id/accept', controller.accept);

  // POST reject proforma invoice
  router.post('/:id/reject', controller.reject);

  // POST convert to bill
  router.post('/:id/convert', requireRole(writeRoles), controller.convertToBill);

  // DELETE proforma invoice (DRAFT only)
  router.delete('/:id', requireRole(adminRoles), controller.delete);

  return router;
}