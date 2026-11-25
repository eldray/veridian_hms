import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditAction } from '@prisma/client';

vi.mock('../src/services/auditChain', () => ({
  appendAuditLog: vi.fn(),
}));

import { appendAuditLog } from '../src/services/auditChain';
import { auditWrites } from '../src/middleware/auditWrites';

const recordId = 'c12345678901234567890';

function buildResponse(statusCode = 201) {
  const response: any = {
    statusCode,
    sent: undefined,
    json: vi.fn(function (this: any, body: any) {
      this.sent = body;
      return this;
    }),
  };
  return response;
}

describe('automatic write auditing', () => {
  beforeEach(() => {
    vi.mocked(appendAuditLog).mockReset();
  });

  it('records the audit event without retaining billing request or response payloads', async () => {
    let auditSaved = false;
    vi.mocked(appendAuditLog).mockImplementation(async () => {
      auditSaved = true;
      return {} as any;
    });

    const req: any = {
      method: 'POST',
      originalUrl: `/api/bills/${recordId}/payments`,
      url: `/api/bills/${recordId}/payments`,
      body: { amount: 100, password: 'must-not-be-stored' },
      user: { id: 'cashier-1' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'audit-test' },
    };
    const res = buildResponse();
    const originalJson = res.json;
    let responseSentAfterAudit = false;
    originalJson.mockImplementation(function (this: any, body: any) {
      responseSentAfterAudit = auditSaved;
      this.sent = body;
      return this;
    });

    auditWrites({} as any)(req, res, vi.fn());
    const body = { success: true, data: { id: recordId, amount: 100, status: 'paid' } };
    res.json(body);

    await vi.waitFor(() => expect(originalJson).toHaveBeenCalledOnce());

    expect(responseSentAfterAudit).toBe(true);
    expect(appendAuditLog).toHaveBeenCalledOnce();
    const entry = vi.mocked(appendAuditLog).mock.calls[0][1];
    expect(entry).toMatchObject({
      entityType: 'Bill',
      entityId: recordId,
      action: AuditAction.create,
      performedById: 'cashier-1',
      newState: undefined,
      metadata: {
        snapshotSource: 'omitted_sensitive_or_unreviewed_topic',
      },
    });
    expect(JSON.stringify(entry)).not.toContain('must-not-be-stored');
    expect(JSON.stringify(entry)).not.toContain('100');
  });

  it('still sends the already-committed API result if audit storage is unavailable', async () => {
    vi.mocked(appendAuditLog).mockRejectedValue(new Error('audit database unavailable'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const req: any = {
      method: 'PATCH',
      originalUrl: `/api/bills/${recordId}`,
      url: `/api/bills/${recordId}`,
      body: { notes: 'updated' },
      user: { id: 'accounts-1' },
      ip: '127.0.0.1',
      headers: {},
    };
    const res = buildResponse(200);

    auditWrites({} as any)(req, res, vi.fn());
    const body = { success: true, data: { id: recordId, notes: 'updated' } };
    res.json(body);

    await vi.waitFor(() => expect(res.json).toBeDefined());
    await vi.waitFor(() => expect(res.sent).toEqual(body));
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does not write audit entries for failed API responses', () => {
    const req: any = {
      method: 'POST',
      originalUrl: '/api/bills',
      url: '/api/bills',
      body: { amount: -1 },
      user: { id: 'cashier-1' },
      headers: {},
    };
    const res = buildResponse(400);
    auditWrites({} as any)(req, res, vi.fn());
    res.json({ success: false, message: 'invalid amount' });
    expect(appendAuditLog).not.toHaveBeenCalled();
    expect(res.sent).toEqual({ success: false, message: 'invalid amount' });
  });
});
