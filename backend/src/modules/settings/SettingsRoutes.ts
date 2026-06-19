import { Router } from 'express';
import * as settingsController from './SettingsController';
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createSettingsRoutes = () => {
  const router = Router();

  // All settings routes require authentication
  router.use(protect);

  // ==========================================
  // HOSPITAL DETAILS ROUTES (Admin only)
  // ==========================================

  router.get('/hospital', requireRole(['admin']), settingsController.getHospitalDetails);

  router.put(
    '/hospital',
    requireRole(['admin']),
    [
      body('name').notEmpty().withMessage('Hospital name is required'),
      body('address').notEmpty().withMessage('Address is required'),
      body('phone').notEmpty().withMessage('Phone number is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('imageUrl').optional().isURL().withMessage('Valid image URL required'),
    ],
    settingsController.updateHospitalDetails
  );

  // ==========================================
  // NHIS API CONFIGURATION ROUTES (Admin only)
  // ==========================================

  router.get('/nhis/status', requireRole(['admin']), settingsController.getNHISApiStatus);

  router.put(
    '/nhis/config',
    requireRole(['admin']),
    [
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
    ],
    settingsController.updateNHISApiConfig
  );

  router.post('/nhis/test-connection', requireRole(['admin']), settingsController.testNHISConnection);

  // ==========================================
  // NHIS ELIGIBILITY VERIFICATION ROUTES (Admin, Accounts, Records)
  // ==========================================

  router.post(
    '/nhis/verify-eligibility',
    requireRole(['admin', 'accounts', 'records']),
    [body('policyNumber').notEmpty().withMessage('Policy number is required').trim()],
    settingsController.verifyNHISEligibility
  );

  router.post(
    '/nhis/bulk-verify-eligibility',
    requireRole(['admin', 'accounts', 'records']),
    [
      body('policyNumbers')
        .isArray({ min: 1, max: 100 })
        .withMessage('policyNumbers must be an array of 1–100 items'),
      body('policyNumbers.*')
        .isString().notEmpty().withMessage('Each policy number must be a non-empty string'),
    ],
    settingsController.bulkVerifyNHISEligibility
  );

  router.post(
    '/nhis/generate-ccc',
    requireRole(['admin', 'accounts', 'records']),
    [
      body('policyNumber').notEmpty().trim().withMessage('Policy number is required'),
      body('encounterId').notEmpty().trim().withMessage('Encounter ID is required'),
      body('totalAmount')
        .isFloat({ min: 0 })
        .withMessage('Total amount must be a non-negative number'),
    ],
    settingsController.generateCCC
  );

  return router;
};