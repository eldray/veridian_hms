import express from 'express';
import { getStockItems, getStockItemById, createStockItem, updateStockItem, deleteStockItem } from '../controllers/stockItemController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['pharmacist', 'admin']), getStockItems);
router.get('/:id', protect, requireRole(['pharmacist', 'admin']), getStockItemById);
router.post('/', protect, requireRole(['pharmacist', 'admin']), createStockItem);
router.put('/:id', protect, requireRole(['pharmacist', 'admin']), updateStockItem);
router.delete('/:id', protect, requireRole(['pharmacist', 'admin']), deleteStockItem);

export default router;
