import { Router } from 'express';
import { PurchaseInvoiceController } from './purchaseInvoice.controller'; // ✅ Fixed import
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createPurchaseInvoiceRoutes = (controller?: PurchaseInvoiceController): Router => {
  const router = Router();
  const purchaseInvoiceController = controller || new PurchaseInvoiceController();

  // All routes require authentication
  router.use(protect);

  // GET all purchase invoices (Admin & Accounts only)
  router.get('/', requireRole(['admin', 'accounts']), purchaseInvoiceController.getInvoices.bind(purchaseInvoiceController));

  // GET suppliers list (Admin & Accounts only)
  router.get('/suppliers', requireRole(['admin', 'accounts']), purchaseInvoiceController.getSuppliers.bind(purchaseInvoiceController));

  // GET invoice stats (Admin & Accounts only)
  router.get('/stats', requireRole(['admin', 'accounts']), purchaseInvoiceController.getInvoiceStats.bind(purchaseInvoiceController));

  // GET invoice by ID (Admin & Accounts only)
  router.get('/:id', requireRole(['admin', 'accounts']), purchaseInvoiceController.getInvoiceById.bind(purchaseInvoiceController));

  // CREATE purchase invoice (Admin only)
  router.post(
    '/',
    requireRole(['admin']),
    [
      body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
      body('supplierName').notEmpty().withMessage('Supplier name is required'),
      body('invoiceDate').isISO8601().withMessage('Valid invoice date is required'),
      body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
      body('invoiceItems').isArray({ min: 1 }).withMessage('At least one invoice item is required'),
      body('invoiceItems.*.stockItemId').notEmpty().withMessage('Stock item ID is required'),
      body('invoiceItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
      body('invoiceItems.*.unitCost').isFloat({ min: 0 }).withMessage('Unit cost must be positive'),
    ],
    purchaseInvoiceController.createInvoice.bind(purchaseInvoiceController)
  );

  // UPDATE purchase invoice (Admin only)
  router.put(
    '/:id',
    requireRole(['admin']),
    [
      body('supplierName').optional().notEmpty().withMessage('Supplier name cannot be empty'),
      body('invoiceDate').optional().isISO8601().withMessage('Valid invoice date is required'),
      body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be positive'),
      body('notes').optional().isString(),
    ],
    purchaseInvoiceController.updateInvoice.bind(purchaseInvoiceController)
  );

  // DELETE purchase invoice (Admin only)
  router.delete('/:id', requireRole(['admin']), purchaseInvoiceController.deleteInvoice.bind(purchaseInvoiceController));

  return router;
};