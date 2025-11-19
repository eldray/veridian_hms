import express from 'express';
import {
  getInsuranceClaims,
  getClaimById,
  submitInsuranceClaim,
  updateClaimStatus,
  generateNHISClaimData,
  downloadNHISClaimXML,
  generatePrivateInsuranceClaim,
  getNHISClaimSummary,
  getClaimByAttendanceId,
  createInsuranceClaimForAttendance,
  submitNHISClaim,
  generateInsuranceClaimData // ADD THIS IMPORT
} from '../controllers/insuranceClaimController';

import { protect, requireAdmin, requireAccountsStaff, requireMedicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// ==========================================
// CLAIM MANAGEMENT ROUTES
// ==========================================

// GET /api/insurance-claims - Get all insurance claims with filtering
router.get('/', requireAccountsStaff, getInsuranceClaims);

// GET /api/insurance-claims/nhis-summary - Get NHIS claim summary
router.get('/nhis-summary', requireAccountsStaff, getNHISClaimSummary);

// GET /api/insurance-claims/:id - Get specific insurance claim
router.get('/:id', requireAccountsStaff, getClaimById);

// POST /api/insurance-claims - Submit new insurance claim
router.post('/', requireAccountsStaff, submitInsuranceClaim);

// PATCH /api/insurance-claims/:id/status - Update claim status
router.patch('/:id/status', requireAccountsStaff, updateClaimStatus);

// ==========================================
// ATTENDANCE-RELATED CLAIM ROUTES
// ==========================================

// GET /api/insurance-claims/attendance/:attendanceId - Get claim by attendance ID
router.get('/attendance/:attendanceId', requireMedicalStaff, getClaimByAttendanceId);

// POST /api/insurance-claims/attendance/:attendanceId - Create insurance claim for attendance
router.post('/attendance/:attendanceId', requireAccountsStaff, createInsuranceClaimForAttendance);

// GET /api/insurance-claims/attendance/:attendanceId/generate - Generate claim data for preview
router.get('/attendance/:attendanceId/generate', requireMedicalStaff, generateInsuranceClaimData);

// ==========================================
// NHIS SPECIFIC ROUTES
// ==========================================

// GET /api/insurance-claims/nhis/:attendanceId/generate - Generate NHIS claim data
router.get('/nhis/:attendanceId/generate', requireAccountsStaff, generateNHISClaimData);

// POST /api/insurance-claims/nhis/:attendanceId/submit - Submit NHIS claim
router.post('/nhis/:attendanceId/submit', requireAccountsStaff, submitNHISClaim);

// GET /api/insurance-claims/nhis/:attendanceId/download-xml - Download NHIS claim XML
router.get('/nhis/:attendanceId/download-xml', requireAccountsStaff, downloadNHISClaimXML);

// ==========================================
// PRIVATE INSURANCE ROUTES
// ==========================================

// GET /api/insurance-claims/private/:attendanceId/:insuranceProviderId/generate - Generate private insurance claim
router.get('/private/:attendanceId/:insuranceProviderId/generate', requireAccountsStaff, generatePrivateInsuranceClaim);

// POST /api/insurance-claims/private/:attendanceId/submit - Submit private insurance claim
router.post('/private/:attendanceId/submit', requireAccountsStaff, submitInsuranceClaim);

export default router;