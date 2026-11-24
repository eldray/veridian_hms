import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';
import { Button, cn, Field, INPUT } from '../ui';
import { formatCurrency } from '../../utils/currency';
import { uuid } from '../../utils/uuid';

/**
 * One recorded payment, as far as the refund dialog needs to know it.
 * `refunds` is the partial-refund history already posted against the payment.
 */
export interface RefundablePayment {
  id: string;
  amount: number;
  paymentMethod: string;
  reference?: string | null;
  transactionDate?: string;
  refunds?: Array<{ amount: number }>;
}

export interface RefundSubmission {
  paymentId: string;
  amount: number;
  refundMethod: string;
  reference?: string;
  reason: string;
  idempotencyKey: string;
}

interface RefundPaymentModalProps {
  payment: RefundablePayment | null;
  billNumber: string;
  onClose: () => void;
  /** Parent posts the refund and refreshes the bill; a rejected promise keeps the dialog open. */
  onSubmit: (data: RefundSubmission) => Promise<void>;
}

const roundMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const refundedOn = (payment: RefundablePayment) =>
  roundMoney((payment.refunds || []).reduce((sum, refund) => sum + Number(refund.amount || 0), 0));
const refundableOn = (payment: RefundablePayment) =>
  Math.max(0, roundMoney(Number(payment.amount) - refundedOn(payment)));

const METHODS = ['cash', 'mobile_money', 'card', 'bank_transfer', 'cheque'];
const refundAttemptStorageKey = (paymentId: string) => `veridian:refund-attempt:${paymentId}`;

const getOrCreateRefundAttemptKey = (paymentId: string): string => {
  try {
    const storageKey = refundAttemptStorageKey(paymentId);
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const key = uuid();
    sessionStorage.setItem(storageKey, key);
    return key;
  } catch {
    return uuid();
  }
};

const rotateRefundAttemptKey = (paymentId: string): string => {
  const key = uuid();
  try {
    sessionStorage.setItem(refundAttemptStorageKey(paymentId), key);
  } catch {
    // The in-memory key still protects retries while this dialog remains mounted.
  }
  return key;
};

/**
 * Money handed back against one payment.
 *
 * The amount is capped at that payment's unrefunded remainder so the operator cannot
 * refund the same cedi twice; the server enforces the same rule under the bill lock.
 */
export default function RefundPaymentModal({ payment, billNumber, onClose, onSubmit }: RefundPaymentModalProps) {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => uuid());

  useEffect(() => {
    if (!payment) return;
    setAmount(refundableOn(payment));
    setMethod(payment.paymentMethod || 'cash');
    setReference('');
    setReason('');
    setError('');
    // Keep this key stable while the dialog remains open, including after a lost response.
    setIdempotencyKey(getOrCreateRefundAttemptKey(payment.id));
  }, [payment?.id]);

  if (!payment) return null;

  const refundable = refundableOn(payment);
  const refunded = refundedOn(payment);
  const reasonTooShort = reason.trim().length < 3;
  const amountTooHigh = !Number.isFinite(amount) || amount < 0.01 || Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-7 || amount > refundable;

  const handleSubmit = async () => {
    if (amountTooHigh) {
      setError(`Enter an amount in pesewas (maximum two decimal places), between 0.01 and ${formatCurrency(refundable)}.`);
      return;
    }
    if (reasonTooShort) {
      setError('State why the money is being refunded (at least 3 characters).');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      await onSubmit({
        paymentId: payment.id,
        amount,
        refundMethod: method,
        reference: reference.trim() || undefined,
        reason: reason.trim(),
        idempotencyKey,
      });
      // Rotate only after confirmed success. Network failures retain the key so
      // retrying the same form cannot create a second refund.
      setIdempotencyKey(rotateRefundAttemptKey(payment.id));
    } catch (err: any) {
      setError(err?.message || 'The refund could not be processed.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <Undo2 className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Refund Payment</h2>
                <p className="text-xs text-[var(--text-secondary)]">Bill {billNumber}</p>
              </div>
            </div>
            <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={onClose} />
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-color)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Original payment</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">{formatCurrency(Number(payment.amount))}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-[var(--text-secondary)]">Already refunded</span>
                <span className="font-semibold text-[var(--icon-red-text)] tabular-nums">{formatCurrency(refunded)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-[var(--border-color)]">
                <span className="font-medium text-[var(--text-primary)]">Still refundable</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">{formatCurrency(refundable)}</span>
              </div>
            </div>

            <Field label="Refund Amount" hint={`Maximum: ${formatCurrency(refundable)}`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-medium text-sm">₵</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  max={refundable}
                  step={0.01}
                  className={cn(INPUT, 'w-full pl-8 tabular-nums font-semibold text-lg py-2.5')}
                />
              </div>
            </Field>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">Refund Method</label>
              <div className="grid grid-cols-2 gap-2">
                {METHODS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMethod(option)}
                    className={cn(
                      'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors border',
                      method === option
                        ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)] ring-1 ring-[var(--icon-cyan-text)]'
                        : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--border-color)]'
                    )}
                  >
                    {option.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Reference No." hint="Optional">
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Txn ID, voucher no."
                className={cn(INPUT, 'w-full text-sm')}
              />
            </Field>

            <Field label="Reason" hint="Required for the audit trail">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Why is the money being refunded?"
                className={cn(INPUT, 'w-full text-sm py-2')}
              />
            </Field>

            {error && (
              <p className="rounded-lg border border-[var(--border-color)] bg-[var(--icon-red-bg)] px-3 py-2 text-xs text-[var(--icon-red-text)]">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="soft"
                accent="red"
                className="flex-1"
                icon={Undo2}
                loading={isProcessing}
                disabled={isProcessing || amountTooHigh || reasonTooShort}
                onClick={handleSubmit}
              >
                {isProcessing ? 'Refunding...' : 'Process Refund'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
