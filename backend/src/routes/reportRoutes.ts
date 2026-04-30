// routes/reportRoutes.ts
import express from 'express';
import {
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport,
  getAttendanceReport,
  getRevenueReport,
  exportReport,
  getFamilyPlanningReport,
  getDemographicReport,
  getMorbidityMortalityReport,  // ✅ ADD THIS
} from '../controllers/reportController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// GHS Reports
router.get('/family-planning', requireRole(['admin', 'doctor']), getFamilyPlanningReport);
router.get('/demographic', requireRole(['admin', 'doctor']), getDemographicReport);
router.get('/morbidity-mortality', requireRole(['admin', 'doctor']), getMorbidityMortalityReport);  // ✅ ADD THIS

// Existing routes
router.get('/financial', requireRole(['admin', 'accounts']), getFinancialReport);
router.get('/insurance-claims', requireRole(['admin', 'accounts']), getInsuranceClaimsReport);
router.get('/clinical', requireRole(['admin', 'doctor']), getClinicalReport);
router.get('/attendance', requireRole(['admin', 'doctor']), getAttendanceReport);
router.get('/revenue', requireRole(['admin', 'accounts']), getRevenueReport);
router.post('/export', exportReport);

export default router;