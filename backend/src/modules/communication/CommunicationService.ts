import { BaseService } from '../../utils/baseService';
import { CommunicationRepository } from './CommunicationRepository';
import { 
  SendSMSDTO, 
  SendWhatsAppDTO,
  SendBulkMessageDTO,
  CommunicationTemplateDTO
} from './CommunicationTypes';

export class CommunicationService extends BaseService {
  private communicationRepository: CommunicationRepository;

  constructor() {
    super();
    this.communicationRepository = new CommunicationRepository();
  }

  async sendSMS(dto: SendSMSDTO) {
    return this.communicationRepository.sendSMS(dto);
  }

  async sendWhatsApp(dto: SendWhatsAppDTO) {
    return this.communicationRepository.sendWhatsApp(dto);
  }

  async sendBulkMessage(dto: SendBulkMessageDTO) {
    return this.communicationRepository.sendBulkMessage(dto);
  }

  async getTemplates(channelType?: string) {
    return this.communicationRepository.getTemplates(channelType);
  }

  async createTemplate(dto: CommunicationTemplateDTO) {
    return this.communicationRepository.createTemplate(dto);
  }

  async updateTemplate(id: string, dto: CommunicationTemplateDTO) {
    return this.communicationRepository.updateTemplate(id, dto);
  }

  async deleteTemplate(id: string) {
    return this.communicationRepository.deleteTemplate(id);
  }

  async getMessageHistory(filters: any) {
    return this.communicationRepository.getMessageHistory(filters);
  }

  async getMessageStats(startDate?: string, endDate?: string) {
    return this.communicationRepository.getMessageStats(startDate, endDate);
  }
}
