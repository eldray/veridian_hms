// routes/antenatalRoutes.ts - SIMPLIFIED

import express from 'express';
import { protect, requireMidwife } from '../middleware/authMiddleware';
import {
  getAntenatalByAttendance,
  updateANCVisit,
  deleteANCVisit,
  getANCVisitsByBooking,
  getANCVisitById,
  getAntenatalBookings,
  getAntenatalBooking,
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
router.get('/bookings/:patientId', requireMidwife, getAntenatalBooking);
router.get('/visits/by-booking/:bookingId', requireMidwife, getANCVisitsByBooking);  // ✅ Fixed
router.get('/visit/:id', requireMidwife, getANCVisitById);
router.get('/stats', requireMidwife, getANCStatistics);

// UPDATE operations
router.put('/visit/:id', requireMidwife, updateANCVisit);
router.put('/bookings/:patientId/close', requireMidwife, closeAntenatalBooking);

// DELETE operations
router.delete('/visit/:id', requireMidwife, deleteANCVisit);

// Postnatal operations
router.get('/postnatal/:attendanceId', requireMidwife, getPostnatalByAttendance);
router.post('/postnatal-examination', requireMidwife, recordPostnatalExamination);

export default router;