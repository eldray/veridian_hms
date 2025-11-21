// routes/requisitionRoutes.ts - NEW
import express from 'express';
import {
  getRequisitions,
  createRequisition,
  fulfillRequisition
} from '../controllers/requisitionController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', getRequisitions);
router.post('/', createRequisition);
router.post('/:id/fulfill', requireRole(['admin', 'pharmacist']), fulfillRequisition);

export default router;