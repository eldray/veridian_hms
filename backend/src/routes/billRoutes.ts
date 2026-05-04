import express from 'express';
import {
  getBills,
  getBillById,
  createBill,
  addPaymentToBill,
  generateBillFromAttendance,
  generateBillReport,
  getBillingBreakdown,
  updateBillStatus,
  getBillStatistics,
  getBillLineItems,
  voidBillLineItem
} from '../controllers/billController';
import { protect, requireAccountsStaff, requireBillingAccess } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// ==========================================
// BILL MANAGEMENT ROUTES
// ==========================================

// GET /api/bills - Get all bills with pagination and filtering
router.get('/', requireBillingAccess, getBills);

// GET /api/bills/statistics - Get bill statistics
router.get('/statistics', requireAccountsStaff, getBillStatistics);

// GET /api/bills/:id - Get bill by ID
router.get('/:id', requireBillingAccess, getBillById);

// GET /api/bills/:id/report - Generate bill report
router.get('/:id/report', requireBillingAccess, generateBillReport);

// GET /api/bills/:id/breakdown - Get billing breakdown
router.get('/:id/breakdown', requireBillingAccess, getBillingBreakdown);

// POST /api/bills - Create manual bill
router.post('/', requireAccountsStaff, createBill);

// POST /api/bills/generate/:attendanceId - Generate bill from attendance services
router.post('/generate/:attendanceId', requireAccountsStaff, generateBillFromAttendance);

// POST /api/bills/:id/payments - Add payment to bill with payment method
router.post('/:id/payments', requireAccountsStaff, addPaymentToBill);

// PATCH /api/bills/:id/status - Update bill status
router.patch('/:id/status', requireAccountsStaff, updateBillStatus);

// Add to billRoutes.ts
router.delete('/line-items/:lineItemId/void', requireAccountsStaff, voidBillLineItem);

router.get('/:id/line-items', protect, requireAccountsStaff, getBillLineItems);
export default router;