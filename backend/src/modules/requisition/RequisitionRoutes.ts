// RequisitionRoutes.ts - Route definitions for requisition module

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RequisitionController } from './RequisitionController';
import { RequisitionService } from './RequisitionService';
import { RequisitionRepository } from './RequisitionRepository';

export function createRequisitionRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new RequisitionRepository(prisma);
  const service = new RequisitionService(repository);
  const controller = new RequisitionController(service);

  // GET all requisitions
  router.get('/', controller.getRequisitions as any);

  // GET requisition by ID
  router.get('/:id', controller.getRequisitionById as any);

  // POST create requisition
  router.post('/', controller.createRequisition);

  // PUT update requisition (basic info)
  router.put('/:id', controller.updateRequisition);

  // PATCH update requisition status
  router.patch('/:id/status', controller.updateRequisitionStatus);

  // POST approve requisition items
  router.post('/:id/approve-items', controller.approveRequisitionItems);

  // DELETE requisition
  router.delete('/:id', controller.deleteRequisition as any);

  return router;
}
