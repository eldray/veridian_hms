// routes/stockItemRoutes.ts
import express from 'express';
import {
  getStockItems,
  getStockItemById,
  createStockItem,
  updateStockItem,
  deleteStockItem,
  getLowStockItems,
  getStockCategories,
  updateStockLevel,
  getStockTransactions,
  getMedicationsByStockItem
} from '../controllers/stockItemController';
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

// GET /api/stock-items/:id/transactions - Get transactions for a stock item
router.get('/:id/transactions', getStockTransactions);

// GET /api/stock-items/:id/medications - Get medications using this stock item
router.get('/:id/medications', getMedicationsByStockItem);

// PATCH /api/stock-items/:id/stock-level - Update stock level
router.patch('/:id/stock-level', requireRole(['admin', 'pharmacist']), updateStockLevel);

// GET /api/stock-items/:id - Get a specific stock item by ID
router.get('/:id', getStockItemById);

// POST /api/stock-items - Create a new stock item
router.post('/', requireRole(['admin', 'pharmacist']), createStockItem);

// PUT /api/stock-items/:id - Update a stock item
router.put('/:id', requireRole(['admin', 'pharmacist']), updateStockItem);

// DELETE /api/stock-items/:id - Delete a stock item
router.delete('/:id', requireRole(['admin']), deleteStockItem);

export default router;