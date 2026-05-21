// modules/antenatal/AntenatalRoutes.ts
import { Router } from 'express';
import { AntenatalController } from './AntenatalController';
import { protect } from '../../middleware/authMiddleware';

const router = Router();
let controller: AntenatalController;

export function createAntenatalRoutes(prisma: any): Router {
  controller = new AntenatalController(prisma);

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ============================================

  // ---------- STATISTICS ROUTES ----------
  router.get('/stats/anc', protect, controller.getANCStatistics.bind(controller));
  router.get('/stats/delivery', protect, controller.getDeliveryStatistics.bind(controller));
  router.get('/stats/postnatal', protect, controller.getPostnatalStatistics.bind(controller));

  // ---------- DELIVERY RECORD ROUTES ----------
  router.get('/deliveries', protect, controller.getDeliveryRecords.bind(controller));
  router.get('/deliveries/:id', protect, controller.getDeliveryRecord.bind(controller));
  router.post('/deliveries', protect, controller.createDeliveryRecord);
  router.put('/deliveries/:id', protect, controller.updateDeliveryRecord.bind(controller));
  router.delete('/deliveries/:id', protect, controller.deleteDeliveryRecord.bind(controller));

  // ---------- POSTNATAL RECORD ROUTES ----------
  router.get('/postnatals', protect, controller.getPostnatalRecords.bind(controller));
  router.get('/postnatal/:id', protect, controller.getPostnatalRecord.bind(controller));
  router.post('/postnatal', protect, controller.createPostnatalRecord);
  router.put('/postnatal/:id', protect, controller.updatePostnatalRecord.bind(controller));
  router.delete('/postnatal/:id', protect, controller.deletePostnatalRecord.bind(controller));

  // ---------- ANC VISIT ROUTES ----------
  router.get('/bookings/:bookingId/visits', protect, controller.getANCVisitsByBooking.bind(controller));
  router.get('/visits/:id', protect, controller.getANCVisitById.bind(controller));
  router.post('/visits', protect, controller.createANCVisit);
  router.put('/visits/:id', protect, controller.updateANCVisit);
  router.delete('/visits/:id', protect, controller.deleteANCVisit.bind(controller));

  // ---------- BOOKING BY ATTENDANCE (specific) ----------
  router.get('/attendance/:attendanceId', protect, controller.getAntenatalByAttendance.bind(controller));

  // ---------- ACTIVE BOOKING BY PATIENT (specific) ----------
  router.get('/patient/:patientId/active', protect, controller.getActiveBookingByPatient.bind(controller));

  // ============================================
  // DYNAMIC ID ROUTES (LAST - catches :id parameters)
  // ============================================

  // Get all antenatal bookings
  router.get('/', protect, controller.getAntenatalBookings.bind(controller));

  // Get single antenatal booking by ID (must be AFTER all specific routes)
  router.get('/:id', protect, controller.getAntenatalBookingById.bind(controller));

  // Create new antenatal booking
  router.post('/', protect, controller.createAntenatalBooking);

  // Update antenatal booking
  router.put('/:id', protect, controller.updateAntenatalBooking);

  // Close antenatal booking
  router.post('/:id/close', protect, controller.closeAntenatalBooking);

  // Delete antenatal booking
  router.delete('/:id', protect, controller.deleteAntenatalBooking.bind(controller));

  return router;
}