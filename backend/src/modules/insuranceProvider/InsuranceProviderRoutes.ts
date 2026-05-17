// InsuranceProviderRoutes.ts
import { Router } from 'express';
import { InsuranceProviderController } from './InsuranceProviderController';
import { body } from 'express-validator';
import { InsuranceType } from '@prisma/client';

export const createInsuranceProviderRoutes = (controller?: InsuranceProviderController): Router => {
  const router = Router();
  const insuranceProviderController = controller || new InsuranceProviderController();

  // GET all insurance providers
  router.get('/', insuranceProviderController.getInsuranceProviders.bind(insuranceProviderController));

  // GET insurance provider by ID
  router.get('/:id', insuranceProviderController.getInsuranceProviderById.bind(insuranceProviderController));

  // CREATE insurance provider
  router.post(
    '/',
    [
      body('name')
        .notEmpty().withMessage('Name is required')
        .trim()
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
      body('type')
        .isIn(Object.values(InsuranceType))
        .withMessage('Valid type is required'),
      body('coveragePercentage')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Coverage percentage must be between 0 and 100'),
      body('contactInfo')
        .optional()
        .isObject()
        .withMessage('Contact info must be a valid object'),
    ],
    insuranceProviderController.createInsuranceProvider.bind(insuranceProviderController)
  );

  // UPDATE insurance provider
  router.put(
    '/:id',
    [
      body('name')
        .optional()
        .notEmpty().withMessage('Name cannot be empty')
        .trim()
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
      body('type')
        .optional()
        .isIn(Object.values(InsuranceType))
        .withMessage('Valid type is required'),
      body('coveragePercentage')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Coverage percentage must be between 0 and 100'),
      body('contactInfo')
        .optional()
        .isObject()
        .withMessage('Contact info must be a valid object'),
    ],
    insuranceProviderController.updateInsuranceProvider.bind(insuranceProviderController)
  );

  // DELETE insurance provider
  router.delete('/:id', insuranceProviderController.deleteInsuranceProvider.bind(insuranceProviderController));

  // TOGGLE insurance provider status
  router.patch('/:id/toggle-status', insuranceProviderController.toggleInsuranceProviderStatus.bind(insuranceProviderController));

  // GET insurance provider statistics
  router.get('/:id/stats', insuranceProviderController.getInsuranceProviderStats.bind(insuranceProviderController));

  // GET insurance types
  router.get('/types', insuranceProviderController.getInsuranceTypes.bind(insuranceProviderController));

  return router;
};
