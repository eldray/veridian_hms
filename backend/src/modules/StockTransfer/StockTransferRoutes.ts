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

  // Anyone can view transfers
  router.get('/', stockTransferController.getAll);
  router.get('/:id', stockTransferController.getById);

  // Any clinical staff can REQUEST a transfer
  router.post('/', requireRole(['admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'records']), stockTransferController.request);

  // Only Store Managers / Admin / Pharmacist can APPROVE and DISPATCH
  router.patch('/:id/approve', requireRole(['admin', 'pharmacist']), stockTransferController.approve);
  router.patch('/:id/dispatch', requireRole(['admin', 'pharmacist']), stockTransferController.dispatch);

  // The DESTINATION department (anyone) can RECEIVE the goods
  router.patch('/:id/receive', stockTransferController.receive);

  return router;
};