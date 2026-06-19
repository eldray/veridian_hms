import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client'; // ✅ Import UserRole
import { WardController } from './WardController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createWardRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new WardController(prisma);

  router.use(protect);

  // ✅ FIXED: Explicitly type the arrays to prevent TypeScript underlines
  const adminRoles: UserRole[] = ['admin'];
  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'];

  // Specific routes first
  router.get('/stats', requireRole(readRoles), controller.getStats);
  router.get('/available-beds', requireRole(readRoles), controller.getAvailableBeds);
  router.get('/corporate-eligible', requireRole(readRoles), controller.getCorporateEligibleWards);
  router.get('/occupancy-report', requireRole(readRoles), controller.getOccupancyReport);
  router.post('/:id/calculate-charge', requireRole(readRoles), controller.calculateCharge);

  // Dynamic routes
  router.get('/', requireRole(readRoles), controller.getWards);
  router.get('/:id', requireRole(readRoles), controller.getWardById);
  
  // Write access restricted to Admin
  router.post('/', requireRole(adminRoles), controller.createWard);
  router.put('/:id', requireRole(adminRoles), controller.updateWard);
  router.delete('/:id', requireRole(adminRoles), controller.deleteWard);

  return router;
}