import { Router } from 'express';
import { billController } from './BillController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { auditSensitiveAccess } from '../../middleware/audit';

export const createBillRoutes = () => {
  const router = Router();

  // All routes require authentication
  router.use(protect);
  router.use(auditSensitiveAccess('Bill'));

  // Patient-linked bill details are limited to staff who legitimately handle care,
  // registration/receipts or billing. Diagnostics, pharmacy and HR do not need the
  // facility's payment history or bill line-item detail.
  const BILL_READERS = ['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife'];
  const FINANCIAL_READERS = ['admin', 'accounts'];

  // GET /api/bills - List all bills with filtering and pagination
  router.get('/', requireRole(BILL_READERS), billController.getBills);

  // GET /api/bills/statistics - Get bill statistics
  router.get('/statistics', requireRole(FINANCIAL_READERS), billController.getBillStatistics);

  // POST /api/bills/generate/:encounterId - Generate a bill from an encounter's billable items
  // ⚠️ Registered BEFORE the dynamic /:id routes so :id does not swallow "generate".
  // Creating charge lines is a revenue action; the same roles that may create or
  // amend a bill, so diagnostics and HR staff cannot raise charges.
  const BILLING_STAFF = ['admin', 'super_admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife', 'pharmacist'];
  router.post('/generate/:encounterId', requireRole(BILLING_STAFF), billController.generateBillFromEncounter);

  // GET /api/bills/:id - Get bill by ID
  router.get('/:id', requireRole(BILL_READERS), billController.getBillById);

  // GET /api/bills/:id/line-items - Get bill line items
  router.get('/:id/line-items', requireRole(BILL_READERS), billController.getBillLineItems);

  // GET /api/bills/:id/breakdown - Get grouped billing breakdown for a bill
  router.get('/:id/breakdown', requireRole(BILL_READERS), billController.getBillBreakdown);

  // GET /api/bills/:id/report - Generate a bill report (reuses breakdown shape)
  router.get('/:id/report', requireRole(BILL_READERS), billController.getBillReport);

  // POST /api/bills - Create a new bill
  router.post('/', requireRole(['admin', 'accounts']), billController.createBill);

  // PUT /api/bills/:id - Update a bill (Admin/Accounts only)
  router.put('/:id', requireRole(['admin', 'accounts']), billController.updateBill);

  // DELETE /api/bills/:id - Delete a bill (Admin only)
  router.delete('/:id', requireRole(['admin']), billController.deleteBill);

  // POST /api/bills/:id/payment - Add payment to a bill
  router.post('/:id/payment', requireRole(['admin', 'accounts', 'records']), billController.addPaymentToBill);

  // POST /api/bills/:id/refunds - Refund a recorded payment (finance only: money leaving the till)
  router.post('/:id/refunds', requireRole(['admin', 'accounts']), billController.refundPayment);

  // POST /api/bills/line-items/:lineItemId/void - Void a bill line item (Admin/Accounts only)
  router.post('/line-items/:lineItemId/void', requireRole(['admin', 'accounts']), billController.voidBillLineItem);

  // POST /api/bills/:billId/apply-waiver - Apply waiver to a bill
  router.post('/:billId/apply-waiver', requireRole(['admin', 'accounts']), billController.applyWaiverToBill);

  return router;
};