// modules/antenatal/AntenatalRoutes.ts
import { Router } from 'express';
import { AntenatalController } from './AntenatalController';
import { authenticate } from '../../middleware/authMiddleware';

const router = Router();
// Controller will be instantiated with prisma in the index file
let controller: AntenatalController;

export function createAntenatalRoutes(prisma: any): Router {
  controller = new AntenatalController(prisma);

  // ============================================
  // ANTENATAL BOOKING ROUTES
  // ============================================

  // Get all antenatal bookings
  router.get('/', authenticate, controller.getAntenatalBookings);

  // Get booking by attendance ID
  router.get('/attendance/:attendanceId', authenticate, controller.getAntenatalByAttendance);

  // Get booking by ID
  router.get('/:id', authenticate, controller.getAntenatalBookingById);

  // Get active booking by patient ID
  router.get('/patient/:patientId/active', authenticate, controller.getActiveBookingByPatient);

  // Create new antenatal booking
  router.post('/', authenticate, ...controller.createAntenatalBooking);

  // Update antenatal booking
  router.put('/:id', authenticate, ...controller.updateAntenatalBooking);

  // Close antenatal booking (on delivery)
  router.post('/:id/close', authenticate, ...controller.closeAntenatalBooking);

  // Delete antenatal booking
  router.delete('/:id', authenticate, controller.deleteAntenatalBooking);

  // Get ANC statistics
  router.get('/stats/anc', authenticate, controller.getANCStatistics);

  // ============================================
  // ANC VISIT ROUTES
  // ============================================

  // Get all visits for a booking
  router.get('/bookings/:bookingId/visits', authenticate, controller.getANCVisitsByBooking);

  // Get single visit by ID
  router.get('/visits/:id', authenticate, controller.getANCVisitById);

  // Record new ANC visit
  router.post('/visits', authenticate, ...controller.createANCVisit);

  // Update ANC visit
  router.put('/visits/:id', authenticate, ...controller.updateANCVisit);

  // Delete ANC visit
  router.delete('/visits/:id', authenticate, controller.deleteANCVisit);

  // ============================================
  // DELIVERY RECORD ROUTES
  // ============================================

  // Get all delivery records
  router.get('/deliveries', authenticate, controller.getDeliveryRecords);

  // Get delivery record by ID
  router.get('/deliveries/:id', authenticate, controller.getDeliveryRecord);

  // Create delivery record
  router.post('/deliveries', authenticate, ...controller.createDeliveryRecord);

  // Update delivery record
  router.put('/deliveries/:id', authenticate, controller.updateDeliveryRecord);

  // Delete delivery record
  router.delete('/deliveries/:id', authenticate, controller.deleteDeliveryRecord);

  // Get delivery statistics
  router.get('/stats/delivery', authenticate, controller.getDeliveryStatistics);

  // ============================================
  // POSTNATAL RECORD ROUTES
  // ============================================

  // Get all postnatal records
  router.get('/postnatal', authenticate, controller.getPostnatalRecords);

  // Get postnatal record by ID
  router.get('/postnatal/:id', authenticate, controller.getPostnatalRecord);

  // Create postnatal record
  router.post('/postnatal', authenticate, ...controller.createPostnatalRecord);

  // Update postnatal record
  router.put('/postnatal/:id', authenticate, controller.updatePostnatalRecord);

  // Delete postnatal record
  router.delete('/postnatal/:id', authenticate, controller.deletePostnatalRecord);

  // Get postnatal statistics
  router.get('/stats/postnatal', authenticate, controller.getPostnatalStatistics);

  return router;
}
