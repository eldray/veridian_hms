import { Router } from 'express';
import { insuranceClaimController } from './InsuranceClaimController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createInsuranceClaimRoutes = () => {
  const router = Router();
  router.use(protect);

  // ==========================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ==========================================

  // NHIS CLAIM ROUTES
  router.post('/nhis/generate', requireRole(['admin', 'accounts']), insuranceClaimController.generateNHISClaim);
  router.get('/nhis', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getNHISClaims);

  // PRIVATE INSURANCE CLAIM ROUTES
  router.post('/private/generate', requireRole(['admin', 'accounts']), insuranceClaimController.generatePrivateInsuranceClaim);
  router.get('/private', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getPrivateInsuranceClaims);

  // CORPORATE CLAIM ROUTES
  router.post('/corporate/generate', requireRole(['admin', 'accounts']), insuranceClaimController.generateCorporateClaim);
  router.get('/corporate', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getCorporateClaims);

  // FINALIZED TOTAL ROUTE
  router.get('/finalized/total', requireRole(['admin', 'accounts']), insuranceClaimController.getFinalizedClaimsTotal);

  // CLAIM BATCH ROUTES (Admin & Accounts only)
  router.post('/batches', requireRole(['admin', 'accounts']), insuranceClaimController.createClaimBatch);
  router.get('/batches', requireRole(['admin', 'accounts']), insuranceClaimController.getClaimBatches);
  router.get('/batches/:id', requireRole(['admin', 'accounts']), insuranceClaimController.getClaimBatch);
  router.post('/batches/:batchId/claims', requireRole(['admin', 'accounts']), insuranceClaimController.addClaimsToBatch);
  router.delete('/batches/:batchId/claims', requireRole(['admin', 'accounts']), insuranceClaimController.removeClaimsFromBatch);
  router.post('/batches/:batchId/generate-xml', requireRole(['admin', 'accounts']), insuranceClaimController.generateBatchXML);
  router.patch('/batches/:batchId/status', requireRole(['admin', 'accounts']), insuranceClaimController.updateBatchStatus);
  router.delete('/batches/:batchId', requireRole(['admin', 'accounts']), insuranceClaimController.deleteClaimBatch);

  // ==========================================
  // DYNAMIC CLAIM ID ROUTES (PUT THESE LAST)
  // ==========================================
  router.get('/attendance/:attendanceId', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getClaimByAttendanceId);
  router.patch('/:claimId/draft', requireRole(['admin', 'accounts']), insuranceClaimController.updateClaimDraft);
  router.patch('/:claimId/finalize', requireRole(['admin', 'accounts']), insuranceClaimController.finalizeClaim);
  router.patch('/:claimId/status', requireRole(['admin', 'accounts']), insuranceClaimController.updateClaimStatus);
  router.patch('/:claimId', requireRole(['admin', 'accounts']), insuranceClaimController.updateInsuranceClaim);
  router.post('/:claimId/generate-xml', requireRole(['admin', 'accounts']), insuranceClaimController.generateClaimXML);
  router.get('/:claimId/print', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.generateClaimPrint);
  router.get('/:id', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getInsuranceClaim);
  router.get('/', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.getAllInsuranceClaims);

  return router;
};