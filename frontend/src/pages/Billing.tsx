// src/pages/Billing.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDocumentStore } from '../store/documentStore';
import {
  Search, RefreshCw, FileText, DollarSign, CreditCard, Eye,
  ChevronLeft, ChevronRight, Receipt, TrendingUp, Wallet,
  AlertCircle, CheckCircle, Clock, Shield, User, Calendar, X,
  Filter, Printer, Download, Activity, Users, Hospital
} from 'lucide-react';
import type { BillStatus, PaymentMode } from '../types';

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export default function Billing() {
  const { success, error: toastError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    bills,
    isLoading,
    getBills,
    billStatistics,
    getBillStatistics,
  } = useBillingStore();
  const { patients, loadPatients } = usePatientStore();
  const { hasRole } = useAuthStore();
  const { generateBillStatement, isLoading: isDocLoading } = useDocumentStore();

  const getDateRange = (): { startDate: Date; endDate: Date } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    switch (dateFilter) {
      case 'today':
        return { startDate: today, endDate: endOfDay };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);
        yesterday.setHours(0, 0, 0, 0);
        return { startDate: yesterday, endDate: endOfYesterday };
      }
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        return { startDate: weekStart, endDate: endOfDay };
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        return { startDate: monthStart, endDate: endOfDay };
      }
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { startDate: start, endDate: end };
        }
        return null;
      default:
        return null;
    }
  };

  const loadData = async () => {
    try {
      setRefreshing(true);
      const dateRange = getDateRange();
      const filters: any = {};
      if (dateRange) {
        filters.dateFrom = dateRange.startDate.toISOString();
        filters.dateTo = dateRange.endDate.toISOString();
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      await Promise.all([getBills(filters), loadPatients(), getBillStatistics(filters)]);
      success('Data refreshed', 'Billing data is up-to-date.');
    } catch {
      toastError('Refresh failed', 'Could not load billing data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, customStartDate, customEndDate, statusFilter]);

  const getPatientName = useCallback((patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  }, []);

  const getPatientFromBill = useCallback(
    (bill: any) => {
      if (bill.Patient?.surname) return bill.Patient;
      return patients.find((p) => p.id === bill.patientId);
    },
    [patients]
  );

  const filteredBills = useMemo(() => {
    if (!bills.length) return [];
    let filtered = [...bills];
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((bill) => {
        const patient = getPatientFromBill(bill);
        const patientName = patient ? getPatientName(patient) : '';
        return (
          bill.billNumber?.toLowerCase().includes(lower) ||
          patientName.toLowerCase().includes(lower) ||
          patient?.folderNumber?.toLowerCase().includes(lower)
        );
      });
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.billDate || b.createdAt).getTime() -
        new Date(a.billDate || a.createdAt).getTime()
    );
  }, [bills, searchQuery, getPatientFromBill, getPatientName]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filteredBills.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, statusFilter]);

  const goToPage = (page: number) =>
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const stats = useMemo(() => {
    const totalAmount = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = filteredBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalBalance = filteredBills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const paidCount = filteredBills.filter((b) => b.status === 'paid').length;
    const pendingCount = filteredBills.filter(
      (b) => b.status === 'pending' || b.status === 'partial'
    ).length;
    return { totalAmount, totalPaid, totalBalance, paidCount, pendingCount, total: filteredBills.length };
  }, [filteredBills]);

  const handlePrintStatement = async (billId: string) => {
    try {
      const result = await generateBillStatement(billId);
      if (result.success && result.data?.filePath) {
        window.open(result.data.filePath, '_blank');
        success('Success', 'Bill statement generated and opened');
      } else {
        toastError('Error', result.message || 'Failed to generate bill statement');
      }
    } catch {
      toastError('Error', 'Could not generate bill statement');
    }
  };

  const getStatusColor = (status: BillStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'partial':
        return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      case 'pending':
        return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      case 'draft':
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
      case 'cancelled':
        return 'bg-[var(--bg-main)] text-[var(--text-tertiary)]';
      default:
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getPaymentModeLabel = (mode: PaymentMode) => {
    const modeMap: Record<PaymentMode, string> = {
      cash: 'Cash',
      nhis: 'NHIS',
      private_insurance: 'Private Insurance',
    };
    return modeMap[mode] || 'Cash';
  };

  const getPaymentModeIcon = (mode: PaymentMode) => {
    switch (mode) {
      case 'nhis':
        return <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />;
      case 'private_insurance':
        return <Hospital className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateOnly = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today':     return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week':      return 'This Week';
      case 'month':     return 'This Month';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatDateOnly(customStartDate)} – ${formatDateOnly(customEndDate)}`;
        }
        return 'Custom Range';
      default:
        return 'This Month';
    }
  };

  const canProcessPayment = hasRole(['admin', 'accounts']);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading && !refreshing && bills.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Billing Management</h1>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded animate-pulse w-48" />
                  <div className="h-3 bg-[var(--bg-main)] rounded animate-pulse w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Billing Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage patient bills, payments, and insurance claims
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredBills.length} bill(s) · Total: ₵{stats.totalAmount.toFixed(2)}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText,    label: 'Total Bills', value: stats.total,                        bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
          { icon: CheckCircle, label: 'Paid',        value: stats.paidCount,                    bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]'  },
          { icon: Clock,       label: 'Pending',     value: stats.pendingCount,                 bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]' },
          { icon: TrendingUp,  label: 'Outstanding', value: `₵${stats.totalBalance.toFixed(2)}`, bg: 'bg-[var(--icon-red-bg)]',   text: 'text-[var(--icon-red-text)]'    },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.text}`} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{stat.label}</p>
                <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Period:</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['today', 'yesterday', 'week', 'month'] as DateFilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => { setDateFilter(f); setShowDatePicker(false); }}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all capitalize ${
                  dateFilter === f
                    ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                }`}
              >
                {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              onClick={() => { setDateFilter('custom'); setShowDatePicker(true); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                dateFilter === 'custom'
                  ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'
                  : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              Custom
            </button>
          </div>

          {showDatePicker && dateFilter === 'custom' && (
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Status Filter & Search */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-[var(--text-secondary)] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            {[
              { val: 'all',     label: 'All',     active: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]'     },
              { val: 'paid',    label: 'Paid',    active: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]'   },
              { val: 'pending', label: 'Pending', active: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'       },
              { val: 'partial', label: 'Partial', active: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => setStatusFilter(s.val)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  statusFilter === s.val
                    ? s.active
                    : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search by bill #, patient name, or folder number..."
                className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-sm placeholder-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Banner */}
      {filteredBills.length > 0 && (
        <div className="bg-[var(--icon-cyan-bg)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--icon-cyan-text)]">
                Showing {paginated.length} of {filteredBills.length} bills
              </p>
              {searchQuery && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Search results for: "{searchQuery}"
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="bg-[var(--bg-card)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-primary)]">
                Total: ₵{stats.totalAmount.toFixed(2)}
              </span>
              <span className="bg-[var(--icon-green-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-green-text)]">
                Paid: ₵{stats.totalPaid.toFixed(2)}
              </span>
              <span className="bg-[var(--icon-red-bg)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--icon-red-text)]">
                Outstanding: ₵{stats.totalBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bills Table / Empty State */}
      {filteredBills.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <Receipt className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            {searchQuery ? 'No Bills Found' : 'No Billing Records'}
          </h3>
          <p className="text-[var(--text-secondary)] text-sm mb-4">
            {searchQuery
              ? 'No bills match your search criteria. Try adjusting your search terms.'
              : `No billing records found for ${getDateFilterDisplay().toLowerCase()}.`}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm border border-[var(--border-color)]"
            >
              <X className="w-4 h-4" />
              Clear Search
            </button>
          ) : dateFilter !== 'month' ? (
            <button
              onClick={() => setDateFilter('month')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
            >
              <Calendar className="w-4 h-4" />
              View This Month's Bills
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  {['Bill #', 'Patient', 'Date', 'Total', 'Paid', 'Balance', 'Payment', 'Status', 'Actions'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase ${
                        i >= 3 && i <= 5 ? 'text-right' : i === 8 ? 'text-center' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginated.map((bill) => {
                  const patient = getPatientFromBill(bill);
                  const patientName = getPatientName(patient);

                  return (
                    <tr key={bill.id} className="hover:bg-[var(--bg-main)] transition-colors duration-150">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-primary)] text-sm">{bill.billNumber}</p>
                        {bill.claimNumber && (
                          <p className="text-xs text-[var(--text-secondary)]">Claim: {bill.claimNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{patientName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{patient?.folderNumber || 'No Folder'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)] text-sm">
                          {formatDate(bill.billDate || bill.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-bold text-[var(--text-primary)]">₵{bill.totalAmount?.toFixed(2) || '0.00'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-[var(--icon-green-text)]">₵{bill.paidAmount?.toFixed(2) || '0.00'}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className={`font-bold ${bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                          ₵{bill.balance?.toFixed(2) || '0.00'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          {getPaymentModeIcon(bill.paymentMode)}
                          <span className="font-medium text-[var(--text-secondary)]">
                            {getPaymentModeLabel(bill.paymentMode)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bill.status)}`}>
                          {bill.status === 'paid'    && <CheckCircle  className="w-3 h-3 mr-1" />}
                          {bill.status === 'pending' && <AlertCircle  className="w-3 h-3 mr-1" />}
                          {bill.status === 'partial' && <Clock        className="w-3 h-3 mr-1" />}
                          {bill.status?.charAt(0).toUpperCase() + bill.status?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/dashboard/patients/${bill.patientId}/billing`}
                            className="p-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
                            title="View Patient Billing Items"
                          >
                            <Receipt className="w-4 h-4" />
                          </Link>
                          {canProcessPayment && bill.balance > 0 && (
                            <Link
                              to={`/dashboard/billing/${bill.id}/payment`}
                              className="p-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors"
                              title="Process Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handlePrintStatement(bill.id)}
                            disabled={isDocLoading}
                            className="p-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors disabled:opacity-50"
                            title="Print Bill Statement"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(`/api/bills/${bill.id}/report`, '_blank')}
                            className="p-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-colors"
                            title="Print Bill"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredBills.length)} of{' '}
                  {filteredBills.length} bills
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5)           pageNum = i + 1;
                    else if (currentPage <= 3)     pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else                           pageNum = currentPage - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[var(--text-primary)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}