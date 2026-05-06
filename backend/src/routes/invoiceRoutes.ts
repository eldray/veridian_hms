// routes/invoiceRoutes.ts
import express from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getSuppliers,
  getInvoiceStats
} from '../controllers/invoiceController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// GET /api/invoices - Get all invoices
router.get('/', requireRole(['admin', 'pharmacist']), getInvoices);

// GET /api/invoices/stats - Get invoice statistics
router.get('/stats', requireRole(['admin', 'pharmacist']), getInvoiceStats);

// GET /api/invoices/suppliers - Get list of suppliers
router.get('/suppliers', requireRole(['admin', 'pharmacist']), getSuppliers);

// GET /api/invoices/:id - Get invoice by ID
router.get('/:id', requireRole(['admin', 'pharmacist']), getInvoiceById);

// POST /api/invoices - Create new invoice
router.post('/', requireRole(['admin', 'pharmacist']), createInvoice);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', requireRole(['admin', 'pharmacist']), updateInvoice);

// DELETE /api/invoices/:id - Delete invoice
router.delete('/:id', requireRole(['admin']), deleteInvoice);

export default router;