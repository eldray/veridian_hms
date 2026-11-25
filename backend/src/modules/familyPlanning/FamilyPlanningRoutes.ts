// modules/familyPlanning/FamilyPlanningRoutes.ts

import { Router } from 'express';
import { FamilyPlanningController } from './FamilyPlanningController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createFamilyPlanningRoutes(prisma: any): Router {
  const router = Router();
  const controller = new FamilyPlanningController(prisma);

  const readRoles = ['admin', 'doctor', 'midwife'];

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================

  // Statistics & Reports
  router.get('/statistics', protect, requireRole(readRoles), controller.getStatistics);
  router.get('/method-mix', protect, requireRole(readRoles), controller.getMethodMix);
  router.get('/ghs-report', protect, requireRole(readRoles), controller.getGHSReport);

  // Patient-specific routes
  router.get('/patient/:patientId/current', protect, requireRole(readRoles), controller.getCurrentMethod);
  router.get('/patient/:patientId/history', protect, requireRole(readRoles), controller.getFPHistory);
  router.get('/patient/:patientId/details', protect, requireRole(readRoles), controller.getClientDetails);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================

  // Get all FP services (register)
  router.get('/', protect, requireRole(readRoles), controller.getFPServices);

  // Get single FP service
  router.get('/:id', protect, requireRole(readRoles), controller.getFPServiceById);

  // Create FP service
  router.post('/', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), controller.createFPService);

  // Update FP service
  router.put('/:id', protect, requireRole(['admin', 'doctor', 'nurse', 'midwife']), controller.updateFPService);

  // Delete FP service
  router.delete('/:id', protect, requireRole(['admin', 'doctor']), controller.deleteFPService);

  return router;
}