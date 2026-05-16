// backend/src/modules/referral/ReferralRoutes.ts

import { Router } from 'express';
import { ReferralController } from './ReferralController';
import { authenticate, authorize } from '../../middleware/authMiddleware';
import { body } from 'express-validator';

const router = Router();
const controller = new ReferralController();

// Validation middleware
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

// Routes
router.get('/', authenticate, (req, res) => controller.getReferrals(req, res));
router.get('/:id', authenticate, (req, res) => controller.getReferralById(req, res));
router.get('/patient/:patientId', authenticate, (req, res) => controller.getReferralsByPatient(req, res));
router.get('/stats/summary', authenticate, (req, res) => controller.getReferralStats(req, res));

router.post('/outgoing', authenticate, authorize(['ADMIN', 'DOCTOR', 'STAFF']), outgoingReferralValidation, (req, res) => 
  controller.createOutgoingReferral(req as any, res)
);

router.post('/incoming', authenticate, authorize(['ADMIN', 'RECEPTIONIST', 'STAFF']), incomingReferralValidation, (req, res) => 
  controller.createIncomingReferral(req as any, res)
);

router.put('/:id/status', authenticate, authorize(['ADMIN', 'DOCTOR']), statusUpdateValidation, (req, res) => 
  controller.updateReferralStatus(req, res)
);

router.delete('/:id', authenticate, authorize(['ADMIN']), (req, res) => 
  controller.deleteReferral(req, res)
);

export default router;
