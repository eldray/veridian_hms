// modules/communication/CommunicationTypes.ts

export interface SendSMSDTO {
  recipient: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SendWhatsAppDTO {
  recipient: string;
  message?: string;
  templateId?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SendBulkMessageDTO {
  channelType: 'SMS' | 'WHATSAPP';
  recipients: string[];
  message?: string;
  templateId?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface CommunicationTemplateDTO {
  name: string;
  body: string;
  channelType: 'SMS' | 'WHATSAPP';
  type?: 'APPOINTMENT_REMINDER' | 'APPOINTMENT_CONFIRMATION' | 'LAB_RESULT_READY' | 'PRESCRIPTION_READY' | 'PAYMENT_REMINDER' | 'BILL_NOTIFICATION' | 'WELCOME_MESSAGE' | 'GENERAL_NOTIFICATION' | 'CUSTOM';
  subject?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface CommunicationLogResponse {
  id: string;
  channelId: string;
  templateId: string | null;
  recipient: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  metadata: any;
  cost: number | null;
  providerMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
  smsCount: number;
  whatsappCount: number;
  deliveryRate: number;
}

export interface CommunicationHistoryFilters {
  recipient?: string;
  status?: string;
  channelType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}