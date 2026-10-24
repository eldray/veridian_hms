// backend/src/modules/insuranceClaim/InsuranceClaimRouter.ts
import { Router } from 'express';
import { insuranceClaimController } from './InsuranceClaimController';
import { createClaimBatchRoutes } from './ClaimBatchRouter';
import { protect, requireRole } from '../../middleware/authMiddleware';
import {
  validate,
  GenerateClaimSchema,
  UpdateClaimDraftSchema,
  ReplaceClaimItemsSchema,
} from './InsuranceClaimValidators';

export const createInsuranceClaimRoutes = () => {
  const router = Router();
  router.use(protect);

  router.use('/batches', createClaimBatchRoutes());

  router.get('/tracking', requireRole(['admin', 'accounts']), insuranceClaimController.listTrackingClaims);
  router.post('/:claimId/tracking-events', requireRole(['admin', 'accounts']), insuranceClaimController.recordTrackingEvent);

  router.get('/summary', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaimsSummary);
  // Read-only audit endpoint; only authorised claims/accounts staff can inspect legacy gaps.
  router.get('/audit/missing-items', requireRole(['admin', 'accounts']), insuranceClaimController.listClaimsMissingItems);

  router.post('/nhis/generate', requireRole(['admin', 'accounts']), validate(GenerateClaimSchema), insuranceClaimController.generateNHISClaim);
  router.get('/nhis', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listNHISClaims);

  router.post('/private/generate', requireRole(['admin', 'accounts']), validate(GenerateClaimSchema), insuranceClaimController.generatePrivateClaim);
  router.get('/private', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listPrivateClaims);

  router.post('/corporate/generate', requireRole(['admin', 'accounts']), validate(GenerateClaimSchema), insuranceClaimController.generateCorporateClaim);
  router.get('/corporate', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listCorporateClaims);

  router.get('/attendance/:attendanceId', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaimByAttendanceId);

  router.get('/:claimId/xml', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.downloadClaimXml);
  router.get('/:claimId/print', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.printClaim);
  router.patch('/:claimId/draft', requireRole(['admin', 'accounts']), validate(UpdateClaimDraftSchema), insuranceClaimController.updateDraft);
  router.put('/:claimId/items', requireRole(['admin', 'accounts']), validate(ReplaceClaimItemsSchema), insuranceClaimController.replaceItems);
  router.patch('/:claimId/finalize', requireRole(['admin', 'accounts']), insuranceClaimController.finalizeClaim);

  router.get('/:id', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.getClaim);
  router.get('/', requireRole(['admin', 'accounts', 'doctor', 'records']), insuranceClaimController.listClaims);

  return router;
};