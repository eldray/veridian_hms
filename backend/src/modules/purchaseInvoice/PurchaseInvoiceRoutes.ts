import { Router } from 'express';
import { body } from 'express-validator';
import { purchaseInvoiceController } from './PurchaseInvoiceController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { UserRole } from '@prisma/client';

export const createPurchaseInvoiceRoutes = () => {
  const router = Router();

  router.use(protect);

  // ── Central role lists ──
  const READERS: UserRole[] = ['super_admin', 'admin', 'accounts', 'pharmacist'];
  const WRITERS: UserRole[] = ['super_admin', 'admin', 'accounts'];
  const DELETERS: UserRole[] = ['super_admin', 'admin'];

  // ==========================================
  // ROUTES
  // ==========================================

  // Read
  router.get('/',         requireRole(READERS), purchaseInvoiceController.getInvoices);
  router.get('/suppliers', requireRole(READERS), purchaseInvoiceController.getSuppliers);
  router.get('/stats',    requireRole(['super_admin', 'admin', 'accounts']), purchaseInvoiceController.getInvoiceStats);
  router.get('/:id',      requireRole(READERS), purchaseInvoiceController.getInvoiceById);

  // Create
  router.post(
    '/',
    requireRole(WRITERS),
    [
      body('invoiceNumber').notEmpty(),
      body('supplierName').notEmpty(),
      body('invoiceDate').isISO8601(),
      body('totalAmount').isFloat({ min: 0 }),
      body('invoiceItems').isArray({ min: 1 }),
      body('invoiceItems.*.stockItemId').notEmpty(),
      body('invoiceItems.*.quantity').isInt({ min: 1 }),
      body('invoiceItems.*.unitCost').isFloat({ min: 0 }),
    ],
    purchaseInvoiceController.createInvoice,
  );

  // Update
  router.put('/:id', requireRole(WRITERS), purchaseInvoiceController.updateInvoice);

  // Delete
  router.delete('/:id', requireRole(DELETERS), purchaseInvoiceController.deleteInvoice);

  return router;
};