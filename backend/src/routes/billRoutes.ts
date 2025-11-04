// routes/billRoutes.ts
import express from 'express';
import {
  getBills,
  getBillById,
  createBill,
  addPaymentToBill,
  generateBillReport
} from '../controllers/billController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getBills);
router.get('/:id', protect, getBillById);
router.get('/:id/report', protect, generateBillReport);
router.post('/', protect, requireRole(['admin', 'accounts', 'doctor']), createBill);
router.post('/:id/payment', protect, requireRole(['admin', 'accounts']), addPaymentToBill);

export default router;
