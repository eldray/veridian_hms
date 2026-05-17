/**
 * Ward Module Routes
 * Defines all ward-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WardController } from './WardController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createWardRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new WardController();

  // All routes are protected
  router.use(protect);

  // GET /api/wards - Get all wards
  router.get('/', controller.getWards as any);

  // GET /api/wards/stats - Get ward statistics
  router.get('/stats', controller.getStats as any);

  // GET /api/wards/available-beds - Get available beds
  router.get('/available-beds', controller.getAvailableBeds as any);

  // GET /api/wards/:id - Get ward by ID
  router.get('/:id', controller.getWardById as any);

  // POST /api/wards - Create new ward (admin only)
  router.post('/', requireRole(['admin']), controller.createWard as any);

  // PUT /api/wards/:id - Update ward (admin only)
  router.put('/:id', requireRole(['admin']), controller.updateWard as any);

  // DELETE /api/wards/:id - Delete ward (admin only)
  router.delete('/:id', requireRole(['admin']), controller.deleteWard as any);

  return router;
}
