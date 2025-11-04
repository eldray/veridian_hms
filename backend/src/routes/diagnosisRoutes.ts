import express from 'express';
import { getDiagnoses, getDiagnosisById, createDiagnosis, updateDiagnosis, deleteDiagnosis } from '../controllers/diagnosisController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['admin']), getDiagnoses);
router.get('/:id', protect, requireRole(['admin']), getDiagnosisById);
router.post('/', protect, requireRole(['admin']), createDiagnosis);
router.put('/:id', protect, requireRole(['admin']), updateDiagnosis);
router.delete('/:id', protect, requireRole(['admin']), deleteDiagnosis);

export default router;
