/**
 * Billing Module Routes
 * Defines all billing-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BillingController } from './BillingController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createBillingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new BillingController(prisma);

  // All routes require authentication
  router.use(protect);

  // Individual invoice details are available to authenticated staff for care,
  // dispensing and front-desk workflows. Facility-wide financial views stay restricted.
  const FINANCIAL_READERS = ['admin', 'accounts'];

  // Get all bills with filtering and pagination
  router.get('/invoices', controller.getAll.bind(controller));

  // Get billing statistics (includes corporate breakdown)
  router.get('/statistics', requireRole(FINANCIAL_READERS), controller.getStatistics.bind(controller));

  // Get actual payment collections for a date range
  router.get('/collections', requireRole(FINANCIAL_READERS), controller.getCollections.bind(controller));

  // Per-levy tax summary for a date range (filing view)
  router.get('/tax-summary', requireRole(FINANCIAL_READERS), controller.getTaxSummary.bind(controller));

  // Get bill by ID
  router.get('/invoices/:id', controller.getById.bind(controller));

  // Create new bill (Admin/Accounts only)
  router.post('/invoices', requireRole(['admin', 'accounts']), controller.create);

  // Update bill status (Admin/Accounts only)
  router.put('/invoices/:id', requireRole(['admin', 'accounts']), controller.updateStatus);

  // Add payment to bill
  router.post('/invoices/:id/pay', requireRole(['admin', 'accounts', 'records']), controller.addPayment);

  // Refund a recorded payment (finance only: money leaving the till)
  router.post('/invoices/:id/refunds', requireRole(['admin', 'accounts']), controller.refundPayment);

  // Get bill line items
  router.get('/invoices/:id/items', controller.getLineItems.bind(controller));

  // Revenue-line report: every charge in a date range, across all bills (Reports screen)
  router.get('/line-items', requireRole(FINANCIAL_READERS), controller.getRevenueLines.bind(controller));

  // Void bill line item (Admin/Accounts only)
  router.post('/line-items/:lineItemId/void', requireRole(['admin', 'accounts']), controller.voidLineItem);

  // Apply waiver to bill (Admin/Accounts only)
  router.post('/invoices/:billId/waiver', requireRole(['admin', 'accounts']), controller.applyWaiver);

  return router;
}