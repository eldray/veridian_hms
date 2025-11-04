import express from 'express';
import {
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport,
  getAttendanceReport,
  getRevenueReport,
  exportReport
} from '../controllers/reportController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Financial Reports
router.get('/financial', protect, requireRole(['admin', 'accounts']), getFinancialReport);
router.get('/revenue', protect, requireRole(['admin', 'accounts']), getRevenueReport);

// Insurance Reports
router.get('/insurance-claims', protect, requireRole(['admin', 'accounts']), getInsuranceClaimsReport);

// Clinical Reports
router.get('/clinical', protect, requireRole(['admin', 'doctor']), getClinicalReport);
router.get('/attendance', protect, requireRole(['admin', 'doctor', 'nurse']), getAttendanceReport);

// Export
router.post('/export', protect, requireRole(['admin', 'accounts']), exportReport);

export default router;
