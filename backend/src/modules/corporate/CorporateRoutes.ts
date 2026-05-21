// modules/corporate/CorporateRoutes.ts
import { Router } from 'express';
import { CorporateController } from './CorporateController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createCorporateRoutes(): Router {
  const router = Router();
  const controller = new CorporateController();

  // All routes require authentication
  router.use(protect);

  // Corporate Account Routes
  router.post('/', requireRole(['admin', 'accounts']), controller.createAccount);
  router.get('/', requireRole(['admin', 'accounts', 'records']), controller.getAccounts);
  router.get('/statistics', requireRole(['admin', 'accounts']), controller.getStatistics);
  router.get('/:id', requireRole(['admin', 'accounts', 'records']), controller.getAccount);
  router.put('/:id', requireRole(['admin', 'accounts']), controller.updateAccount);
  router.delete('/:id', requireRole(['admin', 'accounts']), controller.deactivateAccount);

  // Monthly Billing Routes
  router.post('/:id/bills', requireRole(['admin', 'accounts']), controller.generateMonthlyBill);
  router.get('/:id/bills', requireRole(['admin', 'accounts', 'records']), controller.getMonthlyBills);

  // Corporate Employee Routes
  router.get('/:accountId/employees', requireRole(['admin', 'accounts', 'records']), controller.getEmployees);
  router.post('/:accountId/employees', requireRole(['admin', 'accounts']), controller.addEmployee);
  router.get('/employees/:id', requireRole(['admin', 'accounts', 'records']), controller.getEmployee);
  router.put('/employees/:id', requireRole(['admin', 'accounts']), controller.updateEmployee);
  router.delete('/employees/:id', requireRole(['admin', 'accounts']), controller.removeEmployee);

  return router;
}