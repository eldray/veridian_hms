// routes/patientRoutes.js - UPDATED
import express from 'express';
import { 
  getPatients, 
  getPatientById, 
  createPatient, 
  updatePatient,
  uploadPatientImage 
} from '../controllers/patientController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.get('/', protect, getPatients);
router.get('/:id', protect, getPatientById);
router.post('/', protect, createPatient);
router.put('/:id', protect, updatePatient);
router.post('/:id/image', protect, upload.single('image'), uploadPatientImage);

export default router;