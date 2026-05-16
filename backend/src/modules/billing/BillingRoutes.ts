/**
 * Billing Module Routes
 * Defines all billing-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { BillingController } from './BillingController';

export function createBillingRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new BillingController(prisma);

  // Get all bills with filtering and pagination
  router.get('/invoices', controller.getAll as any);

  // Get billing statistics
  router.get('/statistics', controller.getStatistics as any);

  // Get bill by ID
  router.get('/invoices/:id', controller.getById as any);

  // Create new bill
  router.post('/invoices', ...controller.create);

  // Update bill status
  router.put('/invoices/:id', ...controller.updateStatus);

  // Add payment to bill
  router.post('/invoices/:id/pay', ...controller.addPayment);

  // Get bill line items
  router.get('/invoices/:id/items', controller.getLineItems as any);

  // Void bill line item
  router.post('/line-items/:lineItemId/void', ...controller.voidLineItem);

  // Apply waiver to bill
  router.post('/invoices/:billId/waiver', ...controller.applyWaiver);

  return router;
}
