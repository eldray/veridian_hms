import express from 'express';
import {
  generateNHISClaimForm,
  generatePrivateInsuranceClaim,
  submitInsuranceClaim,
  updateClaimStatus,
  getInsuranceClaims,
  getClaimById
} from '../controllers/insuranceClaimController';
import { protect, requireRole } from '../middleware/authMiddleware';

const router = express.Router();

// Claim Generation
router.get('/nhis-claim/:attendanceId', protect, requireRole(['admin', 'accounts']), generateNHISClaimForm);
router.get('/private-claim/:attendanceId/:insuranceProviderId', protect, requireRole(['admin', 'accounts']), generatePrivateInsuranceClaim);

// Claim Management
router.post('/', protect, requireRole(['admin', 'accounts']), submitInsuranceClaim);
router.get('/', protect, requireRole(['admin', 'accounts']), getInsuranceClaims);
router.get('/:id', protect, requireRole(['admin', 'accounts']), getClaimById);
router.patch('/:id/status', protect, requireRole(['admin', 'accounts']), updateClaimStatus);

export default router;
