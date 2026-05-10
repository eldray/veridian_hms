// routes/insuranceClaimRoutes.ts - ADD THE MISSING ROUTE
import express from 'express';
import {
  // NHIS
  generateNHISClaim,
  getNHISClaims,
  // Private
  generatePrivateInsuranceClaim,
  getPrivateInsuranceClaims,
  // Common
  getAllInsuranceClaims,  // ✅ ADD THIS IMPORT
  getInsuranceClaim,
  getClaimByAttendanceId,
  updateClaimDraft,
  finalizeClaim,
  updateClaimStatus,
  generateClaimXML,
  generateClaimPrint,
  getFinalizedClaimsTotal
} from '../controllers/insuranceClaimController';
import { protect, requireAccountsStaff, requireMedicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

// ==========================================
// GET ALL CLAIMS (For dashboard and general listing)
// ==========================================
router.get('/', requireAccountsStaff, getAllInsuranceClaims);  // ✅ ADD THIS ROUTE

// ==========================================
// NHIS CLAIMS
// ==========================================
router.post('/nhis/generate', requireAccountsStaff, generateNHISClaim);
router.get('/nhis', requireAccountsStaff, getNHISClaims);

// ==========================================
// PRIVATE INSURANCE CLAIMS
// ==========================================
router.post('/private/generate', requireAccountsStaff, generatePrivateInsuranceClaim);
router.get('/private', requireAccountsStaff, getPrivateInsuranceClaims);

// ==========================================
// COMMON CLAIM OPERATIONS
// ==========================================
router.get('/:id', requireAccountsStaff, getInsuranceClaim);
router.get('/attendance/:attendanceId', requireMedicalStaff, getClaimByAttendanceId);
router.patch('/:claimId/draft', requireAccountsStaff, updateClaimDraft);
router.post('/:claimId/finalize', requireAccountsStaff, finalizeClaim);
router.patch('/:claimId/status', requireAccountsStaff, updateClaimStatus);
router.get('/:claimId/xml', requireAccountsStaff, generateClaimXML);
router.get('/:claimId/print', requireAccountsStaff, generateClaimPrint);
router.get('/financials/finalized-total', requireAccountsStaff, getFinalizedClaimsTotal);

export default router;