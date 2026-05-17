import { Router } from 'express';
import { CorporateController } from './CorporateController';
import { protect as authenticate, requireRole as authorize } from '../../middleware/authMiddleware';

export class CorporateRoutes {
  private router: Router;
  private corporateController: CorporateController;

  constructor() {
    this.router = Router();
    this.corporateController = new CorporateController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // Corporate Account Routes
    this.router.post(
      '/',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.createAccount.bind(this.corporateController)
    );

    this.router.get(
      '/',
      authenticate,
      authorize(['admin', 'accounts', 'records']),  // Changed from 'receptionist'
      this.corporateController.getAccounts.bind(this.corporateController)
    );

    this.router.get(
      '/statistics',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.getStatistics.bind(this.corporateController)
    );

    this.router.get(
      '/:id',
      authenticate,
      authorize(['admin', 'accounts', 'records']),  // Changed from 'receptionist'
      this.corporateController.getAccount.bind(this.corporateController)
    );

    this.router.put(
      '/:id',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.updateAccount.bind(this.corporateController)
    );

    this.router.delete(
      '/:id',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.deactivateAccount.bind(this.corporateController)
    );

    // Monthly Billing Routes
    this.router.post(
      '/:id/bills',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.generateMonthlyBill.bind(this.corporateController)
    );

    this.router.get(
      '/:id/bills',
      authenticate,
      authorize(['admin', 'accounts', 'records']),  // Changed from 'receptionist'
      this.corporateController.getMonthlyBills.bind(this.corporateController)
    );

    // Corporate Employee Routes
    this.router.get(
      '/:accountId/employees',
      authenticate,
      authorize(['admin', 'accounts', 'records']),  // Changed from 'receptionist'
      this.corporateController.getEmployees.bind(this.corporateController)
    );

    this.router.post(
      '/:accountId/employees',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.addEmployee.bind(this.corporateController)
    );

    this.router.get(
      '/employees/:id',
      authenticate,
      authorize(['admin', 'accounts', 'records']),  // Changed from 'receptionist'
      this.corporateController.getEmployee.bind(this.corporateController)
    );

    this.router.put(
      '/employees/:id',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.updateEmployee.bind(this.corporateController)
    );

    this.router.delete(
      '/employees/:id',
      authenticate,
      authorize(['admin', 'accounts']),  // Changed from 'finance_manager'
      this.corporateController.removeEmployee.bind(this.corporateController)
    );
  }

  getRouter(): Router {
    return this.router;
  }
}

export function createCorporateRoutes(): Router {
  const routes = new CorporateRoutes();
  return routes.getRouter();
}