import { Router } from 'express';
import { UserRole } from '@prisma/client'; // ✅ Import UserRole
import { bedController } from './BedController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createBedRoutes(): Router {
  const router = Router();
  
  router.use(protect);
  
  // ✅ FIXED: Explicitly type the array to prevent TypeScript underlines
  const adminRoles: UserRole[] = ['admin'];

  // Read access for clinical and records staff
  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records'];

  router.get('/stats', requireRole(readRoles), bedController.getStats);
  router.get('/', requireRole(readRoles), bedController.getBeds);
  router.get('/:id', requireRole(readRoles), bedController.getBedById);
  
  // Write access restricted to Admin
  router.post('/', requireRole(adminRoles), bedController.createBed);
  router.put('/:id', requireRole(adminRoles), bedController.updateBed);
  router.delete('/:id', requireRole(adminRoles), bedController.deleteBed);
  
  return router;
}