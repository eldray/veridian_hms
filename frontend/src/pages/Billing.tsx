// src/pages/Billing.tsx - COMPLETE CORRECTED VERSION
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBillingStore } from '../store/billingStore';
import { useWaiverStore } from '../store/waiverStore';
import { usePatientStore } from '../store/patientStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDocumentStore } from '../store/documentStore';
import { openPrintWindow, generatePDF } from '../utils/pdfGenerator';
import { getBillingCollections, getBillingInvoice } from '../api';
import { promptDialog } from '../context/PromptDialog';
import {
  RefreshCw, FileText, DollarSign, CreditCard, Eye,
  Receipt, TrendingUp,
  CheckCircle, Clock, Shield, User, Calendar, X,
  Filter, Printer, Hospital, Gift, Loader2, Users, Layers
} from 'lucide-react';
import {
  Badge, Button, Card, cn, Field, humanStatus, INPUT, LinkButton, PageHeader, Pagination,
  SearchInput, SELECT, StatCard, statusTone, TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR,
} from '../components/ui';
import type { PaymentMode } from '../types';
import type { BillingCollectionItem, BillingCollectionsReport } from '../types/billing';

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

const formatCurrency = (amount: number | string | null | undefined) =>
  `₵${Number(amount || 0).toFixed(2)}`;

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
    corporate: 'Corporate',
  };
  return modeMap[mode] || 'Cash';
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
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<'bills' | 'collections' | 'waivers'>('bills');

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
  const [collectionsReport, setCollectionsReport] = useState<BillingCollectionsReport>({
    totalAmount: 0,
    paymentCount: 0,
    payments: []
  });
  const [collectionsLoading, setCollectionsLoading] = useState(false);

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

  // Bills already carry the patient name; the register is only consulted for legacy rows,
  // so this page never downloads all patients (or all visits) just to render a list.
  const { patients } = usePatientStore();
  const { hasRole } = useAuthStore();
  const { isLoading: isDocLoading } = useDocumentStore();

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
      setCollectionsLoading(activeTab === 'collections');
      if (activeTab === 'collections' && !dateRange) {
        setCollectionsReport({ totalAmount: 0, paymentCount: 0, payments: [] });
      }
      const filters: any = {};
      if (dateRange) {
        filters.dateFrom = dateRange.startDate.toISOString();
        filters.dateTo = dateRange.endDate.toISOString();
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      const [, , , , collections] = await Promise.all([
        getBills({ ...filters, limit: 5000 }), // all pages of the selected window (100 per request)
        getBillStatistics(filters),
        getWaivers(filters),
        getWaiverStats(filters),
        activeTab === 'collections' && dateRange
          ? getBillingCollections({
              dateFrom: dateRange.startDate.toISOString(),
              dateTo: dateRange.endDate.toISOString()
            })
          : Promise.resolve(null)
      ]);
      if (activeTab === 'collections') {
        setCollectionsReport(collections || { totalAmount: 0, paymentCount: 0, payments: [] });
      }
      success('Data refreshed', 'Billing data is up-to-date.');
    } catch (err) {
      toastError('Refresh failed', 'Could not load billing data.');
    } finally {
      setRefreshing(false);
      setCollectionsLoading(false);
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
    return patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown Patient';
  }, []);

  // Indexed register: the bill filter calls this for every loaded bill, and scanning the
  // patient list linearly from there froze the screen on a long billing queue.
  const patientById = useMemo(
    () => new Map((patients || []).map((p: any) => [p.id, p] as [string, any])),
    [patients],
  );

  const getPatientFromBill = useCallback((bill: any) => {
    // The API lowercases relation keys, but older call sites still read the Prisma spelling.
    const registered = bill.Patient?.surname ? bill.Patient : (bill.patient?.surname ? bill.patient : null);
    if (registered) return registered;
    // A counter ticket bills a walk-in who is not in the register; their name is on the bill.
    const walkIn = bill.CounterClient || bill.counterClient;
    if (walkIn?.name) return walkIn;
    return patientById.get(bill.patientId);
  }, [patientById]);

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

  const collectionRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return collectionsReport.payments.flatMap((payment) =>
      payment.items.map((item: BillingCollectionItem) => ({
        payment,
        item,
        searchText: [
          payment.reference,
          payment.bill.billNumber,
          payment.bill.customer.name,
          payment.bill.customer.reference,
          payment.collector.fullName,
          item.description,
          item.serviceCategory
        ].join(' ').toLowerCase()
      }))
    ).filter((row) => !query || row.searchText.includes(query));
  }, [collectionsReport.payments, searchQuery]);

  const collectionSummaries = useMemo(() => {
    const byCategory = new Map<string, number>();
    const byCollector = new Map<string, { amount: number; payments: number }>();
    for (const payment of collectionsReport.payments) {
      const collector = byCollector.get(payment.collector.id) || { amount: 0, payments: 0 };
      collector.amount += payment.amount;
      collector.payments += 1;
      byCollector.set(payment.collector.id, collector);
      for (const item of payment.items) {
        byCategory.set(item.serviceCategory, (byCategory.get(item.serviceCategory) || 0) + item.amount);
      }
    }
    return {
      categories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      collectors: [...byCollector.entries()].sort((a, b) => b[1].amount - a[1].amount)
    };
  }, [collectionsReport]);

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
  const currentData = activeTab === 'bills'
    ? filteredBills
    : activeTab === 'waivers' ? filteredWaivers : collectionRows;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);
  const paginatedWaivers = filteredWaivers.slice(startIndex, startIndex + itemsPerPage);
  const paginatedCollectionRows = collectionRows.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Handler: Print bill statement

const handlePrintStatement = async (billId: string) => {
  try {
    // Fetch the full bill with line items
    const fullBill: any = await getBillingInvoice(billId);
    if (!fullBill) {
      toastError('Error', 'Bill not found');
      return;
    }

    const patient = fullBill.Patient || getPatientFromBill(fullBill);
    const hospitalInfo = {
      name: fullBill.hospitalName || 'Veridian Hospital',
      address: fullBill.hospitalAddress || '123 Main Street, Accra, Ghana',
      phone: fullBill.hospitalPhone || '+233 123 456 789',
      email: fullBill.hospitalEmail || 'info@veridianhospital.com',
    };

    const billStatementData = {
      bill: fullBill,
      patient,
      hospital: hospitalInfo,
      payments: fullBill.Payment || [],   // ← capital P
    };

    const html = generatePDF('billStatement', billStatementData, hospitalInfo);
    openPrintWindow(html, `Bill-Statement-${fullBill.billNumber}`);
    success('Success', 'Bill statement opened');
  } catch (err: any) {
    console.error('Bill statement error:', err);
    toastError('Error', err?.response?.data?.message || 'Could not generate bill statement');
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
    const rejectionReason = await promptDialog({
      title: 'Reject waiver request',
      message: 'The reason is recorded against the request and shown to whoever raised it.',
      label: 'Rejection reason',
      required: true,
      multiline: true,
      confirmText: 'Reject waiver',
      maxLength: 2000,
    });
    if (!rejectionReason) return;
    try {
      await rejectWaiver(waiverId, rejectionReason);
      success('Waiver Rejected', 'The waiver request has been rejected');
      await loadData();
    } catch (err: any) {
      toastError('Rejection Failed', err.message);
    }
  };

  // One header for this screen, reused by the loading branch so the title never jumps.
  const pageHeader = (
    <PageHeader
      title="Billing Management"
      subtitle="Manage patient bills, payments, waivers, and insurance claims"
      meta={`${filteredBills.length} bill(s) · Total: ${formatCurrency(stats.totalAmount)} · Waivers: ${formatCurrency(stats.totalWaiverAmount)}`}
      icon={DollarSign}
      accent="yellow"
      actions={(
        <>
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/dashboard/estimates')}>
            Estimates
          </Button>
          <Button icon={RefreshCw} loading={refreshing} onClick={loadData}>Refresh</Button>
        </>
      )}
    />
  );

  // Loading skeleton
  if (isLoading && !refreshing && bills.length === 0 && waivers.length === 0) {
    return (
      <div className="space-y-6 p-6">
        {pageHeader}
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
      {pageHeader}

      {/* Stat Cards */}
      {activeTab !== 'collections' && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard label="Total Bills" value={stats.total} icon={FileText} accent="cyan" />
          <StatCard label="Collected" size="money" value={formatCurrency(stats.totalPaid)} icon={DollarSign} accent="green" />
          <StatCard label="Paid Bills" value={stats.paidCount} icon={CheckCircle} accent="green" />
          <StatCard label="Pending" value={stats.pendingCount} icon={Clock} accent="yellow" />
          <StatCard label="Outstanding" size="money" value={formatCurrency(stats.totalBalance)} icon={TrendingUp} accent="red" />
          <StatCard label="Waivers" size="money" value={formatCurrency(stats.totalWaiverAmount)} icon={Gift} accent="purple" />
        </div>
      )}

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
          onClick={() => { setActiveTab('collections'); setStatusFilter('all'); setSearchQuery(''); }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'collections'
              ? 'text-[var(--icon-green-text)] border-b-2 border-[var(--icon-green-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Collections
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {collectionsReport.paymentCount}
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
      <Card>
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
                aria-label="Custom period start date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={cn(INPUT, 'w-auto')}
              />
              <span className="text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                aria-label="Custom period end date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={cn(INPUT, 'w-auto')}
              />
            </div>
          )}
        </div>
      </Card>


      {/* Status Filter & Search */}
      {activeTab !== 'collections' && <Card>
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
          <SearchInput
            className="w-full sm:max-w-sm"
            value={searchQuery}
            onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
            placeholder={activeTab === 'bills'
              ? "Search by bill #, patient name, or folder number..."
              : "Search by patient name or reason..."}
          />
        </div>
      </Card>}

      {/* PAYMENT COLLECTIONS */}
      {activeTab === 'collections' && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Collected" size="money" value={formatCurrency(collectionsReport.totalAmount)} icon={DollarSign} accent="green" />
            <StatCard label="Receipts" value={collectionsReport.paymentCount} icon={Receipt} accent="cyan" />
            <StatCard label="Collectors" value={collectionSummaries.collectors.length} icon={Users} accent="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Collected by Service Category" icon={Layers}>
              {collectionSummaries.categories.length ? (
                <div className="divide-y divide-[var(--border-color)]">
                  {collectionSummaries.categories.map(([category, amount]) => (
                    <div key={category} className="py-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)] capitalize">{category.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[var(--text-tertiary)]">No category totals for this period.</p>}
            </Card>
            <Card title="Collected by User" icon={Users} accent="purple">
              {collectionSummaries.collectors.length ? (
                <div className="divide-y divide-[var(--border-color)]">
                  {collectionSummaries.collectors.map(([collectorId, summary]) => {
                    const collector = collectionsReport.payments.find((payment) => payment.collector.id === collectorId)?.collector;
                    return (
                      <div key={collectorId} className="py-2 flex items-center justify-between text-sm gap-3">
                        <span className="text-[var(--text-secondary)]">{collector?.fullName || collector?.username || 'Unknown user'} <span className="text-xs">({summary.payments} receipts)</span></span>
                        <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(summary.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-[var(--text-tertiary)]">No collections for this period.</p>}
            </Card>
          </div>

          <Card
            title="Itemized Collections"
            description="Payment amounts are allocated proportionally across each bill's active service items."
            actions={(
              <SearchInput
                className="w-full sm:max-w-sm"
                value={searchQuery}
                onChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
                placeholder="Search patient, bill, collector, or item..."
              />
            )}
          >
            {collectionsLoading ? (
              <div className="py-12 flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading collections...
              </div>
            ) : collectionRows.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
                <p className="font-medium text-[var(--text-primary)]">{searchQuery ? 'No matching collection items' : 'No collections found'}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">No payments were recorded for {getDateFilterDisplay().toLowerCase()}.</p>
              </div>
            ) : (
              <div className={TABLE_SHELL}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={TH_ROW}>
                      <tr>
                        {['Collected At', 'Receipt / Bill', 'Paid For', 'Collected By', 'Method', 'Service Item', 'Category', 'Qty', 'Allocated Amount'].map((heading) => (
                          <th key={heading} className={cn(TH, heading === 'Allocated Amount' || heading === 'Qty' ? 'text-right' : 'text-left')}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCollectionRows.map(({ payment, item }: { payment: BillingCollectionsReport['payments'][number]; item: BillingCollectionItem }, index: number) => (
                        <tr key={`${payment.id}-${item.id}-${index}`} className={TR}>
                          <td className={cn(TD, 'text-[var(--text-secondary)]')}>{formatDate(payment.transactionDate)}</td>
                          <td className={TD_MONO}>
                            <p className="font-medium text-[var(--text-primary)]">{payment.reference || payment.id}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{payment.bill.billNumber}</p>
                          </td>
                          <td className={TD}>
                            <p className="font-medium text-[var(--text-primary)]">{payment.bill.customer.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {payment.bill.customer.reference || 'Walk-in (no folder)'}
                            </p>
                          </td>
                          <td className={TD}>{payment.collector.fullName || payment.collector.username}</td>
                          <td className={cn(TD, 'capitalize text-[var(--text-secondary)]')}>{payment.paymentMethod.replace(/_/g, ' ')}</td>
                          <td className={cn(TD, 'whitespace-normal')}>{item.description}</td>
                          <td className={cn(TD, 'capitalize text-[var(--text-secondary)]')}>{item.serviceCategory.replace(/_/g, ' ')}</td>
                          <td className={cn(TD, 'text-right text-[var(--text-secondary)]')}>{item.quantity}</td>
                          <td className={cn(TD, 'text-right font-semibold')}>{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* BILLS TABLE */}
      {activeTab === 'bills' && (
        <>
          {filteredBills.length === 0 ? (
            <Card className="text-center">
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
                <Button variant="secondary" icon={X} onClick={() => setSearchQuery('')}>Clear Search</Button>
              ) : dateFilter !== 'month' ? (
                <Button variant="soft" accent="cyan" icon={Calendar} onClick={() => setDateFilter('month')}>
                  View This Month's Bills
                </Button>
              ) : null}
            </Card>
          ) : (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    {[
                      { h: 'Bill #', a: 'text-left' },
                      { h: 'Patient', a: 'text-left' },
                      { h: 'Folder #', a: 'text-left' },
                      { h: 'Attendance #', a: 'text-left' },
                      { h: 'Date', a: 'text-left' },
                      { h: 'Total', a: 'text-right' },
                      { h: 'Paid', a: 'text-right' },
                      { h: 'Waiver', a: 'text-right' },
                      { h: 'Balance', a: 'text-right' },
                      { h: 'Payment', a: 'text-left' },
                      { h: 'Status', a: 'text-left' },
                      { h: 'Actions', a: 'text-center' },
                    ].map((col) => (
                      <th key={col.h} className={cn(TH, col.a)}>
                        {col.h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedBills.map((bill) => {
                    const patient = getPatientFromBill(bill);
                    const patientName = getPatientName(patient);
                    const isWalkIn = !(bill.patientId || bill.Patient?.id || bill.patient?.id);
                    return (
                      <tr key={bill.id} className={TR}>
                        <td className={TD_MONO}>
                          <p className="font-semibold text-[var(--text-primary)] text-sm">{bill.billNumber}</p>
                          {bill.claimNumber && (
                            <p className="text-xs text-[var(--text-secondary)]">Claim: {bill.claimNumber}</p>
                          )}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-[var(--text-primary)] text-sm truncate">{patientName}</p>
                              {isWalkIn && (
                                <p className="text-xs text-[var(--text-secondary)]">Walk-in customer</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={TD_MONO}>{patient?.folderNumber || '—'}</td>
                        <td className={TD_MONO}>{bill.attendance?.attendanceNumber || '—'}</td>
                        <td className={TD}>{formatDate(bill.billDate || bill.createdAt)}</td>
                        <td className={cn(TD, 'text-right font-bold')}>{formatCurrency(bill.totalAmount)}</td>
                        <td className={cn(TD, 'text-right font-medium text-[var(--icon-green-text)]')}>{formatCurrency(bill.paidAmount)}</td>
                        <td className={cn(TD, 'text-right font-medium text-[var(--icon-purple-text)]')}>{formatCurrency(bill.waiverAmount)}</td>
                        <td className={cn(
                          TD,
                          'text-right font-bold',
                          bill.balance > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-green-text)]',
                        )}>
                          {formatCurrency(bill.balance)}
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-1.5 text-xs">
                            {getPaymentModeIcon(bill.paymentMode)}
                            <span className="font-medium text-[var(--text-secondary)]">
                              {getPaymentModeLabel(bill.paymentMode)}
                            </span>
                          </div>
                        </td>
                        <td className={TD}>
                          <Badge tone={statusTone(bill.status)} dot size="sm">{humanStatus(bill.status)}</Badge>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center justify-center gap-2">
                            <LinkButton
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Eye}
                              aria-label="View Patient Billing Items"
                              className="text-[var(--icon-cyan-text)]"
                              to={`/dashboard/patients/${bill.patientId}/billing?billId=${encodeURIComponent(bill.id)}`}
                            />
                            {isAccountsStaff && bill.balance > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Gift}
                                aria-label="Request Waiver"
                                className="text-[var(--icon-purple-text)]"
                                onClick={() => {
                                  setSelectedBillForWaiver(bill);
                                  setWaiverForm({ 
                                    waiverType: 'indigent', 
                                    reason: '', 
                                    amountRequested: bill.balance 
                                  });
                                  setShowWaiverModal(true);
                                }}
                              />
                            )}
                            {isAccountsStaff && bill.balance > 0 && (
                              <LinkButton
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={DollarSign}
                                aria-label="Process Payment"
                                className="text-[var(--icon-green-text)]"
                                to={`/dashboard/billing/${bill.id}/payment`}
                              />
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Printer}
                              aria-label="Print Bill Statement"
                              className="text-[var(--icon-yellow-text)]"
                              disabled={isDocLoading}
                              onClick={() => handlePrintStatement(bill.id)}
                            />
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
        </>
      )}

      {/* WAIVERS TABLE */}
      {activeTab === 'waivers' && (
        <>
          {/* Waiver Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Requests" value={waiverStatsData.total} icon={Gift} accent="cyan" />
            <StatCard label="Pending" value={waiverStatsData.pending} icon={Clock} accent="yellow" />
            <StatCard label="Approved" value={waiverStatsData.approved} icon={CheckCircle} accent="green" />
            <StatCard label="Rejected" value={waiverStatsData.rejected} icon={X} accent="red" />
            <StatCard label="Approved Amount" size="money" value={formatCurrency(waiverStatsData.totalApprovedAmount)} icon={DollarSign} accent="purple" />
          </div>

          {filteredWaivers.length === 0 ? (
            <Card className="text-center">
              <Gift className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                {searchQuery || statusFilter !== 'all' ? 'No Waivers Found' : 'No Waiver Requests'}
              </h3>
              <p className="text-[var(--text-secondary)] text-sm">
                {searchQuery || statusFilter !== 'all' 
                  ? 'No waivers match your search criteria.'
                  : 'No waiver requests have been submitted.'}
              </p>
            </Card>
          ) : (
            <div className={TABLE_SHELL}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={TH_ROW}>
                  <tr>
                    {['Patient', 'Folder #', 'Attendance #', 'Type', 'Reason', 'Requested', 'Approved', 'Status', 'Requested By', 'Actions'].map((h) => (
                      <th key={h} className={cn(TH, 'text-left')}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedWaivers.map((waiver) => (
                    <tr key={waiver.id} className={TR}>
                      <td className={cn(TD, 'font-semibold')}>
                        {waiver.patient?.surname} {waiver.patient?.otherNames}
                      </td>
                      <td className={TD_MONO}>{waiver.patient?.folderNumber || '—'}</td>
                      <td className={TD_MONO}>{waiver.bill?.attendance?.attendanceNumber || '—'}</td>
                      <td className={TD}>
                        <Badge tone="cyan" size="sm">{getWaiverTypeLabel(waiver.waiverType)}</Badge>
                      </td>
                      <td className={cn(TD, 'whitespace-normal max-w-xs')}>
                        <p className="truncate" title={waiver.reason}>
                          {waiver.reason}
                        </p>
                      </td>
                      <td className={TD}>
                        <p className="font-medium text-[var(--text-primary)]">{formatCurrency(waiver.amountRequested)}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(waiver.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className={TD}>
                        {waiver.status === 'approved' ? (
                          <p className="font-medium text-[var(--icon-green-text)]">{formatCurrency(waiver.amountApproved)}</p>
                        ) : (
                          <p className="text-[var(--text-tertiary)]">—</p>
                        )}
                      </td>
                      <td className={TD}>
                        <Badge tone={statusTone(waiver.status)} dot size="sm">{humanStatus(waiver.status)}</Badge>
                        {waiver.rejectionReason && waiver.status === 'rejected' && (
                          <p className="text-xs text-[var(--icon-red-text)] mt-1 truncate max-w-xs" title={waiver.rejectionReason}>
                            {waiver.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className={TD}>
                        <p className="text-sm text-[var(--text-primary)]">{waiver.requestedBy?.fullName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{new Date(waiver.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          {waiver.status === 'pending' && isAccountsStaff && (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                iconOnly
                                icon={CheckCircle}
                                aria-label="Approve"
                                className="text-[var(--icon-green-text)]"
                                onClick={async () => {
                                  const answer = await promptDialog({
                                    title: 'Approve waiver',
                                    message: `₵${Number(waiver.amountRequested).toLocaleString()} was requested. Leave the amount empty to approve all of it.`,
                                    label: 'Approved amount',
                                    placeholder: 'Full amount',
                                    confirmText: 'Approve',
                                  });
                                  if (answer === null) return;
                                  if (answer === '') {
                                    handleApproveWaiver(waiver.id, undefined);
                                    return;
                                  }
                                  const amount = Number(answer.replace(/,/g, ''));
                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    toastError('Not an amount', 'Enter a number greater than zero, or leave it empty for the full amount.');
                                    return;
                                  }
                                  handleApproveWaiver(waiver.id, amount);
                                }}
                              />
                              <Button
                                size="xs"
                                variant="dangerSoft"
                                iconOnly
                                icon={X}
                                aria-label="Reject"
                                onClick={() => handleRejectWaiver(waiver.id)}
                              />
                            </>
                          )}
                          <LinkButton
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={Eye}
                            aria-label="View Bill"
                            className="text-[var(--icon-cyan-text)]"
                            to={`/dashboard/patients/${waiver.patientId}/billing`}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={currentData.length}
            noun="items"
            onChange={goToPage}
            className="flex-1"
          />
          <select
            aria-label="Rows per page"
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            className={cn(SELECT, 'w-auto text-xs')}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
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
              <Button
                variant="ghost"
                iconOnly
                icon={X}
                aria-label="Close"
                onClick={() => { setShowWaiverModal(false); setSelectedBillForWaiver(null); }}
              />
            </div>

            <div className="p-5 space-y-4">
              <Field label="Waiver Type" required>
                <select
                  value={waiverForm.waiverType}
                  onChange={(e) => setWaiverForm({ ...waiverForm, waiverType: e.target.value })}
                  className={cn(SELECT, 'w-full')}
                >
                  <option value="indigent">Indigent</option>
                  <option value="nhis_exempt">NHIS Exempt</option>
                  <option value="staff_discount">Staff Discount</option>
                  <option value="management_discretion">Management Discretion</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Amount Requested" required hint={`Maximum: ${formatCurrency(selectedBillForWaiver.balance)}`}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm">₵</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedBillForWaiver.balance}
                    value={waiverForm.amountRequested}
                    onChange={(e) => setWaiverForm({ ...waiverForm, amountRequested: parseFloat(e.target.value) || 0 })}
                    className={cn(INPUT, 'w-full pl-8 pr-4')}
                  />
                </div>
              </Field>

              <Field label="Reason" required>
                <textarea
                  rows={3}
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  placeholder="Explain why this waiver is needed..."
                  className={cn(INPUT, 'w-full resize-none')}
                />
              </Field>
            </div>

            <div className="border-t border-[var(--border-color)] p-4 flex gap-3">
              <Button
                variant="soft"
                accent="purple"
                icon={Gift}
                loading={submittingWaiver}
                className="flex-1"
                onClick={handleCreateWaiver}
              >
                Submit Request
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => { setShowWaiverModal(false); setSelectedBillForWaiver(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}