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

  router.get('/', controller.getRequisitions as any);
  router.get('/:id', controller.getRequisitionById as any);
  router.post('/', controller.createRequisition);
  router.put('/:id', controller.updateRequisition);
  router.patch('/:id/status', controller.updateRequisitionStatus);
  router.post('/:id/approve-items', controller.approveRequisitionItems);
  router.delete('/:id', controller.deleteRequisition as any);

  return router;
}