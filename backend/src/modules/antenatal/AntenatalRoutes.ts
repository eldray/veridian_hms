// modules/antenatal/AntenatalRoutes.ts
import { Router } from 'express';
import { AntenatalController } from './AntenatalController';
import { protect } from '../../middleware/authMiddleware';

const router = Router();
let controller: AntenatalController;

export function createAntenatalRoutes(prisma: any): Router {
  controller = new AntenatalController(prisma);

  // ============================================
  // ANTENATAL BOOKING ROUTES
  // ============================================

  // Get all antenatal bookings (regular method - use .bind)
  router.get('/', protect, controller.getAntenatalBookings.bind(controller));

  // Get booking by attendance ID (regular method - use .bind)
  router.get('/attendance/:attendanceId', protect, controller.getAntenatalByAttendance.bind(controller));

  // Get booking by ID (regular method - use .bind)
  router.get('/:id', protect, controller.getAntenatalBookingById.bind(controller));

  // Get active booking by patient ID (regular method - use .bind)
  router.get('/patient/:patientId/active', protect, controller.getActiveBookingByPatient.bind(controller));

  // Create new antenatal booking (ARRAY - NO .bind)
  router.post('/', protect, controller.createAntenatalBooking);

  // Update antenatal booking (ARRAY - NO .bind)
  router.put('/:id', protect, controller.updateAntenatalBooking);

  // Close antenatal booking (ARRAY - NO .bind)
  router.post('/:id/close', protect, controller.closeAntenatalBooking);

  // Delete antenatal booking (regular method - use .bind)
  router.delete('/:id', protect, controller.deleteAntenatalBooking.bind(controller));

  // Get ANC statistics (regular method - use .bind)
  router.get('/stats/anc', protect, controller.getANCStatistics.bind(controller));

  // ============================================
  // ANC VISIT ROUTES
  // ============================================

  // Get all visits for a booking (regular method - use .bind)
  router.get('/bookings/:bookingId/visits', protect, controller.getANCVisitsByBooking.bind(controller));

  // Get single visit by ID (regular method - use .bind)
  router.get('/visits/:id', protect, controller.getANCVisitById.bind(controller));

  // Record new ANC visit (ARRAY - NO .bind)
  router.post('/visits', protect, controller.createANCVisit);

  // Update ANC visit (ARRAY - NO .bind)
  router.put('/visits/:id', protect, controller.updateANCVisit);

  // Delete ANC visit (regular method - use .bind)
  router.delete('/visits/:id', protect, controller.deleteANCVisit.bind(controller));

  // ============================================
  // DELIVERY RECORD ROUTES
  // ============================================

  // Get all delivery records (regular method - use .bind)
  router.get('/deliveries', protect, controller.getDeliveryRecords.bind(controller));

  // Get delivery record by ID (regular method - use .bind)
  router.get('/deliveries/:id', protect, controller.getDeliveryRecord.bind(controller));

  // Create delivery record (ARRAY - NO .bind)
  router.post('/deliveries', protect, controller.createDeliveryRecord);

  // Update delivery record (regular method - use .bind)
  router.put('/deliveries/:id', protect, controller.updateDeliveryRecord.bind(controller));

  // Delete delivery record (regular method - use .bind)
  router.delete('/deliveries/:id', protect, controller.deleteDeliveryRecord.bind(controller));

  // Get delivery statistics (regular method - use .bind)
  router.get('/stats/delivery', protect, controller.getDeliveryStatistics.bind(controller));

  // ============================================
  // POSTNATAL RECORD ROUTES
  // ============================================

  // Get all postnatal records (regular method - use .bind)
  router.get('/postnatal', protect, controller.getPostnatalRecords.bind(controller));

  // Get postnatal record by ID (regular method - use .bind)
  router.get('/postnatal/:id', protect, controller.getPostnatalRecord.bind(controller));

  // Create postnatal record (ARRAY - NO .bind)
  router.post('/postnatal', protect, controller.createPostnatalRecord);

  // Update postnatal record (regular method - use .bind)
  router.put('/postnatal/:id', protect, controller.updatePostnatalRecord.bind(controller));

  // Delete postnatal record (regular method - use .bind)
  router.delete('/postnatal/:id', protect, controller.deletePostnatalRecord.bind(controller));

  // Get postnatal statistics (regular method - use .bind)
  router.get('/stats/postnatal', protect, controller.getPostnatalStatistics.bind(controller));

  return router;
}