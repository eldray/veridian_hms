// src/pages/InsuranceClaims.tsx - UPDATED WITH CORPORATE ACCOUNTS TAB
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
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCorporateStore } from '../store/corporateStore';

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

  const {
    // Corporate Accounts
    corporateAccounts,
    getCorporateAccounts,
    createCorporateAccount,
    updateCorporateAccount,
    deactivateCorporateAccount,
    getCorporateAccount,
    isLoading: corporateLoading
  } = useCorporateStore();

  const { attendances, getAttendances, isLoading: attendanceLoading } = useAttendanceStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState<'nhis' | 'private' | 'corporate'>('nhis');
  const [showPendingAttendances, setShowPendingAttendances] = useState(false);
  const [processingClaims, setProcessingClaims] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Corporate Account Form State
  const [showCorporateForm, setShowCorporateForm] = useState(false);
  const [editingCorporate, setEditingCorporate] = useState<any>(null);
  const [corporateFormData, setCorporateFormData] = useState({
    companyName: '',
    registrationNumber: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: 0,
    paymentTerms: 30,
    discountPercentage: 0,
    insuranceProviderId: ''
  });

  const isLoading = claimsLoading || attendanceLoading || corporateLoading;

  // Get current claims/data based on active tab
  const currentClaims = activeTab === 'nhis' ? nhisClaims : privateClaims;

  useEffect(() => {
    loadData();
  }, [activeTab]);

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
        await getCorporateAccounts();
      }
      
      if (activeTab !== 'corporate') {
        await getAttendances();
        await getFinalizedClaimsTotal({ type: activeTab });
      }
      
      success('Data loaded', `${activeTab.toUpperCase()} data ready`);
    } catch {
      toastError('Load failed', 'Could not fetch data');
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

  // Filter corporate accounts
  const filteredCorporateAccounts = corporateAccounts.filter(account => {
    const matchesSearch =
      account.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.phone?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && account.isActive) ||
      (filterStatus === 'inactive' && !account.isActive);
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

  // Corporate Account Handlers
  const handleCreateCorporateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCorporateAccount(corporateFormData);
      success('Corporate Account Created', `${corporateFormData.companyName} added successfully`);
      setShowCorporateForm(false);
      resetCorporateForm();
      await loadData();
    } catch (error: any) {
      toastError('Creation Failed', error.message || 'Could not create corporate account');
    }
  };

  const handleUpdateCorporateAccount = async (id: string, data: any) => {
    try {
      await updateCorporateAccount(id, data);
      success('Account Updated', 'Corporate account updated successfully');
      await loadData();
    } catch (error: any) {
      toastError('Update Failed', error.message || 'Could not update account');
    }
  };

  const handleDeactivateCorporateAccount = async (id: string, isActive: boolean) => {
    const action = isActive ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} this corporate account?`)) return;
    
    try {
      await deactivateCorporateAccount(id);
      success('Status Updated', `Account has been ${action}d`);
      await loadData();
    } catch (error: any) {
      toastError('Update Failed', error.message || 'Could not update status');
    }
  };

  const resetCorporateForm = () => {
    setCorporateFormData({
      companyName: '',
      registrationNumber: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      creditLimit: 0,
      paymentTerms: 30,
      discountPercentage: 0,
      insuranceProviderId: ''
    });
    setEditingCorporate(null);
  };

  const handleEditCorporate = (account: any) => {
    setEditingCorporate(account);
    setCorporateFormData({
      companyName: account.companyName,
      registrationNumber: account.registrationNumber || '',
      taxId: account.taxId || '',
      contactPerson: account.contactPerson,
      email: account.email,
      phone: account.phone,
      address: account.address || '',
      creditLimit: account.creditLimit,
      paymentTerms: account.paymentTerms,
      discountPercentage: account.discountPercentage,
      insuranceProviderId: account.insuranceProviderId || ''
    });
    setShowCorporateForm(true);
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

  const getCorporateStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border-[var(--icon-green-text)]'
      : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border-[var(--icon-red-text)]';
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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Insurance & Corporate Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Manage NHIS, Private Insurance, and Corporate Accounts</p>
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
          {activeTab === 'corporate' && (
            <button
              onClick={() => {
                resetCorporateForm();
                setShowCorporateForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Corporate Account
            </button>
          )}
          {activeTab !== 'corporate' && eligibleAttendances.length > 0 && (
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
        <button
          onClick={() => {
            setActiveTab('corporate');
            setFilterStatus('all');
            setSearchTerm('');
            loadData();
          }}
          className={`px-6 py-3 text-sm font-medium transition-all relative ${
            activeTab === 'corporate'
              ? 'text-[var(--icon-cyan-text)] border-b-2 border-[var(--icon-cyan-text)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Corporate Accounts
            <span className="ml-1 px-2 py-0.5 bg-[var(--bg-main)] rounded-full text-xs">
              {corporateAccounts.length}
            </span>
          </div>
        </button>
      </div>

      {/* Stats - Only for Claims Tabs */}
      {activeTab !== 'corporate' && (
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
      )}

      {/* Eligible Attendances - Only for Claims Tabs */}
      {activeTab !== 'corporate' && showPendingAttendances && eligibleAttendances.length > 0 && (
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
            placeholder={activeTab === 'corporate' 
              ? "Search corporate accounts by company name, contact person, email, or phone..." 
              : `Search ${activeTab === 'nhis' ? 'NHIS' : 'Private'} claims by claim number, patient, or provider...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== 'corporate' && (
            <>
              <div className="flex flex-col">
                <label className="text-xs text-[var(--text-secondary)] mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs text-[var(--text-secondary)] mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
                />
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => {
            setStartDate('');
            setEndDate('');
            setSearchTerm('');
            setFilterStatus('all');
          }}
          className="px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)] self-end"
        >
          Clear Filters
        </button>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all text-sm"
        >
          <option value="all">All Status</option>
          {activeTab === 'corporate' ? (
            <>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </>
          ) : (
            <>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </>
          )}
        </select>
      </div>

      {/* Corporate Accounts Table */}
      {activeTab === 'corporate' && (
        isLoading ? (
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
        ) : filteredCorporateAccounts.length === 0 ? (
          <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
            <Users className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">No corporate accounts found</p>
            <button
              onClick={() => {
                resetCorporateForm();
                setShowCorporateForm(true);
              }}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add First Corporate Account
            </button>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Contact Person</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Credit Limit</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Balance</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] uppercase">Discount</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredCorporateAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-[var(--text-primary)]">{account.companyName}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{account.registrationNumber || 'No Reg Number'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                        {account.contactPerson}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{account.phone}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{account.email}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[var(--text-primary)]">
                        GHS {account.creditLimit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-medium ${account.currentBalance > account.creditLimit ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'}`}>
                          GHS {account.currentBalance.toLocaleString()}
                        </span>
                        {account.currentBalance > account.creditLimit && (
                          <AlertCircle className="w-3 h-3 text-[var(--icon-red-text)] inline ml-1" title="Exceeds credit limit" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[var(--text-primary)]">
                        {account.discountPercentage}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCorporateStatusColor(account.isActive)}`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/dashboard/corporate/${account.id}`)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-blue-text)] hover:bg-[var(--icon-blue-bg)] rounded-lg transition"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEditCorporate(account)}
                            className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--icon-yellow-text)] hover:bg-[var(--icon-yellow-bg)] rounded-lg transition"
                            title="Edit Account"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeactivateCorporateAccount(account.id, !account.isActive)}
                            className={`p-1.5 rounded-lg transition ${
                              account.isActive 
                                ? 'text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]' 
                                : 'text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)]'
                            }`}
                            title={account.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {account.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Claims Table - Only for Claims Tabs */}
      {activeTab !== 'corporate' && (
        isLoading ? (
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
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Claim Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Claim Amount</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Approved</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[var(--text-secondary)] uppercase">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase">Submitted</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-[var(--text-secondary)] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-[var(--text-primary)]">{claim.claimNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-[var(--text-primary)]">{getPatientFullName(claim.patient)}</div>
                        {claim.Attendance?.attendanceNumber && (
                          <div className="text-xs text-[var(--text-secondary)]">{claim.Attendance.attendanceNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                        {claim.insuranceProvider?.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                          {getStatusLabel(claim.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="font-medium text-[var(--text-primary)]">GHS {claim.totalClaimAmount?.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="text-[var(--text-primary)]">
                          {claim.approvedAmount ? `GHS ${claim.approvedAmount.toFixed(2)}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="text-[var(--text-primary)]">
                          {claim.paidAmount ? `GHS ${claim.paidAmount.toFixed(2)}` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                        {claim.submissionDate ? new Date(claim.submissionDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-1.5">
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
          </div>
        )
      )}

      {/* Corporate Account Form Modal */}
      {showCorporateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl mt-8 mb-8 shadow-xl border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {editingCorporate ? 'Edit Corporate Account' : 'Add New Corporate Account'}
              </h2>
              <button
                onClick={() => {
                  setShowCorporateForm(false);
                  resetCorporateForm();
                }}
                className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCorporateAccount} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={corporateFormData.companyName}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, companyName: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Registration Number</label>
                  <input
                    type="text"
                    value={corporateFormData.registrationNumber}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, registrationNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Registration number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tax ID</label>
                  <input
                    type="text"
                    value={corporateFormData.taxId}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Tax ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={corporateFormData.contactPerson}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={corporateFormData.email}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={corporateFormData.phone}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="Phone number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Address</label>
                <textarea
                  value={corporateFormData.address}
                  onChange={(e) => setCorporateFormData({ ...corporateFormData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                  placeholder="Company address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Credit Limit (GHS)</label>
                  <input
                    type="number"
                    min="0"
                    value={corporateFormData.creditLimit}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Payment Terms (days)</label>
                  <input
                    type="number"
                    min="0"
                    value={corporateFormData.paymentTerms}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, paymentTerms: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={corporateFormData.discountPercentage}
                    onChange={(e) => setCorporateFormData({ ...corporateFormData, discountPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-main)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--icon-blue-text)] focus:border-[var(--icon-blue-text)] transition-all"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowCorporateForm(false);
                    resetCorporateForm();
                  }}
                  className="px-4 py-2.5 text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2.5 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition-colors text-sm disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (editingCorporate ? 'Update' : 'Create')} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}