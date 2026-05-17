import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../utils/baseController';
import { CommunicationService } from './CommunicationService';
import { 
  SendSMSDTO, 
  SendWhatsAppDTO,
  SendBulkMessageDTO,
  CommunicationTemplateDTO
} from './CommunicationTypes';

export class CommunicationController extends BaseController {
  private communicationService: CommunicationService;

  constructor() {
    super();
    this.communicationService = new CommunicationService();
    this.sendSMS = this.sendSMS.bind(this);
    this.sendWhatsApp = this.sendWhatsApp.bind(this);
    this.sendBulkMessage = this.sendBulkMessage.bind(this);
    this.getTemplates = this.getTemplates.bind(this);
    this.createTemplate = this.createTemplate.bind(this);
    this.updateTemplate = this.updateTemplate.bind(this);
    this.deleteTemplate = this.deleteTemplate.bind(this);
    this.getMessageHistory = this.getMessageHistory.bind(this);
    this.getMessageStats = this.getMessageStats.bind(this);
  }

  async sendSMS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: SendSMSDTO = req.body;
      const result = await this.communicationService.sendSMS(dto);
      this.handleSuccess(res, 201, 'SMS sent successfully', result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async sendWhatsApp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: SendWhatsAppDTO = req.body;
      const result = await this.communicationService.sendWhatsApp(dto);
      this.handleSuccess(res, 201, 'WhatsApp message sent successfully', result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async sendBulkMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: SendBulkMessageDTO = req.body;
      const result = await this.communicationService.sendBulkMessage(dto);
      this.handleSuccess(res, 201, 'Bulk messages queued successfully', result);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { channelType } = req.query;
      const templates = await this.communicationService.getTemplates(channelType as string);
      this.handleSuccess(res, 200, 'Templates retrieved successfully', templates);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CommunicationTemplateDTO = req.body;
      const template = await this.communicationService.createTemplate(dto);
      this.handleSuccess(res, 201, 'Template created successfully', template);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const dto: CommunicationTemplateDTO = req.body;
      const template = await this.communicationService.updateTemplate(id, dto);
      this.handleSuccess(res, 200, 'Template updated successfully', template);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await this.communicationService.deleteTemplate(id);
      this.handleSuccess(res, 200, 'Template deleted successfully');
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getMessageHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query;
      const history = await this.communicationService.getMessageHistory(filters);
      this.handleSuccess(res, 200, 'Message history retrieved successfully', history);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getMessageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const stats = await this.communicationService.getMessageStats(
        startDate as string,
        endDate as string
      );
      this.handleSuccess(res, 200, 'Message statistics retrieved successfully', stats);
    } catch (error) {
      this.handleError(res, error);
    }
  }
}
