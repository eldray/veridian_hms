import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { waiverController } from './WaiverController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createWaiverRoutes = () => {
  const router = Router();
  router.use(protect);

  // ✅ FIXED: Explicitly type the arrays to prevent TypeScript underlines
  const adminRoles: UserRole[] = ['admin'];
  const financeRoles: UserRole[] = ['admin', 'accounts'];
  const readRoles: UserRole[] = ['admin', 'accounts', 'doctor', 'nurse', 'midwife', 'records'];

  // ==========================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ==========================================
  router.get('/statistics', requireRole(financeRoles), waiverController.getStatistics);
  router.get('/bill/:billId', requireRole(readRoles), waiverController.getByBill);
  router.get('/patient/:patientId', requireRole(readRoles), waiverController.getByPatient);

  // Approval routes (Admin/Finance only)
  router.post('/:id/approve', requireRole(adminRoles), waiverController.approve);
  router.post('/:id/reject', requireRole(adminRoles), waiverController.reject);

  // ==========================================
  // DYNAMIC ID ROUTES (LAST)
  // ==========================================
  router.get('/', requireRole(readRoles), waiverController.getAll);
  router.get('/:id', requireRole(readRoles), waiverController.getById);
  router.post('/', requireRole(financeRoles), waiverController.create);
  router.put('/:id', requireRole(financeRoles), waiverController.update);
  router.delete('/:id', requireRole(adminRoles), waiverController.delete);

  return router;
};