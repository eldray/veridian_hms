import { Router } from 'express';
import {
  getBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  addPaymentToBill,
  voidBillLineItem,
  getBillStatistics,
  getBillLineItems,
  applyWaiverToBill
} from './BillController';
import { authenticate } from '../../../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/bills - List all bills with filtering and pagination
router.get('/', getBills);

// GET /api/bills/statistics - Get bill statistics
router.get('/statistics', getBillStatistics);

// GET /api/bills/:id - Get bill by ID
router.get('/:id', getBillById);

// GET /api/bills/:id/line-items - Get bill line items
router.get('/:id/line-items', getBillLineItems);

// POST /api/bills - Create a new bill
router.post('/', createBill);

// PUT /api/bills/:id - Update a bill
router.put('/:id', updateBill);

// DELETE /api/bills/:id - Delete a bill
router.delete('/:id', deleteBill);

// POST /api/bills/:id/payment - Add payment to a bill
router.post('/:id/payment', addPaymentToBill);

// POST /api/bills/line-items/:lineItemId/void - Void a bill line item
router.post('/line-items/:lineItemId/void', voidBillLineItem);

// POST /api/bills/:billId/apply-waiver - Apply waiver to a bill
router.post('/:billId/apply-waiver', applyWaiverToBill);

export default router;
