import express from 'express';
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getDoctorSchedule,
  getAppointmentStatistics // ADD THIS
} from '../controllers/appointmentController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// Basic CRUD operations
router.get('/', getAppointments);
router.get('/stats', getAppointmentStatistics); // ADD THIS LINE
router.get('/schedule', getDoctorSchedule);
router.get('/:id', getAppointmentById);
router.post('/', requireRole(['admin', 'doctor', 'nurse', 'records']), createAppointment);
router.put('/:id', requireRole(['admin', 'doctor', 'nurse']), updateAppointment);
router.delete('/:id', requireRole(['admin', 'doctor']), deleteAppointment);

export default router;