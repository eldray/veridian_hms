// src/pages/InsuranceClaims.tsx - UPDATED WITH STATUS INTEGRATION
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useAttendanceStore } from '../store/attendanceStore'; // ADDED
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  PlayCircle,
  Calendar,
  User,
  Activity
} from 'lucide-react';

export default function InsuranceClaims() {
  const { claims, getInsuranceClaims, updateClaimStatus, generateNHISClaimForm, generatePrivateInsuranceClaim, isLoading } = useInsuranceStore();
  const { attendances, getAttendances } = useAttendanceStore(); // ADDED
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false); // ADDED

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        getInsuranceClaims(),
        getAttendances() // ADDED: Load attendances for status integration
      ]);
    } catch (error) {
      addToast('Failed to load insurance claims', 'error');
    }
  };

  // ADDED: Get attendances eligible for insurance claims
  const getEligibleAttendances = () => {
    return attendances.filter(attendance => 
      (attendance.paymentMode === 'nhis' || attendance.paymentMode === 'private_insurance') &&
      attendance.status === 'completed' && // Only completed attendances can have claims
      !claims.some(claim => claim.attendanceId === attendance._id) // No existing claim
    );
  };

  const eligibleAttendances = getEligibleAttendances();

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.patient?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.insuranceProvider?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (claimId: string, newStatus: string, approvedAmount?: number) => {
    try {
      await updateClaimStatus(claimId, { 
        status: newStatus,
        ...(approvedAmount && { approvedAmount })
      });
      addToast('Claim status updated successfully', 'success');
    } catch (error) {
      addToast('Failed to update claim status', 'error');
    }
  };

  const handleGenerateClaimForm = async (claim: any) => {
    try {
      let claimForm;
      if (claim.insuranceProvider?.type === 'nhis') {
        claimForm = await generateNHISClaimForm(claim.attendanceId);
      } else {
        claimForm = await generatePrivateInsuranceClaim(claim.attendanceId, claim.insuranceProviderId);
      }
      
      // Download the claim form as JSON (in real app, this would be PDF)
      const blob = new Blob([JSON.stringify(claimForm, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${claim.claimNumber}-claim-form.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addToast('Claim form generated successfully', 'success');
    } catch (error) {
      addToast('Failed to generate claim form', 'error');
    }
  };

  // ADDED: Function to create new claim from attendance
  const handleCreateClaim = async (attendance: any) => {
    try {
      // This would typically open a claim creation form
      // For now, we'll just show a message
      addToast(`Ready to create claim for ${attendance.attendanceNumber}`, 'info');
      console.log('Creating claim for attendance:', attendance);
    } catch (error) {
      addToast('Failed to create claim', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'paid': return <DollarSign className="w-5 h-5 text-blue-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-amber-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'paid': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'submitted': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // ADDED: Stats calculation
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Insurance Claims</h1>
            <p className="text-gray-600">Manage and track insurance claim submissions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {eligibleAttendances.length > 0 && (
            <button
              onClick={() => setShowPendingAttendances(!showPendingAttendances)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Claim ({eligibleAttendances.length})
            </button>
          )}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Overview - ADDED */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Claims</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.paid}</div>
          <div className="text-sm text-gray-600">Paid</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-lg font-bold text-gray-900">GHS {stats.totalAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Claimed</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-lg font-bold text-green-600">GHS {stats.approvedAmount.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
      </div>

      {/* Eligible Attendances for New Claims - ADDED */}
      {showPendingAttendances && eligibleAttendances.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PlayCircle className="w-6 h-6 text-green-600" />
            Eligible Attendances for Claims ({eligibleAttendances.length})
          </h2>
          <div className="space-y-4">
            {eligibleAttendances.slice(0, 5).map((attendance) => (
              <div key={attendance._id} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{attendance.attendanceNumber}</h3>
                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded-full border">
                        {attendance.paymentMode}
                      </span>
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full border border-green-200">
                        Completed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Patient: {attendance.patient?.fullName || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Date: {new Date(attendance.dateTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Type: {attendance.attendanceType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Bill: GHS {attendance.totalBill?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreateClaim(attendance)}
                    className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

      {/* Claims Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No insurance claims found</p>
          {eligibleAttendances.length > 0 ? (
            <p className="text-gray-400">
              You have {eligibleAttendances.length} completed attendances ready for insurance claims
            </p>
          ) : (
            <p className="text-gray-400">Claims will appear here when submitted</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredClaims.map((claim) => (
            <div key={claim._id} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {getStatusIcon(claim.status)}
                  <div>
                    <h3 className="font-semibold text-gray-900">{claim.claimNumber}</h3>
                    <p className="text-sm text-gray-600">
                      {claim.patient?.fullName} • {claim.insuranceProvider?.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(claim.status)}`}>
                    {claim.status.replace('_', ' ')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateClaimForm(claim)}
                      className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Generate Claim Form"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Claim Amount:</span>
                  <p className="font-medium">GHS {claim.totalClaimAmount?.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Approved Amount:</span>
                  <p className="font-medium">
                    {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : 'Pending'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Submitted:</span>
                  <p className="font-medium">
                    {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : 'Not submitted'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Provider:</span>
                  <p className="font-medium">{claim.insuranceProvider?.type.toUpperCase()}</p>
                </div>
              </div>

              {/* ADDED: Attendance Information */}
              {claim.attendance && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Attendance:</span>
                      <p className="font-medium">{claim.attendance.attendanceNumber}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium capitalize">{claim.attendance.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Completion:</span>
                      <p className="font-medium">
                        {claim.attendance.completedAt ? new Date(claim.attendance.completedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons for Accounts/Admin */}
              {(user?.role === 'admin' || user?.role === 'accounts') && (
                <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
                  {claim.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(claim._id, 'approved', claim.totalClaimAmount * 0.8)}
                        className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(claim._id, 'rejected')}
                        className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {claim.status === 'approved' && (
                    <button
                      onClick={() => handleStatusUpdate(claim._id, 'paid')}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Mark as Paid
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
