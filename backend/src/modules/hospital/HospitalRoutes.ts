// HospitalRoutes.ts
import { Router } from 'express';
import { HospitalController } from './HospitalController';
import { body } from 'express-validator';

export const createHospitalRoutes = (controller?: HospitalController): Router => {
  const router = Router();
  const hospitalController = controller || new HospitalController();

  // GET all hospitals
  router.get('/', hospitalController.getHospitals.bind(hospitalController));

  // GET hospital by ID
  router.get('/:id', hospitalController.getHospitalById.bind(hospitalController));

  // CREATE hospital
  router.post(
    '/',
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

  // UPDATE hospital
  router.put(
    '/:id',
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

  // DELETE hospital
  router.delete('/:id', hospitalController.deleteHospital.bind(hospitalController));

  // GET NHIS Settings (Active Hospital)
  router.get('/nhis/settings', hospitalController.getHospitalNHISSettings.bind(hospitalController));

  // UPDATE NHIS Settings (Active Hospital)
  router.put(
    '/nhis/settings',
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
