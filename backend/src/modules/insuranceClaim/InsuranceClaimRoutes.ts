// backend/src/modules/insuranceClaim/InsuranceClaimRouter.ts
import { Router } from 'express';
import { insuranceClaimController } from './InsuranceClaimController';
import { createClaimBatchRoutes } from './ClaimBatchRouter';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import {
  GenerateClaimSchema,
  UpdateClaimDraftSchema,
  ReplaceClaimItemsSchema,
} from './InsuranceClaimValidators';

export const createInsuranceClaimRoutes = () => {
  const router = Router();
  router.use(protect);

  router.use('/batches', createClaimBatchRoutes());

  // Doctors may follow the progress of claims they submitted; only accounts
  // record the tracking events themselves.
  router.get('/tracking', requireRole(['admin', 'accounts', 'doctor']), insuranceClaimController.listTrackingClaims);
  router.post('/:claimId/tracking-events', requireRole(['admin', 'accounts']), insuranceClaimController.recordTrackingEvent);

  router.get('/summary', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaimsSummary);
  // Read-only audit endpoint; only authorised claims/accounts staff can inspect legacy gaps.
  router.get('/audit/missing-items', requireRole(['admin', 'accounts']), insuranceClaimController.listClaimsMissingItems);

  router.post('/nhis/generate', requireRole(['admin', 'accounts']), validateBody(GenerateClaimSchema), insuranceClaimController.generateNHISClaim);
  router.get('/nhis', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listNHISClaims);

  router.post('/private/generate', requireRole(['admin', 'accounts']), validateBody(GenerateClaimSchema), insuranceClaimController.generatePrivateClaim);
  router.get('/private', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listPrivateClaims);

  router.post('/corporate/generate', requireRole(['admin', 'accounts']), validateBody(GenerateClaimSchema), insuranceClaimController.generateCorporateClaim);
  router.get('/corporate', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listCorporateClaims);

  router.get('/attendance/:attendanceId', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaimByAttendanceId);

  // CLAIM-it (NHIS claims server). Registered above /:id so "claimit" is never read as a claim id.
  router.get('/claimit/status', requireRole(['admin', 'accounts']), insuranceClaimController.claimitStatus);
  router.post('/claimit/test-connection', requireRole(['admin', 'accounts']), insuranceClaimController.claimitTestConnection);

  router.get('/:claimId/xml', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.downloadClaimXml);
  router.get('/:claimId/print', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.printClaim);
  router.patch('/:claimId/draft', requireRole(['admin', 'accounts']), validateBody(UpdateClaimDraftSchema), insuranceClaimController.updateDraft);
  router.put('/:claimId/items', requireRole(['admin', 'accounts']), validateBody(ReplaceClaimItemsSchema), insuranceClaimController.replaceItems);
  router.patch('/:claimId/finalize', requireRole(['admin', 'accounts']), insuranceClaimController.finalizeClaim);
  router.post('/:claimId/submit-claimit', requireRole(['admin', 'accounts']), insuranceClaimController.submitClaimToClaimIt);
  // Every attempt, newest first: the desk needs the payer's own error codes after a page refresh.
  router.get('/:claimId/claimit-submissions', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.claimitClaimSubmissions);
  // DELETE, not POST .../delete-claimit: the write audit middleware labels a POST "create" and only
  // a DELETE "delete", and this genuinely is a deletion - of the claim, from CLAIM-it's database.
  router.delete('/:claimId/claimit', requireRole(['admin', 'accounts']), insuranceClaimController.deleteClaimFromClaimIt);

  router.get('/:id', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaim);
  router.get('/', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listClaims);

  return router;
};