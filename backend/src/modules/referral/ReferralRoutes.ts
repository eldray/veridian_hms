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
    body('status').isIn(['pending', 'accepted', 'rejected', 'completed']).withMessage('Valid status required')
  ];

  // ==========================================
  // ✅ SPECIFIC ROUTES FIRST (BEFORE dynamic :id routes)
  // ==========================================
  router.get('/stats/summary', protect, requireRole(['admin', 'records']), (req, res) => controller.getReferralStats(req, res));
  router.get('/patient/:patientId', protect, (req, res) => controller.getReferralsByPatient(req, res));

  // ==========================================
  // DYNAMIC ID ROUTES (LAST)
  // ==========================================
  router.get('/', protect, (req, res) => controller.getReferrals(req, res));
  router.get('/:id', protect, (req, res) => controller.getReferralById(req, res));

  router.post('/outgoing', protect, requireRole(['admin', 'doctor', 'records']), outgoingReferralValidation, (req, res) => controller.createOutgoingReferral(req, res));
  router.post('/incoming', protect, requireRole(['admin', 'records']), incomingReferralValidation, (req, res) => controller.createIncomingReferral(req, res));

  router.put('/:id/status', protect, requireRole(['admin', 'doctor']), statusUpdateValidation, (req, res) => controller.updateReferralStatus(req, res));
  router.delete('/:id', protect, requireRole(['admin']), (req, res) => controller.deleteReferral(req, res));

  return router;
}

export default createReferralRoutes;