import { Router } from 'express';
import { CommunicationController } from './CommunicationController';
import { authenticate, authorize } from '../../middleware/auth';

export class CommunicationRoutes {
  private router: Router;
  private communicationController: CommunicationController;

  constructor() {
    this.router = Router();
    this.communicationController = new CommunicationController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // SMS Routes
    this.router.post(
      '/sms',
      authenticate,
      authorize(['admin', 'communication_manager', 'receptionist']),
      this.communicationController.sendSMS.bind(this.communicationController)
    );

    // WhatsApp Routes
    this.router.post(
      '/whatsapp',
      authenticate,
      authorize(['admin', 'communication_manager', 'receptionist']),
      this.communicationController.sendWhatsApp.bind(this.communicationController)
    );

    // Bulk Messaging
    this.router.post(
      '/bulk',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.sendBulkMessage.bind(this.communicationController)
    );

    // Template Management
    this.router.get(
      '/templates',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.getTemplates.bind(this.communicationController)
    );

    this.router.post(
      '/templates',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.createTemplate.bind(this.communicationController)
    );

    this.router.put(
      '/templates/:id',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.updateTemplate.bind(this.communicationController)
    );

    this.router.delete(
      '/templates/:id',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.deleteTemplate.bind(this.communicationController)
    );

    // History & Statistics
    this.router.get(
      '/history',
      authenticate,
      authorize(['admin', 'communication_manager']),
      this.communicationController.getMessageHistory.bind(this.communicationController)
    );

    this.router.get(
      '/stats',
      authenticate,
      authorize(['admin', 'communication_manager']),
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
