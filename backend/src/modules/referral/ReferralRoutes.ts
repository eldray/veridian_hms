import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReferralController } from './ReferralController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { body } from 'express-validator';

export function createReferralRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ReferralController(prisma);

  // The structured Part I / Part II answers are the source of truth, and the service mirrors
  // reason-for-referral (outgoing) or findings (incoming) into the flat column, so the route
  // only checks the shape and lets the service decide what counts as missing.
  const outgoingReferralValidation = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('referralReason').optional().isString().withMessage('Referral reason must be text'),
    body('referredToFacility').notEmpty().withMessage('Referred to facility is required'),
    body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required')
  ];

  const incomingReferralValidation = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('referralReason').optional().isString().withMessage('Referral reason must be text'),
    body('referredFromFacility').notEmpty().withMessage('Referred from facility is required'),
    body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required')
  ];

  const statusUpdateValidation = [
    body('status').notEmpty().withMessage('Status is required'),
    body('status').isIn(['pending', 'accepted', 'completed', 'cancelled']).withMessage('Valid status required')
  ];

  // ==========================================
  // ✅ SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ==========================================
  // The referrals page is open to the clinical team, and it loads this summary on
  // mount, so nurses and midwives read it too.
  router.get('/stats/summary', protect, requireRole(['admin', 'records', 'doctor', 'nurse', 'midwife']), controller.getReferralStats);
  router.get('/patient/:patientId', protect, controller.getReferralsByPatient);

  // ==========================================
  // DYNAMIC ID ROUTES (LAST)
  // ==========================================
  router.get('/', protect, controller.getReferrals);
  router.get('/:id', protect, controller.getReferralById);

  router.post('/outgoing', protect, requireRole(['admin', 'doctor', 'records']), outgoingReferralValidation, controller.createOutgoingReferral);
  router.post('/incoming', protect, requireRole(['admin', 'records']), incomingReferralValidation, controller.createIncomingReferral);

  // Accepting carries the receiving clinician's Part II report back, so the records desk
  // that fields incoming referrals can move a referral forward too.
  router.put('/:id/status', protect, requireRole(['admin', 'doctor', 'records']), statusUpdateValidation, controller.updateReferralStatus);
  router.delete('/:id', protect, requireRole(['admin']), controller.deleteReferral);

  return router;
}

export default createReferralRoutes;