// backend/src/modules/insuranceClaim/ClaimBatchRouter.ts
import { Router } from 'express';
import { claimBatchController } from './ClaimBatchController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validateBody } from '../../middleware/validate';
import { GenerateBatchSchema } from './InsuranceClaimValidators';

export const createClaimBatchRoutes = () => {
  const router = Router();
  router.use(protect);

  // Specific routes first
  router.post(
    '/generate',
    requireRole(['admin', 'accounts']),
    validateBody(GenerateBatchSchema),
    claimBatchController.generateBatch,
  );

  router.get(
  '/eligible',
  requireRole(['admin', 'accounts', 'doctor', 'records']),
  claimBatchController.eligible,
);

  // The month's claim rows — must sit above the dynamic :id route or "period-claims"
  // is read as a batch id.
  router.get(
    '/period-claims',
    requireRole(['admin', 'accounts', 'doctor', 'records']),
    claimBatchController.periodClaims,
  );

  // Dynamic :id routes — two-segment before one-segment
  router.get(
    '/:id/xml',
    requireRole(['admin', 'accounts', 'doctor', 'records']),
    claimBatchController.downloadXml,
  );
  router.get(
    '/:id/print',
    requireRole(['admin', 'accounts', 'doctor', 'records']),
    claimBatchController.printBatch,
  );
  router.patch(
    '/:id/finalize',
    requireRole(['admin', 'accounts']),
    claimBatchController.finalizeBatch,
  );

  // CLAIM-it submission for a whole batch. `submit-claimit` is a POST so the write audit records it
  // as a submission; the delete uses the DELETE verb for the same reason.
  router.post(
    '/:id/submit-claimit',
    requireRole(['admin', 'accounts']),
    claimBatchController.submitToClaimIt,
  );
  router.get(
    '/:id/claimit-submissions',
    requireRole(['admin', 'accounts', 'records']),
    claimBatchController.claimitSubmissions,
  );
  // Deletes every NHIS claim CLAIM-it holds for this batch's period, not only the ones sent here.
  router.delete(
    '/:id/claimit',
    requireRole(['admin']),
    claimBatchController.deleteFromClaimIt,
  );

  router.delete(
    '/:id',
    requireRole(['admin', 'accounts']),
    claimBatchController.deleteBatch,
  );
  router.get(
    '/:id',
    requireRole(['admin', 'accounts', 'doctor', 'records']),
    claimBatchController.getBatch,
  );

  // Root
  router.get(
    '/',
    requireRole(['admin', 'accounts', 'doctor', 'records']),
    claimBatchController.listBatches,
  );

  return router;
};