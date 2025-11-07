// src/pages/Billing.tsx
import { useState } from 'react';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { Search, DollarSign, CreditCard, FileText, CheckCircle, Download, Hospital, Shield, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const { bills } = useBillingStore();
  const { patients } = usePatientStore();
  const { hasRole, user } = useAuthStore();

  const displayedBills = searchQuery
    ? bills.filter((b) => {
        const patient = patients.find((p) => p.id === b.patientId);
        return (
          b.billNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          patient?.folderNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : bills;

  const sortedBills = [...displayedBills].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const stats = {
    total: bills.length,
    paid: bills.filter((b) => b.status === 'paid').length,
    pending: bills.filter((b) => b.status === 'pending').length,
    totalRevenue: bills.reduce((sum, b) => sum + b.paidAmount, 0),
    outstanding: bills.reduce((sum, b) => sum + b.balance, 0),
  };

  const canProcessPayment = hasRole(['admin', 'accounts']);

  const hospitalInfo = {
    name: 'Veridian Hospital Management System',
    address: '123 Medical Center Drive, Healthcare City',
    phone: '+1 (555) 123-4567',
    email: 'info@veridianhms.com',
  };

  const handlePrintReceipt = (billId: string, paymentId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    const patient = patients.find(p => p.id === bill.patientId);
    if (!patient) return;

    const payment = bill.payments?.find(p => p.id === paymentId);
    if (!payment) return;

    const receiptHTML = generateReceiptHTML(bill, patient, payment, hospitalInfo);
    openPrintWindow(receiptHTML);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Hospital className="w-8 h-8" />
                Billing & Payments
              </h1>
              <p className="text-blue-100 mt-2">Manage bills, payments, and insurance claims</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Total Bills</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Paid Bills</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.paid}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Total Revenue</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
          </div>

          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-gray-600 text-sm font-medium">Outstanding</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">${stats.outstanding.toFixed(2)}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by bill number, patient name, or folder number..."
              className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
            />
          </div>
        </div>

        {/* Bills List */}
        {sortedBills.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/200 p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">
              {searchQuery ? 'No bills found' : 'No bills generated yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Bill Number
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedBills.map((bill) => {
                    const patient = patients.find((p) => p.id === bill.patientId);
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {bill.billNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{patient?.fullName || 'Unknown'}</p>
                            {patient?.folderNumber && (
                              <p className="text-xs text-gray-500">{patient.folderNumber}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(bill.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          ${bill.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          ${bill.paidAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                          ${bill.balance.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-2 text-sm font-bold rounded-full border ${
                              bill.status === 'paid'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : bill.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : bill.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-800 border-gray-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}
                          >
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            {canProcessPayment && bill.balance > 0 && (
                              <Link
                                to={`/dashboard/billing/${bill.id}/payment`}
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors group"
                              >
                                Process Payment
                                <Activity className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                              </Link>
                            )}
                            {bill.payments && bill.payments.length > 0 && (
                              <button
                                onClick={() => handlePrintReceipt(bill.id, bill.payments[bill.payments.length - 1].id)}
                                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold transition-colors group"
                                title="Print Last Receipt"
                              >
                                <Download className="w-4 h-4 transform group-hover:scale-110 transition-transform" />
                                Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
