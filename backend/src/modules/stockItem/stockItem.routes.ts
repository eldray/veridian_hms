import { Router } from 'express';
import { stockItemController } from './stockItem.controller';

const router = Router();

// Stock Item CRUD routes
router.post('/', stockItemController.create.bind(stockItemController));
router.get('/', stockItemController.getAll.bind(stockItemController));
router.get('/categories', stockItemController.getCategories.bind(stockItemController));
router.get('/low-stock', stockItemController.getLowStockAlerts.bind(stockItemController));
router.get('/expiring-batches', stockItemController.getExpiringBatches.bind(stockItemController));
router.get('/:id', stockItemController.getById.bind(stockItemController));
router.put('/:id', stockItemController.update.bind(stockItemController));
router.delete('/:id', stockItemController.delete.bind(stockItemController));

// Stock level and transaction routes
router.post('/:id/update-stock', stockItemController.updateStockLevel.bind(stockItemController));
router.get('/:id/transactions', stockItemController.getTransactions.bind(stockItemController));
router.post('/:id/add-batch', stockItemController.addStockBatch.bind(stockItemController));
router.get('/:id/medications', stockItemController.getMedicationsByStockItem.bind(stockItemController));

// Report routes
router.get('/reports/value-summary', stockItemController.getValueSummary.bind(stockItemController));
router.get('/reports/expiry', stockItemController.getExpiryReport.bind(stockItemController));
router.get('/reports/movement-summary', stockItemController.getMovementSummary.bind(stockItemController));
router.get('/reports/usage', stockItemController.getUsageReport.bind(stockItemController));
router.get('/reports/supplier', stockItemController.getSupplierReport.bind(stockItemController));
router.get('/reports/requisition-summary', stockItemController.getRequisitionSummary.bind(stockItemController));

export default router;