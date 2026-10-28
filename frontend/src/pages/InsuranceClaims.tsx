// src/pages/InsuranceClaims.tsx - COMPLETE FIXED VERSION
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Search,
  FileText,
  Download,
  Eye,
  DollarSign,
  PlayCircle,
  Calendar,
  User,
  Activity,
  RefreshCw,
  Shield,
  ArrowLeft,
  Lock,
  Printer,
  Building,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InsuranceSectionTabs from '../components/InsuranceSectionTabs';

export default function InsuranceClaims() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    // NHIS Claims
    nhisClaims,
    getNHISClaims,
    generateNHISClaim,

    // Private Claims
    privateClaims,
    getPrivateInsuranceClaims,
    generatePrivateInsuranceClaim,

    // Corporate Claims
    corporateClaims,
    getCorporateClaims,
    generateCorporateClaim,

    // Common
    finalizeClaim,
    downloadClaimXml,
    printClaim,
    getClaimsSummary,
    summary,

    // UI State
    isLoading: claimsLoading,
  } = useInsuranceStore();

  const { attendances, getAttendances, isLoading: attendanceLoading } = useAttendanceStore();

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'nhis' | 'private' | 'corporate'>('nhis');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isLoading = claimsLoading || attendanceLoading;

  // Get current claims based on active tab
  const currentClaims =
    activeTab === 'nhis' ? nhisClaims : activeTab === 'private' ? privateClaims : corporateClaims;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, startDate, endDate]);

  const paymentModeForTab =
    activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';

  const loadData = async () => {
    const filters: any = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    // 1) Claims list — failure here should surface to the user.
    try {
      if (activeTab === 'nhis') {
        await getNHISClaims(filters);
      } else if (activeTab === 'private') {
        await getPrivateInsuranceClaims(filters);
      } else if (activeTab === 'corporate') {
        await getCorporateClaims(filters);
      }
    } catch (error: any) {
      toastError('Load failed', error?.response?.data?.message || error?.message || 'Could not fetch claims');
    }

    // 2) Attendance worklist — non-fatal.
    // Only visits that can still become a claim on THIS tab: completed, billed through this
    // payment mode, inside the selected window. Asking the server for that keeps the call to
    // a couple of requests instead of walking every visit in the hospital.
    try {
      const worklist: any = { status: 'completed', paymentMode: paymentModeForTab, limit: 200 };
      worklist.dateFrom = startDate
        ? new Date(startDate).toISOString()
        : new Date(Date.now() - 30 * 86_400_000).toISOString();
      if (endDate) {
        const to = new Date(endDate);
        to.setHours(23, 59, 59, 999);
        worklist.dateTo = to.toISOString();
      }
      await getAttendances(worklist);
    } catch {
      /* non-fatal */
    }

    // 3) Summary — non-fatal; failure must not blank the table.
    try {
      await getClaimsSummary(activeTab);
    } catch {
      /* non-fatal */
    }
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown';
    return (
      patient.name ||
      patient.fullName ||
      `${patient.surname || ''} ${patient.otherNames || ''}`.trim() ||
      'Unknown'
    );
  };

  // Get eligible attendances based on active tab
  const getEligibleAttendances = () => {
    const paymentMode =
      activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';
    return attendances.filter(
      (att) =>
        att.paymentMode === paymentMode &&
        att.status === 'completed' &&
        !currentClaims.some((c) => c.attendanceId === att.id)
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  // Stats for current tab
  const currentStats = {
    total: currentClaims.length,
    draft: currentClaims.filter((c: any) => c.status === 'draft').length,
    submitted: currentClaims.filter((c: any) => c.status === 'finalized').length,
    approved: currentClaims.filter((c: any) => c.status === 'approved').length,
    paid: currentClaims.filter((c: any) => c.status === 'paid').length,
    rejected: currentClaims.filter((c: any) => c.status === 'rejected').length,
    totalAmount: currentClaims.reduce((sum: number, c: any) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: currentClaims
      .filter((c: any) => c.status === 'approved')
      .reduce((sum: number, c: any) => sum + (c.approvedAmount || 0), 0),
    paidAmount: currentClaims
      .filter((c: any) => c.status === 'paid')
      .reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0),
    // summary.finalized is the server's authoritative "finalized/submitted" total.
    finalizedAmount: summary?.finalized?.totalAmount || 0,
  };

  // Filter claims by search and status
  const filteredClaims = currentClaims.filter((claim: any) => {
    const matchesSearch =
      claim.claimNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPatientFullName(claim.patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insuranceProvider?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.corporateAccount?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;

    let matchesDate = true;
    if (startDate && claim.Attendance?.dateTime) {
      const claimDate = new Date(claim.Attendance.dateTime);
      const start = new Date(startDate);
      matchesDate = matchesDate && claimDate >= start;
    }
    if (endDate && claim.Attendance?.dateTime) {
      const claimDate = new Date(claim.Attendance.dateTime);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && claimDate <= end;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, activeTab, startDate, endDate]);

  const handleGenerateClaim = async (attendanceId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(attendanceId));

      if (activeTab === 'nhis') {
        await generateNHISClaim(attendanceId);
        success('NHIS Claim Generated', 'Claim draft created successfully');
      } else if (activeTab === 'private') {
        await generatePrivateInsuranceClaim(attendanceId);
        success('Private Insurance Claim Generated', 'Claim draft created successfully');
      } else {
        await generateCorporateClaim(attendanceId);
        success('Corporate Claim Generated', 'Claim created successfully');
      }

      await loadData();
      setShowPendingAttendances(false);
    } catch (error: any) {
      toastError(
        'Generation failed',
        error?.response?.data?.message || error?.message || 'Could not generate claim'
      );
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(attendanceId);
        return newSet;
      });
    }
  };

  const handleFinalizeClaim = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await finalizeClaim(claimId);
      success('Claim finalized', 'Claim is now ready for submission');
      await loadData();
    } catch (error: any) {
      toastError('Finalize failed', error?.response?.data?.message || error?.message || 'Could not finalize claim');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handleDownloadXML = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await downloadClaimXml(claimId);
      success('XML ready', 'Claim XML file is downloading');
    } catch (error: any) {
      toastError('Download failed', error?.message || 'Could not generate XML');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handlePrintClaim = async (claimId: string) => {
    try {
      setProcessingClaims((prev) => new Set(prev).add(claimId));
      await printClaim(claimId);
      success('Print ready', 'Claim data ready for printing');
    } catch (error: any) {
      toastError('Print failed', error?.message || 'Could not generate print format');
    } finally {
      setProcessingClaims((prev) => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]';
      case 'rejected':
        return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]';
      case 'paid':
        return 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]';
      case 'finalized':
        return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]';
      case 'draft':
        return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]';
      default:
        return 'bg-[var(--bg-main)] text-[var(--text-secondary)]';
    }
  };

  const getStatusLabel = (status: string) =>
    status.charAt(0).toUpperCase() + status.slice(1);

  const getDateFilterDisplay = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (startDate) return `From ${new Date(startDate).toLocaleDateString()}`;
    if (endDate) return `Until ${new Date(endDate).toLocaleDateString()}`;
    return 'All Dates';
  };

  return (
    <div className="space-y-6 p-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Insurance Claims</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage NHIS, Private Insurance, and Corporate Claims
            </p>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {filteredClaims.length} claims • {currentStats.totalAmount.toFixed(2)} total • Showing:{' '}
              {getDateFilterDisplay()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/insurance-providers')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Shield className="w-4 h-4" />
            Providers
          </button>
          <button
            onClick={() => navigate('/dashboard/insurance-claims/batches')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Layers className="w-4 h-4" />
            Claim Batches
          </button>
          {eligibleAttendances.length > 0 && (
            <button
              onClick={() => setShowPendingAttendances(!showPendingAttendances)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Claim ({eligibleAttendances.length})
            </button>
          )}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all disabled:opacity-50 text-sm text-[var(--text-primary)]"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Section navigation */}
      <InsuranceSectionTabs active="claims" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => {
            setActiveTab('nhis');
            setFilterStatus('all');
            setSearchTerm('');
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'nhis'
              ? 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            NHIS Claims
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-xs">
              {nhisClaims.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('private');
            setFilterStatus('all');
            setSearchTerm('');
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'private'
              ? 'text-[var(--icon-purple-text)] border-b-2 border-[var(--icon-purple-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Private Insurance Claims
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-xs">
              {privateClaims.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('corporate');
            setFilterStatus('all');
            setSearchTerm('');
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'corporate'
              ? 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Corporate Claims
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-card)] rounded-full text-xs">
              {corporateClaims.length}
            </span>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currentStats.total}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Claims</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-yellow-text)]">{currentStats.draft}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Draft</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-purple-text)]">{currentStats.submitted}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Submitted</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-green-text)]">{currentStats.approved}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-cyan-text)]">{currentStats.paid}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Paid</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            GHS {currentStats.totalAmount.toFixed(2)}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Claimed</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--icon-green-text)]">
            GHS {currentStats.approvedAmount.toFixed(2)}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved Total</div>
        </div>
      </div>

      {/* Eligible Attendances */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
            Eligible for{' '}
            {activeTab === 'nhis'
              ? 'NHIS'
              : activeTab === 'private'
              ? 'Private Insurance'
              : 'Corporate'}{' '}
            Claims ({eligibleAttendances.length})
          </h2>
          <div className="space-y-3">
            {eligibleAttendances.slice(0, 5).map((att) => (
              <div key={att.id} className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                        {att.attendanceNumber}
                      </h3>
                      <span className="text-xs text-[var(--icon-green-text)] bg-[var(--icon-green-bg)] px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{getPatientFullName(att.patient)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(att.dateTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{att.attendanceType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>GHS {att.totalBill?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => handleGenerateClaim(att.id)}
                      disabled={processingClaims.has(att.id)}
                      className="px-3 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {processingClaims.has(att.id) ? 'Generating...' : 'Generate Claim'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {eligibleAttendances.length > 5 && (
              <p className="text-center text-sm text-[var(--text-secondary)] pt-2">
                +{eligibleAttendances.length - 5} more eligible attendances
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'corporate'
                  ? 'Search by claim number, patient, or company...'
                  : 'Search by claim number, patient, or provider...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                placeholder="Start Date"
              />
              <span className="text-[var(--text-tertiary)]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
                placeholder="End Date"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="finalized">Finalized</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"
            >
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 shadow-sm border border-[var(--border-color)] text-center">
          <FileText className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">
            No{' '}
            {activeTab === 'nhis'
              ? 'NHIS'
              : activeTab === 'private'
              ? 'Private Insurance'
              : 'Corporate'}{' '}
            claims found
          </p>
          {eligibleAttendances.length > 0 && (
            <p className="text-[var(--text-tertiary)] text-sm mt-1">
              {eligibleAttendances.length} completed visits ready for claims
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Claim Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    {activeTab === 'corporate' ? 'Corporate Account' : 'Provider'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Claim Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Submitted
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedClaims.map((claim: any) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-[var(--bg-main)] transition-colors duration-150"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                        {claim.claimNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--text-primary)]">{getPatientFullName(claim.patient)}</div>
                      {claim.Attendance?.attendanceNumber && (
                        <div className="text-xs text-[var(--text-secondary)]">
                          {claim.Attendance.attendanceNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)]">
                        {activeTab === 'corporate'
                          ? claim.corporateAccount?.companyName || '—'
                          : claim.insuranceProvider?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          claim.status
                        )}`}
                      >
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-[var(--text-primary)]">
                        GHS {claim.totalClaimAmount?.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[var(--text-primary)]">
                        {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[var(--text-primary)]">
                        {claim.paidAmount ? `GHS ${claim.paidAmount.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-primary)]">
                        {claim.submissionDate
                          ? new Date(claim.submissionDate).toLocaleDateString()
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {claim.status === 'finalized' && (
                          <>
                            <button
                              onClick={() => handleDownloadXML(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] rounded-lg transition disabled:opacity-50"
                              title="Download XML"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintClaim(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] rounded-lg transition disabled:opacity-50"
                              title="Print Claim"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => navigate(`/dashboard/insurance-claims/${claim.id}/edit`)}
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-bg)] rounded-lg transition"
                          title={claim.status === 'draft' ? 'Edit Claim' : 'View Claim'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => handleFinalizeClaim(claim.id)}
                            disabled={processingClaims.has(claim.id)}
                            className="p-1.5 text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] rounded-lg transition disabled:opacity-50"
                            title="Finalize Claim"
                          >
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-[var(--text-secondary)]">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(startIndex + itemsPerPage, filteredClaims.length)} of{' '}
                  {filteredClaims.length} claim records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[var(--icon-cyan-text)] text-white shadow-sm'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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