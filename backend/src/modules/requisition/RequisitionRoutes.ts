import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RequisitionController } from './RequisitionController';
import { RequisitionService } from './RequisitionService';
import { RequisitionRepository } from './RequisitionRepository';
import { protect, requireRole } from '../../middleware/authMiddleware'; // ✅ ADDED

export function createRequisitionRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const repository = new RequisitionRepository(prisma);
  const service = new RequisitionService(repository, prisma);
  const controller = new RequisitionController(service);

  // ✅ GLOBAL AUTH: All routes require authentication
  router.use(protect);

  // ==========================================
  // CLINICAL STAFF ROUTES (Requesting goods)
  // ==========================================
  // Doctors, Nurses, Midwives, Records can create and view their requisitions
  router.get('/', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records', 'pharmacist']), controller.getRequisitions as any);
  router.get('/:id', controller.getRequisitionById as any);
  router.post('/', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.createRequisition);
  
  // Only the original requester or Admin can edit/delete a DRAFT
  router.put('/:id', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.updateRequisition);
  router.delete('/:id', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'records']), controller.deleteRequisition as any);

  // ==========================================
  // STORE / ADMIN ROUTES (Approving & Fulfilling)
  // ==========================================
  // Only Admin, Pharmacist, or Store Manager can approve items or change status
  router.patch('/:id/status', requireRole(['admin', 'pharmacist', 'records']), controller.updateRequisitionStatus);
  router.post('/:id/approve-items', requireRole(['admin', 'pharmacist']), controller.approveRequisitionItems);

  return router;
}