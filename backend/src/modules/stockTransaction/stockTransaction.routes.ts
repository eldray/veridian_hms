import { Router } from 'express';
import { stockTransactionController } from './stockTransaction.controller';

const router = Router();

// Stock Transaction CRUD routes
router.post('/', stockTransactionController.create.bind(stockTransactionController));
router.get('/', stockTransactionController.getAll.bind(stockTransactionController));
router.get('/:id', stockTransactionController.getById.bind(stockTransactionController));
router.put('/:id', stockTransactionController.update.bind(stockTransactionController));
router.delete('/:id', stockTransactionController.delete.bind(stockTransactionController));

// Report routes
router.get('/reports/movement-summary', stockTransactionController.getMovementSummary.bind(stockTransactionController));

// Alert routes
router.get('/alerts/low-stock', stockTransactionController.getLowStockAlerts.bind(stockTransactionController));

// Requisition routes
router.get('/requisitions', stockTransactionController.getRequisitionTransactions.bind(stockTransactionController));

export default router;
