// routes/stockTransactionRoutes.ts
import express from 'express';
import {
  getStockTransactions,
  getStockTransactionById,
  createStockTransaction,
  updateStockTransaction,
  getStockMovementReport,
  getLowStockAlerts,
  getStockItemTransactionHistory
} from '../controllers/stockTransactionController';
import { protect, requirePharmacyStaff, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/stock-transactions - Get all stock transactions with filtering
router.get('/', requirePharmacyStaff, getStockTransactions);

// GET /api/stock-transactions/reports/movement - Get stock movement report
router.get('/reports/movement', requirePharmacyStaff, getStockMovementReport);

// GET /api/stock-transactions/alerts/low-stock - Get low stock alerts
router.get('/alerts/low-stock', requirePharmacyStaff, getLowStockAlerts);

// GET /api/stock-transactions/stock-item/:stockItemId - Get transaction history for specific stock item
router.get('/stock-item/:stockItemId', requirePharmacyStaff, getStockItemTransactionHistory);

// GET /api/stock-transactions/:id - Get stock transaction by ID
router.get('/:id', requirePharmacyStaff, getStockTransactionById);

// POST /api/stock-transactions - Create new stock transaction
router.post('/', requirePharmacyStaff, createStockTransaction);

// PUT /api/stock-transactions/:id - Update stock transaction
router.put('/:id', requireRole(['admin', 'pharmacist']), updateStockTransaction);

export default router;