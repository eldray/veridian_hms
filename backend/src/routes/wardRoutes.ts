// routes/wardRoutes.ts
import express from 'express';
import {
  getWards,
  getWardById,
  createWard,
  updateWard,
  deleteWard,
  getAvailableBeds
} from '../controllers/wardController';
import { protect, requireAdmin, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// GET /api/wards - Get all wards
router.get('/', getWards);

// GET /api/wards/available-beds - Get available beds
router.get('/available-beds', getAvailableBeds);

// GET /api/wards/:id - Get ward by ID
router.get('/:id', getWardById);

// POST /api/wards - Create new ward
router.post('/', requireRole(['admin']), createWard);

// PUT /api/wards/:id - Update ward
router.put('/:id', requireRole(['admin']), updateWard);

// DELETE /api/wards/:id - Delete ward
router.delete('/:id', requireAdmin, deleteWard);

export default router;