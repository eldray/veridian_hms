import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../utils/baseRepository';
import { 
  SendSMSDTO, 
  SendWhatsAppDTO,
  SendBulkMessageDTO,
  CommunicationTemplateDTO
} from './CommunicationTypes';

const prisma = new PrismaClient();

export class CommunicationRepository extends BaseRepository {
  async sendSMS(dto: SendSMSDTO) {
    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const message = template ? this.parseTemplate(template.content, dto.variables || {}) : dto.message;

    return prisma.communicationLog.create({
      data: {
        channelId: (await this.getSMSChannel()).id,
        templateId: dto.templateId,
        recipient: dto.recipient,
        message,
        status: 'PENDING',
        metadata: dto.metadata || {}
      }
    });
  }

  async sendWhatsApp(dto: SendWhatsAppDTO) {
    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const message = template ? this.parseTemplate(template.content, dto.variables || {}) : dto.message;

    return prisma.communicationLog.create({
      data: {
        channelId: (await this.getWhatsAppChannel()).id,
        templateId: dto.templateId,
        recipient: dto.recipient,
        message,
        status: 'PENDING',
        metadata: dto.metadata || {}
      }
    });
  }

  async sendBulkMessage(dto: SendBulkMessageDTO) {
    const channel = dto.channelType === 'WHATSAPP' 
      ? await this.getWhatsAppChannel()
      : await this.getSMSChannel();

    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const messages = dto.recipients.map(recipient => ({
      channelId: channel.id,
      templateId: dto.templateId,
      recipient,
      message: template ? this.parseTemplate(template.content, dto.variables || {}) : dto.message,
      status: 'PENDING' as const,
      metadata: dto.metadata || {}
    }));

    return prisma.communicationLog.createMany({
      data: messages
    });
  }

  async getTemplates(channelType?: string) {
    const where: any = {};
    if (channelType) {
      where.channelType = channelType;
    }

    return prisma.communicationTemplate.findMany({
      where,
      include: {
        channel: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async createTemplate(dto: CommunicationTemplateDTO) {
    const channel = dto.channelType === 'WHATSAPP'
      ? await this.getWhatsAppChannel()
      : await this.getSMSChannel();

    return prisma.communicationTemplate.create({
      data: {
        ...dto,
        channelId: channel.id,
        isActive: true
      },
      include: {
        channel: true
      }
    });
  }

  async updateTemplate(id: string, dto: CommunicationTemplateDTO) {
    return prisma.communicationTemplate.update({
      where: { id },
      data: dto
    });
  }

  async deleteTemplate(id: string) {
    return prisma.communicationTemplate.delete({
      where: { id }
    });
  }

  async getMessageHistory(filters: any) {
    const { recipient, status, channelType, startDate, endDate, page = 1, limit = 20 } = filters;
    
    const where: any = {};
    
    if (recipient) {
      where.recipient = { contains: recipient, mode: 'insensitive' };
    }
    
    if (status) {
      where.status = status;
    }
    
    if (channelType) {
      const channel = channelType === 'WHATSAPP' 
        ? await this.getWhatsAppChannel()
        : await this.getSMSChannel();
      where.channelId = channel.id;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        include: {
          channel: true,
          template: true
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.communicationLog.count({ where })
    ]);

    return {
      data: logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    };
  }

  async getMessageStats(startDate?: string, endDate?: string) {
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [total, sent, delivered, failed, smsCount, whatsappCount] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.communicationLog.count({ 
        where: { 
          ...where, 
          channel: { type: 'SMS' } 
        } 
      }),
      prisma.communicationLog.count({ 
        where: { 
          ...where, 
          channel: { type: 'WHATSAPP' } 
        } 
      })
    ]);

    return {
      total,
      sent,
      delivered,
      failed,
      pending: total - sent - delivered - failed,
      smsCount,
      whatsappCount,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
    };
  }

  private async getSMSChannel() {
    let channel = await prisma.communicationChannel.findFirst({
      where: { type: 'SMS' }
    });

    if (!channel) {
      channel = await prisma.communicationChannel.create({
        data: {
          name: 'SMS Gateway',
          type: 'SMS',
          isEnabled: true,
          config: {}
        }
      });
    }

    return channel;
  }

  private async getWhatsAppChannel() {
    let channel = await prisma.communicationChannel.findFirst({
      where: { type: 'WHATSAPP' }
    });

    if (!channel) {
      channel = await prisma.communicationChannel.create({
        data: {
          name: 'WhatsApp Business',
          type: 'WHATSAPP',
          isEnabled: true,
          config: {}
        }
      });
    }

    return channel;
  }

  private parseTemplate(template: string, variables: Record<string, any>): string {
    return Object.entries(variables).reduce((message, [key, value]) => {
      return message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, template);
  }
}
