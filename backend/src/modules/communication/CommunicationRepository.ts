// modules/communication/CommunicationRepository.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommunicationRepository {
  
  async sendSMS(dto: any) {
    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const message = template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message;

    // Get or create SMS channel
    let channel = await prisma.communicationChannel.findFirst({
      where: { name: 'SMS Gateway' }
    });

    if (!channel) {
      channel = await prisma.communicationChannel.create({
        data: {
          name: 'SMS Gateway',
          provider: 'Twilio',
          isActive: true,
          settings: {}
        }
      });
    }

    return prisma.communicationLog.create({
      data: {
        channelId: channel.id,
        templateId: dto.templateId,
        recipient: dto.recipient,
        message,
        status: 'PENDING',
        metadata: dto.metadata || {}
      }
    });
  }

  async sendWhatsApp(dto: any) {
    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const message = template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message;

    // Get or create WhatsApp channel
    let channel = await prisma.communicationChannel.findFirst({
      where: { name: 'WhatsApp Business' }
    });

    if (!channel) {
      channel = await prisma.communicationChannel.create({
        data: {
          name: 'WhatsApp Business',
          provider: 'Twilio',
          isActive: true,
          settings: {}
        }
      });
    }

    return prisma.communicationLog.create({
      data: {
        channelId: channel.id,
        templateId: dto.templateId,
        recipient: dto.recipient,
        message,
        status: 'PENDING',
        metadata: dto.metadata || {}
      }
    });
  }

  async sendBulkMessage(dto: any) {
    const channel = dto.channelType === 'WHATSAPP' 
      ? await prisma.communicationChannel.findFirst({ where: { name: 'WhatsApp Business' } })
      : await prisma.communicationChannel.findFirst({ where: { name: 'SMS Gateway' } });

    if (!channel) {
      throw new Error('Communication channel not configured');
    }

    const template = dto.templateId ? await prisma.communicationTemplate.findUnique({
      where: { id: dto.templateId }
    }) : null;

    const messages = dto.recipients.map(recipient => ({
      channelId: channel.id,
      templateId: dto.templateId,
      recipient,
      message: template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message,
      status: 'PENDING' as const,
      metadata: dto.metadata || {}
    }));

    const result = await prisma.communicationLog.createMany({
      data: messages
    });

    return { count: result.count };
  }

  async getTemplates(channelType?: string) {
    let channelId: string | undefined;
    
    if (channelType) {
      const channel = await prisma.communicationChannel.findFirst({
        where: { name: channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'SMS Gateway' }
      });
      channelId = channel?.id;
    }

    const where: any = {};
    if (channelId) {
      where.channelId = channelId;
    }

    return prisma.communicationTemplate.findMany({
      where,
      include: {
        channel: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async createTemplate(dto: any) {
    const channel = dto.channelType === 'WHATSAPP'
      ? await prisma.communicationChannel.findFirst({ where: { name: 'WhatsApp Business' } })
      : await prisma.communicationChannel.findFirst({ where: { name: 'SMS Gateway' } });

    if (!channel) {
      throw new Error(`Communication channel for ${dto.channelType} not configured`);
    }

    return prisma.communicationTemplate.create({
      data: {
        name: dto.name,
        body: dto.body,
        type: dto.type || 'GENERAL_NOTIFICATION',
        subject: dto.subject,
        variables: dto.variables || [],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        channelId: channel.id
      },
      include: {
        channel: true
      }
    });
  }

  async updateTemplate(id: string, dto: any) {
    return prisma.communicationTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        body: dto.body,
        type: dto.type,
        subject: dto.subject,
        variables: dto.variables,
        isActive: dto.isActive
      }
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
      const channel = await prisma.communicationChannel.findFirst({
        where: { name: channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'SMS Gateway' }
      });
      if (channel) {
        where.channelId = channel.id;
      }
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

    const [total, sent, delivered, failed, pending] = await Promise.all([
      prisma.communicationLog.count({ where }),
      prisma.communicationLog.count({ where: { ...where, status: 'SENT' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.communicationLog.count({ where: { ...where, status: 'PENDING' } })
    ]);

    // Get counts by channel type
    const smsChannel = await prisma.communicationChannel.findFirst({ where: { name: 'SMS Gateway' } });
    const whatsappChannel = await prisma.communicationChannel.findFirst({ where: { name: 'WhatsApp Business' } });

    const smsCount = smsChannel 
      ? await prisma.communicationLog.count({ where: { ...where, channelId: smsChannel.id } })
      : 0;
    
    const whatsappCount = whatsappChannel
      ? await prisma.communicationLog.count({ where: { ...where, channelId: whatsappChannel.id } })
      : 0;

    return {
      total,
      sent,
      delivered,
      failed,
      pending,
      smsCount,
      whatsappCount,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
    };
  }

  private parseTemplate(template: string, variables: Record<string, any>): string {
    return Object.entries(variables).reduce((message, [key, value]) => {
      return message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, template);
  }
}