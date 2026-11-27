import { Router } from 'express';
import { UserRole, InsuranceType, PrismaClient } from '@prisma/client';
import { InsuranceProviderController } from './InsuranceProviderController'; // ✅ Import class, not singleton
import { body } from 'express-validator';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createInsuranceProviderRoutes(prisma: PrismaClient): Router { // ✅ Accept prisma
  const router = Router();
  const controller = new InsuranceProviderController(prisma); // ✅ Instantiate with prisma
  
  router.use(protect);
  
  const adminRoles: UserRole[] = ['admin'];
  const readRoles: UserRole[] = ['admin', 'accounts', 'records', 'doctor', 'nurse'];

  // ==========================================
  // SPECIFIC ROUTES FIRST
  // ==========================================
  router.get('/types', requireRole(readRoles), controller.getInsuranceTypes);

  // ==========================================
  // DYNAMIC ID ROUTES
  // ==========================================
  router.get('/', requireRole(readRoles), controller.getInsuranceProviders);
  router.get('/:id', requireRole(readRoles), controller.getInsuranceProviderById);
  router.get('/:id/stats', requireRole(readRoles), controller.getInsuranceProviderStats);
  
  // Write access restricted to Admin/Accounts
  router.post(
    '/', 
    requireRole(['admin', 'accounts']),
    [
      body('name').notEmpty().trim().isLength({ min: 2 }),
      body('type').isIn(Object.values(InsuranceType)),
      body('coveragePercentage').custom((value, { req }) => {
        if (req.body.type === InsuranceType.nhis) return true;
        if (value === undefined || value === null || value === '') {
          throw new Error('coveragePercentage is required for private and corporate providers');
        }
        const percentage = Number(value);
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
          throw new Error('coveragePercentage must be between 0 and 100');
        }
        return true;
      }),
      body('contactInfo').optional().isObject(),
      body('benefitPolicy').optional({ nullable: true }).isObject()
    ], 
    controller.createInsuranceProvider
  );
  
  router.put(
    '/:id', 
    requireRole(['admin', 'accounts']),
    [
      body('name').optional().notEmpty().trim().isLength({ min: 2 }),
      body('type').optional().isIn(Object.values(InsuranceType)),
      body('coveragePercentage').optional().isFloat({ min: 0, max: 100 }),
      body('benefitPolicy').optional({ nullable: true }).isObject()
    ], 
    controller.updateInsuranceProvider
  );
  
  router.delete('/:id', requireRole(adminRoles), controller.deleteInsuranceProvider);
  router.patch('/:id/toggle-status', requireRole(['admin', 'accounts']), controller.toggleInsuranceProviderStatus);

  return router;
}