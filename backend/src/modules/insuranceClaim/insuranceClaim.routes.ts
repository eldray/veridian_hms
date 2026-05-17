// modules/insuranceClaim/insuranceClaim.routes.ts
import { Router } from 'express';
import * as insuranceClaimController from './insuranceClaim.controller';

const router = Router();

// ==========================================
// CLAIM BATCH ROUTES
// ==========================================
router.post('/batches', insuranceClaimController.createClaimBatch);
router.get('/batches', insuranceClaimController.getClaimBatches);
router.get('/batches/:id', insuranceClaimController.getClaimBatch);
router.post('/batches/:batchId/claims', insuranceClaimController.addClaimsToBatch);
router.delete('/batches/:batchId/claims', insuranceClaimController.removeClaimsFromBatch);
router.post('/batches/:batchId/generate-xml', insuranceClaimController.generateBatchXML);
router.patch('/batches/:batchId/status', insuranceClaimController.updateBatchStatus);
router.delete('/batches/:batchId', insuranceClaimController.deleteClaimBatch);

// ==========================================
// GENERAL CLAIM ROUTES
// ==========================================
router.get('/', insuranceClaimController.getAllInsuranceClaims);
router.get('/:id', insuranceClaimController.getInsuranceClaim);
router.get('/attendance/:attendanceId', insuranceClaimController.getClaimByAttendanceId);
router.patch('/:claimId/draft', insuranceClaimController.updateClaimDraft);
router.patch('/:claimId/finalize', insuranceClaimController.finalizeClaim);
router.patch('/:claimId/status', insuranceClaimController.updateClaimStatus);
router.get('/finalized/total', insuranceClaimController.getFinalizedClaimsTotal);

// ==========================================
// NHIS CLAIM ROUTES
// ==========================================
router.post('/nhis/generate', insuranceClaimController.generateNHISClaim);
router.get('/nhis', insuranceClaimController.getNHISClaims);

// ==========================================
// PRIVATE INSURANCE CLAIM ROUTES
// ==========================================
router.post('/private/generate', insuranceClaimController.generatePrivateInsuranceClaim);
router.get('/private', insuranceClaimController.getPrivateInsuranceClaims);

// ==========================================
// CORPORATE CLAIM ROUTES
// ==========================================
router.post('/corporate/generate', insuranceClaimController.generateCorporateClaim);
router.get('/corporate', insuranceClaimController.getCorporateClaims);

// ==========================================
// XML & PRINT ROUTES
// ==========================================
router.post('/:claimId/generate-xml', insuranceClaimController.generateClaimXML);
router.get('/:claimId/print', insuranceClaimController.generateClaimPrint);

export default router;
