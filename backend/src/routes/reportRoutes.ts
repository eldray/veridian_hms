// routes/ghsReportRoutes.ts
import express from 'express';
import { protect, requireAccountsStaff } from '../middleware/authMiddleware';
import {
  generateOPDReport,
  generateIPDReport,
  generateIDSRReport,
  generateMalariaReport,
  generateANCReport,
  generateDeliveryReport,
  getReportSubmissions,
  getReportById,
  exportReportToCSV
} from '../controllers/ghsReportController';

const router = express.Router();

router.use(protect);
router.use(requireAccountsStaff);

// Reports
router.get('/opd', generateOPDReport);
router.get('/ipd', generateIPDReport);
router.get('/idsr', generateIDSRReport);
router.get('/malaria', generateMalariaReport);
router.get('/anc', generateANCReport);
router.get('/delivery', generateDeliveryReport);

// Submissions
router.get('/submissions', getReportSubmissions);
router.get('/submissions/:id', getReportById);
router.get('/submissions/:id/export', exportReportToCSV);

export default router;