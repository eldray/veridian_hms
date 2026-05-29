// routes/wardRoutes.ts - FIXED
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { WardController } from './WardController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createWardRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new WardController(prisma);  // ✅ Pass prisma to controller

  // All routes are protected
  router.use(protect);

  // GET /api/wards - Get all wards
  router.get('/', controller.getWards.bind(controller));

  // GET /api/wards/stats - Get ward statistics
  router.get('/stats', controller.getStats.bind(controller));

  // GET /api/wards/available-beds - Get available beds
  router.get('/available-beds', controller.getAvailableBeds.bind(controller));

  // GET /api/wards/corporate-eligible - Get corporate eligible wards
  router.get('/corporate-eligible', controller.getCorporateEligibleWards.bind(controller));

  // GET /api/wards/occupancy-report - Get occupancy report
  router.get('/occupancy-report', controller.getOccupancyReport.bind(controller));

  // POST /api/wards/:id/calculate-charge - Calculate charge
  router.post('/:id/calculate-charge', controller.calculateCharge.bind(controller));

  // GET /api/wards/:id - Get ward by ID
  router.get('/:id', controller.getWardById.bind(controller));

  // POST /api/wards - Create new ward (admin only)
  router.post('/', requireRole(['admin']), controller.createWard.bind(controller));

  // PUT /api/wards/:id - Update ward (admin only)
  router.put('/:id', requireRole(['admin']), controller.updateWard.bind(controller));

  // DELETE /api/wards/:id - Delete ward (admin only)
  router.delete('/:id', requireRole(['admin']), controller.deleteWard.bind(controller));

  return router;
}