import { Router } from 'express';
import { stockTransactionController } from './StockTransactionController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createStockTransactionRoutes = () => {
  const router = Router();

  // ✅ Global Auth
  router.use(protect);

  // ==========================================
  // 1. SPECIFIC ROUTES (MUST BE BEFORE /:id)
  // ==========================================

  // Reports & Valuation
  router.get('/valuation', requireRole(['admin', 'pharmacist', 'accounts']), stockTransactionController.getStockValuation);
  router.get('/reports/movement-summary', requireRole(['admin', 'pharmacist', 'accounts']), stockTransactionController.getMovementSummary);

  // Alerts & Requisitions
  router.get('/alerts/low-stock', requireRole(['admin', 'pharmacist']), stockTransactionController.getLowStockAlerts);
  router.get('/requisitions', requireRole(['admin', 'pharmacist', 'accounts']), stockTransactionController.getRequisitionTransactions);

  // ==========================================
  // 2. DYNAMIC ID ROUTES
  // ==========================================

  router.post('/', requireRole(['admin', 'pharmacist']), stockTransactionController.create);
  router.get('/', requireRole(['admin', 'pharmacist', 'accounts']), stockTransactionController.getAll);
  router.get('/:id', requireRole(['admin', 'pharmacist', 'accounts']), stockTransactionController.getById);
  router.put('/:id', requireRole(['admin', 'pharmacist']), stockTransactionController.update);
  router.delete('/:id', requireRole(['admin']), stockTransactionController.delete);

  return router;
};