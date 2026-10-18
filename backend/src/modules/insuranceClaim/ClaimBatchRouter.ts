// backend/src/modules/insuranceClaim/ClaimBatchRouter.ts
import { Router } from 'express';
import { claimBatchController } from './ClaimBatchController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { validate, GenerateBatchSchema } from './InsuranceClaimValidators';

export const createClaimBatchRoutes = () => {
  const router = Router();
  router.use(protect);

  // Specific routes first
  router.post(
    '/generate',
    requireRole(['admin', 'accounts']),
    validate(GenerateBatchSchema),
    claimBatchController.generateBatch,
  );

  router.get(
  '/eligible',
  requireRole(['admin', 'accounts', 'doctor', 'records']),
  claimBatchController.eligible,
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