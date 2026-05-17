// GHSReportRoutes.ts - Route definitions for GHS Report module

import { Router } from 'express';
import { GHSReportController } from './GHSReportController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createGHSReportRoutes = () => {
  const router = Router();
  const controller = new GHSReportController();

  router.use(protect);
  router.use(requireRole(['admin', 'doctor', 'accounts']));

  // ==============================================
  // GENERATE REPORTS
  // ==============================================
  router.get('/opd', controller.generateOPDReport);
  router.get('/ipd', controller.generateIPDReport);
  router.get('/idsr', controller.generateIDSRReport);
  router.get('/malaria', controller.generateMalariaReport);
  router.get('/morbidity-mortality', controller.generateMorbidityMortalityReport);
  router.get('/top-diagnoses', controller.getTopDiagnoses);
  router.get('/form-a', controller.generateFormAReport);

  // ==============================================
  // REPORT SUBMISSIONS
  // ==============================================
  router.get('/submissions', controller.getReportSubmissions);
  router.get('/submissions/:id', controller.getReportById);
  router.get('/submissions/:id/export', controller.exportReportToCSV);

  return router;
};

export default createGHSReportRoutes;
