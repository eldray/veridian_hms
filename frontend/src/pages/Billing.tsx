// src/pages/Billing.tsx
import { useState } from 'react';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore'; // TOAST HOOK
import { Search, DollarSign, CreditCard, FileText, CheckCircle, Download, Hospital, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const { success, error: toastError } = useToast(); // TOAST

  const { bills, isLoading } = useBillingStore();
  const { patients } = usePatientStore();
  const { hasRole, user } = useAuthStore();

  // Filter & sort bills
  const displayedBills = searchQuery
    ? bills.filter((b) => {
        const patient = patients.find((p) => (p._id || p.id) === b.patientId);
        const q = searchQuery.toLowerCase();
        return (
          b.billNumber?.toLowerCase().includes(q) ||
          patient?.fullName?.toLowerCase().includes(q) ||
          patient?.folderNumber?.toLowerCase().includes(q)
        );
      })
    : bills;

  const sortedBills = [...displayedBills].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Stats
  const stats = {
    total: bills.length,
    paid: bills.filter((b) => b.status === 'paid').length,
    pending: bills.filter((b) => b.status === 'pending').length,
    totalRevenue: bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
    outstanding: bills.reduce((sum, b) => sum + (b.balance || 0), 0),
  };

  const canProcessPayment = hasRole(['admin', 'accounts']);

  const hospitalInfo = {
    name: 'Veridian Hospital Management System',
    address: '123 Medical Center Drive, Healthcare City',
    phone: '+1 (555) 123-4567',
    email: 'info@veridianhms.com',
  };

  // Generate receipt HTML
  const generateReceiptHTML = (bill: any, patient: any, payment: any, hospital: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${bill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { display: flex; justify-content: space-between; margin: 20px 0; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f4f4f4; }
          .total { font-weight: bold; font-size: 1.1em; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hospital.name}</h1>
          <p>${hospital.address} | ${hospital.phone} | ${hospital.email}</p>
        </div>
        <div class="info">
          <div>
            <p><strong>Patient:</strong> ${patient.fullName}</p>
            <p><strong>Folder #:</strong> ${patient.folderNumber || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Bill #:</strong> ${bill.billNumber}</p>
            <p><strong>Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
          </div>
        </div>
        <div class="section">
          <h3>Payment Details</h3>
          <table>
            <tr><th>Description</th><th>Amount</th></tr>
            <tr><td>Amount Paid</td><td>$${payment.amount.toFixed(2)}</td></tr>
            <tr><td>Payment Mode</td><td>${payment.paymentMode}</td></tr>
            <tr><td>Reference #</td><td>${payment.referenceNumber || 'N/A'}</td></tr>
          </table>
          <p class="total">Balance Remaining: $${bill.balance.toFixed(2)}</p>
        </div>
        <div style="text-align: center; margin-top: 40px; color: #666;">
          <p>Thank you for your payment.</p>
        </div>
      </body>
      </html>
    `;
  };

  const openPrintWindow = (html: string) => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      printWin.close();
      success('Receipt opened', 'Ready to print.');
    } else {
      toastError('Print failed', 'Please allow popups for this site.');
    }
  };

  const handlePrintReceipt = (billId: string, paymentId: string) => {
    const bill = bills.find(b => (b._id || b.id) === billId);
    if (!bill) {
      toastError('Bill not found');
      return;
    }
    const patient = patients.find(p => (p._id || p.id) === bill.patientId);
    if (!patient) {
      toastError('Patient not found');
      return;
    }
    const payment = bill.payments?.find(p => (p._id || p.id) === paymentId);
    if (!payment) {
      toastError('Payment record not found');
      return;
    }

    const receiptHTML = generateReceiptHTML(bill, patient, payment, hospitalInfo);
    openPrintWindow(receiptHTML);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 max-w-md w-full">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Loading Bills...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Hospital className="w-7 h-7" />
              Billing & Payments
            </h1>
            <p className="text-blue-100 mt-1">Manage bills, payments, and insurance claims</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { icon: FileText, label: 'Total Bills', value: stats.total, color: 'blue' },
          { icon: CheckCircle, label: 'Paid', value: stats.paid, color: 'green' },
          { icon: DollarSign, label: 'Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, color: 'emerald' },
          { icon: CreditCard, label: 'Outstanding', value: `$${stats.outstanding.toFixed(2)}`, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <span className="text-xs text-gray-600 font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-5 shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by bill #, name, or folder..."
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bills Table */}
      {sortedBills.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <DollarSign className="w-14 h-14 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{searchQuery ? 'No bills found' : 'No bills yet'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Bill #', 'Patient', 'Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedBills.map((bill) => {
                  const patient = patients.find(p => (p._id || p.id) === bill.patientId);
                  const lastPayment = bill.payments?.[bill.payments.length - 1];

                  return (
                    <tr key={bill._id || bill.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4 text-sm font-bold text-gray-900">{bill.billNumber}</td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{patient?.fullName || 'Unknown'}</p>
                          {patient?.folderNumber && <p className="text-xs text-gray-500">{patient.folderNumber}</p>}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {new Date(bill.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-900">
                        ${bill.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-green-600">
                        ${bill.paidAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-red-600">
                        ${bill.balance?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                          bill.status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          bill.status === 'cancelled' ? 'bg-gray-100 text-gray-800 border-gray-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-3">
                          {canProcessPayment && bill.balance > 0 && (
                            <Link
                              to={`/dashboard/billing/${bill._id || bill.id}/payment`}
                              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                              Pay <Activity className="w-3.5 h-3.5" />
                            </Link>
                          )}
                          {lastPayment && (
                            <button
                              onClick={() => handlePrintReceipt(bill._id || bill.id, lastPayment._id || lastPayment.id)}
                              className="text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                              title="Print Receipt"
                            >
                              <Download className="w-3.5 h-3.5" />
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
  );
}