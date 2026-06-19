import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { LabTestController } from './LabTestController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createLabTestRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new LabTestController(prisma);

  router.use(protect);

  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'records', 'accounts'];
  const writeRoles: UserRole[] = ['admin', 'lab_tech', 'accounts'];

  // ==========================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ==========================================
  router.get('/categories', requireRole(readRoles), controller.getLabTestCategories);
  router.get('/sub-categories', requireRole(readRoles), controller.getLabTestSubCategories);
  router.get('/specimen-types', requireRole(readRoles), controller.getSpecimenTypes);
  router.get('/metadata-fields', requireRole(readRoles), controller.getLabTestMetadataFields);
  router.post('/bulk-update', requireRole(writeRoles), controller.bulkUpdateLabTests);

  // ==========================================
  // DYNAMIC ID ROUTES (LAST)
  // ==========================================
  router.get('/', requireRole(readRoles), controller.getLabTests);
  router.get('/:id', requireRole(readRoles), controller.getLabTestById);
  router.post('/', requireRole(writeRoles), controller.createLabTest);
  router.put('/:id', requireRole(writeRoles), controller.updateLabTest);
  router.delete('/:id', requireRole(['admin']), controller.deleteLabTest);

  return router;
}