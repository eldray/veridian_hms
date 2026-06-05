// modules/antenatal/AntenatalRoutes.ts
import { Router } from 'express';
import { AntenatalController } from './AntenatalController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createAntenatalRoutes(prisma: any): Router {
  const router = Router();
  const controller = new AntenatalController(prisma);

  // All routes require authentication
  router.use(protect);

  // ============================================
  // STATISTICS ROUTES
  // ============================================
  router.get('/statistics/antenatal', controller.getAntenatalStatistics.bind(controller));
  router.get('/statistics/delivery', controller.getDeliveryStatistics.bind(controller));
  router.get('/statistics/postnatal', controller.getPostnatalStatistics.bind(controller));

  // ============================================
  // ANTENATAL REGISTRATION (Called after encounter created)
  // ============================================
  router.post('/register', controller.registerAntenatalBooking);

  // ============================================
  // ANTENATAL RECORD MANAGEMENT
  // ============================================
  router.get('/records', controller.listAntenatalRecords.bind(controller));
  router.get('/records/by-encounter/:encounterId', controller.getAntenatalRecordByEncounter.bind(controller));
  router.get('/records/by-patient/:patientId/active', controller.getActiveAntenatalRecordByPatient.bind(controller));
  router.get('/records/:id', controller.getAntenatalRecordById.bind(controller));
  router.put('/records/:id', controller.updateAntenatalRecord);
  router.post('/records/:id/close', controller.closeAntenatalRecord);
  router.delete('/records/:id', requireRole(['admin']), controller.deleteAntenatalRecord.bind(controller));

  // ============================================
  // ANC VISITS (Follow-up visits)
  // ============================================
  router.post('/visits', controller.recordANCVisit);
  router.get('/visits/by-antenatal-record/:antenatalRecordId', controller.listANCVisitsByAntenatalRecord.bind(controller));
  router.get('/visits/:id', controller.getANCVisitById.bind(controller));
  router.put('/visits/:id', controller.updateANCVisit);
  router.delete('/visits/:id', requireRole(['admin']), controller.deleteANCVisit.bind(controller));

  // ============================================
  // DELIVERY RECORDS
  // ============================================
  router.post('/delivery', controller.recordDelivery);
  router.get('/deliveries', controller.getDeliveryStatistics.bind(controller)); // Or separate method

  // ============================================
  // POSTNATAL RECORDS
  // ============================================
  router.post('/postnatal', controller.recordPostnatalVisit);
  router.get('/postnatal', controller.getPostnatalStatistics.bind(controller)); // Or separate method

  return router;
}