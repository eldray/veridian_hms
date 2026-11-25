import { PrismaClient } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { CommunicationRepository } from './CommunicationRepository';
import { 
  SendSMSDTO, 
  SendWhatsAppDTO,
  SendBulkMessageDTO,
  CommunicationTemplateDTO,
  CommunicationHistoryFilters
} from './CommunicationTypes';

export class CommunicationService extends BaseService {
  private repository: CommunicationRepository;

  constructor(prisma: PrismaClient) {
    super('CommunicationService');
    this.repository = new CommunicationRepository(prisma);
  }

  async sendSMS(dto: SendSMSDTO) {
    this.logInfo('Sending SMS', { recipient: dto.recipient });
    return this.repository.sendSMS(dto);
  }

  async sendWhatsApp(dto: SendWhatsAppDTO) {
    this.logInfo('Sending WhatsApp', { recipient: dto.recipient });
    return this.repository.sendWhatsApp(dto);
  }

  async sendBulkMessage(dto: SendBulkMessageDTO) {
    if (!dto.recipients || dto.recipients.length === 0) {
      throw new Error('At least one recipient is required for bulk messaging');
    }
    if (!dto.message && !dto.templateId) {
      throw new Error('Either message or templateId is required');
    }
    this.logInfo('Sending bulk message', { channel: dto.channelType, count: dto.recipients.length });
    return this.repository.sendBulkMessage(dto);
  }

  async getTemplates(channelType?: string) {
    return this.repository.getTemplates(channelType);
  }

  async createTemplate(dto: CommunicationTemplateDTO) {
    if (!dto.name || !dto.body) {
      throw new Error('Name and body are required for template');
    }
    return this.repository.createTemplate(dto);
  }

  async updateTemplate(id: string, dto: CommunicationTemplateDTO) {
    return this.repository.updateTemplate(id, dto);
  }

  async deleteTemplate(id: string) {
    return this.repository.deleteTemplate(id);
  }

  async getMessageHistory(filters: CommunicationHistoryFilters) {
    return this.repository.getMessageHistory(filters);
  }

  async getMessageStats(startDate?: string, endDate?: string) {
    return this.repository.getMessageStats(startDate, endDate);
  }
}