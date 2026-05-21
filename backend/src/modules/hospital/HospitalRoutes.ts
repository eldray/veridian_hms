// HospitalRoutes.ts
import { Router } from 'express';
import { HospitalController } from './HospitalController';
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export const createHospitalRoutes = (controller?: HospitalController): Router => {
  const router = Router();
  const hospitalController = controller || new HospitalController();

  // All routes require authentication
  router.use(protect);

  // GET all hospitals (Admin only)
  router.get('/', requireRole(['admin']), hospitalController.getHospitals.bind(hospitalController));

  // GET hospital by ID (Admin only)
  router.get('/:id', requireRole(['admin']), hospitalController.getHospitalById.bind(hospitalController));

  // CREATE hospital (Admin only)
  router.post(
    '/',
    requireRole(['admin']),
    [
      body('name').notEmpty().withMessage('Hospital name is required'),
      body('address').notEmpty().withMessage('Address is required'),
      body('phone').notEmpty().withMessage('Phone number is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('nhisFacilityCode').notEmpty().withMessage('NHIS facility code is required'),
      body('nhisFacilityType')
        .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
        .withMessage('Valid NHIS facility type is required'),
    ],
    hospitalController.createHospital.bind(hospitalController)
  );

  // UPDATE hospital (Admin only)
  router.put(
    '/:id',
    requireRole(['admin']),
    [
      body('name').optional().notEmpty().withMessage('Hospital name cannot be empty'),
      body('email').optional().isEmail().withMessage('Valid email is required'),
      body('nhisFacilityType')
        .optional()
        .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
        .withMessage('Valid NHIS facility type is required'),
    ],
    hospitalController.updateHospital.bind(hospitalController)
  );

  // DELETE hospital (Admin only)
  router.delete('/:id', requireRole(['admin']), hospitalController.deleteHospital.bind(hospitalController));

  // GET NHIS Settings (Active Hospital) - Admin and Accounts can view
  router.get('/nhis/settings', requireRole(['admin', 'accounts']), hospitalController.getHospitalNHISSettings.bind(hospitalController));

  // UPDATE NHIS Settings (Active Hospital) - Admin only
  router.put(
    '/nhis/settings',
    requireRole(['admin']),
    [
      body('nhisFacilityCode').notEmpty().withMessage('NHIS facility code is required'),
      body('nhisFacilityType')
        .isIn(['Tertiary', 'Secondary', 'Primary', 'Clinic', 'Health_Center', 'Maternity_Home'])
        .withMessage('Valid facility type is required'),
    ],
    hospitalController.updateHospitalNHISSettings.bind(hospitalController)
  );

  return router;
};