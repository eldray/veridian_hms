// src/pages/InsuranceClaims.tsx - UPDATED WITH SAME THEME
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Search,
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  PlayCircle,
  Calendar,
  User,
  Activity,
  RefreshCw,
  Send,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InsuranceClaims() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const {
    claims,
    getInsuranceClaims,
    updateClaimStatus,
    generatePrivateInsuranceClaim,
    generateNHISClaim,
    submitInsuranceClaim,
    isLoading: claimsLoading
  } = useInsuranceStore();

  const { attendances, getAttendances, submitNHISClaim, isLoading: attendanceLoading } = useAttendanceStore();
  const { user } = useAuthStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [submittingClaims, setSubmittingClaims] = useState<Set<string>>(new Set());

  const isLoading = claimsLoading || attendanceLoading;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([getInsuranceClaims(), getAttendances()]);
      success('Data loaded', 'Insurance claims ready');
    } catch {
      toastError('Load failed', 'Could not fetch claims or visits');
    }
  };

  const getEligibleAttendances = () => {
    return attendances.filter(att =>
      (att.paymentMode === 'nhis' || att.paymentMode === 'private_insurance') &&
      att.status === 'completed' &&
      !claims.some(c => c.attendanceId === att._id)
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  const filteredClaims = claims.filter(claim => {
    const matchesSearch =
      claim.claimNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patient?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.insuranceProvider?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (claimId: string, newStatus: string, approvedAmount?: number) => {
    try {
      await updateClaimStatus(claimId, {
        status: newStatus,
        ...(approvedAmount && { approvedAmount })
      });
      success('Status updated', `Claim is now ${newStatus}`);
    } catch {
      toastError('Update failed', 'Could not change claim status');
    }
  };

  const handleGenerateClaimForm = async (claim: any) => {
    try {
      let claimForm;
      
      if (claim.insuranceProvider?.type === 'nhis') {
        claimForm = await generateNHISClaim(claim.attendanceId);
      } else {
        claimForm = await generatePrivateInsuranceClaim(claim.attendanceId, claim.insuranceProviderId);
      }

      const xmlContent = typeof claimForm === 'string' ? claimForm : 
                        claimForm.xml || claimForm.data || claimForm;

      if (!xmlContent) {
        throw new Error('No claim data received');
      }

      const blob = new Blob([xmlContent], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${claim.claimNumber}-${claim.insuranceProvider?.type.toUpperCase()}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Claim downloaded', 'XML file ready');
    } catch (error: any) {
      console.error('Claim generation error:', error);
      toastError('Generation failed', error.message || 'Could not create claim file');
    }
  };

  const handleSubmitNHISClaim = async (attendanceId: string) => {
    try {
      setSubmittingClaims(prev => new Set(prev).add(attendanceId));
      await submitNHISClaim(attendanceId);
      success('Claim submitted', 'NHIS claim submitted successfully');
      await loadData();
    } catch (error: any) {
      toastError('Submission failed', error.message || 'Could not submit NHIS claim');
    } finally {
      setSubmittingClaims(prev => {
        const newSet = new Set(prev);
        newSet.delete(attendanceId);
        return newSet;
      });
    }
  };

  const handleCreateClaim = async (attendance: any) => {
    try {
      let insuranceProviderId = attendance.insuranceProviderId;
      
      if (!insuranceProviderId && attendance.paymentMode === 'nhis') {
        const nhisProvider = useInsuranceStore.getState().providers.find(p => p.type === 'nhis');
        if (nhisProvider) {
          insuranceProviderId = nhisProvider._id;
        }
      }

      if (!insuranceProviderId) {
        throw new Error('Insurance provider not found for this attendance');
      }

      await submitInsuranceClaim({
        attendanceId: attendance._id,
        insuranceProviderId: insuranceProviderId,
        status: 'draft'
      });
      success('Claim created', `Draft for ${attendance.attendanceNumber}`);
      await loadData();
    } catch (error: any) {
      toastError('Create failed', error.message || 'Could not start claim');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-[var(--icon-green-text)]" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-[var(--icon-red-text)]" />;
      case 'paid': return <DollarSign className="w-5 h-5 text-[var(--icon-blue-text)]" />;
      case 'processing': return <Clock className="w-5 h-5 text-[var(--icon-yellow-text)]" />;
      case 'submitted': return <FileText className="w-5 h-5 text-[var(--icon-purple-text)]" />;
      default: return <FileText className="w-5 h-5 text-[var(--text-tertiary)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]';
      case 'rejected': return 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
      case 'paid': return 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]';
      case 'processing': return 'bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border-[var(--icon-yellow-text)]';
      case 'submitted': return 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-text)]';
      default: return 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)]';
    }
  };

  const stats = {
    total: claims.length,
    pending: claims.filter(c => ['draft', 'submitted', 'processing'].includes(c.status)).length,
    approved: claims.filter(c => c.status === 'approved').length,
    paid: claims.filter(c => c.status === 'paid').length,
    totalAmount: claims.reduce((sum, c) => sum + (c.totalClaimAmount || 0), 0),
    approvedAmount: claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header - SAME THEME as medical entries */}
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
            <p className="text-sm text-[var(--text-secondary)]">Manage, submit, and track reimbursements</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Claims</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-yellow-text)]">{stats.pending}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Pending</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-green-text)]">{stats.approved}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-2xl font-bold text-[var(--icon-blue-text)]">{stats.paid}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Paid</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--text-primary)]">GHS {stats.totalAmount.toFixed(2)}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Claimed</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="text-lg font-bold text-[var(--icon-green-text)]">GHS {stats.approvedAmount.toFixed(2)}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Approved</div>
        </div>
      </div>

      {/* Eligible Attendances */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-[var(--icon-green-text)]" />
            Eligible for Claims ({eligibleAttendances.length})
          </h2>
          <div className="space-y-3">
            {eligibleAttendances.slice(0, 5).map((att) => (
              <div key={att._id} className="bg-[var(--icon-green-bg)] rounded-lg p-3 border border-[var(--icon-green-text)]">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">{att.attendanceNumber}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        att.paymentMode === 'nhis' 
                          ? 'bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] border-[var(--icon-blue-text)]' 
                          : 'bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] border-[var(--icon-purple-text)]'
                      }`}>
                        {att.paymentMode}
                      </span>
                      <span className="text-xs text-[var(--icon-green-text)] bg-[var(--icon-green-bg)] px-2 py-0.5 rounded-full border border-[var(--icon-green-text)]">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        <span className="truncate">{att.patient?.fullName}</span>
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
                    {att.paymentMode === 'nhis' && (
                      <button
                        onClick={() => handleSubmitNHISClaim(att._id)}
                        disabled={submittingClaims.has(att._id)}
                        className="px-3 py-1.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white disabled:opacity-50 text-xs flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" />
                        {submittingClaims.has(att._id) ? 'Submitting...' : 'Submit NHIS'}
                      </button>
                    )}
                    <button
                      onClick={() => handleCreateClaim(att)}
                      className="px-3 py-1.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white text-xs"
                    >
                      Create Draft
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
            placeholder="Search by claim, patient, or provider..."
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
          <option value="processing">Processing</option>
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
          <p className="text-[var(--text-secondary)]">No claims found</p>
          {eligibleAttendances.length > 0 && (
            <p className="text-[var(--text-tertiary)] text-sm mt-1">
              {eligibleAttendances.length} completed visits ready for claims
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <div key={claim._id} className="bg-[var(--bg-card)] rounded-xl p-5 border border-[var(--border-color)] hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(claim.status)}
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)] text-sm">{claim.claimNumber}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {claim.patient?.fullName} • {claim.insuranceProvider?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                    {claim.status}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleGenerateClaimForm(claim)}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-bg)] rounded-lg transition"
                      title="Download XML"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[var(--text-secondary)]">Claim:</span>
                  <p className="font-medium text-[var(--text-primary)]">GHS {claim.totalClaimAmount?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Approved:</span>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Submitted:</span>
                  <p className="font-medium text-[var(--text-primary)]">
                    {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">Type:</span>
                  <p className="font-medium text-[var(--text-primary)]">{claim.insuranceProvider?.type.toUpperCase()}</p>
                </div>
              </div>

              {(user?.role === 'admin' || user?.role === 'accounts') && (
                <div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]">
                  {claim.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(claim._id, 'approved', claim.totalClaimAmount)}
                        className="flex-1 py-1.5 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white text-xs"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(claim._id, 'rejected')}
                        className="flex-1 py-1.5 bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-text)] hover:text-white text-xs"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {claim.status === 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate(claim._id, 'paid')}
                      className="flex-1 py-1.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white text-xs"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}