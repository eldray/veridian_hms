/**
 * Department Module Routes
 * Defines all department-related API endpoints
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DepartmentController } from './DepartmentController';

export function createDepartmentRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new DepartmentController(prisma);

  // Get all departments with filtering
  router.get('/', controller.getAll as any);

  // Get department statistics
  router.get('/statistics', controller.getStats as any);

  // Get department by ID
  router.get('/:id', controller.getById as any);

  // Create new department
  router.post('/', ...controller.create);

  // Update department
  router.put('/:id', ...controller.update);

  // Delete department
  router.delete('/:id', controller.delete as any);

  // Get department users
  router.get('/:id/users', controller.getUsers as any);

  // Assign user to department
  router.post('/:id/users', ...controller.assignUser);

  // Remove user from department
  router.delete('/:id/users/:userId', controller.removeUser as any);

  // Bulk update departments
  router.put('/bulk/update', ...controller.bulkUpdate);

  return router;
}
