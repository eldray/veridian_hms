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
  getFinalizedClaimsTotal,
  // Batch functions
  createClaimBatch,
  getClaimBatches,
  getClaimBatch,
  addClaimsToBatch,
  removeClaimsFromBatch,
  generateBatchXML,
  updateBatchStatus,
  deleteClaimBatch
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

// ==========================================
// CLAIM BATCH OPERATIONS
// ==========================================
router.post('/batches', requireAccountsStaff, createClaimBatch);
router.get('/batches', requireAccountsStaff, getClaimBatches);
router.get('/batches/:id', requireAccountsStaff, getClaimBatch);
router.post('/batches/:batchId/claims', requireAccountsStaff, addClaimsToBatch);
router.delete('/batches/:batchId/claims', requireAccountsStaff, removeClaimsFromBatch);
router.get('/batches/:batchId/xml', requireAccountsStaff, generateBatchXML);
router.patch('/batches/:batchId/status', requireAccountsStaff, updateBatchStatus);
router.delete('/batches/:batchId', requireAccountsStaff, deleteClaimBatch);

export default router;