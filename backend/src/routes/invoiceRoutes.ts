// routes/invoiceRoutes.ts - NEW
import express from 'express';
import {
  getInvoices,
  createInvoice
} from '../controllers/invoiceController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', requireRole(['admin', 'pharmacist']), getInvoices);
router.post('/', requireRole(['admin', 'pharmacist']), createInvoice);

export default router;