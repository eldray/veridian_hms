import express from 'express';
import {
  getFinancialReport,
  getInsuranceClaimsReport,
  getClinicalReport,
  getRevenueReport,
  getAttendanceReport,
  exportReport,
  getGHSOPDReport,
  getGHSIPDReport,
  getGHSANCReport,
  getGHSCWCReport,
  getGHSFamilyPlanningReport,
  getMorbidityMortalityReport,
  getDemographicReport
} from '../controllers/reportController';
import { protect, requireAdmin, requireAccountsStaff, requireClinicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// ==========================================
// GHS STANDARD REPORTS (Ghana Health Service)
// ==========================================

// GET /api/reports/ghs/opd - GHS OPD Report
router.get('/ghs/opd', requireClinicalStaff, getGHSOPDReport);

// GET /api/reports/ghs/ipd - GHS IPD Report  
router.get('/ghs/ipd', requireClinicalStaff, getGHSIPDReport);

// GET /api/reports/ghs/anc - GHS Antenatal Care Report
router.get('/ghs/anc', requireClinicalStaff, getGHSANCReport);

// GET /api/reports/ghs/cwc - GHS Child Welfare Clinic Report
router.get('/ghs/cwc', requireClinicalStaff, getGHSCWCReport);

// GET /api/reports/ghs/family-planning - GHS Family Planning Report
router.get('/ghs/family-planning', requireClinicalStaff, getGHSFamilyPlanningReport);

// GET /api/reports/morbidity-mortality - Morbidity & Mortality Report
router.get('/morbidity-mortality', requireAdmin, getMorbidityMortalityReport);

// GET /api/reports/demographic - Comprehensive Demographic Analysis
router.get('/demographic', requireClinicalStaff, getDemographicReport);

// ==========================================
// FINANCIAL & OPERATIONAL REPORTS
// ==========================================

// GET /api/reports/financial - Financial report
router.get('/financial', requireAccountsStaff, getFinancialReport);

// GET /api/reports/insurance-claims - Insurance claims report
router.get('/insurance-claims', requireAccountsStaff, getInsuranceClaimsReport);

// GET /api/reports/clinical - Clinical statistics report
router.get('/clinical', requireClinicalStaff, getClinicalReport);

// GET /api/reports/revenue - Revenue analysis report
router.get('/revenue', requireAccountsStaff, getRevenueReport);

// GET /api/reports/attendance - Attendance statistics report
router.get('/attendance', requireClinicalStaff, getAttendanceReport);

// ==========================================
// EXPORT FUNCTIONALITY
// ==========================================

// POST /api/reports/export - Export report in various formats
router.post('/export', requireAdmin, exportReport);

export default router;