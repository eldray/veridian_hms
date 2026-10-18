// src/pages/InsuranceClaims.tsx
import { useEffect, useState, useMemo } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useToast } from '../store/toastStore';
import {
  Plus, Search, FileText, Download, Eye, DollarSign, PlayCircle,
  Calendar, User, Activity, RefreshCw, Shield, ArrowLeft, Lock,
  Printer, Building, Briefcase, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InsuranceSectionTabs from '../components/InsuranceSectionTabs';

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

const fmtGHS = (v: unknown): string => `GHS ${toNum(v).toFixed(2)}`;

export default function InsuranceClaims() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    nhisClaims, getNHISClaims, generateNHISClaim,
    privateClaims, getPrivateInsuranceClaims, generatePrivateInsuranceClaim,
    corporateClaims, getCorporateClaims, generateCorporateClaim,
    finalizeClaim,
    downloadClaimXml,
    printClaim,
    getClaimsSummary,
    summary,
    isLoading: claimsLoading,
  } = useInsuranceStore();

  const { attendances, getAttendances, isLoading: attendanceLoading } = useAttendanceStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'nhis' | 'private' | 'corporate'>('nhis');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isLoading = claimsLoading || attendanceLoading;

  const currentClaims = useMemo(() => {
    if (activeTab === 'nhis') return nhisClaims;
    if (activeTab === 'private') return privateClaims;
    return corporateClaims;
  }, [activeTab, nhisClaims, privateClaims, corporateClaims]);

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      if (activeTab === 'nhis') await getNHISClaims(filters);
      else if (activeTab === 'private') await getPrivateInsuranceClaims(filters);
      else if (activeTab === 'corporate') await getCorporateClaims(filters);

      await getAttendances();
      await getClaimsSummary(activeTab === 'corporate' ? 'corporate' : activeTab);

      success('Data loaded', `${activeTab.toUpperCase()} claims ready`);
    } catch (error: any) {
      toastError('Load failed', error?.response?.data?.message || error?.message || 'Could not fetch data');
    }
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown';
    return patient.name || patient.fullName || `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown';
  };

  const getPatientAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    if (
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
    ) age--;
    return age >= 0 ? age : null;
  };

  const getInsuranceNumber = (claim: any) => {
    const patient = claim.patient ?? claim.Patient;
    const insuranceDetails = patient?.insuranceDetails;
    if (activeTab === 'nhis') {
      return patient?.nhisNumber || insuranceDetails?.insuranceNumber || insuranceDetails?.memberId || '—';
    }
    return insuranceDetails?.insuranceNumber || insuranceDetails?.policyNumber ||
      insuranceDetails?.memberId || claim.attendance?.corporateEmployeeId || claim.Attendance?.corporateEmployeeId || '—';
  };

  const getEligibleAttendances = () => {
    const paymentMode = activeTab === 'nhis' ? 'nhis' : activeTab === 'private' ? 'private_insurance' : 'corporate';
    return attendances.filter(att =>
      att.paymentMode === paymentMode &&
      att.status === 'completed' &&
      !currentClaims.some((c: any) => c.attendanceId === att.id)
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  const currentStats = useMemo(() => {
    const totalAmount = currentClaims.reduce((s, c: any) => s + toNum(c.totalClaimAmount), 0);
    return {
      total: currentClaims.length,
      draft: currentClaims.filter((c: any) => c.status === 'draft').length,
      finalized: currentClaims.filter((c: any) => c.status === 'finalized').length,
      totalAmount,
      finalizedAmount: toNum(summary?.finalized?.totalAmount),
    };
  }, [currentClaims, summary]);

  const filteredClaims = useMemo(() => {
    return currentClaims.filter((claim: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        claim.claimNumber?.toLowerCase().includes(searchLower) ||
        getPatientFullName(claim.patient ?? claim.Patient).toLowerCase().includes(searchLower) ||
        claim.insuranceProvider?.name?.toLowerCase().includes(searchLower) ||
        claim.InsuranceProvider?.name?.toLowerCase().includes(searchLower) ||
        claim.corporateAccount?.companyName?.toLowerCase().includes(searchLower) ||
        claim.CorporateAccount?.companyName?.toLowerCase().includes(searchLower) ||
        String(getInsuranceNumber(claim)).toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;

      let matchesDate = true;
      const att = claim.attendance ?? claim.Attendance;
      if (startDate && att?.dateTime) matchesDate = matchesDate && new Date(att.dateTime) >= new Date(startDate);
      if (endDate && att?.dateTime) {
        const end = new Date(endDate); end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(att.dateTime) <= end;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [currentClaims, searchTerm, filterStatus, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedClaims = filteredClaims.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, activeTab, startDate, endDate, itemsPerPage]);

  const handleGenerateClaim = async (attendanceId: string) => {
    try {
      setProcessingClaims(prev => new Set(prev).add(attendanceId));
      if (activeTab === 'nhis') {
        await generateNHISClaim(attendanceId);
        success('NHIS Claim Generated', 'Claim draft created');
      } else if (activeTab === 'private') {
        await generatePrivateInsuranceClaim(attendanceId);
        success('Private Claim Generated', 'Claim draft created');
      } else {
        await generateCorporateClaim(attendanceId);
        success('Corporate Claim Generated', 'Claim created');
      }
      await loadData();
      setShowPendingAttendances(false);
    } catch (error: any) {
      toastError('Generation failed', error.message || 'Could not generate claim');
    } finally {
      setProcessingClaims(prev => {
        const next = new Set(prev); next.delete(attendanceId); return next;
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
        const next = new Set(prev); next.delete(claimId); return next;
      });
    }
  };

  const handleDownloadXML = (claimId: string) => {
    try {
      downloadClaimXml(claimId);
      success('XML download started', 'Browser download in progress');
    } catch (error: any) {
      toastError('Download failed', error.message || 'Could not open XML');
    }
  };

  const handlePrintClaim = (claimId: string) => {
    try {
      printClaim(claimId);
      success('Print window opened', 'Use browser print dialog');
    } catch (error: any) {
      toastError('Print failed', error.message || 'Could not open print view');
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'finalized') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'draft') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  const getStatusLabel = (status: string) =>
    status === 'finalized' ? 'Finalized'
    : status === 'draft' ? 'Draft'
    : status;

  const getDateFilterDisplay = () => {
    if (startDate && endDate) return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    if (startDate) return `From ${new Date(startDate).toLocaleDateString()}`;
    if (endDate) return `Until ${new Date(endDate).toLocaleDateString()}`;
    return 'All Dates';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Insurance Claims</h1>
            <p className="text-sm text-gray-500">Manage NHIS, Private Insurance, and Corporate Claims</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredClaims.length} claims • {fmtGHS(currentStats.totalAmount)} total • Showing: {getDateFilterDisplay()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard/insurance-providers')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-700">
            <Shield className="w-4 h-4" /> Providers
          </button>
          {eligibleAttendances.length > 0 && (
            <button onClick={() => setShowPendingAttendances(!showPendingAttendances)} className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-600 hover:text-white text-sm font-medium">
              <Plus className="w-4 h-4" /> New Claim ({eligibleAttendances.length})
            </button>
          )}
          <button onClick={loadData} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-700">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <InsuranceSectionTabs active="claims" />

      <div className="flex gap-2 border-b border-gray-200">
        {(['nhis', 'private', 'corporate'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setFilterStatus('all');
              setSearchTerm('');
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
              loadData();
            }}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeTab === tab
                ? tab === 'nhis' ? 'text-blue-600 border-b-2 border-blue-600'
                : tab === 'private' ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-cyan-600 border-b-2 border-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {tab === 'nhis' && <Shield className="w-4 h-4" />}
              {tab === 'private' && <Building className="w-4 h-4" />}
              {tab === 'corporate' && <Briefcase className="w-4 h-4" />}
              {tab === 'nhis' ? 'NHIS Claims' : tab === 'private' ? 'Private Insurance Claims' : 'Corporate Claims'}
              <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                {tab === 'nhis' ? nhisClaims.length : tab === 'private' ? privateClaims.length : corporateClaims.length}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{currentStats.total}</div>
          <div className="text-xs text-gray-500 mt-1">Total Claims</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-yellow-600">{currentStats.draft}</div>
          <div className="text-xs text-gray-500 mt-1">Draft</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{currentStats.finalized}</div>
          <div className="text-xs text-gray-500 mt-1">Finalized</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="text-lg font-bold text-gray-900">{fmtGHS(currentStats.totalAmount)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Claimed</div>
        </div>
      </div>

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
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Completed</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /><span className="truncate">{getPatientFullName(att.patient)}</span></div>
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{new Date(att.dateTime).toLocaleDateString()}</span></div>
                      <div className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /><span>{att.attendanceType}</span></div>
                      <div className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /><span>{fmtGHS(att.totalBill)}</span></div>
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
              <p className="text-center text-sm text-gray-500 pt-2">+{eligibleAttendances.length - 5} more eligible attendances</p>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 w-full sm:max-w-sm relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'corporate' ? 'Search by claim number, patient, or company...' : 'Search by claim number, patient, or provider...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm" />
              <span className="text-gray-400">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm" />
            </div>

            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="finalized">Finalized</option>
            </select>

            <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 text-sm">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

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
            <p className="text-gray-400 text-sm mt-1">{eligibleAttendances.length} completed visits ready for claims</p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">DOB / Age</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {activeTab === 'nhis' ? 'NHIS Number' : activeTab === 'private' ? 'Policy / Member No.' : 'Insurance / Employee No.'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    {activeTab === 'corporate' ? 'Corporate Account' : 'Provider'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Claim Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Finalized</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClaims.map((claim: any) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{claim.claimNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900">{getPatientFullName(claim.patient ?? claim.Patient)}</div>
                      {(claim.attendance ?? claim.Attendance)?.attendanceNumber && (
                        <div className="text-xs text-gray-500">{(claim.attendance ?? claim.Attendance).attendanceNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const patient = claim.patient ?? claim.Patient;
                        const age = getPatientAge(patient?.dateOfBirth);
                        return (
                          <>
                            <div className="text-gray-700">{patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'DOB unavailable'}</div>
                            <div className="text-xs text-gray-500">{age === null ? 'Age unavailable' : `${age} years`}</div>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-gray-700">{getInsuranceNumber(claim)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {activeTab === 'corporate'
                          ? (claim.corporateAccount?.companyName || claim.CorporateAccount?.companyName || '—')
                          : (claim.insuranceProvider?.name || claim.InsuranceProvider?.name || '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">{fmtGHS(claim.totalClaimAmount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">
                        {claim.finalizedAt ? new Date(claim.finalizedAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {claim.status === 'finalized' && (
                          <>
                            <button
                              onClick={() => handleDownloadXML(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50"
                              title="Download XML"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handlePrintClaim(claim.id)}
                              disabled={processingClaims.has(claim.id)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                              title="Print Claim"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => navigate(`/dashboard/insurance-claims/${claim.id}/edit`)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title={claim.status === 'draft' ? 'Edit Claim' : 'View Claim'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {claim.status === 'draft' && (
                          <button
                            onClick={() => handleFinalizeClaim(claim.id)}
                            disabled={processingClaims.has(claim.id)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg disabled:opacity-50"
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

          {totalPages > 1 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredClaims.length)} of {filteredClaims.length} claim records
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (safePage <= 3) pageNum = i + 1;
                    else if (safePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = safePage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => goToPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-medium ${safePage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {pageNum}
                      </button>
                    );
                  })}
                  <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
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