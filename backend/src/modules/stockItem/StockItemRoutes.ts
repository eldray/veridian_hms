import { Router } from 'express';
import { stockItemController } from './StockItemController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createStockItemRoutes = () => {
  const router = Router();

  // ✅ Global Auth: All routes require authentication
  router.use(protect);

  // ==========================================
  // 1. SPECIFIC ROUTES (MUST BE BEFORE /:id)
  // ==========================================

  // Reports
  router.get('/reports/value-summary', requireRole(['admin', 'pharmacist', 'accounts']), stockItemController.getValueSummary);
  router.get('/reports/expiry', requireRole(['admin', 'pharmacist']), stockItemController.getExpiryReport);
  router.get('/reports/movement-summary', requireRole(['admin', 'pharmacist', 'accounts']), stockItemController.getMovementSummary);
  router.get('/reports/usage', requireRole(['admin', 'pharmacist']), stockItemController.getUsageReport);
  router.get('/reports/supplier', requireRole(['admin', 'accounts']), stockItemController.getSupplierReport);
  router.get('/reports/requisition-summary', requireRole(['admin', 'pharmacist']), stockItemController.getRequisitionSummary);

  // Alerts & Categories
  router.get('/categories', stockItemController.getCategories);
  router.get('/low-stock', requireRole(['admin', 'pharmacist']), stockItemController.getLowStockAlerts);
  router.get('/expiring-batches', requireRole(['admin', 'pharmacist']), stockItemController.getExpiringBatches);

  // ==========================================
  // 2. DYNAMIC ID ROUTES
  // ==========================================

  router.get('/', stockItemController.getAll);
  router.post('/', requireRole(['admin', 'pharmacist']), stockItemController.create);
  router.get('/:id', stockItemController.getById);
  router.put('/:id', requireRole(['admin', 'pharmacist']), stockItemController.update);
  router.delete('/:id', requireRole(['admin']), stockItemController.delete);

  // Sub-resources
  router.post('/:id/update-stock', requireRole(['admin', 'pharmacist']), stockItemController.updateStockLevel);
  router.get('/:id/transactions', stockItemController.getTransactions);
  router.post('/:id/add-batch', requireRole(['admin', 'pharmacist']), stockItemController.addStockBatch);
  router.get('/:id/medications', stockItemController.getMedicationsByStockItem);

  return router;
};