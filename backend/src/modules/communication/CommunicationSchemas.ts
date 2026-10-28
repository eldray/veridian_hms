import { z } from 'zod';
import { CommunicationType } from '@prisma/client';

// `.loose()` keeps provider-specific extras (metadata, variables) that the
// repository forwards untouched, so validation does not silently drop them.

const recipient = z.string().trim().min(1, 'Recipient is required').max(32, 'Recipient is too long');
const messageBody = z.string().trim().max(5000, 'Message is too long').nullish();
const templateId = z.string().trim().min(1, 'Template id is required').max(64).nullish();
const variables = z.record(z.string(), z.unknown()).optional();
const metadata = z.record(z.string(), z.unknown()).optional();

const hasContent = (value: { message?: string | null; templateId?: string | null }) =>
  Boolean((value.message && value.message.length > 0) || value.templateId);

const contentIssue = {
  message: 'Either message or templateId is required',
  path: ['message'],
};

const outbound = z
  .object({
    recipient,
    message: messageBody,
    templateId,
    variables,
    metadata,
  })
  .loose()
  .refine(hasContent, contentIssue);

export const sendMessageSchema = outbound;

export const sendBulkMessageSchema = z
  .object({
    channelType: z.enum(['SMS', 'WHATSAPP']),
    recipients: z
      .array(recipient)
      .min(1, 'At least one recipient is required')
      .max(10000, 'Too many recipients in one batch'),
    message: messageBody,
    templateId,
    variables,
    metadata,
  })
  .loose()
  .refine(hasContent, contentIssue);

export const createTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'Template name is required').max(120),
    body: z.string().trim().min(1, 'Template body is required').max(5000),
    channelType: z.enum(['SMS', 'WHATSAPP']),
    type: z.nativeEnum(CommunicationType).optional(),
    subject: z.string().trim().max(200).nullish(),
    variables: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .loose();

// Partial updates: every field is optional, but present fields still validate.
export const updateTemplateSchema = createTemplateSchema.partial();
