import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { ReferralController } from './ReferralController';
import { protect, requireRole } from '../../middleware/authMiddleware';
import { body } from 'express-validator';

export function createReferralRoutes(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new ReferralController(prisma);

  const outgoingReferralValidation = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('referralReason').notEmpty().withMessage('Referral reason is required'),
    body('referredToFacility').notEmpty().withMessage('Referred to facility is required'),
    body('urgency').optional().isIn(['routine', 'urgent', 'stat']).withMessage('Valid urgency required')
  ];

  const incomingReferralValidation = [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('referralReason').notEmpty().withMessage('Referral reason is required'),
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
  router.get('/stats/summary', protect, requireRole(['admin', 'records']), controller.getReferralStats);
  router.get('/patient/:patientId', protect, controller.getReferralsByPatient);

  // ==========================================
  // DYNAMIC ID ROUTES (LAST)
  // ==========================================
  router.get('/', protect, controller.getReferrals);
  router.get('/:id', protect, controller.getReferralById);

  router.post('/outgoing', protect, requireRole(['admin', 'doctor', 'records']), outgoingReferralValidation, controller.createOutgoingReferral);
  router.post('/incoming', protect, requireRole(['admin', 'records']), incomingReferralValidation, controller.createIncomingReferral);

  router.put('/:id/status', protect, requireRole(['admin', 'doctor']), statusUpdateValidation, controller.updateReferralStatus);
  router.delete('/:id', protect, requireRole(['admin']), controller.deleteReferral);

  return router;
}

export default createReferralRoutes;