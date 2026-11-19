import { Router } from 'express';
import { stockItemController } from './StockItemController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createStockItemRoutes = () => {
  const router = Router();

  // ✅ Global Auth: All routes require authentication
  router.use(protect);

  // Stock catalogue entries include pricing and stock information. Keep reads
  // within operational, clinical and finance roles; HR has no stock workflow.
  const STOCK_CATALOG_READERS = [
    'admin', 'super_admin', 'accounts', 'pharmacist', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'sonographer',
  ];

  // ==========================================
  // 1. SPECIFIC ROUTES (MUST BE BEFORE /:id)
  // ==========================================

  // Reports
  router.get('/reports/value-summary', requireRole(['admin', 'pharmacist', 'accounts', 'super_admin']), stockItemController.getValueSummary);
  router.get('/reports/expiry', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.getExpiryReport);
  router.get('/reports/movement-summary', requireRole(['admin', 'pharmacist', 'accounts', 'super_admin']), stockItemController.getMovementSummary);
  router.get('/reports/usage', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.getUsageReport);
  router.get('/reports/supplier', requireRole(['admin', 'accounts', 'super_admin']), stockItemController.getSupplierReport);
  router.get('/reports/requisition-summary', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.getRequisitionSummary);

  // Alerts & Categories
  router.get('/categories', requireRole(STOCK_CATALOG_READERS), stockItemController.getCategories);
  router.get('/low-stock', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.getLowStockAlerts);
  router.get('/expiring-batches', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.getExpiringBatches);

  // ==========================================
  // 2. DYNAMIC ID ROUTES
  // ==========================================

  router.get('/', requireRole(STOCK_CATALOG_READERS), stockItemController.getAll);
  router.post('/', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.create);
  router.get('/:id', requireRole(STOCK_CATALOG_READERS), stockItemController.getById);
  router.put('/:id', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.update);
  router.delete('/:id', requireRole(['admin']), stockItemController.delete);

  // Sub-resources
  router.post('/:id/update-stock', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.updateStockLevel);
  // Transaction history can expose purchasing, costing, and adjustment details.
  router.get('/:id/transactions', requireRole(['admin', 'super_admin', 'pharmacist', 'accounts']), stockItemController.getTransactions);
  router.post('/:id/add-batch', requireRole(['admin', 'pharmacist', 'super_admin']), stockItemController.addStockBatch);
  // Pharmacy is responsible for allocating stock between departments; administrators retain facility-wide override.
  router.post('/:id/allocate-stock', requireRole(['admin', 'super_admin', 'pharmacist']), stockItemController.allocateStock);
  // Medication history may contain patient-linked clinical information.
  router.get('/:id/medications', requireRole(['admin', 'pharmacist', 'doctor', 'nurse', 'midwife']), stockItemController.getMedicationsByStockItem);

  return router;
};