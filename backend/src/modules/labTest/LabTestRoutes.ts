// LabTestRoutes.ts - UPDATED
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { LabTestController } from './LabTestController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createLabTestRoutes(prisma: PrismaClient): Router {  // ✅ Add prisma parameter
  const router = Router();
  const controller = new LabTestController(prisma);  // ✅ Pass to controller

  router.use(protect);

  router.get('/', requireRole(['admin', 'doctor', 'lab_tech', 'nurse', 'midwife']), controller.getLabTestServices);
  router.get('/sub-categories', requireRole(['admin', 'doctor', 'lab_tech']), controller.getLabTestSubCategories);
  router.get('/metadata-fields', requireRole(['admin', 'doctor', 'lab_tech']), controller.getLabTestMetadataFields);
  router.get('/:id', requireRole(['admin', 'doctor', 'lab_tech', 'nurse', 'midwife']), controller.getLabTestServiceById);

  router.post('/', requireRole(['admin']), controller.createLabTestService);
  router.put('/:id', requireRole(['admin']), controller.updateLabTestService);
  router.delete('/:id', requireRole(['admin']), controller.deleteLabTestService);
  router.patch('/bulk-update', requireRole(['admin']), controller.bulkUpdateLabTestServices);

  return router;
}