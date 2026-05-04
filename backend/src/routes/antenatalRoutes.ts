// routes/antenatalRoutes.ts - UPDATED
import express from 'express';
import { protect, requireMidwife } from '../middleware/authMiddleware';
import {
  getAntenatalByAttendance,
  updateANCVisit,
  deleteANCVisit,
  getANCVisitsByBooking,
  getANCVisitById,
  getAntenatalBookings,
  getAntenatalBookingById,  // ✅ Changed: get by booking ID, not patient ID
  getActiveBookingByPatient, // ✅ NEW: Get active booking by patient ID
  closeAntenatalBooking,
  getANCStatistics,
  getPostnatalByAttendance,
  recordPostnatalExamination
} from '../controllers/antenatalController';

const router = express.Router();

router.use(protect);

// READ operations
router.get('/attendance/:attendanceId', requireMidwife, getAntenatalByAttendance);
router.get('/bookings', requireMidwife, getAntenatalBookings);
router.get('/bookings/patient/:patientId', requireMidwife, getActiveBookingByPatient);  // ✅ NEW: Get by patient ID
router.get('/booking/:id', requireMidwife, getAntenatalBookingById);  // ✅ Get by booking ID
router.get('/visits/by-booking/:bookingId', requireMidwife, getANCVisitsByBooking);
router.get('/visit/:id', requireMidwife, getANCVisitById);
router.get('/stats', requireMidwife, getANCStatistics);

// UPDATE operations
router.put('/visit/:id', requireMidwife, updateANCVisit);
router.put('/booking/:id/close', requireMidwife, closeAntenatalBooking);  // ✅ Use booking ID

// DELETE operations
router.delete('/visit/:id', requireMidwife, deleteANCVisit);

// Postnatal operations
router.get('/postnatal/:attendanceId', requireMidwife, getPostnatalByAttendance);
router.post('/postnatal-examination', requireMidwife, recordPostnatalExamination);

export default router;