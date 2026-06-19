import { Router } from 'express';
import { billController, createBillValidation, updateBillValidation, addPaymentValidation, voidLineItemValidation, applyWaiverValidation } from './BillController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createBillRoutes = () => {
  const router = Router();

  // All routes require authentication
  router.use(protect);

  // GET /api/bills - List all bills with filtering and pagination
  router.get('/', billController.getBills);

  // GET /api/bills/statistics - Get bill statistics
  router.get('/statistics', billController.getBillStatistics);

  // POST /api/bills/generate/:encounterId - Generate a bill from an encounter's billable items
  // ⚠️ Registered BEFORE the dynamic /:id routes so :id does not swallow "generate".
  router.post('/generate/:encounterId', billController.generateBillFromEncounter);

  // GET /api/bills/:id - Get bill by ID
  router.get('/:id', billController.getBillById);

  // GET /api/bills/:id/line-items - Get bill line items
  router.get('/:id/line-items', billController.getBillLineItems);

  // GET /api/bills/:id/breakdown - Get grouped billing breakdown for a bill
  router.get('/:id/breakdown', billController.getBillBreakdown);

  // GET /api/bills/:id/report - Generate a bill report (reuses breakdown shape)
  router.get('/:id/report', billController.getBillReport);

  // POST /api/bills - Create a new bill
  router.post('/', createBillValidation, billController.createBill);

  // PUT /api/bills/:id - Update a bill (Admin/Accounts only)
  router.put('/:id', requireRole(['admin', 'accounts']), updateBillValidation, billController.updateBill);

  // DELETE /api/bills/:id - Delete a bill (Admin only)
  router.delete('/:id', requireRole(['admin']), billController.deleteBill);

  // POST /api/bills/:id/payment - Add payment to a bill
  router.post('/:id/payment', addPaymentValidation, billController.addPaymentToBill);

  // POST /api/bills/line-items/:lineItemId/void - Void a bill line item (Admin/Accounts only)
  router.post('/line-items/:lineItemId/void', requireRole(['admin', 'accounts']), voidLineItemValidation, billController.voidBillLineItem);

  // POST /api/bills/:billId/apply-waiver - Apply waiver to a bill
  router.post('/:billId/apply-waiver', requireRole(['admin', 'accounts']), applyWaiverValidation, billController.applyWaiverToBill);

  return router;
};