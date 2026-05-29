// modules/labTest/LabTestRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { LabTestController } from './LabTestController';
import { LabTestService } from './LabTestService';
import { LabTestRepository } from './LabTestRepository';

export function createLabTestRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new LabTestRepository(prisma);
  const service = new LabTestService(repository);
  const controller = new LabTestController(service);

  // GET all lab tests
  router.get('/', controller.getLabTests as any);

  // GET lab test categories
  router.get('/categories', controller.getLabTestCategories as any);

  // GET specimen types
  router.get('/specimen-types', controller.getSpecimenTypes as any);

  // GET lab test metadata fields
  router.get('/metadata-fields', controller.getLabTestMetadataFields as any);

  // GET lab test by ID
  router.get('/:id', controller.getLabTestById as any);

  // POST create lab test
  router.post('/', controller.createLabTest);

  // PUT update lab test
  router.put('/:id', controller.updateLabTest);

  // DELETE lab test
  router.delete('/:id', controller.deleteLabTest as any);

  // POST bulk update lab tests
  router.post('/bulk-update', controller.bulkUpdateLabTests as any);

  return router;
} 