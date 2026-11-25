import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { BaseController } from '../../shared/base/BaseController';
import { CommunicationService } from './CommunicationService';
import { HubtelProvider } from './HubtelProvider';
import { AuthRequest } from '../../middleware/authMiddleware';

export class CommunicationController extends BaseController {
  private service: CommunicationService;

  constructor(prisma: PrismaClient) {
    super();
    this.service = new CommunicationService(prisma);
  }

  sendSMS = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.sendSMS(req.body);
    return this.created(res, result, 'SMS sent successfully');
  });

  sendWhatsApp = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.sendWhatsApp(req.body);
    return this.created(res, result, 'WhatsApp message sent successfully');
  });

  sendBulkMessage = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const result = await this.service.sendBulkMessage(req.body);
    return this.created(res, result, 'Bulk messages queued successfully');
  });

  // Reports whether real SMS/WhatsApp delivery is currently active.
  getProviderStatus = this.asyncHandler(async (_req: AuthRequest, res: Response) => {
    return this.ok(res, {
      provider: 'Hubtel',
      smsEnabled: HubtelProvider.smsReady(),
      whatsappEnabled: HubtelProvider.whatsappReady(),
    }, 'Communication provider status');
  });

  getTemplates = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { channelType } = req.query;
    const templates = await this.service.getTemplates(channelType as string);
    return this.ok(res, templates, 'Templates retrieved successfully');
  });

  createTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await this.service.createTemplate(req.body);
    return this.created(res, template, 'Template created successfully');
  });

  updateTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await this.service.updateTemplate(req.params.id, req.body);
    return this.ok(res, template, 'Template updated successfully');
  });

  deleteTemplate = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    await this.service.deleteTemplate(req.params.id);
    return this.ok(res, null, 'Template deleted successfully');
  });

  getMessageHistory = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    // ✅ Use BaseController's safe pagination parser
    const { page, limit } = this.getPaginationParams(req);
    const filters = { ...req.query, page, limit };
    
    const history = await this.service.getMessageHistory(filters);
    
    // ✅ Use BaseController's paginated response formatter
    return this.paginated(res, history.data, history.pagination, 'Message history retrieved successfully');
  });

  getMessageStats = this.asyncHandler(async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const stats = await this.service.getMessageStats(startDate as string, endDate as string);
    return this.ok(res, stats, 'Message statistics retrieved successfully');
  });
}