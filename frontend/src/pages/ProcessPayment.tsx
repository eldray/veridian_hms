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
  const { patients, getPatients } = usePatientStore();
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

  useEffect(() => {
    if (!billId) return;
    paymentAttemptKey.current = getOrCreatePaymentAttemptKey(billId);
  }, [billId]);

  useEffect(() => {
    const loadData = async () => {
      if (billId) {
        try {
          setIsPageLoading(true);
          await Promise.all([
            getBill(billId),
            patients.length === 0 ? getPatients() : Promise.resolve()
          ]);
          
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
  }, [billId, getBill, getPatients, patients.length, getBillingBreakdown, toastError]);

  useEffect(() => {
    if (currentBill) {
      setAmount(currentBill.balance || 0);
    }
  }, [currentBill]);

  const bill = currentBill;
  const patient = bill ? patients.find(p => p.id === bill.patientId) : null;

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
        for (let attempt = 0; attempt < 24; attempt++) {
          if (finalStatus.status === 'successful' || finalStatus.status === 'failed') break;
          await new Promise(resolve => window.setTimeout(resolve, 5000));
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 max-w-md">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Loading Bill...</h2>
          <p className="text-gray-600 text-sm">Please wait while we load the bill details</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 max-w-md">
          <DollarSign className="w-14 h-14 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bill Not Found</h2>
          <p className="text-gray-600 text-sm mb-5">The bill you're looking for doesn't exist.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
            >
              Back to Billing
            </button>
            <Link
              to="/dashboard/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
            >
              View All Bills
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Process Payment</h1>
              <p className="text-blue-100 text-sm mt-0.5">Bill: {bill.billNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSendReceipt(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
              Send Receipt
            </button>
            <Link
              to="/dashboard/billing"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-sm font-medium"
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bill Summary
            </h2>
            
            {/* Patient & Bill Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">PATIENT</span>
                </div>
                <p className="font-bold text-gray-900 text-lg">
                  {getPatientName(patient)}
                </p>
                {patient?.folderNumber && (
                  <p className="text-sm text-blue-600 mt-1">Folder: {patient.folderNumber}</p>
                )}
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-800">BILL INFO</span>
                </div>
                <p className="font-bold text-gray-900 text-lg">{bill.billNumber}</p>
                <p className="text-sm text-purple-600 mt-1 capitalize">{bill.status}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-semibold text-green-800">TOTAL AMOUNT</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(bill.totalAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">AMOUNT PAID</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(bill.paidAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">BALANCE DUE</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(bill.balance)}</p>
              </div>
            </div>

            {/* Billing Breakdown */}
            {billingBreakdown && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Billing Breakdown
                </h3>
                <div className="space-y-2">
                  {billingBreakdown.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-3 border border-gray-200">
                      <span className="text-gray-700 font-medium">{item.description}</span>
                      <span className="font-bold text-gray-900">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Previous Payments */}
          {bill.payments && bill.payments.length > 0 && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment History
              </h3>
              <div className="space-y-2">
                {bill.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(payment.transactionDate).toLocaleDateString()} - {payment.paymentMethod}
                      </p>
                      {payment.reference && (
                        <p className="text-xs text-gray-600 mt-1">Ref: {payment.reference}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Payment Form */}
        <div className="lg:col-span-1">
          {canProcessPayment ? (
          <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 space-y-6 sticky top-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Payment Details
            </h2>

            {/* Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs font-bold">{CURRENCY_CODE}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={bill.balance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full pl-11 pr-4 py-3.5 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base font-bold"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Maximum: <span className="font-bold text-red-600">{formatCurrency(bill.balance)}</span>
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Payment Method <span className="text-red-500">*</span>
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
                      className={`p-4 border-2 rounded-xl transition-all duration-300 hover:shadow-md ${
                        isSelected
                          ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-teal-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Money Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  required
                  placeholder="024 123 4567"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
                <p className="text-xs text-gray-600 mt-2">A payment approval prompt will be sent to this number. The bill is updated only after the provider confirms success.</p>
              </div>
            )}

            {/* Reference */}
            {(paymentMethod === 'card' || paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required
                  placeholder="Enter transaction reference"
                  className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-5 border-t border-gray-200">
              <button
                type="submit"
                disabled={isLoading || isSubmittingPayment}
                className="flex items-center justify-center gap-2.5 px-7 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {isLoading || isSubmittingPayment ? 'Processing...' : 'Process Payment'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/billing')}
                className="px-7 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-base"
              >
                Cancel
              </button>
            </div>
          </form>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              You have read-only access to this bill. Only authorised accounts, records, or administrator staff can record payments.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}