import api from './api';

export interface MomoPaymentStatus {
  id: string;
  billId: string;
  amount: number;
  currency: string;
  payerPhone: string;
  status: 'initiating' | 'pending' | 'successful' | 'failed';
  providerStatus?: string | null;
  paymentId?: string | null;
  providerTransactionId?: string | null;
  failureReason?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export async function initiateMomoPayment(input: {
  billId: string;
  amount: number;
  payerPhone: string;
  idempotencyKey: string;
}): Promise<MomoPaymentStatus> {
  const response = await api.post('/momo/payments', input);
  return response.data?.data ?? response.data;
}

export async function checkMomoPaymentStatus(intentId: string): Promise<MomoPaymentStatus> {
  const response = await api.get(`/momo/payments/${encodeURIComponent(intentId)}`);
  return response.data?.data ?? response.data;
}

export async function getMomoReadiness(): Promise<{ enabled: boolean; provider: string; currency: string; environment: string; message: string }> {
  const response = await api.get('/momo/config');
  return response.data?.data ?? response.data;
}
