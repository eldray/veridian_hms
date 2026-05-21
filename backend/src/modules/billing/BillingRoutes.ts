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

  // Get all bills with filtering and pagination
  router.get('/invoices', controller.getAll.bind(controller));

  // Get billing statistics (includes corporate breakdown)
  router.get('/statistics', controller.getStatistics.bind(controller));

  // Get bill by ID
  router.get('/invoices/:id', controller.getById.bind(controller));

  // Create new bill (Admin/Accounts only)
  router.post('/invoices', requireRole(['admin', 'accounts']), controller.create);

  // Update bill status (Admin/Accounts only)
  router.put('/invoices/:id', requireRole(['admin', 'accounts']), controller.updateStatus);

  // Add payment to bill
  router.post('/invoices/:id/pay', controller.addPayment);

  // Get bill line items
  router.get('/invoices/:id/items', controller.getLineItems.bind(controller));

  // Void bill line item (Admin/Accounts only)
  router.post('/line-items/:lineItemId/void', requireRole(['admin', 'accounts']), controller.voidLineItem);

  // Apply waiver to bill (Admin/Accounts only)
  router.post('/invoices/:billId/waiver', requireRole(['admin', 'accounts']), controller.applyWaiver);

  return router;
}