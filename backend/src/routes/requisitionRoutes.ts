// routes/requisitionRoutes.ts - NEW
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

router.get('/', getRequisitions);
router.get('/:id', getRequisitionById);
router.post('/', createRequisition);
router.put('/:id', updateRequisition);
router.delete('/:id', deleteRequisition);
router.patch('/:id/status', updateRequisitionStatus);
router.post('/:id/approve-items', requireRole(['admin', 'pharmacist']), approveRequisitionItems);

export default router;