// modules/communication/CommunicationController.ts
import { Response } from 'express';
import { BaseController } from '../../shared/base/BaseController';
import { CommunicationService } from './CommunicationService';
import { AuthRequest } from '../../middleware/authMiddleware';

export class CommunicationController extends BaseController {
  private communicationService: CommunicationService;

  constructor() {
    super();
    this.communicationService = new CommunicationService();
  }

  sendSMS = async (req: AuthRequest, res: Response) => {
    try {
      const dto = req.body;
      const result = await this.communicationService.sendSMS(dto);
      this.created(res, result, 'SMS sent successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  sendWhatsApp = async (req: AuthRequest, res: Response) => {
    try {
      const dto = req.body;
      const result = await this.communicationService.sendWhatsApp(dto);
      this.created(res, result, 'WhatsApp message sent successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  sendBulkMessage = async (req: AuthRequest, res: Response) => {
    try {
      const dto = req.body;
      const result = await this.communicationService.sendBulkMessage(dto);
      this.created(res, result, 'Bulk messages queued successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getTemplates = async (req: AuthRequest, res: Response) => {
    try {
      const { channelType } = req.query;
      const templates = await this.communicationService.getTemplates(channelType as string);
      this.ok(res, templates, 'Templates retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  createTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const dto = req.body;
      const template = await this.communicationService.createTemplate(dto);
      this.created(res, template, 'Template created successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  updateTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const dto = req.body;
      const template = await this.communicationService.updateTemplate(id, dto);
      this.ok(res, template, 'Template updated successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  deleteTemplate = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await this.communicationService.deleteTemplate(id);
      this.ok(res, null, 'Template deleted successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getMessageHistory = async (req: AuthRequest, res: Response) => {
    try {
      const filters = req.query;
      const history = await this.communicationService.getMessageHistory(filters);
      this.ok(res, history.data, 'Message history retrieved successfully', { pagination: history.pagination });
    } catch (error: any) {
      this.error(res, error);
    }
  };

  getMessageStats = async (req: AuthRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const stats = await this.communicationService.getMessageStats(
        startDate as string,
        endDate as string
      );
      this.ok(res, stats, 'Message statistics retrieved successfully');
    } catch (error: any) {
      this.error(res, error);
    }
  };
}