// src/pages/ProcessPayment.tsx - FIXED VERSION
import { useState, FormEvent, useEffect } from 'react'; 
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

export default function ProcessPayment() {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId: string }>();
  const { getBill, addPaymentToBill, currentBill, isLoading, getBillingBreakdown } = useBillingStore();
  const { patients, getPatients } = usePatientStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');
  const [billingBreakdown, setBillingBreakdown] = useState<any>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [showSendReceipt, setShowSendReceipt] = useState(false);

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

    try {
      await addPaymentToBill(bill.id, {
        amount,
        paymentMethod,
        reference: reference || undefined,
        transactionDate: new Date().toISOString(),
        receivedById: user.id,
      });

      success(
        'Payment recorded', 
        `$${amount.toFixed(2)} received via ${paymentMethod.replace('_', ' ')}`
      );
      navigate('/dashboard/billing');
    } catch (error: any) {
      toastError('Payment failed', error.message || 'Failed to process payment');
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
                <p className="text-2xl font-bold text-gray-900">${bill.totalAmount?.toFixed(2)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">AMOUNT PAID</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">${bill.paidAmount?.toFixed(2)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-800">BALANCE DUE</span>
                </div>
                <p className="text-2xl font-bold text-red-600">${bill.balance?.toFixed(2)}</p>
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
                      <span className="font-bold text-gray-900">${item.totalPrice?.toFixed(2)}</span>
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
                    <span className="text-lg font-bold text-green-600">${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Payment Form */}
        <div className="lg:col-span-1">
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
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-base font-bold">$</span>
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
                Maximum: <span className="font-bold text-red-600">${bill.balance?.toFixed(2)}</span>
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

            {/* Reference */}
            {(paymentMethod === 'card' || paymentMethod === 'mobile_money' || paymentMethod === 'bank_transfer' || paymentMethod === 'cheque') && (
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
                disabled={isLoading}
                className="flex items-center justify-center gap-2.5 px-7 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {isLoading ? 'Processing...' : 'Process Payment'}
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
        </div>
      </div>
    </div>
  );
}