/**
 * Department Module Routes
 * Defines all department-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DepartmentController } from './DepartmentController';
import { protect, requireRole } from '../../middleware/authMiddleware';

// DepartmentRoutes.ts - Add new route for eligible heads

export function createDepartmentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new DepartmentController(prisma);

  // All routes require authentication
  router.use(protect);

  // Get all departments with filtering and pagination
  router.get('/', controller.getAll.bind(controller));

  // Get department statistics
  router.get('/statistics', controller.getStats.bind(controller));

  // ✅ NEW: Get eligible department heads (SENIOR/PRINCIPAL only)
  router.get('/eligible-heads', controller.getEligibleHeads.bind(controller));

  // Get department by ID
  router.get('/:id', controller.getById.bind(controller));

  // Create new department (Admin only)
  router.post('/', requireRole(['admin']), controller.create);

  // Update department (Admin only)
  router.put('/:id', requireRole(['admin']), controller.update);

  // Delete department (Admin only)
  router.delete('/:id', requireRole(['admin']), controller.delete.bind(controller));

  // Get department users
  router.get('/:id/users', controller.getUsers.bind(controller));

  // Assign user to department (Admin only)
  router.post('/:id/users', requireRole(['admin']), controller.assignUser);

  // Remove user from department (Admin only)
  router.delete('/:id/users/:userId', requireRole(['admin']), controller.removeUser.bind(controller));

  // Bulk update departments (Admin only)
  router.put('/bulk/update', requireRole(['admin']), controller.bulkUpdate);

  return router;
}