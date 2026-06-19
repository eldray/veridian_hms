import { Router } from 'express';
// ✅ 1. Import UserRole from Prisma
import { PrismaClient, UserRole } from '@prisma/client'; 
import { AntenatalController } from './AntenatalController';
import { AntenatalService } from './AntenatalService';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAntenatalRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const service = new AntenatalService(prisma);
  const controller = new AntenatalController(service);

  // ✅ Global Auth
  router.use(protect);

  // ✅ 2. Explicitly type the arrays as UserRole[]
  // Read access for clinical and records staff
  const readRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife', 'records'];
  // Write access restricted to clinical staff
  const writeRoles: UserRole[] = ['admin', 'doctor', 'nurse', 'midwife'];

  // ============================================
  // SPECIFIC ROUTES FIRST
  // ============================================
  
  // Statistics
  router.get('/stats/anc', requireRole(readRoles), controller.getANCStatistics);
  router.get('/stats/delivery', requireRole(readRoles), controller.getDeliveryStatistics);
  router.get('/stats/postnatal', requireRole(readRoles), controller.getPostnatalStatistics);

  // Deliveries
  router.get('/deliveries', requireRole(readRoles), controller.getDeliveryRecords);
  router.get('/deliveries/:id', requireRole(readRoles), controller.getDeliveryRecord);
  router.post('/deliveries', requireRole(writeRoles), controller.createDeliveryRecord);
  router.put('/deliveries/:id', requireRole(writeRoles), controller.updateDeliveryRecord);
  router.delete('/deliveries/:id', requireRole(['admin']), controller.deleteDeliveryRecord);

  // Postnatals
  router.get('/postnatals', requireRole(readRoles), controller.getPostnatalRecords);
  router.get('/postnatal/:id', requireRole(readRoles), controller.getPostnatalRecord);
  router.post('/postnatal', requireRole(writeRoles), controller.createPostnatalRecord);
  router.put('/postnatal/:id', requireRole(writeRoles), controller.updatePostnatalRecord);
  router.delete('/postnatal/:id', requireRole(['admin']), controller.deletePostnatalRecord);

  // ANC Visits
  router.get('/bookings/:bookingId/visits', requireRole(readRoles), controller.getANCVisitsByBooking);
  router.get('/visits/:id', requireRole(readRoles), controller.getANCVisitById);
  router.post('/visits', requireRole(writeRoles), controller.createANCVisit);
  router.put('/visits/:id', requireRole(writeRoles), controller.updateANCVisit);
  router.delete('/visits/:id', requireRole(['admin']), controller.deleteANCVisit);

  // Specific Bookings
  router.get('/attendance/:attendanceId', requireRole(readRoles), controller.getAntenatalByAttendance);
  router.get('/patient/:patientId/active', requireRole(readRoles), controller.getActiveBookingByPatient);

  // ============================================
  // DYNAMIC ID ROUTES (LAST)
  // ============================================
  router.get('/', requireRole(readRoles), controller.getAntenatalBookings);
  router.get('/:id', requireRole(readRoles), controller.getAntenatalBookingById);
  router.post('/', requireRole(writeRoles), controller.createAntenatalBooking);
  router.put('/:id', requireRole(writeRoles), controller.updateAntenatalBooking);
  router.post('/:id/close', requireRole(writeRoles), controller.closeAntenatalBooking);
  router.delete('/:id', requireRole(['admin']), controller.deleteAntenatalBooking);

  return router;
}