// src/pages/ProcessPayment.tsx
import { useState, FormEvent, useEffect } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore'; // UNIFIED TOAST
import { ArrowLeft, Save, DollarSign, CreditCard, Smartphone, Building2, Banknote } from 'lucide-react';
import type { paymentMethod } from '../types';

export default function ProcessPayment() {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId: string }>();
  const { getBill, addPayment, currentBill, isLoading } = useBillingStore();
  const { patients } = usePatientStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();// TOAST

    // ✅ NEW: Load bill from API
  useEffect(() => {
    if (billId) {
      getBill(billId);
    }
  }, [billId, getBill]);

  const bill = currentBill; // ✅ Use currentBill
  const patient = bill ? patients.find(p => p.id === bill.patientId) : null;

  const [amount, setAmount] = useState(bill?.balance || 0);
  const [paymentMethod, setPaymentMethod] = useState<paymentMethod>('cash');
  const [reference, setReference] = useState('');

  if (!bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 max-w-md">
          <DollarSign className="w-14 h-14 text-gray-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Bill Not Found</h2>
          <p className="text-gray-600 text-sm mb-5">The bill you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toastError('Invalid amount', 'Payment amount must be greater than 0');
      return;
    }
    if (amount > bill.balance) {
      toastError('Overpayment', 'Payment amount cannot exceed outstanding balance');
      return;
    }

    addPayment(bill.id, {
      billId: bill.id,
      amount,
      paymentMethod,
      paymentDate: new Date().toISOString(),
      receivedBy: user?.id || user?.username || '',
      reference: reference || undefined,
    });

    success('Payment recorded', `$${amount.toFixed(2)} received via ${paymentMethod.replace('_', ' ')}`);
    navigate('/dashboard/billing');
  };

  const paymentMethods: Array<{ value: paymentMethod; label: string; icon: any }> = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
    { value: 'insurance', label: 'Insurance', icon: DollarSign },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
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
      </div>

      {/* Bill Summary */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Bill Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-3.5 border border-gray-200">
            <p className="text-xs text-gray-600">Patient</p>
            <p className="font-bold text-base text-gray-900">{patient?.fullName || 'Unknown'}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-3.5 border border-gray-200">
            <p className="text-xs text-gray-600">Bill Number</p>
            <p className="font-bold text-base text-gray-900">{bill.billNumber}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-xl p-3.5 border border-gray-200">
            <p className="text-xs text-gray-600">Total Amount</p>
            <p className="text-xl font-bold text-gray-900">${bill.totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-xl p-3.5 border border-gray-200">
            <p className="text-xs text-gray-600">Amount Paid</p>
            <p className="text-xl font-bold text-green-600">${bill.paidAmount.toFixed(2)}</p>
          </div>
          <div className="sm:col-span-2 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
            <p className="text-xs text-gray-600">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600">${bill.balance.toFixed(2)}</p>
          </div>
        </div>

        {bill.payments?.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-3">Previous Payments</h3>
            <div className="space-y-2">
              {bill.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-3 border border-gray-200 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">
                      {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMethod}
                    </span>
                    {payment.reference && (
                      <span className="text-xs text-gray-500 ml-2">Ref: {payment.reference}</span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900">${payment.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>

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
              min="0"
              max={bill.balance}
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full pl-11 pr-4 py-3.5 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base font-bold"
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Max: <span className="font-bold text-red-600">${bill.balance.toFixed(2)}</span>
          </p>
        </div>

        {/* Payment Mode */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paymentMethods.map((mode) => {
              const Icon = mode.icon;
              const isSelected = paymentMethod === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setPaymentMethod(mode.value)}
                  className={`p-5 border-2 rounded-2xl transition-all duration-300 hover:shadow-md ${
                    isSelected
                      ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-teal-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Icon className={`w-7 h-7 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                  <p className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                    {mode.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reference */}
        {(paymentMethod === 'card' || paymentMethod === 'mobile_money' || paymentMethod === 'bank_transfer') && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reference Number {paymentMethod !== 'cash' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required={paymentMethod !== 'cash'}
              placeholder="Enter transaction reference"
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-5 border-t border-gray-200">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-7 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-medium text-base"
          >
            <Save className="w-5 h-5" />
            Process Payment
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
  );
}