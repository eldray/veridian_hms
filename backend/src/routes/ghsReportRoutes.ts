// routes/ghsReportRoutes.ts - CLEAN VERSION

import express from 'express';
import { protect, requireAccountsStaff } from '../middleware/authMiddleware';
import {
  generateOPDReport,
  generateIPDReport,
  generateIDSRReport,
  generateMalariaReport,
  generateMorbidityMortalityReport,
  getTopDiagnoses,
  generateFormAReport,  // NEW - replaces ANC and Delivery
  getReportSubmissions,
  getReportById,
  exportReportToCSV
} from '../controllers/ghsReportController';

const router = express.Router();

router.use(protect);
router.use(requireAccountsStaff);

// ==============================================
// GENERATE REPORTS
// ==============================================
router.get('/opd', generateOPDReport);
router.get('/ipd', generateIPDReport);
router.get('/idsr', generateIDSRReport);
router.get('/malaria', generateMalariaReport);
router.get('/morbidity-mortality', generateMorbidityMortalityReport);
router.get('/top-diagnoses', getTopDiagnoses);
router.get('/form-a', generateFormAReport);  // NEW - Replaces ANC and Delivery

// ==============================================
// REPORT SUBMISSIONS
// ==============================================
router.get('/submissions', getReportSubmissions);
router.get('/submissions/:id', getReportById);
router.get('/submissions/:id/export', exportReportToCSV);

export default router;