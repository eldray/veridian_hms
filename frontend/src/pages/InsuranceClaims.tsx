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
  CheckCircle,
  XCircle,
  DollarSign,
  PlayCircle,
  Calendar,
  User,
  Activity,
  RefreshCw,
  Shield,
  ArrowLeft,
  Edit,
  Lock,
  Printer,
  Building,
  Layers,
  Users,
  CreditCard,
  AlertCircle,
  Trash2,
  Briefcase,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    
    // Corporate Claims (to be added to store)
    corporateClaims,
    getCorporateClaims,
    generateCorporateClaim,
    
    // Common
    finalizeClaim,
    generateClaimXML,
    generateClaimPrint,
    getFinalizedClaimsTotal,
    finalizedClaimsTotal,
    
    // UI State
    isLoading: claimsLoading
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
  const currentClaims = activeTab === 'nhis' ? nhisClaims : activeTab === 'private' ? privateClaims : corporateClaims;

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      if (activeTab === 'nhis') {
        await getNHISClaims(filters);
      } else if (activeTab === 'private') {
        await getPrivateInsuranceClaims(filters);
      } else if (activeTab === 'corporate') {
        await getCorporateClaims(filters);
      }
      
      await getAttendances();
      await getFinalizedClaimsTotal({ type: activeTab === 'corporate' ? 'corporate' : activeTab });
      
      success('Data loaded', `${activeTab.toUpperCase()} claims ready`);
    } catch (error: any) {
      toastError('Load failed', error?.message || 'Could not fetch data');
    }
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown';
  };

  // Get eligible attendances based on active tab
  const getEligibleAttendances = () => {
    const paymentMode = activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';
    return attendances.filter(att =>
      att.paymentMode === paymentMode &&
      att.status === 'completed' &&
      !currentClaims.some(c => c.attendanceId === att.id)
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  // Stats for current tab
  const currentStats = {
    total: currentClaims.length,
    draft: currentClaims.filter((c: any) => c.status === 'draft').length,
    submitted: currentClaims.filter((c: any) => c.status === 'submitted').length,
    approved: currentClaims.filter((c: any) => c.status === 'approved').length,
    paid: currentClaims.filter((c: any) => c.status === 'paid').length,
    rejected: currentClaims.filter((c: any) => c.status === 'rejected').length,
    totalAmount: currentClaims.reduce((sum: number, c: any) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: currentClaims.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + (c.approvedAmount || 0), 0),
    paidAmount: currentClaims.filter((c: any) => c.status === 'paid').reduce((sum: number, c: any) => sum + (c.paidAmount || 0), 0),
    finalizedAmount: finalizedClaimsTotal?.totalAmount || 0
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
      setProcessingClaims(prev => new Set(prev).add(attendanceId));
      
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
      toastError('Generation failed', error.message || 'Could not generate claim');
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(attendanceId);
        return newSet;
      });
    }
  };

  const handleFinalizeClaim = async (claimId: string) => {
    try {
      setProcessingClaims(prev => new Set(prev).add(claimId));
      await finalizeClaim(claimId);
      success('Claim finalized', 'Claim is now ready for submission');
      await loadData();
    } catch (error: any) {
      toastError('Finalize failed', error.message || 'Could not finalize claim');
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handleDownloadXML = async (claimId: string) => {
    try {
      setProcessingClaims(prev => new Set(prev).add(claimId));
      await generateClaimXML(claimId);
      success('XML downloaded', 'Claim XML file ready for submission');
    } catch (error: any) {
      toastError('Download failed', error.message || 'Could not generate XML');
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const handlePrintClaim = async (claimId: string) => {
    try {
      setProcessingClaims(prev => new Set(prev).add(claimId));
      await generateClaimPrint(claimId);
      success('Print ready', 'Claim data ready for printing');
    } catch (error: any) {
      toastError('Print failed', error.message || 'Could not generate print format');
    } finally {
      setProcessingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(claimId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'submitted': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted': return 'Finalized';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getDateFilterDisplay = () => {
    if (startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (startDate) return `From ${new Date(startDate).toLocaleDateString()}`;
    if (endDate) return `Until ${new Date(endDate).toLocaleDateString()}`;
    return 'All Dates';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Insurance Claims</h1>
            <p className="text-sm text-gray-500">Manage NHIS, Private Insurance, and Corporate Claims</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredClaims.length} claims • {currentStats.totalAmount.toFixed(2)} total • Showing: {getDateFilterDisplay()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/insurance-providers')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm text-gray-700"
          >
            <Shield className="w-4 h-4" />
            Providers
          </button>
          {eligibleAttendances.length > 0 && (
            <button
              onClick={() => setShowPendingAttendances(!showPendingAttendances)}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Claim ({eligibleAttendances.length})
            </button>
          )}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 text-sm text-gray-700"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('nhis');
            setFilterStatus('all');
            setSearchTerm('');
            setStartDate('');
            setEndDate('');
            setCurrentPage(1);
            loadData();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'nhis'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            NHIS Claims
            <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
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
            loadData();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'private'
              ? 'text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Private Insurance Claims
            <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
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
            loadData();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'corporate'
              ? 'text-cyan-600 border-b-2 border-cyan-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Corporate Claims
            <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
              {corporateClaims.length}
            </span>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{currentStats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Claims</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{currentStats.draft}</div>
          <div className="text-xs text-gray-500 mt-1">Draft</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{currentStats.submitted}</div>
          <div className="text-xs text-gray-500 mt-1">Submitted</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{currentStats.approved}</div>
          <div className="text-xs text-gray-500 mt-1">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{currentStats.paid}</div>
          <div className="text-xs text-gray-500 mt-1">Paid</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">GHS {currentStats.totalAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Claimed</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-green-600">GHS {currentStats.approvedAmount.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">Approved Total</div>
        </div>
      </div>

      {/* Eligible Attendances */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-green-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-green-600" />
            Eligible for {activeTab === 'nhis' ? 'NHIS' : activeTab === 'private' ? 'Private Insurance' : 'Corporate'} Claims ({eligibleAttendances.length})
          </h2>
          <div className="space-y-3">
            {eligibleAttendances.slice(0, 5).map((att) => (
              <div key={att.id} className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{att.attendanceNumber}</h3>
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
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
                      className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-600 hover:text-white disabled:opacity-50 text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {processingClaims.has(att.id) ? 'Generating...' : 'Generate Claim'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {eligibleAttendances.length > 5 && (
              <p className="text-center text-sm text-gray-500 pt-2">
                +{eligibleAttendances.length - 5} more eligible attendances
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'corporate' 
                ? "Search by claim number, patient, or company..." 
                : "Search by claim number, patient, or provider..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm"
                placeholder="Start Date"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm"
                placeholder="End Date"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm"
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
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <FileText className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No {activeTab === 'nhis' ? 'NHIS' : activeTab === 'private' ? 'Private Insurance' : 'Corporate'} claims found</p>
          {eligibleAttendances.length > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              {eligibleAttendances.length} completed visits ready for claims
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Claim Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {activeTab === 'corporate' ? 'Corporate Account' : 'Provider'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Claim Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Approved</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClaims.map((claim: any) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{claim.claimNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{getPatientFullName(claim.patient)}</div>
                      {claim.Attendance?.attendanceNumber && (
                        <div className="text-xs text-gray-500">{claim.Attendance.attendanceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {activeTab === 'corporate' 
                          ? (claim.corporateAccount?.companyName || '—')
                          : (claim.insuranceProvider?.name || '—')
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">GHS {claim.totalClaimAmount?.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-700">
                        {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-700">
                        {claim.paidAmount ? `GHS ${claim.paidAmount.toFixed(2)}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {claim.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleDownloadXML(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
                              title="Download XML"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintClaim(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                              title="Print Claim"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => navigate(`/dashboard/insurance-claims/${claim.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title={claim.status === 'draft' ? 'Edit Claim' : 'View Claim'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => handleFinalizeClaim(claim.id)}
                            disabled={processingClaims.has(claim.id)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition disabled:opacity-50"
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClaims.length)} of {filteredClaims.length} claim records
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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