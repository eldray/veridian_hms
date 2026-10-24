import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MomoPaymentService } from '../src/modules/momo/MomoPaymentService';

const baseIntent = {
  id: 'momo-intent-1',
  billId: 'bill-1',
  amount: 25,
  currency: 'GHS',
  payerPhone: '233241234567',
  providerReference: 'provider-reference-1',
  idempotencyKey: 'request-key-1',
  paymentIdempotencyKey: 'payment-key-1',
  initiatedById: 'cashier-1',
  status: 'pending',
  providerStatus: 'PENDING',
  providerTransactionId: null,
  paymentId: null,
  failureReason: null,
  createdAt: new Date('2026-10-24T09:00:00.000Z'),
  completedAt: null,
};

function providerResponse(status: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ status, ...extra }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('MomoPaymentService', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    MOMO_COLLECTION_SUBSCRIPTION_KEY: process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY,
    MOMO_USER_ID: process.env.MOMO_USER_ID,
    MOMO_CREDENTIAL_TOKEN: process.env.MOMO_CREDENTIAL_TOKEN,
    MOMO_API_USER: process.env.MOMO_API_USER,
    MOMO_API_KEY: process.env.MOMO_API_KEY,
    MOMO_BASE_URL: process.env.MOMO_BASE_URL,
    MOMO_TARGET_ENVIRONMENT: process.env.MOMO_TARGET_ENVIRONMENT,
  };

  beforeEach(() => {
    process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY = 'test-subscription-key';
    process.env.MOMO_USER_ID = 'test-user';
    process.env.MOMO_CREDENTIAL_TOKEN = 'test-credential';
    process.env.MOMO_BASE_URL = 'https://momo.test';
    process.env.MOMO_TARGET_ENVIRONMENT = 'sandbox';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  function setup(intent = { ...baseIntent }) {
    const prisma = {
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-1',
          billNumber: 'BILL-1001',
          balance: 100,
          status: 'pending',
        }),
      },
      momoPaymentIntent: {
        findUnique: vi.fn().mockResolvedValue(intent),
        update: vi.fn(async ({ data }: any) => ({ ...intent, ...data })),
      },
    } as any;
    const service = new MomoPaymentService(prisma);
    const addPayment = vi.fn().mockResolvedValue({ payment: { id: 'payment-1' } });
    (service as any).billing.addPaymentToBill = addPayment;
    return { prisma, service, addPayment };
  }

  it('does not expose internal idempotency keys or provider reference when reusing an attempt', async () => {
    const { service } = setup();

    const result = await service.initiate({
      billId: 'bill-1',
      amount: 25,
      payerPhone: '0241234567',
      idempotencyKey: 'request-key-1',
      userId: 'cashier-1',
    });

    expect(result.reused).toBe(true);
    expect(result.intent.id).toBe(baseIntent.id);
    expect(result.intent.status).toBe('pending');
    expect(result.intent).not.toHaveProperty('idempotencyKey');
    expect(result.intent).not.toHaveProperty('paymentIdempotencyKey');
    expect(result.intent).not.toHaveProperty('providerReference');
    expect(result.intent).not.toHaveProperty('initiatedById');
  });

  it('returns an existing idempotent attempt even after its payment changed the bill balance', async () => {
    const { service, prisma } = setup();
    prisma.bill.findUnique.mockResolvedValue({
      id: 'bill-1',
      billNumber: 'BILL-1001',
      balance: 0,
      status: 'paid',
    });

    const result = await service.initiate({
      billId: 'bill-1',
      amount: 25,
      payerPhone: '0241234567',
      idempotencyKey: 'request-key-1',
      userId: 'cashier-1',
    });

    expect(result.reused).toBe(true);
    expect(result.intent.id).toBe(baseIntent.id);
  });

  it('keeps a 5xx initiation outcome reconcilable instead of marking it failed', async () => {
    const createdIntent = {
      ...baseIntent,
      id: 'new-intent',
      status: 'initiating',
      providerStatus: null,
      idempotencyKey: 'new-request-key',
      providerReference: 'new-provider-reference',
    };
    const prisma = {
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-1',
          billNumber: 'BILL-1001',
          balance: 100,
          status: 'pending',
        }),
      },
      momoPaymentIntent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdIntent),
        update: vi.fn(async ({ data }: any) => ({ ...createdIntent, ...data })),
      },
    } as any;
    const service = new MomoPaymentService(prisma);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('temporary provider error', { status: 503 })) as any;

    await expect(service.initiate({
      billId: 'bill-1',
      amount: 25,
      payerPhone: '0241234567',
      idempotencyKey: 'new-request-key',
      userId: 'cashier-1',
    })).rejects.toThrow(/could not confirm the outcome/i);

    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'new-intent' },
      data: expect.objectContaining({
        status: 'initiating',
        providerStatus: 'INITIATION_UNCONFIRMED',
      }),
    }));
  });

  it('does not post a bill payment while MTN reports pending', async () => {
    const { service, prisma, addPayment } = setup();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(providerResponse('PENDING')) as any;

    const result = await service.getStatus(baseIntent.id, 'cashier-1', 'cashier');

    expect(result.status).toBe('pending');
    expect(addPayment).not.toHaveBeenCalled();
    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: baseIntent.id },
      data: expect.objectContaining({ status: 'pending', providerStatus: 'PENDING' }),
    }));
  });

  it('records payment through the existing billing service only after provider success', async () => {
    const { service, prisma, addPayment } = setup();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(providerResponse('SUCCESSFUL', { financialTransactionId: 'mtn-txn-123' })) as any;

    const result = await service.getStatus(baseIntent.id, 'cashier-1', 'cashier');

    expect(addPayment).toHaveBeenCalledWith('bill-1', expect.objectContaining({
      amount: 25,
      paymentMethod: 'mobile_money',
      reference: 'MTN-MOMO:provider-reference-1',
      idempotencyKey: 'payment-key-1',
    }), 'cashier-1');
    expect(result.status).toBe('successful');
    expect(result.paymentId).toBe('payment-1');
    expect(result.providerTransactionId).toBe('mtn-txn-123');
    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: baseIntent.id },
      data: expect.objectContaining({ status: 'successful', paymentId: 'payment-1' }),
    }));
  });

  it('does not let another ordinary staff user inspect an intent', async () => {
    const { service } = setup();

    await expect(service.getStatus(baseIntent.id, 'another-user', 'nurse'))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns terminal status without contacting MTN again', async () => {
    const { service } = setup({ ...baseIntent, status: 'successful', paymentId: 'payment-1' });
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    const result = await service.getStatus(baseIntent.id, 'cashier-1', 'cashier');

    expect(result.status).toBe('successful');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks a definite provider 4xx rejection as failed', async () => {
    const createdIntent = {
      ...baseIntent,
      id: 'rejected-intent',
      status: 'initiating',
      providerStatus: null,
      idempotencyKey: 'rejected-request-key',
      providerReference: 'rejected-provider-reference',
    };
    const prisma = {
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-1',
          billNumber: 'BILL-1001',
          balance: 100,
          status: 'pending',
        }),
      },
      momoPaymentIntent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdIntent),
        update: vi.fn(async ({ data }: any) => ({ ...createdIntent, ...data })),
      },
    } as any;
    const service = new MomoPaymentService(prisma);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('invalid payer details', { status: 400 })) as any;

    await expect(service.initiate({
      billId: 'bill-1',
      amount: 25,
      payerPhone: '0241234567',
      idempotencyKey: 'rejected-request-key',
      userId: 'cashier-1',
    })).rejects.toThrow(/rejected the payment request/i);

    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rejected-intent' },
      data: expect.objectContaining({
        status: 'failed',
        providerStatus: 'INITIATION_FAILED',
      }),
    }));
  });

  it('does not record a bill payment when MTN reports FAILED', async () => {
    const { service, prisma, addPayment } = setup();
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(providerResponse('FAILED', {
        financialTransactionId: 'mtn-failed-txn',
        reason: { code: 'PAYER_NOT_FOUND', message: 'Payer account not found' },
      })) as any;

    const result = await service.getStatus(baseIntent.id, 'cashier-1', 'cashier');

    expect(result.status).toBe('failed');
    expect(result.failureReason).toBe('Payer account not found');
    expect(addPayment).not.toHaveBeenCalled();
    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: baseIntent.id },
      data: expect.objectContaining({ status: 'failed', providerStatus: 'FAILED' }),
    }));
  });

  it('keeps a network-interrupted initiation reconcilable', async () => {
    const createdIntent = {
      ...baseIntent,
      id: 'network-interrupted-intent',
      status: 'initiating',
      providerStatus: null,
      idempotencyKey: 'network-request-key',
      providerReference: 'network-provider-reference',
    };
    const prisma = {
      bill: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'bill-1',
          billNumber: 'BILL-1001',
          balance: 100,
          status: 'pending',
        }),
      },
      momoPaymentIntent: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdIntent),
        update: vi.fn(async ({ data }: any) => ({ ...createdIntent, ...data })),
      },
    } as any;
    const service = new MomoPaymentService(prisma);
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('fetch failed')) as any;

    await expect(service.initiate({
      billId: 'bill-1',
      amount: 25,
      payerPhone: '0241234567',
      idempotencyKey: 'network-request-key',
      userId: 'cashier-1',
    })).rejects.toThrow(/fetch failed/i);

    expect(prisma.momoPaymentIntent.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'network-interrupted-intent' },
      data: expect.objectContaining({
        status: 'initiating',
        providerStatus: 'INITIATION_UNCONFIRMED',
      }),
    }));
  });

  it('refreshes a revoked cached access token once after HTTP 401', async () => {
    const { service, addPayment } = setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'old-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'fresh-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(providerResponse('PENDING'));
    globalThis.fetch = fetchMock as any;

    const result = await service.getStatus(baseIntent.id, 'cashier-1', 'cashier');

    expect(result.status).toBe('pending');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer old-token');
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer fresh-token');
    expect(addPayment).not.toHaveBeenCalled();
  });
});
