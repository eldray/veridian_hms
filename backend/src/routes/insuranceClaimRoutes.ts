import express from 'express';
import {
  generateClaimDraft,
  getClaimDraft,
  updateClaimDraft,
  finalizeClaim,
  generateClaimXML,
  generateClaimPrint,
  getFinalizedClaimsTotal,
  getInsuranceClaims,
  getInsuranceClaim,
  getClaimByAttendanceId
} from '../controllers/insuranceClaimController';

import { protect, requireAccountsStaff, requireMedicalStaff } from '../middleware/authMiddleware';

const router = express.Router();

// All routes are protected
router.use(protect);

// SIMPLIFIED WORKFLOW ROUTES
router.post('/drafts', requireAccountsStaff, generateClaimDraft);
router.get('/drafts/:claimId', requireAccountsStaff, getClaimDraft);
router.patch('/drafts/:claimId', requireAccountsStaff, updateClaimDraft);
router.post('/:claimId/finalize', requireAccountsStaff, finalizeClaim);
router.get('/:claimId/xml', requireAccountsStaff, generateClaimXML);
router.get('/:claimId/print', requireAccountsStaff, generateClaimPrint);
router.get('/financials/finalized-total', requireAccountsStaff, getFinalizedClaimsTotal);

// BASIC VIEWING ROUTES
router.get('/', requireAccountsStaff, getInsuranceClaims);
router.get('/:id', requireAccountsStaff, getInsuranceClaim);
router.get('/attendance/:attendanceId', requireMedicalStaff, getClaimByAttendanceId);

export default router;