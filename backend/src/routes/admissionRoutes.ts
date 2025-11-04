import express from 'express';
import { getAdmissions, getAdmissionById, createAdmission, updateAdmission, deleteAdmission } from '../controllers/admissionController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['doctor', 'nurse', 'admin']), getAdmissions);
router.get('/:id', protect, requireRole(['doctor', 'nurse', 'admin']), getAdmissionById);
router.post('/', protect, requireRole(['doctor', 'nurse', 'admin']), createAdmission);
router.put('/:id', protect, requireRole(['doctor', 'nurse', 'admin']), updateAdmission);
router.delete('/:id', protect, requireRole(['doctor', 'nurse', 'admin']), deleteAdmission);

export default router;
