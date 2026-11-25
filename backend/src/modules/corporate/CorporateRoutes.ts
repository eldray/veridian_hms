// modules/corporate/CorporateRoutes.ts
import { Router } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { CorporateController } from './CorporateController';
import { protect, requireRole } from '../../middleware/authMiddleware';

export function createCorporateRoutes(prisma: PrismaClient): Router {
  const router = Router();
  
  // ✅ FIXED: Pass prisma to controller
  const controller = new CorporateController(prisma);

  // All routes require authentication
  router.use(protect);

  // ✅ FIXED: Explicitly type role arrays
  const adminAccounts: UserRole[] = ['admin', 'accounts'];
  const readRoles: UserRole[] = ['admin', 'accounts', 'records'];

  // ============================================
  // SPECIFIC ROUTES FIRST (BEFORE dynamic :id)
  // ============================================

  // Statistics
  router.get('/statistics', requireRole(adminAccounts), controller.getStatistics);

  // ✅ FIXED: Employee routes MUST come before /:id
  // Otherwise /employees/123 gets caught by /:id with id="employees"
  router.get('/employees/:id', requireRole(readRoles), controller.getEmployee);
  router.put('/employees/:id', requireRole(adminAccounts), controller.updateEmployee);
  router.delete('/employees/:id', requireRole(adminAccounts), controller.removeEmployee);

  // ============================================
  // CORPORATE ACCOUNT ROUTES
  // ============================================
  router.post('/', requireRole(adminAccounts), controller.createAccount);
  router.get('/', requireRole(readRoles), controller.getAccounts);
  router.get('/:id', requireRole(readRoles), controller.getAccount);
  router.put('/:id', requireRole(adminAccounts), controller.updateAccount);
  router.delete('/:id', requireRole(adminAccounts), controller.deactivateAccount);

  // Monthly Billing Routes
  router.post('/:id/bills', requireRole(adminAccounts), controller.generateMonthlyBill);
  router.get('/:id/bills', requireRole(readRoles), controller.getMonthlyBills);

  // Corporate Employee Routes (under account)
  router.get('/:accountId/employees', requireRole(readRoles), controller.getEmployees);
  router.post('/:accountId/employees', requireRole(adminAccounts), controller.addEmployee);

  return router;
}