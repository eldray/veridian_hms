// modules/ghsReport/GHSReportRoutes.ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { GHSReportController } from './GHSReportController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createGHSReportRoutes = (prisma: PrismaClient) => {
  const router = Router();
  const controller = new GHSReportController(prisma);

  // Apply authentication to all routes
  router.use(protect);
  router.use(requireRole(['admin', 'doctor', 'midwife', 'accounts']));

  // ==============================================
  // GENERATE REPORTS
  // ==============================================
  router.get('/opd', controller.generateOPDReport);
  router.get('/ipd', controller.generateIPDReport);
  router.get('/family-planning', controller.getFamilyPlanningReport);
  router.get('/idsr', controller.generateIDSRReport);
  router.get('/malaria', controller.generateMalariaReport);
  router.get('/delivery', controller.generateDeliveryReport);
  router.get('/morbidity-mortality', controller.generateMorbidityMortalityReport);
  router.get('/top-diagnoses', controller.getTopDiagnoses);
  router.get('/form-a', controller.generateFormAReport);
  router.get('/consulting-room-register', controller.generateConsultingRoomRegister);

  // ==============================================
  // REPORT SUBMISSIONS (PRESERVED FROM ORIGINAL)
  // ==============================================
  router.get('/submissions', controller.getReportSubmissions);
  router.get('/submissions/:id', controller.getReportById);
  router.get('/submissions/:id/export', controller.exportReportToCSV);

  return router;
};

export default createGHSReportRoutes;