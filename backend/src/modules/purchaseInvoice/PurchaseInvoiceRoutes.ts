import { Router } from 'express';
import { body } from 'express-validator';
import { purchaseInvoiceController } from './PurchaseInvoiceController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createPurchaseInvoiceRoutes = () => {
  const router = Router();

  // ✅ Global Auth
  router.use(protect);

  // ==========================================
  // ROUTES
  // ==========================================

  // Read access for Admin, Accounts, and Pharmacist
  router.get('/', requireRole(['admin', 'accounts', 'pharmacist']), purchaseInvoiceController.getInvoices);
  router.get('/suppliers', requireRole(['admin', 'accounts', 'pharmacist']), purchaseInvoiceController.getSuppliers);
  router.get('/stats', requireRole(['admin', 'accounts']), purchaseInvoiceController.getInvoiceStats);
  router.get('/:id', requireRole(['admin', 'accounts', 'pharmacist']), purchaseInvoiceController.getInvoiceById);

  // Write access restricted to Admin/Accounts
  router.post(
    '/',
    requireRole(['admin', 'accounts']),
    [
      body('invoiceNumber').notEmpty(), 
      body('supplierName').notEmpty(), 
      body('invoiceDate').isISO8601(),
      body('totalAmount').isFloat({ min: 0 }), 
      body('invoiceItems').isArray({ min: 1 }),
      body('invoiceItems.*.stockItemId').notEmpty(), 
      body('invoiceItems.*.quantity').isInt({ min: 1 }),
      body('invoiceItems.*.unitCost').isFloat({ min: 0 })
    ],
    purchaseInvoiceController.createInvoice
  );

  router.put('/:id', requireRole(['admin', 'accounts']), purchaseInvoiceController.updateInvoice);
  router.delete('/:id', requireRole(['admin']), purchaseInvoiceController.deleteInvoice);

  return router;
};