// modules/communication/HubtelProvider.ts
// Real outbound dispatch for SMS and WhatsApp via Hubtel.
//
// Delivery only happens when HUBTEL_ENABLED=true AND credentials are present.
// Otherwise dispatch() reports "skipped" and the message stays queued (PENDING),
// so the app works end-to-end before live credentials are added.
import axios from 'axios';
import { config } from '../../config';

export interface DispatchResult {
  // 'sent'    -> handed to provider successfully (providerMessageId set)
  // 'failed'  -> provider rejected / network error (failureReason set)
  // 'skipped' -> Hubtel disabled or not configured; leave as PENDING
  outcome: 'sent' | 'failed' | 'skipped';
  providerMessageId?: string;
  failureReason?: string;
  cost?: number;
}

// E.164-ish normalisation for Ghana numbers (Hubtel expects msisdn without '+').
const normaliseMsisdn = (raw: string): string => {
  let n = (raw || '').replace(/[\s\-()]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = `233${n.slice(1)}`; // local 0XXXXXXXXX -> 233XXXXXXXXX
  return n;
};

const isSmsConfigured = (): boolean =>
  config.hubtel.ENABLED && !!config.hubtel.CLIENT_ID && !!config.hubtel.CLIENT_SECRET && !!config.hubtel.SENDER_ID;

const isWhatsAppConfigured = (): boolean =>
  config.hubtel.ENABLED && !!config.hubtel.CLIENT_ID && !!config.hubtel.CLIENT_SECRET &&
  !!config.hubtel.WHATSAPP_URL && !!config.hubtel.WHATSAPP_FROM;

export class HubtelProvider {
  static smsReady = isSmsConfigured;
  static whatsappReady = isWhatsAppConfigured;

  static async sendSMS(to: string, content: string): Promise<DispatchResult> {
    if (!isSmsConfigured()) return { outcome: 'skipped' };

    try {
      const res = await axios.get(config.hubtel.SMS_URL, {
        params: {
          clientid: config.hubtel.CLIENT_ID,
          clientsecret: config.hubtel.CLIENT_SECRET,
          from: config.hubtel.SENDER_ID,
          to: normaliseMsisdn(to),
          content,
        },
        timeout: 15000,
      });

      // Hubtel returns { status: 0, messageId, rate, ... } on success (0 = OK).
      const data: any = res.data || {};
      const ok = data.status === 0 || data.status === '0' || data.Status === 0;
      if (ok) {
        return {
          outcome: 'sent',
          providerMessageId: data.messageId || data.MessageId,
          cost: typeof data.rate === 'number' ? data.rate : undefined,
        };
      }
      return { outcome: 'failed', failureReason: data.statusDescription || data.message || `Hubtel status ${data.status}` };
    } catch (err: any) {
      const reason = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      return { outcome: 'failed', failureReason: `Hubtel SMS error: ${reason}` };
    }
  }

  static async sendWhatsApp(to: string, content: string, metadata?: Record<string, any>): Promise<DispatchResult> {
    if (!isWhatsAppConfigured()) return { outcome: 'skipped' };

    try {
      // Hubtel WhatsApp messaging API. Template/body payload depends on the
      // account's approved templates; metadata.templateName/templateArgs can carry them.
      const res = await axios.post(
        config.hubtel.WHATSAPP_URL,
        {
          from: config.hubtel.WHATSAPP_FROM,
          to: normaliseMsisdn(to),
          type: metadata?.templateName ? 'template' : 'text',
          ...(metadata?.templateName
            ? { template: { name: metadata.templateName, arguments: metadata.templateArgs || [] } }
            : { text: { body: content } }),
        },
        {
          auth: { username: config.hubtel.CLIENT_ID, password: config.hubtel.CLIENT_SECRET },
          timeout: 15000,
        }
      );

      const data: any = res.data || {};
      const id = data.messageId || data.MessageId || data?.data?.id;
      if (id || res.status < 300) {
        return { outcome: 'sent', providerMessageId: id };
      }
      return { outcome: 'failed', failureReason: data.message || `Hubtel WhatsApp status ${res.status}` };
    } catch (err: any) {
      const reason = err?.response?.data ? JSON.stringify(err.response.data) : err.message;
      return { outcome: 'failed', failureReason: `Hubtel WhatsApp error: ${reason}` };
    }
  }
}
