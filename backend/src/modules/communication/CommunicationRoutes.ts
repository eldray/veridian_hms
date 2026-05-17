import { Router } from 'express';
import { CommunicationController } from './CommunicationController';
import { protect as authenticate, requireRole as authorize } from '../../middleware/authMiddleware';

export class CommunicationRoutes {
  private router: Router;
  private communicationController: CommunicationController;

  constructor() {
    this.router = Router();
    this.communicationController = new CommunicationController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // SMS Routes - Allow more staff: doctors, nurses, midwives can also send messages
    this.router.post(
      '/sms',
      authenticate,
      authorize(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']),
      this.communicationController.sendSMS.bind(this.communicationController)
    );

    // WhatsApp Routes - Allow more staff
    this.router.post(
      '/whatsapp',
      authenticate,
      authorize(['admin', 'accounts', 'records', 'doctor', 'nurse', 'midwife']),
      this.communicationController.sendWhatsApp.bind(this.communicationController)
    );

    // Bulk Messaging - Keep restricted to admin and accounts
    this.router.post(
      '/bulk',
      authenticate,
      authorize(['admin', 'accounts']),
      this.communicationController.sendBulkMessage.bind(this.communicationController)
    );

    // Template Management - Keep restricted to admin and accounts
    this.router.get(
      '/templates',
      authenticate,
      authorize(['admin', 'accounts']),
      this.communicationController.getTemplates.bind(this.communicationController)
    );

    this.router.post(
      '/templates',
      authenticate,
      authorize(['admin', 'accounts']),
      this.communicationController.createTemplate.bind(this.communicationController)
    );

    this.router.put(
      '/templates/:id',
      authenticate,
      authorize(['admin', 'accounts']),
      this.communicationController.updateTemplate.bind(this.communicationController)
    );

    this.router.delete(
      '/templates/:id',
      authenticate,
      authorize(['admin', 'accounts']),
      this.communicationController.deleteTemplate.bind(this.communicationController)
    );

    // History & Statistics - Allow admin, accounts, and medical staff to view
    this.router.get(
      '/history',
      authenticate,
      authorize(['admin', 'accounts', 'doctor', 'nurse', 'midwife']),
      this.communicationController.getMessageHistory.bind(this.communicationController)
    );

    this.router.get(
      '/stats',
      authenticate,
      authorize(['admin', 'accounts', 'doctor', 'nurse', 'midwife']),
      this.communicationController.getMessageStats.bind(this.communicationController)
    );
  }

  getRouter(): Router {
    return this.router;
  }
}

export function createCommunicationRoutes(): Router {
  const routes = new CommunicationRoutes();
  return routes.getRouter();
}