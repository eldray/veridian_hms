// routes/antenatalRoutes.ts - UPDATED WITH ATTENDANCE INTEGRATION
import express from 'express';
import { protect, requireMidwife, requireDoctor, requireAdmin } from '../middleware/authMiddleware';
import {
  getAntenatalByAttendance,
  createAntenatalFromAttendance,
  recordANCVisitFromAttendance,
  getANCVisitsByAttendance,
  getPostnatalByAttendance,
  recordPostnatalExamination,
  getAntenatalBookings,
  getAntenatalBooking,
  closeAntenatalBooking,
  getANCStatistics
} from '../controllers/antenatalController';

const router = express.Router();

router.use(protect);

// ==============================================
// ATTENDANCE-INTEGRATED ROUTES (Primary for midwives)
// ==============================================

// Get antenatal data for a specific attendance
router.get('/attendance/:attendanceId', requireMidwife, getAntenatalByAttendance);

// Create/update antenatal booking from attendance
router.post('/booking-from-attendance', requireMidwife, createAntenatalFromAttendance);

// Record ANC visit from attendance
router.post('/visit-from-attendance', requireMidwife, recordANCVisitFromAttendance);

// Get all ANC visits for an attendance
router.get('/visits/:attendanceId', requireMidwife, getANCVisitsByAttendance);

// Get postnatal data for a specific attendance
router.get('/postnatal/:attendanceId', requireMidwife, getPostnatalByAttendance);

// Record postnatal examination
router.post('/postnatal-examination', requireMidwife, recordPostnatalExamination);

// ==============================================
// STANDALONE BOOKING MANAGEMENT (Admin/Doctors)
// ==============================================
router.get('/bookings', requireMidwife, getAntenatalBookings);
router.get('/bookings/:patientId', requireMidwife, getAntenatalBooking);
router.put('/bookings/:patientId/close', requireMidwife, closeAntenatalBooking);
router.get('/stats', requireMidwife, getANCStatistics);

export default router;