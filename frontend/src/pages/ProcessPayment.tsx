// src/pages/ProcessPayment.tsx - FIXED VERSION
import { useState, FormEvent, useEffect, useRef } from 'react'; 
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  ArrowLeft, 
  Save, 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Building2, 
  Banknote,
  FileText,
  BarChart3,
  User,
  Calendar,
  Tag,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import type { PaymentMethod } from '../types';
import SendDocumentModal from '../components/SendDocumentModal';
import { generateReceipt, downloadDocument } from '../api';
import { checkMomoPaymentStatus, initiateMomoPayment } from '../api/momo';
import { CURRENCY_CODE, formatCurrency } from '../utils/currency';

const paymentAttemptStorageKey = (billId: string) => `veridian:payment-attempt:${billId}`;

const getOrCreatePaymentAttemptKey = (billId: string) => {
  try {
    const storageKey = paymentAttemptStorageKey(billId);
    const existingKey = sessionStorage.getItem(storageKey);
    if (existingKey) return existingKey;
    const newKey = crypto.randomUUID();
    sessionStorage.setItem(storageKey, newKey);
    return newKey;
  } catch {
    // Storage may be unavailable in restricted browser contexts; in-memory
    // idempotency still protects retries while this page remains mounted.
    return crypto.randomUUID();
  }
};

export default function ProcessPayment() {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId: string }>();
  const { getBill, addPaymentToBill, currentBill, isLoading, getBillingBreakdown } = useBillingStore();
  const { patients, currentPatient, fetchPatient } = usePatientStore();
  const { user, hasRole } = useAuthStore();
  const canProcessPayment = hasRole(['admin', 'accounts', 'records']);
  const { success, error: toastError } = useToast();

  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [momoPhone, setMomoPhone] = useState('');
  const [billingBreakdown, setBillingBreakdown] = useState<any>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showSendReceipt, setShowSendReceipt] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const paymentAttemptKey = useRef(getOrCreatePaymentAttemptKey(billId || 'pending'));
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!billId) return;
    paymentAttemptKey.current = getOrCreatePaymentAttemptKey(billId);
  }, [billId]);

  useEffect(() => {
    const loadData = async () => {
      if (billId) {
        try {
          setIsPageLoading(true);
          // The bill row already carries its patient, so this screen never downloads the
          // patient register just to print a name in the header.
          await getBill(billId);
          const bill: any = useBillingStore.getState().currentBill;
          if (bill && !bill.Patient?.surname && bill.patientId) {
            await fetchPatient(bill.patientId).catch(() => undefined);
          }

          // Get billing breakdown
          const breakdown = await getBillingBreakdown(billId);
          setBillingBreakdown(breakdown);
        } catch (error) {
          toastError('Error loading bill', 'Failed to load bill details');
        } finally {
          setIsPageLoading(false);
        }
      }
    };
    loadData();
  }, [billId, getBill, fetchPatient, getBillingBreakdown, toastError]);

  useEffect(() => {
    if (currentBill) {
      setAmount(currentBill.balance || 0);
    }
  }, [currentBill]);

  const bill = currentBill;
  const patient = bill
    ? ((bill as any).Patient?.surname
        ? (bill as any).Patient
        : patients.find(p => p.id === bill.patientId)
          || (currentPatient?.id === bill.patientId ? currentPatient : null))
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isSubmittingPayment) return;
    if (!bill || !user) {
      toastError('Missing data', 'Bill or user information not available');
      return;
    }

    if (amount <= 0) {
      toastError('Invalid amount', 'Payment amount must be greater than 0');
      return;
    }
    if (amount > (bill.balance || 0)) {
      toastError('Overpayment', 'Payment amount cannot exceed outstanding balance');
      return;
    }
    if (paymentMethod === 'mobile_money' && !momoPhone.trim()) {
      toastError('Mobile number required', 'Enter the Ghana mobile number that should receive the payment prompt.');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      let paymentResult: any;
      if (paymentMethod === 'mobile_money') {
        const intent = await initiateMomoPayment({
          billId: bill.id,
          amount,
          payerPhone: momoPhone.trim(),
          idempotencyKey: paymentAttemptKey.current,
        });
        success('Payment request sent', 'Ask the patient to approve the MoMo prompt on their phone. Do not record a separate cash payment while this request is pending.');
        let finalStatus = intent;
        // The payer approves on their own phone, so this waits — but with a budget, a
        // backoff and an unmount guard. The old fixed 24 x 5 s loop kept the button busy
        // for two minutes, even after staff navigated away from the bill.
        const WAIT_BUDGET_MS = 60_000;
        let waited = 0;
        while (
          waited < WAIT_BUDGET_MS &&
          mountedRef.current &&
          finalStatus.status !== 'successful' &&
          finalStatus.status !== 'failed'
        ) {
          const step = waited < 30_000 ? 2_000 : 5_000;
          await new Promise(resolve => window.setTimeout(resolve, step));
          waited += step;
          if (!mountedRef.current) break;
          finalStatus = await checkMomoPaymentStatus(intent.id);
        }
        if (finalStatus.status === 'failed') {
          paymentAttemptKey.current = crypto.randomUUID();
          try { if (billId) sessionStorage.setItem(paymentAttemptStorageKey(billId), paymentAttemptKey.current); } catch { /* optional storage */ }
          throw new Error(finalStatus.failureReason || 'The mobile money transaction failed or was declined.');
        }
        if (finalStatus.status !== 'successful') {
          throw new Error('The MoMo request is still pending. Check the payer’s phone and wait for approval, then retry the status check before taking another payment.');
        }
        if (!finalStatus.paymentId) {
          throw new Error('MoMo confirmed success, but the HMS payment reference is not available yet. Do not collect payment again; ask accounts to verify the transaction.');
        }
        paymentResult = { payment: { id: finalStatus.paymentId } };
      } else {
        paymentResult = await addPaymentToBill(bill.id, {
          amount,
          paymentMethod,
          reference: reference || undefined,
          transactionDate: new Date().toISOString(),
          receivedById: user.id,
          idempotencyKey: paymentAttemptKey.current,
        });
      }

      // Rotate only after the server confirms success. If the response is lost,
      // a reload/retry still uses the same key and cannot post the payment twice.
      paymentAttemptKey.current = crypto.randomUUID();
      try {
        if (billId) sessionStorage.setItem(paymentAttemptStorageKey(billId), paymentAttemptKey.current);
      } catch {
        // The in-memory key remains usable if session storage is unavailable.
      }
      success(
        'Payment recorded', 
        `${formatCurrency(amount)} received via ${paymentMethod === 'mobile_money' ? 'Mobile Money' : paymentMethod.replace('_', ' ')}`
      );
      // Receipt generation is deliberately separate from payment posting: a receipt-template
      // failure must never make a successfully committed payment look unsuccessful.
      const recordedPayment = paymentResult?.payment ?? paymentResult?.data?.payment;
      if (recordedPayment?.id) {
        try {
          const receiptResult: any = await generateReceipt(bill.id, recordedPayment.id);
          const documentId = receiptResult?.data?.documentId ?? receiptResult?.documentId;
          if (documentId) {
            const fileBlob = await downloadDocument(documentId);
            const blobUrl = URL.createObjectURL(fileBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `receipt_${bill.billNumber || bill.id}_${recordedPayment.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(blobUrl);
          } else {
            toastError('Payment recorded; receipt unavailable', 'The payment was saved, but the receipt document could not be prepared. Please ask an authorised accounts user to generate the payment receipt.');
          }
        } catch (receiptError: any) {
          toastError('Payment recorded; receipt unavailable', receiptError?.message || 'The payment was saved, but the receipt could not be generated.');
        }
      } else {
        toastError('Payment recorded; receipt unavailable', 'The payment was saved, but no payment reference was returned to generate its receipt.');
      }
      navigate('/dashboard/billing');
    } catch (error: any) {
      const message = error.message || 'Failed to process payment';
      if (paymentMethod === 'mobile_money' && /pending|status|verify|outcome is unknown|not confirmed/i.test(message)) {
        toastError('Mobile Money status not confirmed', `${message} Do not collect a second payment until this attempt is verified.`);
      } else {
        toastError('Payment failed', message);
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const paymentMethods: Array<{ value: PaymentMethod; label: string; icon: any }> = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
    { value: 'cheque', label: 'Cheque', icon: FileText },
  ];

  const getPatientName = (patient: any) => {
    if (!patient) return 'Unknown Patient';
    return patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
        <div className="text-center bg-[var(--bg-card)] rounded-2xl shadow-md border border-[var(--border-color)] p-10 max-w-md">
          <div className="w-14 h-14 border-4 border-[var(--icon-cyan-text)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Loading Bill...</h2>
          <p className="text-[var(--text-secondary)] text-sm">Please wait while we load the bill details</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
        <div className="text-center bg-[var(--bg-card)] rounded-2xl shadow-md border border-[var(--border-color)] p-10 max-w-md">
          <DollarSign className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Bill Not Found</h2>
          <p className="text-[var(--text-secondary)] text-sm mb-5">The bill you're looking for doesn't exist.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm"
            >
              Back to Billing
            </button>
            <Link
              to="/dashboard/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)] rounded-lg hover:bg-[var(--bg-main)] transition-all font-medium text-sm"
            >
              View All Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-[var(--bg-main)] min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-card)] rounded-2xl p-6 shadow-sm border border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="p-2.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">Process Payment</h1>
              <p className="text-[var(--text-secondary)] text-sm mt-0.5">Bill: {bill.billNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSendReceipt(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Send Receipt
            </button>
            <Link
              to="/dashboard/billing"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              Billing Dashboard
            </Link>
          </div>
        </div>
      </div>

      <SendDocumentModal
        open={showSendReceipt}
        onClose={() => setShowSendReceipt(false)}
        patient={patient}
        documentType="receipt"
        entityId={bill.id}
        paymentId={(() => {
          const payments = ((bill as any).Payment || (bill as any).payments || [])
            .filter((payment: any) => !payment.isVoided)
            .slice()
            .sort((a: any, b: any) => new Date(b.transactionDate || 0).getTime() - new Date(a.transactionDate || 0).getTime());
          return payments[0]?.id;
        })()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Bill Summary & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bill Summary */}
          <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] p-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              Bill Summary
            </h2>
            
            {/* Patient & Bill Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">PATIENT</span>
                </div>
                <p className="font-bold text-[var(--text-primary)] text-lg">
                  {getPatientName(patient)}
                </p>
                {patient?.folderNumber && (
                  <p className="text-sm text-[var(--icon-cyan-text)] mt-1">Folder: {patient.folderNumber}</p>
                )}
              </div>
              
              <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-[var(--icon-purple-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">BILL INFO</span>
                </div>
                <p className="font-bold text-[var(--text-primary)] text-lg">{bill.billNumber}</p>
                <p className="text-sm text-[var(--icon-purple-text)] mt-1 capitalize">{bill.status}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[var(--icon-green-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">TOTAL AMOUNT</span>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(bill.totalAmount)}</p>
              </div>
              
              <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">AMOUNT PAID</span>
                </div>
                <p className="text-2xl font-bold text-[var(--icon-cyan-text)]">{formatCurrency(bill.paidAmount)}</p>
              </div>
              
              <div className="bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[var(--icon-red-text)]" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">BALANCE DUE</span>
                </div>
                <p className="text-2xl font-bold text-[var(--icon-red-text)]">{formatCurrency(bill.balance)}</p>
              </div>
            </div>

            {/* Billing Breakdown */}
            {billingBreakdown && (
              <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                  Billing Breakdown
                </h3>
                <div className="space-y-2">
                  {billingBreakdown.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-[var(--bg-main)] rounded-xl p-3 border border-[var(--border-color)]">
                      <span className="text-[var(--text-secondary)] font-medium">{item.description}</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Previous Payments */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] p-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                Payment History
              </h3>
              <div className="space-y-2">
                {bill.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center bg-[var(--bg-main)] rounded-xl p-4 border border-[var(--border-color)]">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {new Date(payment.transactionDate).toLocaleDateString()} - {payment.paymentMethod}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Ref: {payment.reference}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-[var(--icon-green-text)]">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Payment Form */}
        <div className="lg:col-span-1">
          {canProcessPayment ? (
          <form onSubmit={handleSubmit} className="bg-[var(--bg-card)] rounded-2xl shadow-sm border border-[var(--border-color)] p-6 space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              Payment Details
            </h2>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                Payment Amount <span className="text-[var(--icon-red-text)]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)] text-xs font-bold">{CURRENCY_CODE}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={bill.balance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-11 pr-4 py-3.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-base font-bold"
                />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-2">
                Maximum: <span className="font-bold text-[var(--icon-red-text)]">{formatCurrency(bill.balance)}</span>
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-3">
                Payment Method <span className="text-[var(--icon-red-text)]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMethod === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setPaymentMethod(mode.value)}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                        isSelected
                          ? 'border-[var(--icon-cyan-text)] bg-[var(--icon-cyan-bg)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]'}`} />
                      <p className={`text-xs font-bold ${isSelected ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>
                        {mode.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Money payer number: the backend initiates a real collection request. */}
            {paymentMethod === 'mobile_money' && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Mobile Money Number <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  required
                  placeholder="024 123 4567"
                  className="w-full px-4 py-3 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-base"
                />
                <p className="text-xs text-[var(--text-secondary)] mt-2">A payment approval prompt will be sent to this number. The bill is updated only after the provider confirms success.</p>
              </div>
            )}

            {/* Reference */}
            {(paymentMethod === 'card' || paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') && (
              <div>
                <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                  Reference Number <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                  placeholder="Enter transaction reference"
                  className="w-full px-4 py-3 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-base"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-5 border-t border-[var(--border-color)]">
              <button
                type="submit"
                disabled={isLoading || isSubmittingPayment}
                className="flex items-center justify-center gap-2.5 px-7 py-3 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all duration-200 font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {isLoading || isSubmittingPayment ? 'Processing...' : 'Process Payment'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/billing')}
                className="px-7 py-3 border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)] rounded-lg hover:bg-[var(--bg-main)] transition-all duration-200 font-medium text-base"
              >
                Cancel
              </button>
            </div>
          </form>
          ) : (
            <div className="rounded-2xl border border-[var(--border-color)] border-l-4 border-l-[var(--icon-yellow-text)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
              You have read-only access to this bill. Only authorised accounts, records, or administrator staff can record payments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}