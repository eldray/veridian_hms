import { Router } from 'express';
import { stockTransferController } from './StockTransferController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createStockTransferRoutes = () => {
  const router = Router();

  // ✅ Global Auth
  router.use(protect);

  // ==========================================
  // ROUTES
  // ==========================================

  // Any clinical or support department can view transfers it is involved in.
  router.get('/', stockTransferController.getAll);
  router.get('/:id', stockTransferController.getById);

  // The departments that hold stock and can move it between each other. Lab and
  // imaging run their own stores, so they request and receive too; accounts and
  // HR only read.
  const REQUESTING_DEPARTMENTS = [
    'admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'records', 'lab_tech', 'sonographer',
  ];

  // Any department staff can REQUEST a transfer
  router.post('/', requireRole(REQUESTING_DEPARTMENTS), stockTransferController.request);

  // Only Store Managers / Admin / Pharmacist can APPROVE and DISPATCH
  router.patch('/:id/approve', requireRole(['admin', 'super_admin', 'pharmacist']), stockTransferController.approve);
  router.patch('/:id/dispatch', requireRole(['admin', 'super_admin', 'pharmacist']), stockTransferController.dispatch);

  // The DESTINATION department can RECEIVE the goods — previously open to any
  // signed-in role, which let a receipt be booked by someone outside the department.
  router.patch('/:id/receive', requireRole(REQUESTING_DEPARTMENTS), stockTransferController.receive);

  return router;
};