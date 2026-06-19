// ScanTemplateRoutes.ts - Route definitions for scan template module

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ScanTemplateController } from './ScanTemplateController';
import { ScanTemplateService } from './ScanTemplateService';
import { ScanTemplateRepository } from './ScanTemplateRepository';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createScanTemplateRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new ScanTemplateRepository(prisma);
  const service = new ScanTemplateService(repository);
  const controller = new ScanTemplateController(service);

  // Add authentication middleware
  router.use(protect);

  // Specific routes FIRST (before /:id)
  router.get('/meta/categories', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts']), controller.getScanCategories as any);
  router.get('/meta/body-parts', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts']), controller.getScanBodyParts as any);
  router.get('/meta/scan-types', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts']), controller.getScanTypes as any);
  router.post('/bulk-update', requireRole(['admin']), controller.bulkUpdateScanTemplates as any);

  // Dynamic routes AFTER
  router.get('/', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts']), controller.getScanTemplates as any);
  router.get('/:id', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts']), controller.getScanTemplateById as any);
  router.post('/', requireRole(['admin']), controller.createScanTemplate);
  router.put('/:id', requireRole(['admin']), controller.updateScanTemplate);
  router.delete('/:id', requireRole(['admin']), controller.deleteScanTemplate as any);

  return router;
}