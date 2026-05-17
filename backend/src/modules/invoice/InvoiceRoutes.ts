// InvoiceRoutes.ts
import { Router } from 'express';
import { InvoiceController } from './InvoiceController';
import { body } from 'express-validator';

export const createInvoiceRoutes = (controller?: InvoiceController): Router => {
  const router = Router();
  const invoiceController = controller || new InvoiceController();

  // GET all invoices
  router.get('/', invoiceController.getInvoices.bind(invoiceController));

  // GET suppliers list
  router.get('/suppliers', invoiceController.getSuppliers.bind(invoiceController));

  // GET invoice stats
  router.get('/stats', invoiceController.getInvoiceStats.bind(invoiceController));

  // GET invoice by ID
  router.get('/:id', invoiceController.getInvoiceById.bind(invoiceController));

  // CREATE invoice
  router.post(
    '/',
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
    invoiceController.createInvoice.bind(invoiceController)
  );

  // UPDATE invoice
  router.put(
    '/:id',
    [
      body('supplierName').optional().notEmpty().withMessage('Supplier name cannot be empty'),
      body('invoiceDate').optional().isISO8601().withMessage('Valid invoice date is required'),
      body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be positive'),
      body('notes').optional().isString(),
    ],
    invoiceController.updateInvoice.bind(invoiceController)
  );

  // DELETE invoice
  router.delete('/:id', invoiceController.deleteInvoice.bind(invoiceController));

  return router;
};
