import express from 'express';
import { getHospitals, createHospital, updateHospital } from '../controllers/hospitalController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getHospitals);
router.post('/', protect, requireRole(['admin']), createHospital);
router.put('/:id', protect, requireRole(['admin']), updateHospital);

export default router;
