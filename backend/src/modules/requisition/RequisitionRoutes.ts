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
  // Every department that consumes stock may raise and edit its own requisitions —
  // the laboratory and imaging stores are included, matching the requisitions page
  // in src/config/access.ts. Approval stays with the supplying department below.
  const REQUESTING_DEPARTMENTS = [
    'admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'records', 'pharmacist', 'lab_tech', 'sonographer',
  ];

  router.get('/', requireRole(REQUESTING_DEPARTMENTS), controller.getRequisitions as any);
  // Search items with supplier/requester quantities (must be declared before '/:id')
  router.get('/stock-lookup', requireRole(REQUESTING_DEPARTMENTS), controller.lookupStock as any);
  router.get('/:id', controller.getRequisitionById as any);
  router.post('/', requireRole(REQUESTING_DEPARTMENTS), controller.createRequisition);
  
  // Only the original requester or Admin can edit/delete a DRAFT
  router.put('/:id', requireRole(REQUESTING_DEPARTMENTS), controller.updateRequisition);
  router.delete('/:id', requireRole(REQUESTING_DEPARTMENTS), controller.deleteRequisition as any);

  // ==========================================
  // STORE / ADMIN ROUTES (Approving & Fulfilling)
  // ==========================================
  // Only Admin, Pharmacist, or Store Manager can approve items or change status
  // Requesters submit/cancel; the supplying department approves/fulfils. Who may do what is enforced in the service.
  router.patch('/:id/status', requireRole(REQUESTING_DEPARTMENTS), controller.updateRequisitionStatus);
  // Supplying-department authorization is enforced in RequisitionService; administrators can approve across departments.
  router.post('/:id/approve-items', requireRole(['admin', 'super_admin', 'pharmacist']), controller.approveRequisitionItems);

  return router;
}