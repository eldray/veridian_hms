import express from 'express';
import { getPatients, getPatientById, createPatient, updatePatient } from '../controllers/patientController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, getPatients);
router.get('/:id', protect, getPatientById);
router.post('/', protect, createPatient);
router.put('/:id', protect, updatePatient);

export default router;
