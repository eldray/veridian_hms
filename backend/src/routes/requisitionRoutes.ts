// routes/requisitionRoutes.ts
import express from 'express';
import {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisition,
  deleteRequisition,
  updateRequisitionStatus,
  approveRequisitionItems
} from '../controllers/requisitionController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// GET /api/requisitions - Get all requisitions
router.get('/', getRequisitions);

// GET /api/requisitions/:id - Get requisition by ID
router.get('/:id', getRequisitionById);

// POST /api/requisitions - Create new requisition
router.post('/', createRequisition);

// PUT /api/requisitions/:id - Update requisition
router.put('/:id', updateRequisition);

// DELETE /api/requisitions/:id - Delete requisition
router.delete('/:id', deleteRequisition);

// PATCH /api/requisitions/:id/status - Update requisition status
router.patch('/:id/status', updateRequisitionStatus);

// POST /api/requisitions/:id/approve-items - Approve requisition items (pharmacy only)
router.post('/:id/approve-items', requireRole(['admin', 'pharmacist']), approveRequisitionItems);

export default router;