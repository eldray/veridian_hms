import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validateBody } from '../src/middleware/validate';
import {
  createTemplateSchema,
  sendBulkMessageSchema,
  sendMessageSchema,
  updateTemplateSchema,
} from '../src/modules/communication/CommunicationSchemas';

const runMiddleware = (schema: z.ZodTypeAny, body: unknown) => {
  const req = { body } as any;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as any;
  const next = vi.fn();
  validateBody(schema)(req, res, next);
  return { req, res, next };
};

describe('communication request validation', () => {
  it('accepts an SMS with a trimmed recipient and keeps extra provider fields', () => {
    const { req, next } = runMiddleware(sendMessageSchema, {
      recipient: '  0244000000  ',
      message: 'Your appointment is tomorrow',
      metadata: { source: 'sms-page' },
      providerOptions: { unicode: true },
    });

    expect(next).toHaveBeenCalledOnce();
    expect(req.body.recipient).toBe('0244000000');
    expect(req.body.metadata).toEqual({ source: 'sms-page' });
    // Unknown-but-harmless extras must survive for provider passthrough.
    expect(req.body.providerOptions).toEqual({ unicode: true });
  });

  it('accepts a template-backed message without a body', () => {
    const { next } = runMiddleware(sendMessageSchema, {
      recipient: '0244000000',
      templateId: 'tmpl_1',
      variables: { name: 'Ama' },
    });

    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects a blank recipient or a message with no content', () => {
    const blankRecipient = runMiddleware(sendMessageSchema, { recipient: '   ', message: 'Hi' });
    expect(blankRecipient.next).not.toHaveBeenCalled();
    expect(blankRecipient.res.status).toHaveBeenCalledWith(400);

    const noContent = runMiddleware(sendMessageSchema, { recipient: '0244000000', message: '   ' });
    expect(noContent.next).not.toHaveBeenCalled();
    expect(noContent.res.status).toHaveBeenCalledWith(400);
    expect(noContent.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'message' })] }),
    );
  });

  it('rejects a bulk send without recipients or content', () => {
    const noRecipients = runMiddleware(sendBulkMessageSchema, {
      channelType: 'SMS',
      recipients: [],
      message: 'Hello',
    });
    expect(noRecipients.next).not.toHaveBeenCalled();
    expect(noRecipients.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'recipients' })] }),
    );

    const noContent = runMiddleware(sendBulkMessageSchema, {
      channelType: 'WHATSAPP',
      recipients: ['0244000000'],
    });
    expect(noContent.next).not.toHaveBeenCalled();
    expect(noContent.res.status).toHaveBeenCalledWith(400);

    const badChannel = runMiddleware(sendBulkMessageSchema, {
      channelType: 'EMAIL',
      recipients: ['0244000000'],
      message: 'Hello',
    });
    expect(badChannel.next).not.toHaveBeenCalled();
  });

  it('requires a name, body and channel for a new template', () => {
    const valid = runMiddleware(createTemplateSchema, {
      name: '  Reminder  ',
      body: 'Hello {{name}}',
      channelType: 'SMS',
      type: 'APPOINTMENT_REMINDER',
      variables: ['name'],
    });
    expect(valid.next).toHaveBeenCalledOnce();
    expect(valid.req.body.name).toBe('Reminder');

    const missingBody = runMiddleware(createTemplateSchema, {
      name: 'Reminder',
      channelType: 'SMS',
    });
    expect(missingBody.next).not.toHaveBeenCalled();
    expect(missingBody.res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: [expect.objectContaining({ field: 'body' })] }),
    );

    const badType = runMiddleware(createTemplateSchema, {
      name: 'Reminder',
      body: 'Hello',
      channelType: 'SMS',
      type: 'NOT_A_TYPE',
    });
    expect(badType.next).not.toHaveBeenCalled();
  });

  it('allows a partial template update but still validates present fields', () => {
    const partial = runMiddleware(updateTemplateSchema, { isActive: false });
    expect(partial.next).toHaveBeenCalledOnce();

    const blankName = runMiddleware(updateTemplateSchema, { name: '   ' });
    expect(blankName.next).not.toHaveBeenCalled();
    expect(blankName.res.status).toHaveBeenCalledWith(400);
  });
});
