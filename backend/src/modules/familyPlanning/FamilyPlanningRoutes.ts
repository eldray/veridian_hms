// modules/familyPlanning/FamilyPlanningRoutes.ts

import { Router } from 'express';
import { FamilyPlanningController } from './FamilyPlanningController';
import { protect, requireRole } from '../../middleware/authMiddleware';

const router = Router();

export function createFamilyPlanningRoutes(prisma: any): Router {
  const controller = new FamilyPlanningController(prisma);

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================

  // Statistics & Reports
  router.get('/statistics', protect, controller.getStatistics);
  router.get('/method-mix', protect, controller.getMethodMix);
  router.get('/ghs-report', protect, controller.getGHSReport);

  // Patient-specific routes
  router.get('/patient/:patientId/current', protect, controller.getCurrentMethod);
  router.get('/patient/:patientId/history', protect, controller.getFPHistory);
  router.get('/patient/:patientId/details', protect, controller.getClientDetails);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================

  // Get all FP services (register)
  router.get('/', protect, controller.getFPServices);

  // Get single FP service
  router.get('/:id', protect, controller.getFPServiceById);

  // Create FP service
  router.post('/', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), controller.createFPService);

  // Update FP service
  router.put('/:id', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), controller.updateFPService);

  // Delete FP service
  router.delete('/:id', protect, requireRole(['admin', 'doctor']), controller.deleteFPService);

  return router;
}