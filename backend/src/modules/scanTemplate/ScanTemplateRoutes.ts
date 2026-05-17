// ScanTemplateRoutes.ts - Route definitions for scan template module

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ScanTemplateController } from './ScanTemplateController';
import { ScanTemplateService } from './ScanTemplateService';
import { ScanTemplateRepository } from './ScanTemplateRepository';

export function createScanTemplateRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new ScanTemplateRepository(prisma);
  const service = new ScanTemplateService(repository);
  const controller = new ScanTemplateController(service);

  // GET all scan templates
  router.get('/', controller.getScanTemplates as any);

  // GET scan categories
  router.get('/meta/categories', controller.getScanCategories as any);

  // GET scan body parts
  router.get('/meta/body-parts', controller.getScanBodyParts as any);

  // GET scan types
  router.get('/meta/scan-types', controller.getScanTypes as any);

  // GET scan template by ID
  router.get('/:id', controller.getScanTemplateById as any);

  // POST create scan template
  router.post('/', controller.createScanTemplate);

  // PUT update scan template
  router.put('/:id', controller.updateScanTemplate);

  // DELETE scan template
  router.delete('/:id', controller.deleteScanTemplate as any);

  // POST bulk update scan templates
  router.post('/bulk-update', controller.bulkUpdateScanTemplates as any);

  return router;
}
