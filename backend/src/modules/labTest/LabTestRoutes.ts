// modules/labTest/LabTestRoutes.ts - FIXED

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { LabTestController } from './LabTestController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createLabTestRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new LabTestController(prisma);

  router.use(protect);

  // ✅ Regular methods (not arrays) - use .bind()
  router.get('/', requireRole(['admin', 'doctor', 'lab_tech', 'nurse', 'midwife']), controller.getLabTestServices.bind(controller));
  router.get('/categories', requireRole(['admin', 'doctor', 'lab_tech']), controller.getLabTestCategories.bind(controller));
  router.get('/sub-categories', requireRole(['admin', 'doctor', 'lab_tech']), controller.getLabTestSubCategories.bind(controller));
  router.get('/specimen-types', requireRole(['admin', 'doctor', 'lab_tech']), controller.getSpecimenTypes.bind(controller));
  router.get('/metadata-fields', requireRole(['admin', 'doctor', 'lab_tech']), controller.getLabTestMetadataFields.bind(controller));
  router.get('/:id', requireRole(['admin', 'doctor', 'lab_tech', 'nurse', 'midwife']), controller.getLabTestServiceById.bind(controller));

  // ✅ Array-based methods (with validation) - NO .bind()
  router.post('/', requireRole(['admin']), controller.createLabTestService);
  router.put('/:id', requireRole(['admin']), controller.updateLabTestService);
  router.delete('/:id', requireRole(['admin']), controller.deleteLabTestService.bind(controller));
  router.patch('/bulk-update', requireRole(['admin']), controller.bulkUpdateLabTestServices);

  return router;
}