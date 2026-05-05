import express from 'express';
import { protect, requireMidwife } from '../middleware/authMiddleware';
import {
  // ANC Bookings
  getAntenatalBookings,
  getAntenatalBookingById,
  getActiveBookingByPatient,
  closeAntenatalBooking,
  getANCStatistics,
  
  // ANC Visits
  getANCVisitsByBooking,
  getANCVisitById,
  updateANCVisit,
  deleteANCVisit,
  
  // Delivery
  getDeliveryRecords,
  getDeliveryRecord,
  createDeliveryRecord,
  updateDeliveryRecord,
  deleteDeliveryRecord,
  getDeliveryStatistics,
  
  // Postnatal
  getPostnatalRecords,
  getPostnatalRecord,
  createPostnatalRecord,
  updatePostnatalRecord,
  deletePostnatalRecord,
  getPostnatalStatistics,
} from '../controllers/antenatalController';

const router = express.Router();

router.use(protect);

// ============================================
// ANTENATAL BOOKINGS
// ============================================
router.get('/bookings', requireMidwife, getAntenatalBookings);
router.get('/booking/:id', requireMidwife, getAntenatalBookingById);
router.get('/booking/patient/:patientId', requireMidwife, getActiveBookingByPatient);
router.put('/booking/:id/close', requireMidwife, closeAntenatalBooking);
router.get('/stats', requireMidwife, getANCStatistics);

// ============================================
// ANC VISITS
// ============================================
router.get('/visits/booking/:bookingId', requireMidwife, getANCVisitsByBooking);
router.get('/visit/:id', requireMidwife, getANCVisitById);
router.put('/visit/:id', requireMidwife, updateANCVisit);
router.delete('/visit/:id', requireMidwife, deleteANCVisit);

// ============================================
// DELIVERY
// ============================================
router.get('/deliveries', requireMidwife, getDeliveryRecords);
router.get('/delivery/:id', requireMidwife, getDeliveryRecord);
router.post('/delivery', requireMidwife, createDeliveryRecord);
router.put('/delivery/:id', requireMidwife, updateDeliveryRecord);
router.delete('/delivery/:id', requireMidwife, deleteDeliveryRecord);
router.get('/delivery/stats', requireMidwife, getDeliveryStatistics);

// ============================================
// POSTNATAL
// ============================================
router.get('/postnatals', requireMidwife, getPostnatalRecords);
router.get('/postnatal/:id', requireMidwife, getPostnatalRecord);
router.post('/postnatal', requireMidwife, createPostnatalRecord);
router.put('/postnatal/:id', requireMidwife, updatePostnatalRecord);
router.delete('/postnatal/:id', requireMidwife, deletePostnatalRecord);
router.get('/postnatal/stats', requireMidwife, getPostnatalStatistics);

export default router;