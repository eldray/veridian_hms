import { Router } from 'express';
import {
  getBills,
  getBillById,
  createBill,
  createBillValidation,
  updateBill,
  updateBillValidation,
  deleteBill,
  addPaymentToBill,
  addPaymentValidation,
  voidBillLineItem,
  voidLineItemValidation,
  getBillStatistics,
  getBillLineItems,
  applyWaiverToBill,
  applyWaiverValidation
} from './BillController';
import { protect, requireRole } from '../../middleware/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

// GET /api/bills - List all bills with filtering and pagination
router.get('/', getBills);

// GET /api/bills/statistics - Get bill statistics
router.get('/statistics', getBillStatistics);

// GET /api/bills/:id - Get bill by ID
router.get('/:id', getBillById);

// GET /api/bills/:id/line-items - Get bill line items
router.get('/:id/line-items', getBillLineItems);

// POST /api/bills - Create a new bill
router.post('/', createBillValidation, createBill);

// PUT /api/bills/:id - Update a bill (Admin/Accounts only)
router.put('/:id', requireRole(['admin', 'accounts']), updateBillValidation, updateBill);

// DELETE /api/bills/:id - Delete a bill (Admin only)
router.delete('/:id', requireRole(['admin']), deleteBill);

// POST /api/bills/:id/payment - Add payment to a bill
router.post('/:id/payment', addPaymentValidation, addPaymentToBill);

// POST /api/bills/line-items/:lineItemId/void - Void a bill line item (Admin/Accounts only)
router.post('/line-items/:lineItemId/void', requireRole(['admin', 'accounts']), voidLineItemValidation, voidBillLineItem);

// POST /api/bills/:billId/apply-waiver - Apply waiver to a bill
router.post('/:billId/apply-waiver', applyWaiverValidation, applyWaiverToBill);

export default router;