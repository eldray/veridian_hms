import express from 'express';
import { getWards, getWardById, createWard, updateWard, deleteWard } from '../controllers/wardController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['doctor', 'nurse', 'admin']), getWards);
router.get('/:id', protect, requireRole(['doctor', 'nurse', 'admin']), getWardById);
router.post('/', protect, requireRole(['admin']), createWard);
router.put('/:id', protect, requireRole(['admin']), updateWard);
router.delete('/:id', protect, requireRole(['admin']), deleteWard);

export default router;
