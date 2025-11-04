import express from 'express';
import { getStockTransactions, getStockTransactionById, createStockTransaction, updateStockTransaction, updateStockTransaction } from '../controllers/stockTransactionController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['pharmacist', 'admin']), getStockTransactions);
router.get('/:id', protect, requireRole(['pharmacist', 'admin']), getStockTransactionById);
router.post('/', protect, requireRole(['pharmacist', 'admin']), createStockTransaction);
router.put('/:id', protect, requireRole(['pharmacist', 'admin']), updateStockTransaction);

export default router;
