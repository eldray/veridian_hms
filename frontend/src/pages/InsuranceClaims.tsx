// src/pages/InsuranceClaims.tsx - UPDATED WITH SEPARATED STORE FUNCTIONS
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
  Layers
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

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'nhis' | 'private'>('nhis');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());

  const isLoading = claimsLoading || attendanceLoading;

  // Get current claims based on active tab
  const currentClaims = activeTab === 'nhis' ? nhisClaims : privateClaims;

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === 'nhis') {
        await getNHISClaims();
      } else {
        await getPrivateInsuranceClaims();
      }
      await getAttendances();
      await getFinalizedClaimsTotal({ type: activeTab });
      success('Data loaded', `${activeTab.toUpperCase()} claims ready`);
    } catch {
      toastError('Load failed', 'Could not fetch claims or visits');
    }
  };

  const getPatientFullName = (patient: any) => {
    if (!patient) return 'Unknown';
    return `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Unknown';
  };

  // Get eligible attendances based on active tab
  const getEligibleAttendances = () => {
    const paymentMode = activeTab === 'nhis' ? 'nhis' : 'private_insurance';
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
    draft: currentClaims.filter(c => c.status === 'draft').length,
    submitted: currentClaims.filter(c => c.status === 'submitted').length,
    approved: currentClaims.filter(c => c.status === 'approved').length,
    paid: currentClaims.filter(c => c.status === 'paid').length,
    rejected: currentClaims.filter(c => c.status === 'rejected').length,
    totalAmount: currentClaims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: currentClaims.filter(c => c.status === 'approved').reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
    paidAmount: currentClaims.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.paidAmount || 0), 0),
    finalizedAmount: activeTab === 'nhis' 
      ? (finalizedClaimsTotal?.totalAmount || 0)
      : (finalizedClaimsTotal?.totalAmount || 0)
  };

  // Filter claims by search and status
  const filteredClaims = currentClaims.filter(claim => {
    const matchesSearch =
      claim.claimNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getPatientFullName(claim.patient).toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insuranceProvider?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleGenerateClaim = async (attendanceId: string) => {
    try {
      setProcessingClaims(prev => new Set(prev).add(attendanceId));
      
      if (activeTab === 'nhis') {
        await generateNHISClaim(attendanceId);
        success('NHIS Claim Generated', 'Claim draft created successfully');
      } else {
        await generatePrivateInsuranceClaim(attendanceId);
        success('Private Insurance Claim Generated', 'Claim draft created successfully');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-[var(--icon-red-text)]" />;
      case 'paid': return <DollarSign className="w-5 h-5 text-[var(--icon-blue-text)]" />;
      case 'submitted': return <Lock className="w-5 h-5 text-[var(--icon-purple-text)]" />;
      case 'draft': return <Edit className="w-5 h-5 text-[var(--icon-yellow-text)]" />;
      default: return <FileText className="w-5 h-5 text-[var(--text-tertiary)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'rejected': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
      case 'paid': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      case 'submitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-text)]';
      case 'draft': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted': return 'Finalized';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-12 h-12 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--icon-purple-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Insurance Claims</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage NHIS and Private Insurance claims</p>
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
            Batches
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border-color)]">
        <button
          onClick={() => {
            setActiveTab('nhis');
            setFilterStatus('all');
            setSearchTerm('');
            loadData();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'nhis'
              ? 'text-[var(--icon-blue-text)] border-b-2 border-[var(--icon-blue-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            NHIS Claims
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {nhisClaims.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => {
            setActiveTab('private');
            setFilterStatus('all');
            setSearchTerm('');
            loadData();
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
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {privateClaims.length}
            </span>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{currentStats.total}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Claims</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-yellow-text)]">{currentStats.draft}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Draft</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-purple-text)]">{currentStats.submitted}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Submitted</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-green-text)]">{currentStats.approved}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-blue-text)]">{currentStats.paid}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Paid</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--text-primary)]">GHS {currentStats.totalAmount.toFixed(2)}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Claimed</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--icon-green-text)]">GHS {currentStats.approvedAmount.toFixed(2)}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved Total</div>
        </div>
      </div>

      {/* Eligible Attendances */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
            Eligible for {activeTab === 'nhis' ? 'NHIS' : 'Private Insurance'} Claims ({eligibleAttendances.length})
          </h2>
          <div className="space-y-3">
            {eligibleAttendances.slice(0, 5).map((att) => (
              <div key={att.id} className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--icon-green-text)]">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">{att.attendanceNumber}</h3>
                      <span className="text-xs text-[var(--icon-green-text)] bg-[var(--icon-green-bg)] px-2 py-0.5 rounded-full border border-[var(--icon-green-text)]">
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
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${activeTab === 'nhis' ? 'NHIS' : 'Private'} claims by claim number, patient, or provider...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Claims List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] animate-pulse">
              <div className="h-5 bg-[var(--bg-main)] rounded w-1/3 mb-3"></div>
              <div className="grid grid-cols-4 gap-3">
                <div className="h-3 bg-[var(--bg-main)] rounded"></div>
                <div className="h-3 bg-[var(--bg-main)] rounded"></div>
                <div className="h-3 bg-[var(--bg-main)] rounded"></div>
                <div className="h-3 bg-[var(--bg-main)] rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <FileText className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No {activeTab === 'nhis' ? 'NHIS' : 'Private Insurance'} claims found</p>
          {eligibleAttendances.length > 0 && (
            <p className="text-[var(--text-tertiary)] text-sm mt-1">
              {eligibleAttendances.length} completed visits ready for claims
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(claim.status)}
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{claim.claimNumber}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {getPatientFullName(claim.patient)} • {claim.insuranceProvider?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                    {getStatusLabel(claim.status)}
                  </span>
                  <div className="flex gap-1.5">
                    {claim.status === 'submitted' && (
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
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition disabled:opacity-50"
                          title="Print Claim"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => navigate(`/dashboard/insurance-claims/${claim.id}/edit`)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition"
                      title={claim.status === 'draft' ? 'Edit Claim' : 'View Claim'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)]">Claim Amount:</span>
                  <p className="font-medium text-[var(--text-primary)]">GHS {claim.totalClaimAmount?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Approved:</span>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Paid:</span>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.paidAmount ? `GHS ${claim.paidAmount.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Submitted:</span>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">
                {claim.status === 'draft' && (
                  <>
                    <button
                      onClick={() => navigate(`/dashboard/insurance-claims/${claim.id}/edit`)}
                      className="flex-1 py-1.5 bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white text-xs flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit Draft
                    </button>
                    <button
                      onClick={() => handleFinalizeClaim(claim.id)}
                      disabled={processingClaims.has(claim.id)}
                      className="flex-1 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Lock className="w-3 h-3" />
                      {processingClaims.has(claim.id) ? 'Finalizing...' : 'Finalize'}
                    </button>
                  </>
                )}
                {claim.status === 'submitted' && (
                  <div className="text-xs text-[var(--text-secondary)] italic">
                    Claim finalized and ready for export
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}