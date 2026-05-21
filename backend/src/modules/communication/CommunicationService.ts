// modules/communication/CommunicationService.ts
import { CommunicationRepository } from './CommunicationRepository';
import { 
  SendSMSDTO, 
  SendWhatsAppDTO,
  SendBulkMessageDTO,
  CommunicationTemplateDTO,
  CommunicationHistoryFilters
} from './CommunicationTypes';

export class CommunicationService {
  private communicationRepository: CommunicationRepository;

  constructor() {
    this.communicationRepository = new CommunicationRepository();
  }

  async sendSMS(dto: SendSMSDTO) {
    return this.communicationRepository.sendSMS(dto);
  }

  async sendWhatsApp(dto: SendWhatsAppDTO) {
    return this.communicationRepository.sendWhatsApp(dto);
  }

  async sendBulkMessage(dto: SendBulkMessageDTO) {
    if (!dto.recipients || dto.recipients.length === 0) {
      throw new Error('At least one recipient is required for bulk messaging');
    }
    if (!dto.message && !dto.templateId) {
      throw new Error('Either message or templateId is required');
    }
    return this.communicationRepository.sendBulkMessage(dto);
  }

  async getTemplates(channelType?: string) {
    return this.communicationRepository.getTemplates(channelType);
  }

  async createTemplate(dto: CommunicationTemplateDTO) {
    if (!dto.name || !dto.body) {
      throw new Error('Name and body are required for template');
    }
    return this.communicationRepository.createTemplate(dto);
  }

  async updateTemplate(id: string, dto: CommunicationTemplateDTO) {
    return this.communicationRepository.updateTemplate(id, dto);
  }

  async deleteTemplate(id: string) {
    return this.communicationRepository.deleteTemplate(id);
  }

  async getMessageHistory(filters: CommunicationHistoryFilters) {
    return this.communicationRepository.getMessageHistory(filters);
  }

  async getMessageStats(startDate?: string, endDate?: string) {
    return this.communicationRepository.getMessageStats(startDate, endDate);
  }
}