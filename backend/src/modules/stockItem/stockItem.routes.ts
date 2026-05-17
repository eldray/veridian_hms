import { Router } from 'express';
import { stockItemController } from './stockItem.controller';

const router = Router();

// Stock Item CRUD routes
router.post('/', stockItemController.create.bind(stockItemController));
router.get('/', stockItemController.getAll.bind(stockItemController));
router.get('/:id', stockItemController.getById.bind(stockItemController));
router.put('/:id', stockItemController.update.bind(stockItemController));
router.delete('/:id', stockItemController.delete.bind(stockItemController));

// Report routes
router.get('/reports/value-summary', stockItemController.getValueSummary.bind(stockItemController));
router.get('/reports/expiry', stockItemController.getExpiryReport.bind(stockItemController));
router.get('/reports/movement-summary', stockItemController.getMovementSummary.bind(stockItemController));
router.get('/reports/usage', stockItemController.getUsageReport.bind(stockItemController));
router.get('/reports/supplier', stockItemController.getSupplierReport.bind(stockItemController));
router.get('/reports/requisition-summary', stockItemController.getRequisitionSummary.bind(stockItemController));

// Alert routes
router.get('/alerts/low-stock', stockItemController.getLowStockAlerts.bind(stockItemController));

export default router;
