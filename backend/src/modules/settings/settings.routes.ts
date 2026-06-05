// modules/settings/settings.routes.ts
import { Router } from 'express';
import * as settingsController from './settings.controller';
import { body } from 'express-validator';

const router = Router();

// ✅ ALIGNED: UserRole enum from schema
const VALID_ROLES = [
  'admin', 'doctor', 'nurse', 'midwife',
  'records', 'lab_tech', 'pharmacist', 'accounts', 'sonographer',
];

// ✅ Seniority levels
const VALID_SENIORITY = ['TRAINEE', 'JUNIOR', 'SENIOR', 'PRINCIPAL'];

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
  body('role').optional().isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(', ')}`),
  body('seniority').optional().isIn(VALID_SENIORITY).withMessage(`Seniority must be one of: ${VALID_SENIORITY.join(', ')}`),
  body('isActive').optional().isBoolean(),
  body('departmentId').optional().isString(),
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
  body('email').isEmail().withMessage('Valid email is required'),
  body('imageUrl').optional().isURL().withMessage('Valid image URL required'),
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
  body('nhisApiActive').optional().isBoolean(),
  body('nhisFacilityCode').optional().trim(),
  body('nhisFacilityType').optional().isIn([
    'Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home',
  ]).withMessage('Invalid facility type'),
  body('nhisAccreditationNumber').optional().trim(),
  body('nhisContactPerson').optional().trim(),
  body('nhisContactPhone').optional().trim(),
  body('nhisContactEmail').optional().isEmail().withMessage('Valid contact email required'),
], settingsController.updateNHISApiConfig);

router.post('/nhis/test-connection', settingsController.testNHISConnection);

// ==========================================
// NHIS ELIGIBILITY VERIFICATION ROUTES
// ==========================================

router.post('/nhis/verify-eligibility', [
  body('policyNumber')
    .notEmpty().withMessage('Policy number is required')
    .trim(),
], settingsController.verifyNHISEligibility);

router.post('/nhis/bulk-verify-eligibility', [
  body('policyNumbers')
    .isArray({ min: 1, max: 100 })
    .withMessage('policyNumbers must be an array of 1–100 items'),
  body('policyNumbers.*')
    .isString().notEmpty().withMessage('Each policy number must be a non-empty string'),
], settingsController.bulkVerifyNHISEligibility);

router.post('/nhis/generate-ccc', [
  body('policyNumber').notEmpty().trim().withMessage('Policy number is required'),
  body('encounterId').notEmpty().trim().withMessage('Encounter ID is required'),
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be a non-negative number'),
], settingsController.generateCCC);

export default router;