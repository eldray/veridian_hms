import express from 'express';
import {
  getVitals,
  getVitalsByAttendance,
  getVitalsByPatient,
  createVitals,
  updateVitals
} from '../controllers/vitalsController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requireRole(['admin', 'doctor', 'nurse']), getVitals);
router.get('/attendance/:attendanceId', protect, requireRole(['admin', 'doctor', 'nurse']), getVitalsByAttendance);
router.get('/patient/:patientId', protect, requireRole(['admin', 'doctor', 'nurse']), getVitalsByPatient);
router.post('/', protect, requireRole(['admin', 'doctor', 'nurse']), createVitals);
router.put('/:id', protect, requireRole(['admin', 'doctor', 'nurse']), updateVitals);

export default router;
