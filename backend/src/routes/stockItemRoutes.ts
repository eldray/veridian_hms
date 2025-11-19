// routes/stockItemRoutes.ts - FIXED
import express from 'express';
import {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getLowStockItems,
  getStockCategories,
  bulkUpdateStock
} from '../controllers/stockItemController'; // ✅ FIXED: Added all imports
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/stock-items - Get all stock items
router.get('/', getStockItems);

// GET /api/stock-items/alerts/low-stock - Get low stock alerts
router.get('/alerts/low-stock', getLowStockItems);

// GET /api/stock-items/categories - Get stock categories
router.get('/categories', getStockCategories);

// GET /api/stock-items/:id - Get a specific stock item by ID
router.get('/:id', getStockItemById);

// POST /api/stock-items - Create a new stock item
router.post('/', requireRole(['admin', 'pharmacist']), createStockItem);

// PUT /api/stock-items/:id - Update a stock item
router.put('/:id', requireRole(['admin', 'pharmacist']), updateStockItem);

// PATCH /api/stock-items/bulk-update - Bulk update stock levels
router.patch('/bulk-update', requireRole(['admin', 'pharmacist']), bulkUpdateStock);

// DELETE /api/stock-items/:id - Delete a stock item
router.delete('/:id', requireRole(['admin']), deleteStockItem);

export default router;