// src/pages/Billing.tsx - PERFORMANCE OPTIMIZED WITH COMPLETE CODE
import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  Search, 
  DollarSign, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  Download, 
  Hospital, 
  Activity,
  BarChart3,
  RefreshCw,
  Users,
  TrendingUp,
  AlertCircle,
  Eye,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Memoized hospital info to prevent recreation
const HOSPITAL_INFO = {
  name: 'Veridian Hospital Management System',
  address: '123 Medical Center Drive, Healthcare City',
  phone: '+1 (555) 123-4567',
  email: 'info@veridianhms.com',
};

// Interface matching your backend Bill structure
interface ProcessedBill {
  id: string;
  billNumber: string;
  patientId: string;
  attendanceId: string;
  admissionId?: string;
  items: any[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  insuranceCovered: number;
  patientPayable: number;
  paidAmount: number;
  balance: number;
  status: string;
  paymentMode: string;
  insuranceProviderId?: string;
  preAuthNumber?: string;
  claimNumber?: string;
  claimStatus: string;
  createdById: string;
  updatedById?: string;
  billDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  payments: any[];
}

export default function Billing() {
  const [searchQuery, setSearchQuery] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { success, error: toastError } = useToast();

  const { bills, isLoading, getBills, getBillStatistics, billStatistics } = useBillingStore();
  const { patients, loadPatients } = usePatientStore();
  const { hasRole, user } = useAuthStore();

  // ✅ OPTIMIZED: Sequential data loading with loading states
  useEffect(() => {
    const loadData = async () => {
      setLocalLoading(true);
      try {
        console.log('🔄 Loading billing data...');
        // Load all data in parallel for better performance
        await Promise.all([
          getBills(),
          loadPatients(), 
          getBillStatistics()
        ]);
        console.log('✅ Billing data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading billing data:', error);
        toastError('Error loading data', 'Failed to load billing information');
      } finally {
        setLocalLoading(false);
      }
    };
    
    loadData();
  }, []);

  // ✅ OPTIMIZED: Memoized patient lookup map
  const patientMap = useMemo(() => {
    const map: Record<string, any> = {};
    patients.forEach(patient => {
      map[patient.id] = patient;
    });
    return map;
  }, [patients]);

  // ✅ OPTIMIZED: Memoized stats calculation with backend data structure
  const stats = useMemo(() => {
    console.log('📊 Processing bills data:', bills.length);
    
    const statistics = {
      total: bills.length,
      paid: bills.filter((b) => b.status === 'paid').length,
      pending: bills.filter((b) => b.status === 'pending').length,
      partial: bills.filter((b) => b.status === 'partial').length,
      totalRevenue: bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
      outstanding: bills.reduce((sum, b) => sum + (b.balance || 0), 0),
    };

    console.log('📈 Statistics calculated:', statistics);
    return statistics;
  }, [bills]);

  // ✅ OPTIMIZED: Memoized bill filtering with efficient search
  const displayedBills = useMemo(() => {
    if (!searchQuery.trim()) {
      return bills;
    }

    const q = searchQuery.toLowerCase();
    return bills.filter((bill) => {
      // Fast bill number check
      if (bill.billNumber?.toLowerCase().includes(q)) {
        return true;
      }

      // Fast patient lookup using precomputed map
      const patient = patientMap[bill.patientId];
      if (!patient) return false;

      // Efficient patient field checks
      return (
        patient.surname?.toLowerCase().includes(q) ||
        patient.otherNames?.toLowerCase().includes(q) ||
        patient.folderNumber?.toLowerCase().includes(q)
      );
    });
  }, [bills, searchQuery, patientMap]);

  // ✅ OPTIMIZED: Memoized sorted bills
  const sortedBills = useMemo(() => {
    return [...displayedBills].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [displayedBills]);

  const canProcessPayment = hasRole(['admin', 'accounts']);

  // ✅ OPTIMIZED: Memoized helper function
  const getPatientName = useCallback((patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  }, []);

  // ✅ OPTIMIZED: Memoized receipt generation - updated to match backend payment structure
  const generateReceiptHTML = useCallback((bill: any, patient: any, payment: any, hospital: any) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${bill.billNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .info { display: flex; justify-content: space-between; margin: 20px 0; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #f4f4f4; font-weight: bold; }
          .total { font-weight: bold; font-size: 1.1em; background: #f9f9f9; }
          .thank-you { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
          @media print { 
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hospital.name}</h1>
          <p>${hospital.address} | ${hospital.phone} | ${hospital.email}</p>
        </div>
        
        <div class="info">
          <div>
            <p><strong>Patient:</strong> ${getPatientName(patient)}</p>
            <p><strong>Folder #:</strong> ${patient.folderNumber || 'N/A'}</p>
            <p><strong>Contact:</strong> ${patient.contact || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Bill #:</strong> ${bill.billNumber}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.transactionDate).toLocaleDateString()}</p>
            <p><strong>Receipt Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>Payment Details</h3>
          <table>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>Amount Paid (${payment.paymentMethod})</td>
              <td>$${payment.amount.toFixed(2)}</td>
            </tr>
            ${payment.reference ? `
            <tr>
              <td>Reference Number</td>
              <td>${payment.reference}</td>
            </tr>
            ` : ''}
            <tr class="total">
              <td>Previous Balance</td>
              <td>$${(bill.totalAmount - bill.paidAmount + payment.amount).toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Current Balance</td>
              <td>$${bill.balance.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <div class="thank-you">
          <p><strong>Thank you for your payment.</strong></p>
          <p>This receipt confirms your payment has been processed successfully.</p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }, [getPatientName]);

  // ✅ OPTIMIZED: Debounced search handler with transition
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    startTransition(() => {
      // Filtering happens in useMemo automatically
    });
  }, []);

  const openPrintWindow = useCallback((html: string) => {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
      printWin.print();
      success('Receipt opened', 'Ready to print.');
    } else {
      toastError('Print failed', 'Please allow popups for this site.');
    }
  }, [success, toastError]);

  // ✅ OPTIMIZED: Memoized receipt handler
  const handlePrintReceipt = useCallback((billId: string, paymentId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) {
      toastError('Bill not found');
      return;
    }
    const patient = patientMap[bill.patientId];
    if (!patient) {
      toastError('Patient not found');
      return;
    }
    const payment = bill.payments?.find(p => p.id === paymentId);
    if (!payment) {
      toastError('Payment record not found');
      return;
    }

    const receiptHTML = generateReceiptHTML(bill, patient, payment, HOSPITAL_INFO);
    openPrintWindow(receiptHTML);
  }, [bills, patientMap, generateReceiptHTML, openPrintWindow, toastError]);

  // ✅ OPTIMIZED: Refresh handler with loading state
  const handleRefresh = useCallback(async () => {
    setLocalLoading(true);
    try {
      await Promise.all([
        getBills(),
        getBillStatistics()
      ]);
      success('Data refreshed', 'Billing data has been updated');
    } catch (error) {
      toastError('Refresh failed', 'Failed to refresh billing data');
    } finally {
      setLocalLoading(false);
    }
  }, [getBills, getBillStatistics, success, toastError]);

  const showLoading = localLoading || (isLoading && bills.length === 0);

  if (showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-10 max-w-md w-full">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Loading Bills...</h2>
          <p className="text-gray-600 text-sm mt-2">Please wait while we load your billing data</p>
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
            <p className="text-blue-100 text-sm mt-0.5">Manage bills, payments, and insurance claims</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={localLoading}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${localLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/billing/statistics"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            View Statistics
          </Link>
          <Link
            to="/dashboard/insurance-claims"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
          >
            <FileText className="w-4 h-4" />
            Insurance Claims
          </Link>
          <Link
            to="/dashboard/attendances"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Attendance
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[
          { 
            icon: FileText, 
            label: 'Total Bills', 
            value: stats.total, 
            color: 'blue',
            bg: 'from-blue-50 to-cyan-50',
            border: 'border-blue-200'
          },
          { 
            icon: CheckCircle, 
            label: 'Paid Bills', 
            value: stats.paid, 
            color: 'green',
            bg: 'from-green-50 to-emerald-50',
            border: 'border-green-200'
          },
          { 
            icon: Activity, 
            label: 'Pending', 
            value: stats.pending, 
            color: 'yellow',
            bg: 'from-yellow-50 to-amber-50',
            border: 'border-yellow-200'
          },
          { 
            icon: TrendingUp, 
            label: 'Outstanding', 
            value: `$${stats.outstanding.toLocaleString()}`, 
            color: 'red',
            bg: 'from-red-50 to-pink-50',
            border: 'border-red-200'
          },
        ].map((stat, i) => (
          <div key={i} className={`bg-gradient-to-br ${stat.bg} rounded-2xl shadow-xl border ${stat.border} p-5 hover:shadow-2xl transition-all duration-300`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
              <span className="text-gray-600 text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search Input - Uses optimized handler */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-5">
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600" />
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by bill #, patient name, or folder number..."
              className="w-full px-4 py-3 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>
        {isPending && (
          <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Searching...
          </div>
        )}
      </div>

      {/* Table - Uses optimized sortedBills */}
      {sortedBills.length === 0 ? (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {searchQuery ? "No bills found" : "No bills available"}
          </h3>
          <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
            {searchQuery 
              ? "No bills match your search criteria. Try adjusting your search terms."
              : "Get started by creating a new patient attendance to generate bills."
            }
          </p>
          {!searchQuery && (
            <div className="flex gap-3 justify-center">
              <Link
                to="/dashboard/attendances"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-sm"
              >
                <Users className="w-4 h-4" />
                Create New Attendance
              </Link>
              <Link
                to="/dashboard/patients"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
              >
                View Patients
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  {['Bill #', 'Patient', 'Date', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map((header, index) => (
                    <th 
                      key={header} 
                      className={`px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                        index === 0 ? 'rounded-tl-2xl' : ''
                      } ${
                        index === 7 ? 'rounded-tr-2xl' : ''
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedBills.map((bill) => {
                  const patient = patientMap[bill.patientId];
                  const lastPayment = bill.payments?.[bill.payments.length - 1];
                  const hasPayments = bill.payments && bill.payments.length > 0;

                  return (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-bold text-gray-900">{bill.billNumber}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {bill.paymentMode && (
                              <span className="capitalize">{bill.paymentMode.replace('_', ' ')}</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {getPatientName(patient)}
                          </p>
                          {patient?.folderNumber && (
                            <p className="text-xs text-gray-500">{patient.folderNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {new Date(bill.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-gray-400">
                          {new Date(bill.createdAt).toLocaleTimeString()}
                        </span>
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
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border ${
                          bill.status === 'paid' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : bill.status === 'partial' 
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                            : bill.status === 'cancelled' 
                            ? 'bg-gray-100 text-gray-800 border-gray-200'
                            : bill.status === 'draft'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {bill.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {bill.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* View Bill Details */}
                          <Link
                            to={`/dashboard/bills/${bill.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-lg hover:from-gray-700 hover:to-slate-700 transition-all duration-200 text-xs font-medium"
                            title="View Bill Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Link>

                          {/* Process Payment */}
                          {canProcessPayment && bill.balance > 0 && (
                            <Link
                              to={`/dashboard/billing/${bill.id}/payment`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all duration-200 text-xs font-medium"
                              title="Process Payment"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              Pay
                            </Link>
                          )}

                          {/* Print Receipt */}
                          {hasPayments && (
                            <button
                              onClick={() => handlePrintReceipt(bill.id, lastPayment.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-xs font-medium"
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
          
          {/* Table Footer */}
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold">{sortedBills.length}</span> of{' '}
                <span className="font-semibold">{bills.length}</span> bills
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}