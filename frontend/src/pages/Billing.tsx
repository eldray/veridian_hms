// src/pages/Billing.tsx - COMPLETE CORRECTED VERSION
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useWaiverStore } from '../store/waiverStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDocumentStore } from '../store/documentStore';
import { openPrintWindow, generatePDF } from '../utils/pdfGenerator';
import {
  Search, RefreshCw, FileText, DollarSign, CreditCard, Eye,
  ChevronLeft, ChevronRight, Receipt, TrendingUp,
  AlertCircle, CheckCircle, Clock, Shield, User, Calendar, X,
  Filter, Printer, Hospital, Gift, Loader2
} from 'lucide-react';
import type { BillStatus, PaymentMode } from '../types';

type DateFilterType = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

// Helper functions
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

const formatCurrency = (amount: number) => `₵${amount?.toFixed(2) ?? '0.00'}`;

const getPaymentModeIcon = (mode: PaymentMode) => {
  switch (mode) {
    case 'nhis': return <Shield className="w-3.5 h-3.5 text-[var(--icon-green-text)]" />;
    case 'private_insurance': return <Hospital className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />;
    default: return <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />;
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

const getStatusColor = (status: BillStatus) => {
  switch (status) {
    case 'paid': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    case 'partial': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
    case 'pending': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
    case 'draft': return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    case 'cancelled': return 'bg-[var(--bg-main)] text-[var(--text-tertiary)]';
    default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  }
};

const getWaiverStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
    case 'rejected': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
    case 'pending': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
    default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
  }
};

const getWaiverTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    indigent: 'Indigent',
    nhis_exempt: 'NHIS Exempt',
    staff_discount: 'Staff Discount',
    management_discretion: 'Management Discretion',
    other: 'Other'
  };
  return types[type] || type;
};

export default function Billing() {
  const { success, error: toastError } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'bills' | 'waivers'>('bills');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Waiver modal state
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedBillForWaiver, setSelectedBillForWaiver] = useState<any>(null);
  const [waiverForm, setWaiverForm] = useState({
    waiverType: 'indigent',
    reason: '',
    amountRequested: 0
  });
  const [submittingWaiver, setSubmittingWaiver] = useState(false);

  // Store hooks
  const {
    bills,
    isLoading: billsLoading,
    getBills,
    getBillStatistics,
  } = useBillingStore();

  const {
    waivers,
    getWaivers,
    createWaiver,
    approveWaiver,
    rejectWaiver,
    statistics: waiverStats,
    getStatistics: getWaiverStats,
    isLoading: waiversLoading
  } = useWaiverStore();

  const { patients, loadPatients } = usePatientStore();
  const { hasRole } = useAuthStore();
  const { generateBillStatement, isLoading: isDocLoading } = useDocumentStore();

  const isAccountsStaff = hasRole(['admin', 'accounts']);
  const isLoading = billsLoading || waiversLoading;

  // Get date range for filters
  const getDateRange = useCallback((): { startDate: Date; endDate: Date } | null => {
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
  }, [dateFilter, customStartDate, customEndDate]);

  const getDateFilterDisplay = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${formatDateOnly(customStartDate)} – ${formatDateOnly(customEndDate)}`;
        }
        return 'Custom Range';
      default: return 'This Month';
    }
  };

  // Load data
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
      await Promise.all([
        getBills(filters),
        loadPatients(),
        getBillStatistics(filters),
        getWaivers(filters),
        getWaiverStats(filters)
      ]);
      success('Data refreshed', 'Billing data is up-to-date.');
    } catch (err) {
      toastError('Refresh failed', 'Could not load billing data.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, customStartDate, customEndDate, statusFilter, activeTab]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, statusFilter, activeTab]);

  // Helper to get patient name from bill
  const getPatientName = useCallback((patient: any) => {
    if (!patient) return 'Unknown Patient';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  }, []);

  const getPatientFromBill = useCallback((bill: any) => {
    if (bill.Patient?.surname) return bill.Patient;
    return patients.find((p) => p.id === bill.patientId);
  }, [patients]);

  // Filter bills
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

  // Filter waivers
  const filteredWaivers = useMemo(() => {
    if (!waivers.length) return [];
    let filtered = [...waivers];
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      filtered = filtered.filter((w) =>
        w.reason?.toLowerCase().includes(lower) ||
        w.patient?.surname?.toLowerCase().includes(lower) ||
        w.patient?.otherNames?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [waivers, searchQuery, statusFilter]);

  // Bill statistics
  const stats = useMemo(() => {
    const totalAmount = filteredBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = filteredBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalBalance = filteredBills.reduce((sum, b) => sum + (b.balance || 0), 0);
    const totalWaiverAmount = filteredBills.reduce((sum, b) => sum + (b.waiverAmount || 0), 0);
    const paidCount = filteredBills.filter((b) => b.status === 'paid').length;
    const pendingCount = filteredBills.filter(
      (b) => b.status === 'pending' || b.status === 'partial'
    ).length;
    return { totalAmount, totalPaid, totalBalance, totalWaiverAmount, paidCount, pendingCount, total: filteredBills.length };
  }, [filteredBills]);

  // Waiver statistics
  const waiverStatsData = {
    total: waiverStats?.summary?.totalRequests || 0,
    approved: waiverStats?.summary?.approved || 0,
    rejected: waiverStats?.summary?.rejected || 0,
    pending: waiverStats?.summary?.pending || 0,
    totalRequestedAmount: waiverStats?.summary?.totalRequestedAmount || 0,
    totalApprovedAmount: waiverStats?.summary?.totalApprovedAmount || 0
  };

  // Pagination
  const currentData = activeTab === 'bills' ? filteredBills : filteredWaivers;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = currentData.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Handler: Print bill statement

  const handlePrintStatement = async (billId: string) => {
    try {
      // First, fetch the full bill details including line items
      const bill = bills.find(b => b.id === billId);
      if (!bill) {
        toastError('Error', 'Bill not found');
        return;
      }
      
      // Get the full bill with details (you might need to fetch it again)
      // If your bill object doesn't have BillLineItem, you may need to call getBill
      const result = await generateBillStatement(billId);
      
      if (result.success && result.data) {
        // Get hospital info
        const hospitalInfo = {
          name: result.data.hospitalName || 'Veridian Hospital',
          address: result.data.hospitalAddress || '123 Main Street, Accra, Ghana',
          phone: result.data.hospitalPhone || '+233 123 456 789',
          email: result.data.hospitalEmail || 'info@veridianhospital.com'
        };
        
        // Get patient info
        const patient = getPatientFromBill(bill);
        
        // Prepare data for the bill statement PDF
        const billStatementData = {
          bill: bill,
          patient: patient,
          hospital: hospitalInfo,
          payments: bill.payments || []
        };
        
        // Generate HTML using your bill statement template
        const html = generatePDF('billStatement', billStatementData, hospitalInfo);
        
        // Open in popup window (same as receipt)
        openPrintWindow(html, `Bill-Statement-${bill.billNumber}`);
        
        success('Success', 'Bill statement opened in new window');
      } else {
        toastError('Error', result.message || 'Failed to generate bill statement');
      }
    } catch (err) {
      console.error('Bill statement generation error:', err);
      toastError('Error', 'Could not generate bill statement');
    }
  };
  // Waiver handlers
  const handleCreateWaiver = async () => {
    if (!selectedBillForWaiver) return;
    if (!waiverForm.reason.trim()) {
      toastError('Validation Error', 'Please provide a reason for the waiver');
      return;
    }
    if (waiverForm.amountRequested <= 0) {
      toastError('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (waiverForm.amountRequested > selectedBillForWaiver.balance) {
      toastError('Validation Error', `Amount cannot exceed bill balance (${formatCurrency(selectedBillForWaiver.balance)})`);
      return;
    }

    setSubmittingWaiver(true);
    try {
      await createWaiver({
        patientId: selectedBillForWaiver.patientId,
        billId: selectedBillForWaiver.id,
        waiverType: waiverForm.waiverType,
        reason: waiverForm.reason,
        amountRequested: waiverForm.amountRequested
      });
      success('Waiver Request Created', 'Your request has been submitted for approval');
      setShowWaiverModal(false);
      setSelectedBillForWaiver(null);
      setWaiverForm({ waiverType: 'indigent', reason: '', amountRequested: 0 });
      await loadData();
    } catch (err: any) {
      toastError('Creation Failed', err.message);
    } finally {
      setSubmittingWaiver(false);
    }
  };

  const handleApproveWaiver = async (waiverId: string, amountApproved?: number) => {
    try {
      await approveWaiver(waiverId, amountApproved);
      success('Waiver Approved', 'The waiver has been approved and applied to the bill');
      await loadData();
    } catch (err: any) {
      toastError('Approval Failed', err.message);
    }
  };

  const handleRejectWaiver = async (waiverId: string) => {
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason) return;
    try {
      await rejectWaiver(waiverId, rejectionReason);
      success('Waiver Rejected', 'The waiver request has been rejected');
      await loadData();
    } catch (err: any) {
      toastError('Rejection Failed', err.message);
    }
  };

  // Loading skeleton
  if (isLoading && !refreshing && bills.length === 0 && waivers.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 bg-[var(--bg-main)] rounded w-48 animate-pulse mb-2" />
            <div className="h-4 bg-[var(--bg-main)] rounded w-64 animate-pulse" />
          </div>
          <div className="w-24 h-9 bg-[var(--bg-main)] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 animate-pulse">
              <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg mb-2" />
              <div className="h-6 bg-[var(--bg-main)] rounded w-16" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Billing Management</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage patient bills, payments, waivers, and insurance claims
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {filteredBills.length} bill(s) · Total: {formatCurrency(stats.totalAmount)} · Waivers: {formatCurrency(stats.totalWaiverAmount)}
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { icon: FileText, label: 'Total Bills', value: stats.total, bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]' },
          { icon: DollarSign, label: 'Collected', value: formatCurrency(stats.totalPaid), bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]' },
          { icon: CheckCircle, label: 'Paid Bills', value: stats.paidCount, bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]' },
          { icon: Clock, label: 'Pending', value: stats.pendingCount, bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]' },
          { icon: TrendingUp, label: 'Outstanding', value: formatCurrency(stats.totalBalance), bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]' },
          { icon: Gift, label: 'Waivers', value: formatCurrency(stats.totalWaiverAmount), bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => { setActiveTab('bills'); setStatusFilter('all'); setSearchQuery(''); }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'bills'
              ? 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Bills
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {stats.total}
            </span>
          </div>
        </button>
        <button
          onClick={() => { setActiveTab('waivers'); setStatusFilter('all'); setSearchQuery(''); }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'waivers'
              ? 'text-[var(--icon-purple-text)] border-b-2 border-[var(--icon-purple-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            Waiver Requests
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {waiverStatsData.total}
            </span>
          </div>
        </button>
      </div>

      {/* Filters Bar */}
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
            {activeTab === 'bills' ? (
              <>
                {[
                  { val: 'all', label: 'All', active: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                  { val: 'paid', label: 'Paid', active: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                  { val: 'pending', label: 'Pending', active: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
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
              </>
            ) : (
              <>
                {[
                  { val: 'all', label: 'All', active: 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' },
                  { val: 'pending', label: 'Pending', active: 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]' },
                  { val: 'approved', label: 'Approved', active: 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' },
                  { val: 'rejected', label: 'Rejected', active: 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]' },
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
              </>
            )}
          </div>
          <div className="flex-1 w-full sm:max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder={activeTab === 'bills'
                  ? "Search by bill #, patient name, or folder number..."
                  : "Search by patient name or reason..."}
                className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all bg-[var(--bg-card)] text-sm placeholder-[var(--text-tertiary)]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BILLS TABLE */}
      {activeTab === 'bills' && (
        <>
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-color)] transition-all text-sm"
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
            <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    {['Bill #', 'Patient', 'Date', 'Total', 'Paid', 'Waiver', 'Balance', 'Payment', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase ${
                        i >= 3 && i <= 6 ? 'text-right' : i === 9 ? 'text-center' : 'text-left'
                      }`}>
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
                          <p className="font-bold text-[var(--text-primary)]">{formatCurrency(bill.totalAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium text-[var(--icon-green-text)]">{formatCurrency(bill.paidAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium text-[var(--icon-purple-text)]">{formatCurrency(bill.waiverAmount)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className={`font-bold ${bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]'}`}>
                            {formatCurrency(bill.balance)}
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
                            {bill.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {bill.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {bill.status === 'partial' && <Clock className="w-3 h-3 mr-1" />}
                            {bill.status === 'draft' && <FileText className="w-3 h-3 mr-1" />}
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
                              <Eye className="w-4 h-4" />
                            </Link>
                            {isAccountsStaff && bill.balance > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedBillForWaiver(bill);
                                  setWaiverForm({ 
                                    waiverType: 'indigent', 
                                    reason: '', 
                                    amountRequested: bill.balance 
                                  });
                                  setShowWaiverModal(true);
                                }}
                                className="p-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors"
                                title="Request Waiver"
                              >
                                <Gift className="w-4 h-4" />
                              </button>
                            )}
                            {isAccountsStaff && bill.balance > 0 && (
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
                              className="p-2 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-colors disabled:opacity-50"
                              title="Print Bill Statement"
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
          )}
        </>
      )}

      {/* WAIVERS TABLE */}
      {activeTab === 'waivers' && (
        <>
          {/* Waiver Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { icon: Gift, label: 'Total Requests', value: waiverStatsData.total, bg: 'bg-[var(--icon-cyan-bg)]', text: 'text-[var(--icon-cyan-text)]' },
              { icon: Clock, label: 'Pending', value: waiverStatsData.pending, bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]' },
              { icon: CheckCircle, label: 'Approved', value: waiverStatsData.approved, bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]' },
              { icon: X, label: 'Rejected', value: waiverStatsData.rejected, bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]' },
              { icon: DollarSign, label: 'Approved Amount', value: formatCurrency(waiverStatsData.totalApprovedAmount), bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
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

          {filteredWaivers.length === 0 ? (
            <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
              <Gift className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No Waivers Found' : 'No Waiver Requests'}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No waivers match your search criteria.'
                  : 'No waiver requests have been submitted.'}
              </p>
            </div>
          ) : (
            <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    {['Patient', 'Type', 'Reason', 'Requested', 'Approved', 'Status', 'Requested By', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-[var(--text-secondary)] uppercase text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginated.map((waiver) => (
                    <tr key={waiver.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--text-primary)] text-sm">
                          {waiver.patient?.surname} {waiver.patient?.otherNames}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">{waiver.patient?.folderNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          {getWaiverTypeLabel(waiver.waiverType)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[var(--text-primary)] truncate max-w-xs" title={waiver.reason}>
                          {waiver.reason}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--text-primary)]">{formatCurrency(waiver.amountRequested)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(waiver.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        {waiver.status === 'approved' ? (
                          <p className="font-medium text-[var(--icon-green-text)]">{formatCurrency(waiver.amountApproved)}</p>
                        ) : (
                          <p className="text-[var(--text-tertiary)]">—</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getWaiverStatusColor(waiver.status)}`}>
                          {waiver.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {waiver.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {waiver.status === 'rejected' && <X className="w-3 h-3 mr-1" />}
                          {waiver.status.charAt(0).toUpperCase() + waiver.status.slice(1)}
                        </span>
                        {waiver.rejectionReason && waiver.status === 'rejected' && (
                          <p className="text-xs text-[var(--icon-red-text)] mt-1 truncate max-w-xs" title={waiver.rejectionReason}>
                            {waiver.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[var(--text-primary)]">{waiver.requestedBy?.fullName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(waiver.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {waiver.status === 'pending' && isAccountsStaff && (
                            <>
                              <button
                                onClick={() => {
                                  const amount = prompt('Enter approved amount (leave empty for full amount):', waiver.amountRequested.toString());
                                  handleApproveWaiver(waiver.id, amount ? parseFloat(amount) : undefined);
                                }}
                                className="p-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectWaiver(waiver.id)}
                                className="p-1.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white transition-colors"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <Link
                            to={`/dashboard/patients/${waiver.patientId}/billing`}
                            className="p-1.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors"
                            title="View Bill"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-[var(--text-secondary)]">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, currentData.length)} of {currentData.length} items
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
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
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

              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-[var(--border-color)] rounded-lg text-xs bg-[var(--bg-main)] text-[var(--text-primary)]"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Waiver Request Modal */}
      {showWaiverModal && selectedBillForWaiver && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-lg w-full border border-[var(--border-color)] shadow-xl">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-[var(--text-primary)]">Request Waiver</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Bill: {selectedBillForWaiver.billNumber} | Balance: {formatCurrency(selectedBillForWaiver.balance)}
                </p>
              </div>
              <button
                onClick={() => { setShowWaiverModal(false); setSelectedBillForWaiver(null); }}
                className="p-1.5 hover:bg-[var(--bg-main)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Waiver Type */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Waiver Type <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <select
                  value={waiverForm.waiverType}
                  onChange={(e) => setWaiverForm({ ...waiverForm, waiverType: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
                >
                  <option value="indigent">Indigent</option>
                  <option value="nhis_exempt">NHIS Exempt</option>
                  <option value="staff_discount">Staff Discount</option>
                  <option value="management_discretion">Management Discretion</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Amount Requested */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Amount Requested <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedBillForWaiver.balance}
                    value={waiverForm.amountRequested}
                    onChange={(e) => setWaiverForm({ ...waiverForm, amountRequested: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all"
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Maximum: {formatCurrency(selectedBillForWaiver.balance)}
                </p>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Reason <span className="text-[var(--icon-red-text)]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  placeholder="Explain why this waiver is needed..."
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all resize-none"
                />
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] p-4 flex gap-3">
              <button
                onClick={handleCreateWaiver}
                disabled={submittingWaiver}
                className="flex-1 px-4 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingWaiver ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
              <button
                onClick={() => { setShowWaiverModal(false); setSelectedBillForWaiver(null); }}
                className="flex-1 px-4 py-2 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}