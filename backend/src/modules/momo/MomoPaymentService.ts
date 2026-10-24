import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { BillingService } from '../billing/BillingService';

type MomoStatus = 'pending' | 'successful' | 'failed';
const money = (value: unknown) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export class MomoPaymentService {
  private billing: BillingService;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private prisma: PrismaClient) {
    this.billing = new BillingService(prisma);
  }

  private config() {
    const baseUrl = (process.env.MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com').replace(/\/$/, '');
    const subscriptionKey = process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY;
    const user = process.env.MOMO_USER_ID || process.env.MOMO_API_USER;
    const credential = process.env.MOMO_CREDENTIAL_TOKEN || process.env.MOMO_API_KEY;
    const targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox';
    const currency = process.env.MOMO_CURRENCY || 'GHS';
    if (!subscriptionKey || !user || !credential) {
      throw Object.assign(new Error('Mobile Money is not configured yet. Add the MoMo credentials to the backend environment.'), { statusCode: 503 });
    }
    return { baseUrl, subscriptionKey, user, credential, targetEnvironment, currency };
  }

  getReadiness() {
    const configured = Boolean(
      process.env.MOMO_COLLECTION_SUBSCRIPTION_KEY &&
      (process.env.MOMO_USER_ID || process.env.MOMO_API_USER) &&
      (process.env.MOMO_CREDENTIAL_TOKEN || process.env.MOMO_API_KEY)
    );
    return {
      enabled: configured,
      provider: 'MTN MoMo Collections',
      currency: process.env.MOMO_CURRENCY || 'GHS',
      environment: process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox',
      message: configured ? 'Mobile Money credentials are configured.' : 'Mobile Money is prepared but awaits backend credentials.'
    };
  }

  private async accessToken() {
    const cfg = this.config();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) return this.tokenCache.token;
    const response = await fetch(`${cfg.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${cfg.user}:${cfg.credential}`).toString('base64')}`,
        'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
        'X-Target-Environment': cfg.targetEnvironment
      }
    });
    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw Object.assign(new Error(`MoMo authentication failed (HTTP ${response.status}). Check the API credentials, subscription key and target environment.${details ? ` ${details.slice(0, 180)}` : ''}`), { statusCode: 502 });
    }
    const data = await response.json() as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw Object.assign(new Error('MoMo did not return an access token.'), { statusCode: 502 });
    this.tokenCache = { token: data.access_token, expiresAt: Date.now() + Math.max(60, Number(data.expires_in || 3600)) * 1000 };
    return data.access_token;
  }

  private async providerRequest(path: string, init: RequestInit = {}) {
    const cfg = this.config();
    const token = await this.accessToken();
    const response = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key': cfg.subscriptionKey,
        'X-Target-Environment': cfg.targetEnvironment,
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    });
    return response;
  }

  private normalizePhone(phone: string) {
    const digits = String(phone || '').replace(/[\s()+.-]/g, '');
    if (/^0\d{9}$/.test(digits)) return `233${digits.slice(1)}`;
    if (/^233\d{9}$/.test(digits)) return digits;
    throw Object.assign(new Error('Enter a valid Ghana mobile number, for example 0241234567 or 233241234567.'), { statusCode: 400 });
  }

  async initiate(input: { billId: string; amount: number; payerPhone: string; idempotencyKey: string; userId: string }) {
    const amount = money(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error('Payment amount must be greater than zero.'), { statusCode: 400 });
    if (!input.idempotencyKey || input.idempotencyKey.length > 100) throw Object.assign(new Error('A valid idempotency key is required.'), { statusCode: 400 });
    const payerPhone = this.normalizePhone(input.payerPhone);
    const bill = await this.prisma.bill.findUnique({ where: { id: input.billId } });
    if (!bill) throw Object.assign(new Error('Bill not found.'), { statusCode: 404 });
    if (bill.status === 'cancelled') throw Object.assign(new Error('Cannot pay a cancelled bill.'), { statusCode: 409 });
    if (amount > money(bill.balance)) throw Object.assign(new Error('Payment amount exceeds the outstanding balance.'), { statusCode: 409 });

    const existing = await this.prisma.momoPaymentIntent.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      if (existing.billId !== input.billId || money(existing.amount) !== amount || existing.payerPhone !== payerPhone) {
        throw Object.assign(new Error('This payment attempt key was already used with different payment details.'), { statusCode: 409 });
      }
      return { intent: existing, reused: true };
    }

    const providerReference = randomUUID();
    let intent;
    try {
      intent = await this.prisma.momoPaymentIntent.create({
        data: {
          billId: bill.id,
          amount,
          currency: process.env.MOMO_CURRENCY || 'GHS',
          payerPhone,
          providerReference,
          idempotencyKey: input.idempotencyKey,
          paymentIdempotencyKey: randomUUID(),
          initiatedById: input.userId,
          status: 'initiating'
        }
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const raced = await this.prisma.momoPaymentIntent.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (raced) {
          if (raced.billId !== input.billId || money(raced.amount) !== amount || raced.payerPhone !== payerPhone) {
            throw Object.assign(new Error('This payment attempt key was already used with different payment details.'), { statusCode: 409 });
          }
          return { intent: raced, reused: true };
        }
      }
      throw error;
    }

    try {
      const cfg = this.config();
      const response = await this.providerRequest('/collection/v1_0/requesttopay', {
        method: 'POST',
        headers: { 'X-Reference-Id': providerReference },
        body: JSON.stringify({
          amount: amount.toFixed(2),
          currency: cfg.currency,
          externalId: `BILL-${bill.billNumber}-${intent.id}`.slice(0, 80),
          payer: { partyIdType: 'MSISDN', partyId: payerPhone },
          payerMessage: `Payment for hospital bill ${bill.billNumber}`.slice(0, 100),
          payeeNote: `Veridian HMS bill ${bill.billNumber}`.slice(0, 100)
        })
      });
      if (response.status !== 202 && !response.ok) {
        const details = await response.text().catch(() => '');
        throw Object.assign(new Error(`MoMo rejected the payment request (HTTP ${response.status}). ${details.slice(0, 180)}`), { statusCode: 502 });
      }
      const updated = await this.prisma.momoPaymentIntent.update({
        where: { id: intent.id },
        data: { status: 'pending', providerStatus: 'PENDING' }
      });
      return { intent: updated, reused: false };
    } catch (error: any) {
      // Only a definite provider/configuration rejection is marked failed.
      // A network interruption may occur after MTN accepted the request, so retain
      // the intent as initiating and reconcile it through the status endpoint.
      const definiteFailure = Boolean(error?.statusCode);
      await this.prisma.momoPaymentIntent.update({
        where: { id: intent.id },
        data: {
          status: definiteFailure ? 'failed' : 'initiating',
          providerStatus: definiteFailure ? 'INITIATION_FAILED' : 'INITIATION_UNCONFIRMED',
          failureReason: String(error?.message || 'MoMo initiation outcome is unknown').slice(0, 500)
        }
      });
      throw error;
    }
  }

  async getStatus(intentId: string, userId: string, role?: string) {
    let intent = await this.prisma.momoPaymentIntent.findUnique({ where: { id: intentId } });
    if (!intent) throw Object.assign(new Error('MoMo payment attempt not found.'), { statusCode: 404 });
    if (intent.initiatedById !== userId && !['admin', 'accounts'].includes(String(role || '').toLowerCase())) {
      throw Object.assign(new Error('You are not authorised to view this payment attempt.'), { statusCode: 403 });
    }

    if (intent.status === 'successful' || intent.status === 'failed') return this.publicIntent(intent);
    try {
      const response = await this.providerRequest(`/collection/v1_0/requesttopay/${encodeURIComponent(intent.providerReference)}`, { method: 'GET' });
      if (response.status === 404) return this.publicIntent(intent);
      if (!response.ok) {
        const details = await response.text().catch(() => '');
        throw Object.assign(new Error(`Could not verify MoMo payment status (HTTP ${response.status}). ${details.slice(0, 160)}`), { statusCode: 502 });
      }
      const providerData = await response.json() as { status?: string; financialTransactionId?: string; reason?: { message?: string; code?: string } };
      const providerStatus = String(providerData.status || 'PENDING').toUpperCase();
      const now = new Date();
      if (providerStatus === 'SUCCESSFUL') {
        // Billing's existing idempotent payment workflow is the only path that records
        // collections and updates balances; a request being accepted is not proof of payment.
        const result: any = await this.billing.addPaymentToBill(intent.billId, {
          amount: money(intent.amount),
          paymentMethod: 'mobile_money',
          reference: `MTN-MOMO:${intent.providerReference}`,
          idempotencyKey: intent.paymentIdempotencyKey
        }, intent.initiatedById);
        const payment = result?.payment ?? result?.data?.payment ?? result?.Payment;
        intent = await this.prisma.momoPaymentIntent.update({
          where: { id: intent.id },
          data: {
            status: 'successful',
            providerStatus,
            providerTransactionId: providerData.financialTransactionId || null,
            paymentId: payment?.id || null,
            lastCheckedAt: now,
            completedAt: now,
            failureReason: null
          }
        });
      } else if (providerStatus === 'FAILED') {
        intent = await this.prisma.momoPaymentIntent.update({
          where: { id: intent.id },
          data: {
            status: 'failed',
            providerStatus,
            providerTransactionId: providerData.financialTransactionId || null,
            lastCheckedAt: now,
            failureReason: providerData.reason?.message || providerData.reason?.code || 'The mobile money provider marked this payment as failed.'
          }
        });
      } else {
        intent = await this.prisma.momoPaymentIntent.update({
          where: { id: intent.id },
          data: { status: 'pending', providerStatus, lastCheckedAt: now }
        });
      }
      return this.publicIntent(intent);
    } catch (error: any) {
      // A temporary provider/network failure must not be interpreted as a failed payment.
      if (error?.statusCode) throw error;
      throw Object.assign(new Error('Unable to verify the MoMo transaction right now. Retry the status check before taking another payment.'), { statusCode: 502 });
    }
  }

  private publicIntent(intent: any) {
    return {
      id: intent.id,
      billId: intent.billId,
      amount: Number(intent.amount),
      currency: intent.currency,
      payerPhone: intent.payerPhone,
      status: intent.status,
      providerStatus: intent.providerStatus,
      paymentId: intent.paymentId,
      providerTransactionId: intent.providerTransactionId,
      failureReason: intent.failureReason,
      createdAt: intent.createdAt,
      completedAt: intent.completedAt
    };
  }
}
