// src/pages/ClaimBatches.tsx
import { useEffect, useState } from 'react';
import { useInsuranceStore } from '../store/insuranceStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  User,
  DollarSign,
  Shield,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  AlertCircle,
  Loader,
  Printer,
  Edit,
  Lock,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClaimBatch {
  id: string;
  batchNumber: string;
  batchDate: string;
  description: string | null;
  totalAmount: number;
  status: 'draft' | 'generated' | 'submitted' | 'exported';
  claims: any[];
  createdBy: { fullName: string; username: string };
  createdAt: string;
  xmlGeneratedAt?: string;
  xmlFilePath?: string;
}

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'yellow' },
  { value: 'generated', label: 'XML Generated', color: 'blue' },
  { value: 'submitted', label: 'Submitted', color: 'purple' },
  { value: 'exported', label: 'Exported', color: 'green' }
];

export default function ClaimBatches() {
  const navigate = useNavigate();
  const { success, error: toastError, warning } = useToast();

  const {
    batches,
    allClaims,
    getClaimBatches,
    getInsuranceClaims,
    createClaimBatch,
    getClaimBatch,
    generateBatchXML,
    updateBatchStatus,
    deleteClaimBatch,
    isLoading: storeLoading
  } = useInsuranceStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(ITEMS_PER_PAGE);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [batchDescription, setBatchDescription] = useState('');
  const [viewingBatch, setViewingBatch] = useState<ClaimBatch | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [processingBatch, setProcessingBatch] = useState<string | null>(null);

  const isLoading = storeLoading;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      
      await Promise.all([
        getClaimBatches(filters),
        getInsuranceClaims()
      ]);
    } catch (error) {
      toastError('Load failed', 'Could not fetch batches');
    }
  };

  // Filter batches
  const filteredBatches = batches.filter(batch => {
    const matchesSearch = searchTerm === '' ||
      batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (batch.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || batch.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredBatches.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);

  // Get eligible claims for batch creation (submitted NHIS claims not in any batch)
  const eligibleClaims = allClaims.filter(claim => 
    claim.status === 'submitted' && 
    claim.insuranceProvider?.type === 'nhis' &&
    !claim.batchId
  );

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleToggleClaimSelection = (claimId: string) => {
    const newSet = new Set(selectedClaims);
    if (newSet.has(claimId)) {
      newSet.delete(claimId);
    } else {
      newSet.add(claimId);
    }
    setSelectedClaims(newSet);
  };

  const handleSelectAll = () => {
    if (selectedClaims.size === eligibleClaims.length) {
      setSelectedClaims(new Set());
    } else {
      setSelectedClaims(new Set(eligibleClaims.map(c => c.id)));
    }
  };

  const handleCreateBatch = async () => {
    if (selectedClaims.size === 0) {
      warning('No Claims Selected', 'Please select at least one claim to create a batch');
      return;
    }

    try {
      const claimIds = Array.from(selectedClaims);
      await createClaimBatch(claimIds, batchDescription || `Batch of ${claimIds.length} claims`);
      success('Batch Created', `Batch created with ${claimIds.length} claims`);
      setShowCreateModal(false);
      setSelectedClaims(new Set());
      setBatchDescription('');
      await loadData();
    } catch (error: any) {
      toastError('Create Failed', error.message);
    }
  };

  const handleViewBatch = async (batchId: string) => {
    try {
      const batch = await getClaimBatch(batchId);
      setViewingBatch(batch);
    } catch (error: any) {
      toastError('View Failed', error.message);
    }
  };

  const handleGenerateXML = async (batchId: string) => {
    setProcessingBatch(batchId);
    try {
      await generateBatchXML(batchId);
      success('XML Generated', 'Batch XML file downloaded successfully');
      await loadData();
    } catch (error: any) {
      toastError('Generation Failed', error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleDownloadXML = async (batchId: string, batchNumber: string) => {
    setProcessingBatch(batchId);
    try {
      await generateBatchXML(batchId);
      success('Download Started', 'XML file is being downloaded');
    } catch (error: any) {
      toastError('Download Failed', error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleUpdateStatus = async (batchId: string, status: string) => {
    setProcessingBatch(batchId);
    try {
      await updateBatchStatus(batchId, status);
      success('Status Updated', `Batch status changed to ${status}`);
      await loadData();
      if (viewingBatch?.id === batchId) {
        setViewingBatch(await getClaimBatch(batchId));
      }
    } catch (error: any) {
      toastError('Update Failed', error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const handleDeleteBatch = async () => {
    if (!deleteConfirm) return;
    setProcessingBatch(deleteConfirm);
    try {
      await deleteClaimBatch(deleteConfirm);
      success('Batch Deleted', 'Batch removed successfully');
      setDeleteConfirm(null);
      if (viewingBatch?.id === deleteConfirm) {
        setViewingBatch(null);
      }
      await loadData();
    } catch (error: any) {
      toastError('Delete Failed', error.message);
    } finally {
      setProcessingBatch(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: JSX.Element }> = {
      draft: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Edit className="w-3 h-3" /> },
      generated: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <FileText className="w-3 h-3" /> },
      submitted: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Send className="w-3 h-3" /> },
      exported: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> }
    };
    const c = config[status] || config.draft;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const stats = {
    total: batches.length,
    draft: batches.filter(b => b.status === 'draft').length,
    generated: batches.filter(b => b.status === 'generated').length,
    submitted: batches.filter(b => b.status === 'submitted').length,
    exported: batches.filter(b => b.status === 'exported').length,
    totalAmount: batches.reduce((sum, b) => sum + b.totalAmount, 0)
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)]"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
          <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center">
            <Layers className="w-5 h-5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Claim Batches</h1>
            <p className="text-sm text-[var(--text-secondary)]">Group NHIS claims into batches for submission</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {eligibleClaims.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Batch ({eligibleClaims.length} available)
            </button>
          )}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Batches</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Draft</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.generated}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">XML Generated</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.submitted}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Submitted</div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] text-center">
          <div className="text-lg font-bold text-[var(--text-primary)]">GHS {stats.totalAmount.toFixed(2)}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">Total Amount</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Search by batch number or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-secondary)]">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition text-sm"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </button>
          {(startDate || endDate || filterStatus !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setFilterStatus('all');
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-card)] transition text-sm"
            >
              <XCircle className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          Showing <span className="font-medium text-[var(--text-primary)]">{startIndex + 1}</span> to{' '}
          <span className="font-medium text-[var(--text-primary)]">{Math.min(endIndex, totalItems)}</span> of{' '}
          <span className="font-medium text-[var(--text-primary)]">{totalItems}</span> batches
        </p>
      </div>

      {/* Batches Grid */}
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
      ) : paginatedBatches.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 border border-[var(--border-color)] text-center">
          <Layers className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)]">No claim batches found</p>
          {eligibleClaims.length > 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm"
            >
              Create your first batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paginatedBatches.map(batch => (
            <div
              key={batch.id}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] hover:shadow-md transition-all overflow-hidden"
            >
              <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)]">{batch.batchNumber}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {batch.description || `Batch of ${batch.claims?.length || 0} claims`}
                    </p>
                  </div>
                  {getStatusBadge(batch.status)}
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">{new Date(batch.batchDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">{batch.createdBy?.fullName || batch.createdBy?.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">{batch.claims?.length || 0} claims</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="font-medium text-[var(--text-primary)]">GHS {batch.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => handleViewBatch(batch.id)}
                    className="flex-1 py-1.5 text-xs flex items-center justify-center gap-1 bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-text)] hover:text-white transition"
                  >
                    <Eye className="w-3 h-3" />
                    View Details
                  </button>
                  {batch.status === 'draft' && (
                    <button
                      onClick={() => handleGenerateXML(batch.id)}
                      disabled={processingBatch === batch.id}
                      className="flex-1 py-1.5 text-xs flex items-center justify-center gap-1 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition disabled:opacity-50"
                    >
                      {processingBatch === batch.id ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Generate XML
                    </button>
                  )}
                  {(batch.status === 'generated' || batch.status === 'submitted' || batch.status === 'exported') && (
                    <button
                      onClick={() => handleDownloadXML(batch.id, batch.batchNumber)}
                      disabled={processingBatch === batch.id}
                      className="flex-1 py-1.5 text-xs flex items-center justify-center gap-1 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition disabled:opacity-50"
                    >
                      {processingBatch === batch.id ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      Download XML
                    </button>
                  )}
                  {batch.status === 'generated' && (
                    <button
                      onClick={() => handleUpdateStatus(batch.id, 'submitted')}
                      disabled={processingBatch === batch.id}
                      className="flex-1 py-1.5 text-xs flex items-center justify-center gap-1 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      Submit
                    </button>
                  )}
                  {batch.status === 'draft' && (
                    <button
                      onClick={() => setDeleteConfirm(batch.id)}
                      disabled={processingBatch === batch.id}
                      className="py-1.5 px-3 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-5 py-3 flex justify-between items-center">
              <h3 className="font-bold text-lg">Create Claim Batch</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedClaims(new Set());
                  setBatchDescription('');
                }}
                className="p-1 hover:bg-[var(--bg-main)] rounded"
              >
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Batch Description (Optional)
                </label>
                <input
                  type="text"
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="e.g., October 2024 NHIS Claims"
                  className="w-full px-3 py-2 bg-[var(--bg-main)] border rounded-lg text-sm"
                />
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]">
                    Select Claims ({eligibleClaims.length} available)
                  </label>
                  <button
                    onClick={handleSelectAll}
                    className="text-xs text-[var(--icon-cyan-text)] hover:underline"
                  >
                    {selectedClaims.size === eligibleClaims.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  {eligibleClaims.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-secondary)]">
                      No eligible claims found. Claims must be NHIS and finalized (submitted).
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-main)] sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left w-10">
                            <input
                              type="checkbox"
                              checked={selectedClaims.size === eligibleClaims.length && eligibleClaims.length > 0}
                              onChange={handleSelectAll}
                              className="rounded"
                            />
                          </th>
                          <th className="px-3 py-2 text-left">Claim Number</th>
                          <th className="px-3 py-2 text-left">Patient</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2 text-left">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {eligibleClaims.map(claim => (
                          <tr key={claim.id} className="hover:bg-[var(--bg-main)]">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedClaims.has(claim.id)}
                                onChange={() => handleToggleClaimSelection(claim.id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{claim.claimNumber}</td>
                            <td className="px-3 py-2">
                              {claim.patient?.surname} {claim.patient?.otherNames}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              GHS {claim.totalClaimAmount?.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                              {new Date(claim.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t">
                <button
                  onClick={handleCreateBatch}
                  disabled={selectedClaims.size === 0}
                  className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50"
                >
                  Create Batch ({selectedClaims.size} claims)
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setSelectedClaims(new Set());
                    setBatchDescription('');
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Batch Modal */}
      {viewingBatch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto border">
            <div className="sticky top-0 bg-[var(--bg-card)] border-b px-5 py-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{viewingBatch.batchNumber}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{viewingBatch.description}</p>
              </div>
              <button onClick={() => setViewingBatch(null)} className="p-1 hover:bg-[var(--bg-main)] rounded">
                <XCircle className="w-5 h-5 text-[var(--text-secondary)]" />
              </button>
            </div>
            <div className="p-5">
              {/* Batch Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-4 border-b">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Status</p>
                  <div className="mt-1">{getStatusBadge(viewingBatch.status)}</div>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Created By</p>
                  <p className="text-sm font-medium">{viewingBatch.createdBy?.fullName || viewingBatch.createdBy?.username}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Created Date</p>
                  <p className="text-sm">{new Date(viewingBatch.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Total Amount</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">GHS {viewingBatch.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Claims Table */}
              <h4 className="font-semibold mb-3">Claims in this Batch ({viewingBatch.claims?.length || 0})</h4>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-main)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Claim Number</th>
                      <th className="px-3 py-2 text-left">Patient</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Principal GDRG</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingBatch.claims?.map(claim => (
                      <tr key={claim.id} className="hover:bg-[var(--bg-main)]">
                        <td className="px-3 py-2 font-mono text-xs">{claim.claimNumber}</td>
                        <td className="px-3 py-2">
                          {claim.patient?.surname} {claim.patient?.otherNames}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">GHS {claim.totalClaimAmount?.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${claim.status === 'submitted' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{claim.principalGDRG || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-5 mt-4 border-t">
                {viewingBatch.status === 'draft' && (
                  <button
                    onClick={() => handleGenerateXML(viewingBatch.id)}
                    disabled={processingBatch === viewingBatch.id}
                    className="flex-1 py-2 flex items-center justify-center gap-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white"
                  >
                    <Download className="w-4 h-4" />
                    Generate Batch XML
                  </button>
                )}
                {viewingBatch.status === 'generated' && (
                  <button
                    onClick={() => handleUpdateStatus(viewingBatch.id, 'submitted')}
                    className="flex-1 py-2 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white"
                  >
                    Mark as Submitted
                  </button>
                )}
                <button onClick={() => setViewingBatch(null)} className="flex-1 py-2 border rounded-lg">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Delete Batch</h3>
                <p className="text-sm text-[var(--text-secondary)]">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6">Are you sure you want to delete this batch? All claims will be removed from the batch.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleDeleteBatch} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}