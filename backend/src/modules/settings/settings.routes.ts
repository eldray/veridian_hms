// modules/settings/settings.routes.ts
import { Router } from 'express';
import * as settingsController from './settings.controller';
import { body } from 'express-validator';

const router = Router();

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================
router.get('/users', settingsController.getAllUsers);
router.put('/users/:id', [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('phone').optional().trim(),
  body('licenseNumber').optional().trim(),
  body('specialization').optional().trim(),
  body('role').optional().isIn(['admin', 'doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'pharmacist', 'accounts']),
  body('isActive').optional().isBoolean()
], settingsController.updateUser);
router.patch('/users/:id/deactivate', settingsController.deactivateUser);

// ==========================================
// HOSPITAL DETAILS ROUTES
// ==========================================
router.get('/hospital', settingsController.getHospitalDetails);
router.put('/hospital', [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').isEmail().withMessage('Valid email is required')
], settingsController.updateHospitalDetails);

// ==========================================
// NHIS API CONFIGURATION ROUTES
// ==========================================
router.get('/nhis/status', settingsController.getNHISApiStatus);
router.put('/nhis/config', [
  body('nhisApiBaseUrl').optional().isURL().withMessage('Valid NHIS API base URL required'),
  body('nhisApiClientId').optional().trim(),
  body('nhisApiClientSecret').optional().trim(),
  body('nhisApiTokenEndpoint').optional().isURL().withMessage('Valid token endpoint URL required'),
  body('nhisApiEligibilityEndpoint').optional().isURL().withMessage('Valid eligibility endpoint URL required'),
  body('nhisApiCccEndpoint').optional().isURL().withMessage('Valid CCC endpoint URL required'),
  body('nhisApiActive').optional().isBoolean()
], settingsController.updateNHISApiConfig);
router.post('/nhis/test-connection', settingsController.testNHISConnection);

// ==========================================
// NHIS ELIGIBILITY VERIFICATION ROUTES
// ==========================================
router.post('/nhis/verify-eligibility', [
  body('policyNumber').notEmpty().trim().withMessage('Policy number is required')
], settingsController.verifyNHISEligibility);

router.post('/nhis/bulk-verify-eligibility', [
  body('policyNumbers').isArray({ min: 1 }).withMessage('Policy numbers array is required')
], settingsController.bulkVerifyNHISEligibility);

router.post('/nhis/generate-ccc', [
  body('policyNumber').notEmpty().trim().withMessage('Policy number is required'),
  body('encounterId').notEmpty().trim().withMessage('Encounter ID is required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number')
], settingsController.generateCCC);

export default router;
