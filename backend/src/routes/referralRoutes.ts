// routes/referralRoutes.ts
import express from 'express';
import { protect, requireClinicalStaff, requireDoctor, requireAdmin } from '../middleware/authMiddleware';
import {
  getReferrals,
  getReferralById,
  createOutgoingReferral,
  createIncomingReferral,
  updateReferral,
  updateReferralStatus,
  deleteReferral,
  getReferralsByPatient,
  generateReferralLetter,
  getReferralStats
} from '../controllers/referralController';

const router = express.Router();

// All referral routes require authentication
router.use(protect);

// ==============================================
// REFERRAL STATISTICS
// ==============================================
router.get('/stats', requireClinicalStaff, getReferralStats);

// ==============================================
// PATIENT REFERRALS
// ==============================================
router.get('/patient/:patientId', requireClinicalStaff, getReferralsByPatient);

// ==============================================
// REFERRAL LETTER GENERATION
// ==============================================
router.get('/:id/letter', requireClinicalStaff, generateReferralLetter);

// ==============================================
// MAIN REFERRAL CRUD
// ==============================================
router.get('/', requireClinicalStaff, getReferrals);
router.get('/:id', requireClinicalStaff, getReferralById);
router.post('/outgoing', requireClinicalStaff, createOutgoingReferral);
router.post('/incoming', requireClinicalStaff, createIncomingReferral);
router.put('/:id', requireClinicalStaff, updateReferral);
router.put('/:id/status', requireClinicalStaff, updateReferralStatus);
router.delete('/:id', requireDoctor, deleteReferral);

export default router;