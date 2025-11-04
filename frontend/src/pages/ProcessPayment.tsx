// src/pages/ProcessPayment.tsx
import { useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, Save, DollarSign, CreditCard, Smartphone, Building2, Banknote, Hospital, Shield, Activity } from 'lucide-react';
import type { PaymentMode } from '../types';

export default function ProcessPayment() {
  const navigate = useNavigate();
  const { billId } = useParams<{ billId: string }>();
  const { getBillById, addPayment } = useBillingStore();
  const { patients } = usePatientStore();
  const { user } = useAuthStore();

  const bill = billId ? getBillById(billId) : null;
  const patient = bill ? patients.find(p => p.id === bill.patientId) : null;

  const [amount, setAmount] = useState(bill?.balance || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [reference, setReference] = useState('');

  if (!bill) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bill Not Found</h2>
          <p className="text-gray-600 mb-6">The bill you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/dashboard/billing')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-semibold"
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
      alert('Payment amount must be greater than 0');
      return;
    }

    if (amount > bill.balance) {
      alert('Payment amount cannot exceed outstanding balance');
      return;
    }

    addPayment(bill.id, {
      billId: bill.id,
      amount,
      paymentMode,
      paymentDate: new Date().toISOString(),
      receivedBy: user?.id || user?.username || '',
      reference: reference || undefined,
    });

    navigate('/dashboard/billing');
  };

  const paymentModes: Array<{ value: PaymentMode; label: string; icon: any }> = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
    { value: 'insurance', label: 'Insurance', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Process Payment</h1>
              <p className="text-blue-100 mt-2">Record payment for bill {bill.billNumber}</p>
            </div>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Bill Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Patient</p>
              <p className="font-bold text-lg text-gray-900">{patient?.fullName || 'Unknown'}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Bill Number</p>
              <p className="font-bold text-lg text-gray-900">{bill.billNumber}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-green-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">${bill.totalAmount.toFixed(2)}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-emerald-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-600">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">${bill.paidAmount.toFixed(2)}</p>
            </div>
            <div className="md:col-span-2 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
              <p className="text-sm text-gray-600">Outstanding Balance</p>
              <p className="text-3xl font-bold text-red-600">${bill.balance.toFixed(2)}</p>
            </div>
          </div>

          {bill.payments && bill.payments.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Previous Payments</h3>
              <div className="space-y-3">
                {bill.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200">
                    <div>
                      <span className="text-gray-600 font-medium">
                        {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMode}
                      </span>
                      {payment.reference && (
                        <span className="text-sm text-gray-500 ml-3">Ref: {payment.reference}</span>
                      )}
                    </div>
                    <span className="font-bold text-lg text-gray-900">${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 space-y-8">
          <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg font-bold">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={bill.balance}
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-lg font-bold"
              />
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Maximum: <span className="font-bold text-red-600">${bill.balance.toFixed(2)}</span>
            </p>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {paymentModes.map((mode) => {
                const Icon = mode.icon;
                const isSelected = paymentMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setPaymentMode(mode.value)}
                    className={`p-6 border-2 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                      isSelected
                        ? 'border-blue-600 bg-gradient-to-r from-blue-50 to-teal-50 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-3 ${
                      isSelected ? 'text-blue-600' : 'text-gray-600'
                    }`} />
                    <p className={`text-sm font-bold ${
                      isSelected ? 'text-blue-900' : 'text-gray-700'
                    }`}>
                      {mode.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Number */}
          {(paymentMode === 'card' || paymentMode === 'mobile_money' || paymentMode === 'bank_transfer') && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Reference Number {paymentMode !== 'cash' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required={paymentMode !== 'cash'}
                placeholder="Enter transaction reference"
                className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
              />
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold text-lg"
            >
              <Save className="w-6 h-6" />
              <span>Process Payment</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/billing')}
              className="px-8 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
