import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { HubtelProvider, DispatchResult } from './HubtelProvider';

export class CommunicationRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'communicationLog');
  }

  // Apply a provider dispatch result to a queued log row.
  // 'skipped' (provider disabled/unconfigured) leaves the row as PENDING.
  private async applyDispatch(logId: string, result: DispatchResult) {
    if (result.outcome === 'skipped') return;
    if (result.outcome === 'sent') {
      await this.getModel().update({
        where: { id: logId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          providerMessageId: result.providerMessageId ?? null,
          ...(result.cost !== undefined ? { cost: result.cost } : {}),
        },
      });
    } else {
      await this.getModel().update({
        where: { id: logId },
        data: { status: 'FAILED', failedAt: new Date(), failureReason: result.failureReason ?? 'Unknown error' },
      });
    }
  }

  private async getOrCreateChannel(name: string, provider: string) {
    let channel = await this.prisma.communicationChannel.findFirst({ where: { name } });
    if (!channel) {
      channel = await this.prisma.communicationChannel.create({
        data: { name, provider, isActive: true, settings: {} }
      });
    }
    return channel;
  }

  private parseTemplate(template: string, variables: Record<string, any>): string {
    return Object.entries(variables).reduce((msg, [key, value]) => {
      return msg.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, template);
  }

  async sendSMS(dto: any) {
    const template = dto.templateId ? await this.prisma.communicationTemplate.findUnique({ where: { id: dto.templateId } }) : null;
    const message = template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message;
    const channel = await this.getOrCreateChannel('SMS Gateway', 'Hubtel');

    const log = await this.getModel().create({
      data: {
        channelId: channel.id, templateId: dto.templateId, recipient: dto.recipient,
        message, status: 'PENDING', metadata: dto.metadata || {}
      }
    });

    // Attempt real delivery (no-op + stays PENDING if Hubtel isn't configured).
    const result = await HubtelProvider.sendSMS(dto.recipient, message);
    await this.applyDispatch(log.id, result);

    return this.getModel().findUnique({ where: { id: log.id } });
  }

  async sendWhatsApp(dto: any) {
    const template = dto.templateId ? await this.prisma.communicationTemplate.findUnique({ where: { id: dto.templateId } }) : null;
    const message = template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message;
    const channel = await this.getOrCreateChannel('WhatsApp Business', 'Hubtel');

    const log = await this.getModel().create({
      data: {
        channelId: channel.id, templateId: dto.templateId, recipient: dto.recipient,
        message, status: 'PENDING', metadata: dto.metadata || {}
      }
    });

    const result = await HubtelProvider.sendWhatsApp(dto.recipient, message, dto.metadata || {});
    await this.applyDispatch(log.id, result);

    return this.getModel().findUnique({ where: { id: log.id } });
  }

  async sendBulkMessage(dto: any) {
    const channel = dto.channelType === 'WHATSAPP' 
      ? await this.getOrCreateChannel('WhatsApp Business', 'Twilio')
      : await this.getOrCreateChannel('SMS Gateway', 'Twilio');

    const template = dto.templateId ? await this.prisma.communicationTemplate.findUnique({ where: { id: dto.templateId } }) : null;

    const messages = dto.recipients.map((recipient: string) => ({
      channelId: channel.id, templateId: dto.templateId, recipient,
      message: template ? this.parseTemplate(template.body, dto.variables || {}) : dto.message,
      status: 'PENDING' as const, metadata: dto.metadata || {}
    }));

    const result = await this.getModel().createMany({ data: messages });
    return { count: result.count };
  }

  async getTemplates(channelType?: string) {
    let channelId: string | undefined;
    if (channelType) {
      const channel = await this.prisma.communicationChannel.findFirst({
        where: { name: channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'SMS Gateway' }
      });
      channelId = channel?.id;
    }

    return this.prisma.communicationTemplate.findMany({
      where: channelId ? { channelId } : {},
      include: { channel: true },
      orderBy: { name: 'asc' }
    });
  }

  async createTemplate(dto: any) {
    const channel = dto.channelType === 'WHATSAPP'
      ? await this.getOrCreateChannel('WhatsApp Business', 'Twilio')
      : await this.getOrCreateChannel('SMS Gateway', 'Twilio');

    return this.prisma.communicationTemplate.create({
      data: {
        name: dto.name, body: dto.body, type: dto.type || 'GENERAL_NOTIFICATION',
        subject: dto.subject, variables: dto.variables || [],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        channelId: channel.id
      },
      include: { channel: true }
    });
  }

  async updateTemplate(id: string, dto: any) {
    return this.prisma.communicationTemplate.update({
      where: { id },
      data: { name: dto.name, body: dto.body, type: dto.type, subject: dto.subject, variables: dto.variables, isActive: dto.isActive }
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.communicationTemplate.delete({ where: { id } });
  }

  // ✅ Uses BaseRepository's built-in pagination helper
  async getMessageHistory(filters: any) {
    const { recipient, status, channelType, startDate, endDate, page = 1, limit = 20 } = filters;
    
    const where: any = {};
    if (recipient) where.recipient = { contains: recipient, mode: 'insensitive' };
    if (status) where.status = status;
    if (channelType) {
      const channel = await this.prisma.communicationChannel.findFirst({
        where: { name: channelType === 'WHATSAPP' ? 'WhatsApp Business' : 'SMS Gateway' }
      });
      if (channel) where.channelId = channel.id;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const result = await this.findManyWithPagination({
      where,
      include: { channel: true, template: true },
      orderBy: { createdAt: 'desc' },
      page: Number(page),
      limit: Number(limit)
    });

    return {
      data: result.data,
      pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
    };
  }

  // ✅ Optimized: All 7 count queries run in parallel via Promise.all
  async getMessageStats(startDate?: string, endDate?: string) {
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const smsChannel = await this.prisma.communicationChannel.findFirst({ where: { name: 'SMS Gateway' } });
    const whatsappChannel = await this.prisma.communicationChannel.findFirst({ where: { name: 'WhatsApp Business' } });

    const [total, sent, delivered, failed, pending, smsCount, whatsappCount] = await Promise.all([
      this.getModel().count({ where }),
      this.getModel().count({ where: { ...where, status: 'SENT' } }),
      this.getModel().count({ where: { ...where, status: 'DELIVERED' } }),
      this.getModel().count({ where: { ...where, status: 'FAILED' } }),
      this.getModel().count({ where: { ...where, status: 'PENDING' } }),
      smsChannel ? this.getModel().count({ where: { ...where, channelId: smsChannel.id } }) : Promise.resolve(0),
      whatsappChannel ? this.getModel().count({ where: { ...where, channelId: whatsappChannel.id } }) : Promise.resolve(0),
    ]);

    return {
      total, sent, delivered, failed, pending, smsCount, whatsappCount,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100) : 0
    };
  }
}