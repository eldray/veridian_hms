import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client'; // ✅ Import UserRole
import { ProformaInvoiceController } from './ProformaInvoiceController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import {
  ConvertEstimateToBillSchema,
  CreateEstimateSchema,
  RejectEstimateSchema,
  UpdateEstimateSchema,
} from './ProformaInvoiceValidators';

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
  router.get('/:id', requireRole(readRoles), controller.getById);

  // POST create new proforma invoice
  router.post('/', requireRole(writeRoles), validateBody(CreateEstimateSchema), controller.create);

  // PUT update proforma invoice (DRAFT only)
  router.put('/:id', requireRole(writeRoles), validateBody(UpdateEstimateSchema), controller.update);

  // POST send proforma invoice
  router.post('/:id/send', requireRole(writeRoles), controller.send);

  // POST accept proforma invoice
  // Accepting an estimate approves it, so it needs the same finance roles as create and convert.
  router.post('/:id/accept', requireRole(writeRoles), controller.accept);

  // POST reject proforma invoice
  router.post('/:id/reject', requireRole(writeRoles), validateBody(RejectEstimateSchema), controller.reject);

  // POST convert to bill
  router.post('/:id/convert', requireRole(writeRoles), validateBody(ConvertEstimateToBillSchema), controller.convertToBill);

  // DELETE proforma invoice (DRAFT only)
  router.delete('/:id', requireRole(adminRoles), controller.delete);

  return router;
}