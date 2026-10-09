// src/pages/RequisitionManagement.tsx - COMPLETE FIXED VERSION
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncSelect from 'react-select/async';
import { lookupRequisitionStock, getRequisition as apiGetRequisition, type RequisitionStockLookupItem } from '../api';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useWardStore } from '../store/wardStore';
import { useToast } from '../store/toastStore';
import { 
  Plus, 
  Search, 
  ClipboardList, 
  Edit, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Package,
  User,
  Calendar,
  Send,
  CheckCheck,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RequisitionItem {
  id?: string;
  stockItemId: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityFulfilled?: number;
  purpose?: string;
  notes?: string;
  StockItem?: {
    name: string;
    unitOfMeasure: string;
    currentStock: number;
  };
  /** Live quantities at the supplying / requesting department (detail view) */
  supplierQty?: number;
  requesterQty?: number;
}

/** A line being edited in the create form */
interface FormLine {
  stockItemId: string;
  quantityRequested: number;
  purpose: string;
  /** Picked item with its quantities at the supplier / at us (UI only, not sent) */
  picked?: RequisitionStockLookupItem | null;
}

interface Requisition {
  id: string;
  requisitionNumber: string;
  requestingDepartmentId?: string | null;
  requestingWardId?: string | null;
  supplyingDepartmentId?: string | null;
  supplyingDepartment?: { id?: string; name: string } | null;
  requestedById: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  requiredDate?: string;
  purpose?: string;
  status: 'draft' | 'submitted' | 'approved' | 'fulfilled' | 'cancelled';
  approvedById?: string;
  approvedAt?: string;
  fulfilledById?: string;
  fulfilledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  departments?: { name: string } | null;
  ward?: { wardName: string } | null;
  User_Requisition_requestedByIdToUser?: { fullName: string; role: string };
  User_Requisition_approvedByIdToUser?: { fullName: string };
  User_Requisition_fulfilledByIdToUser?: { fullName: string };
  RequisitionItem?: RequisitionItem[];
}

export default function RequisitionManagement() {
  const {
    requisitions,
    stockItems,
    getRequisitions,
    getStockItems,
    createRequisition,
    updateRequisitionStatus,
    deleteRequisition,
    isLoading
  } = useStockStore();
  const { user, hasRole } = useAuthStore();
  const { departments, getDepartments } = useDepartmentStore();
  const { wards, getWards } = useWardStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const isAdmin = hasRole(['admin', 'pharmacist']);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const myDepartmentId = user?.departmentId || '';
  const myDepartmentName = departments.find(d => d.id === myDepartmentId)?.name || (user as any)?.department?.name || '';

  const emptyLine = (): FormLine => ({ stockItemId: '', quantityRequested: 1, purpose: '', picked: null });

  const [formData, setFormData] = useState({
    requesterType: 'department' as 'department' | 'ward',
    // Requests always come from the user's own department unless they pick a ward.
    // (Admins without a department can pick one.)
    requestingDepartmentId: myDepartmentId,
    requestingWardId: '',
    supplyingDepartmentId: '',
    purpose: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency',
    requiredDate: '',
    notes: '',
    requisitionItems: [emptyLine()] as FormLine[]
  });

  // Departments we can request FROM: everything except our own department. Stores first.
  const supplierOptions = useMemo(() => {
    const ownId = formData.requesterType === 'department' ? formData.requestingDepartmentId : myDepartmentId;
    return departments
      .filter(d => d.isActive !== false && d.id !== ownId)
      .sort((a, b) => {
        const rank = (d: any) => (d.isStore ? 0 : /pharmacy/i.test(d.name) ? 1 : 2);
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
  }, [departments, formData.requesterType, formData.requestingDepartmentId, myDepartmentId]);

  const supplierName = departments.find(d => d.id === formData.supplyingDepartmentId)?.name || 'supplier';
  const requesterDeptId = formData.requesterType === 'department' ? formData.requestingDepartmentId : myDepartmentId;
  const requesterDeptName = departments.find(d => d.id === requesterDeptId)?.name || myDepartmentName || 'Your department';

  // Debounced server-side item search (so we never load the whole catalogue into a dropdown)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadItemOptions = (input: string) =>
    new Promise<RequisitionStockLookupItem[]>((resolve) => {
      if (!formData.supplyingDepartmentId) return resolve([]);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(async () => {
        try {
          resolve(await lookupRequisitionStock({
            supplierDepartmentId: formData.supplyingDepartmentId,
            requesterDepartmentId: requesterDeptId || undefined,
            q: input,
            limit: 25
          }));
        } catch (err) {
          console.error('Item lookup failed:', err);
          toastError('Search failed', 'Could not search items. Please try again.');
          resolve([]);
        }
      }, 250);
    });

  useEffect(() => {
    loadData();
  }, []);

  // Pre-select a sensible supplier (the Main Store, else the first option) once departments are known
  useEffect(() => {
    if (!showForm || formData.supplyingDepartmentId || supplierOptions.length === 0) return;
    setFormData(prev => ({ ...prev, supplyingDepartmentId: supplierOptions[0].id }));
  }, [showForm, supplierOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the requester in step with the logged-in user's department
  useEffect(() => {
    if (!formData.requestingDepartmentId && myDepartmentId) {
      setFormData(prev => ({ ...prev, requestingDepartmentId: myDepartmentId }));
    }
  }, [myDepartmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      await Promise.all([
        getRequisitions(),
        getStockItems(),
        getDepartments(),
        getWards()
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
      toastError('Load failed', 'Could not load requisition data');
    }
  };

  // Filter requisitions
  const filteredRequisitions = (requisitions || []).filter(requisition => {
    const matchesSearch = 
      requisition.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requisition.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requisition.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      requisition.ward?.wardName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || requisition.status === statusFilter;
    const matchesUrgency = urgencyFilter === 'all' || requisition.urgency === urgencyFilter;
    
    return matchesSearch && matchesStatus && matchesUrgency;
  });

  // Sort by createdAt descending
  const sortedRequisitions = [...filteredRequisitions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Pagination calculations
  const totalPages = Math.ceil(sortedRequisitions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequisitions = sortedRequisitions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isWard = formData.requesterType === 'ward';
    if (isWard && !formData.requestingWardId) {
      toastError('Validation', 'Please select a requesting ward');
      return;
    }
    if (!isWard && !formData.requestingDepartmentId) {
      toastError('Validation', 'Your account has no department. Ask an administrator to assign one, or request for a ward.');
      return;
    }
    if (!formData.supplyingDepartmentId) {
      toastError('Validation', 'Please select the department/store you are requesting from');
      return;
    }

    const validItems = formData.requisitionItems.filter(item => item.stockItemId && item.quantityRequested > 0);
    if (validItems.length === 0) {
      toastError('Validation', 'Please add at least one item');
      return;
    }

    // Heads-up when asking for more than the supplier currently holds
    const short = validItems.filter(i => i.picked && i.quantityRequested > i.picked.supplierQty);
    if (short.length > 0) {
      const list = short.map(i => `• ${i.picked!.name}: asking ${i.quantityRequested}, ${supplierName} has ${i.picked!.supplierQty}`).join('\n');
      if (!window.confirm(`${supplierName} does not currently hold enough of:\n\n${list}\n\nSubmit anyway?`)) return;
    }

    try {
      const submitData = {
        requestingDepartmentId: isWard ? undefined : formData.requestingDepartmentId,
        requestingWardId: isWard ? formData.requestingWardId : undefined,
        supplyingDepartmentId: formData.supplyingDepartmentId,
        purpose: formData.purpose,
        urgency: formData.urgency,
        requiredDate: formData.requiredDate || undefined,
        notes: formData.notes,
        requisitionItems: validItems.map(({ stockItemId, quantityRequested, purpose }) => ({
          stockItemId, quantityRequested, purpose: purpose || undefined
        }))
      };
      await createRequisition(submitData);
      success('Created', 'Requisition created successfully');
      setShowForm(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      console.error('Failed to create requisition:', error);
      toastError('Save failed', error?.response?.data?.message || error.message || 'Could not create requisition');
    }
  };

  const handleStatusUpdate = async (id: string, status: string, additionalData?: any) => {
    try {
      await updateRequisitionStatus(id, status, additionalData);
      const actionMessages: Record<string, string> = {
        submitted: 'Requisition submitted for approval',
        approved: 'Requisition approved',
        fulfilled: 'Requisition fulfilled',
        cancelled: 'Requisition cancelled'
      };
      success('Success', actionMessages[status] || `Requisition ${status}`);
      await loadData();
    } catch (error: any) {
      console.error(`Failed to ${status} requisition:`, error);
      toastError('Action failed', error?.response?.data?.message || error.message || `Could not ${status} requisition`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this requisition? This action cannot be undone.')) return;
    try {
      await deleteRequisition(id);
      success('Deleted', 'Requisition deleted successfully');
      await loadData();
    } catch (error: any) {
      console.error('Failed to delete requisition:', error);
      toastError('Delete failed', error?.response?.data?.message || error.message || 'Could not delete requisition');
    }
  };

  const resetForm = () => {
    setFormData({
      requesterType: 'department',
      requestingDepartmentId: myDepartmentId,
      requestingWardId: '',
      supplyingDepartmentId: '',
      purpose: '',
      urgency: 'routine',
      requiredDate: '',
      notes: '',
      requisitionItems: [emptyLine()]
    });
  };

  const addRequisitionItem = () => {
    setFormData(prev => ({ ...prev, requisitionItems: [...prev.requisitionItems, emptyLine()] }));
  };

  const removeRequisitionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: prev.requisitionItems.length > 1 ? prev.requisitionItems.filter((_, i) => i !== index) : [emptyLine()]
    }));
  };

  const updateRequisitionItem = (index: number, patch: Partial<FormLine>) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: prev.requisitionItems.map((item, i) => (i === index ? { ...item, ...patch } : item))
    }));
  };

  // Changing the supplier invalidates the quantities we showed, so start the item list fresh
  const changeSupplier = (id: string) => {
    setFormData(prev => ({
      ...prev,
      supplyingDepartmentId: id,
      requisitionItems: prev.requisitionItems.some(i => i.stockItemId) ? [emptyLine()] : prev.requisitionItems
    }));
  };

  const getStockItemName = (id: string) => {
    const item = stockItems.find(i => i.id === id);
    return item?.name || 'Unknown Item';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': 
        return { 
          bg: 'bg-[var(--icon-gray-bg)]', 
          text: 'text-[var(--icon-gray-text)]', 
          border: 'border-[var(--icon-gray-text)]',
          label: 'Draft',
          icon: Clock
        };
      case 'submitted': 
        return { 
          bg: 'bg-[var(--icon-blue-bg)]', 
          text: 'text-[var(--icon-blue-text)]', 
          border: 'border-[var(--icon-blue-text)]',
          label: 'Submitted',
          icon: Send
        };
      case 'approved': 
        return { 
          bg: 'bg-[var(--icon-green-bg)]', 
          text: 'text-[var(--icon-green-text)]', 
          border: 'border-[var(--icon-green-text)]',
          label: 'Approved',
          icon: CheckCheck
        };
      case 'fulfilled': 
        return { 
          bg: 'bg-[var(--icon-cyan-bg)]', 
          text: 'text-[var(--icon-cyan-text)]', 
          border: 'border-[var(--icon-cyan-text)]',
          label: 'Fulfilled',
          icon: Truck
        };
      case 'cancelled': 
        return { 
          bg: 'bg-[var(--icon-red-bg)]', 
          text: 'text-[var(--icon-red-text)]', 
          border: 'border-[var(--icon-red-text)]',
          label: 'Cancelled',
          icon: XCircle
        };
      default: 
        return { 
          bg: 'bg-[var(--bg-main)]', 
          text: 'text-[var(--text-secondary)]', 
          border: 'border-[var(--border-color)]',
          label: status,
          icon: Clock
        };
    }
  };

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'routine':
        return { bg: 'bg-[var(--icon-gray-bg)]', text: 'text-[var(--icon-gray-text)]', label: 'Routine' };
      case 'urgent':
        return { bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]', label: 'Urgent' };
      case 'emergency':
        return { bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]', label: 'Emergency' };
      default:
        return { bg: 'bg-[var(--bg-main)]', text: 'text-[var(--text-secondary)]', label: urgency };
    }
  };

  const isRequesterSide = (r: Requisition) =>
    r.requestedById === user?.id || (!!user?.departmentId && user.departmentId === r.requestingDepartmentId);
  // The supplying department approves/fulfils. Admins always can. Old requisitions (no supplier) fall back to pharmacist/admin.
  const isSupplierSide = (r: Requisition) =>
    hasRole(['admin']) || (r.supplyingDepartmentId ? user?.departmentId === r.supplyingDepartmentId : isAdmin);

  const canEdit = (requisition: Requisition) => requisition.status === 'draft' && requisition.requestedById === user?.id;
  const canSubmit = (requisition: Requisition) => requisition.status === 'draft' && isRequesterSide(requisition);
  const canApprove = (requisition: Requisition) => requisition.status === 'submitted' && isSupplierSide(requisition);
  const canFulfill = (requisition: Requisition) => requisition.status === 'approved' && isSupplierSide(requisition);
  const canDelete = (requisition: Requisition) =>
    (requisition.status === 'draft' && requisition.requestedById === user?.id) || hasRole(['admin']);

  // Open the detail view with live supplier/requester quantities
  const openDetails = async (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setShowDetailModal(true);
    try {
      const res: any = await apiGetRequisition(requisition.id);
      const full = res?.data ?? res;
      if (full?.RequisitionItem) setSelectedRequisition(prev => (prev && prev.id === requisition.id ? { ...prev, ...full } : prev));
    } catch (err) {
      console.error('Could not load requisition details:', err);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setUrgencyFilter('all');
    setCurrentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || urgencyFilter !== 'all';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Requisitions</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage internal stock requests and approvals
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              showFilters || hasActiveFilters
                ? 'bg-[var(--icon-cyan-text)] text-white' 
                : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Requisition
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-gray-bg)] rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[var(--icon-gray-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{requisitions?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-[var(--icon-blue-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Submitted</p>
              <p className="text-xl font-bold text-[var(--icon-blue-text)]">
                {requisitions?.filter(r => r.status === 'submitted').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
              <CheckCheck className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Approved</p>
              <p className="text-xl font-bold text-[var(--icon-green-text)]">
                {requisitions?.filter(r => r.status === 'approved').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Fulfilled</p>
              <p className="text-xl font-bold text-[var(--icon-cyan-text)]">
                {requisitions?.filter(r => r.status === 'fulfilled').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-[var(--icon-red-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Cancelled</p>
              <p className="text-xl font-bold text-[var(--icon-red-text)]">
                {requisitions?.filter(r => r.status === 'cancelled').length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Requisitions
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Urgency</label>
              <select
                value={urgencyFilter}
                onChange={e => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="all">All Urgencies</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Items Per Page */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by requisition number, purpose, or department..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

      {/* Results Count */}
      {sortedRequisitions.length > 0 && (
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {startIndex + 1} to {Math.min(endIndex, sortedRequisitions.length)} of {sortedRequisitions.length} requisitions
        </div>
      )}

      {/* Requisitions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[var(--bg-main)] rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
                </div>
                <div className="h-8 w-20 bg-[var(--bg-main)] rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedRequisitions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Requisitions Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {hasActiveFilters
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first requisition'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          ) : (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Requisition
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Req #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Purpose / Department</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Urgency</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Requested By</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedRequisitions.map(requisition => {
                    const statusConfig = getStatusConfig(requisition.status);
                    const urgencyConfig = getUrgencyConfig(requisition.urgency);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <tr key={requisition.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-[var(--text-primary)]">
                            {requisition.requisitionNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {requisition.purpose || 'No purpose specified'}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                            {requisition.departments?.name || requisition.ward?.wardName || 'Requester not specified'}{requisition.supplyingDepartment?.name ? ` → ${requisition.supplyingDepartment.name}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full capitalize ${urgencyConfig.bg} ${urgencyConfig.text}`}>
                            {urgencyConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                              {requisition.User_Requisition_requestedByIdToUser?.fullName || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {requisition.RequisitionItem?.length || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                              {new Date(requisition.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* View Details */}
                            <button
                              onClick={() => {
                                openDetails(requisition);
                              }}
                              className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Submit (Draft only) */}
                            {canSubmit(requisition) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'submitted')}
                                className="p-1.5 text-[var(--icon-blue-text)] border border-[var(--icon-blue-text)] rounded-lg hover:bg-[var(--icon-blue-bg)] transition-colors"
                                title="Submit for Approval"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Approve (Submitted only) */}
                            {canApprove(requisition) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'approved')}
                                className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)] transition-colors"
                                title="Approve"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Fulfill (Approved only) */}
                            {canFulfill(requisition) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'fulfilled')}
                                className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-colors"
                                title="Fulfill"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel */}
                            {(canSubmit(requisition) || canApprove(requisition)) && (
                              <button
                                onClick={() => handleStatusUpdate(requisition.id, 'cancelled')}
                                className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-colors"
                                title="Cancel"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            {canDelete(requisition) && (
                              <button
                                onClick={() => handleDelete(requisition.id)}
                                className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      onClick={() => handlePageChange(pageNum)}
                      className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                        currentPage === pageNum
                          ? 'bg-[var(--icon-cyan-text)] text-white'
                          : 'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Requisition Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Create Requisition</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Requisition Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* WHO is requesting: always the user's own department (or a ward) */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Requesting for *</label>
                    <div className="inline-flex mb-2 rounded-lg border border-[var(--border-color)] overflow-hidden">
                      {(['department', 'ward'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, requesterType: type })}
                          className={`px-4 py-1.5 text-sm transition-colors ${
                            formData.requesterType === type
                              ? 'bg-[var(--icon-cyan-text)] text-white'
                              : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                          }`}
                        >
                          {type === 'department' ? 'My department' : 'A ward'}
                        </button>
                      ))}
                    </div>
                    {formData.requesterType === 'department' ? (
                      myDepartmentId || hasRole(['admin']) === false ? (
                        <div className="px-3 py-2 text-sm rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]">
                          {myDepartmentName || 'Your department'}
                          <span className="ml-2 text-xs text-[var(--text-tertiary)]">(your department)</span>
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.requestingDepartmentId}
                          onChange={e => setFormData({ ...formData, requestingDepartmentId: e.target.value })}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                        >
                          <option value="">Select department...</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                      )
                    ) : (
                      <select
                        required
                        value={formData.requestingWardId}
                        onChange={e => setFormData({ ...formData, requestingWardId: e.target.value })}
                        className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                      >
                        <option value="">Select ward...</option>
                        {wards.map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* WHERE the goods come from */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Request from (department / store) *</label>
                    <select
                      required
                      value={formData.supplyingDepartmentId}
                      onChange={e => changeSupplier(e.target.value)}
                      className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm md:mt-[38px]"
                    >
                      <option value="">Select supplying department...</option>
                      {supplierOptions.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}{(dept as any).isStore ? ' (store)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Purpose *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter the purpose of this requisition"
                    value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Urgency *
                  </label>
                  <select 
                    required
                    value={formData.urgency}
                    onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Required Date
                  </label>
                  <input 
                    type="date" 
                    value={formData.requiredDate}
                    onChange={e => setFormData({ ...formData, requiredDate: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
              </div>

              {/* Requisition Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">Requested Items *</h3>
                  <button
                    type="button"
                    onClick={addRequisitionItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {!formData.supplyingDepartmentId && (
                    <div className="text-xs text-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)] rounded-lg px-3 py-2">
                      Choose the department/store you are requesting from first, then search for items.
                    </div>
                  )}
                  {formData.requisitionItems.map((item, index) => {
                    const picked = item.picked;
                    const over = !!picked && item.quantityRequested > picked.supplierQty;
                    const chosenIds = new Set(formData.requisitionItems.map(l => l.stockItemId).filter(Boolean));

                    return (
                      <div key={index} className="p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                          <div className="md:col-span-7">
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Item *</label>
                            <AsyncSelect<RequisitionStockLookupItem, false>
                              key={`${formData.supplyingDepartmentId}-${index}`}
                              cacheOptions={false}
                              defaultOptions
                              isDisabled={!formData.supplyingDepartmentId}
                              loadOptions={loadItemOptions}
                              value={picked || null}
                              onChange={(sel) => updateRequisitionItem(index, { stockItemId: sel?.id || '', picked: sel || null })}
                              getOptionValue={(o) => o.id}
                              getOptionLabel={(o) => `${o.name}${o.strength && o.strength !== 'N/A' ? ' ' + o.strength : ''}`}
                              isOptionDisabled={(o) => chosenIds.has(o.id) && o.id !== item.stockItemId}
                              formatOptionLabel={(o, meta) => (
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate">{o.name}{o.strength && o.strength !== 'N/A' ? ` ${o.strength}` : ''}</div>
                                    <div className="text-[11px] opacity-60">{o.drugCode} · {o.unitOfMeasure}</div>
                                  </div>
                                  {meta.context === 'menu' && (
                                    <div className="text-right text-[11px] shrink-0">
                                      <div className={o.supplierQty > 0 ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
                                        {supplierName}: {o.supplierQty}
                                      </div>
                                      <div className="opacity-70">You: {o.requesterQty}</div>
                                    </div>
                                  )}
                                </div>
                              )}
                              placeholder={formData.supplyingDepartmentId ? 'Type to search by name or code...' : 'Select the supplying department first'}
                              noOptionsMessage={({ inputValue }) => (inputValue ? `No items match "${inputValue}"` : 'Type to search items')}
                              loadingMessage={() => 'Searching...'}
                              isClearable
                              className="text-sm"
                              classNamePrefix="react-select"
                              styles={{
                                control: (base) => ({ ...base, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', minHeight: '40px', fontSize: '14px' }),
                                option: (base) => ({ ...base, fontSize: '14px' }),
                                menu: (base) => ({ ...base, zIndex: 9999, minWidth: 380 }),
                                singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
                                input: (base) => ({ ...base, color: 'var(--text-primary)' })
                              }}
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                              Quantity *{picked ? ` (${picked.unitOfMeasure})` : ''}
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              required
                              value={item.quantityRequested}
                              onChange={e => updateRequisitionItem(index, { quantityRequested: parseInt(e.target.value) || 0 })}
                              className={`w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm ${over ? 'border-red-400' : 'border-[var(--border-color)]'}`}
                            />
                          </div>
                          <div className="md:col-span-2 flex md:justify-end md:pt-6">
                            <button
                              type="button"
                              onClick={() => removeRequisitionItem(index)}
                              className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quantities at both ends */}
                        {picked && (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-1 rounded-md font-medium ${picked.supplierQty > 0 ? 'bg-[var(--icon-green-bg)] text-[var(--icon-green-text)]' : 'bg-[var(--icon-red-bg)] text-[var(--icon-red-text)]'}`}>
                              {supplierName} has: {picked.supplierQty} {picked.unitOfMeasure}
                            </span>
                            <span className="px-2 py-1 rounded-md bg-[var(--icon-blue-bg)] text-[var(--icon-blue-text)] font-medium">
                              {requesterDeptName} has: {picked.requesterQty} {picked.unitOfMeasure}
                            </span>
                            {picked.requesterQty <= picked.reorderLevel && (
                              <span className="px-2 py-1 rounded-md bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">Below reorder level ({picked.reorderLevel})</span>
                            )}
                            {over && (
                              <span className="px-2 py-1 rounded-md bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] font-medium">
                                Only {picked.supplierQty} available - you are asking for {item.quantityRequested}
                              </span>
                            )}
                            {!over && item.quantityRequested > 0 && (
                              <span className="text-[var(--text-secondary)]">
                                After receiving: {picked.requesterQty + item.quantityRequested} {picked.unitOfMeasure}
                              </span>
                            )}
                          </div>
                        )}

                        <input
                          type="text"
                          placeholder="Reason for this item (optional)"
                          value={item.purpose}
                          onChange={e => updateRequisitionItem(index, { purpose: e.target.value })}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] text-sm"
                        />
                      </div>
                    );
                  })}
                </div>

                {formData.requisitionItems.length === 0 && (
                  <div className="text-center py-6 text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color)] rounded-lg">
                    <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                    Click "Add Item" to add items to this requisition
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Additional Notes
                </label>
                <textarea 
                  placeholder="Any additional information or special instructions..."
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none" 
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formData.requisitionItems.length === 0}
                  className="flex-1 px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  Create Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Requisition Details</h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">{selectedRequisition.requisitionNumber}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Purpose</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selectedRequisition.purpose || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">{selectedRequisition.ward?.wardName ? 'Ward' : 'Department'}</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selectedRequisition.departments?.name || selectedRequisition.ward?.wardName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Requested from</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selectedRequisition.supplyingDepartment?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Requested By</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">
                    {selectedRequisition.User_Requisition_requestedByIdToUser?.fullName || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Requested Date</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">
                    {new Date(selectedRequisition.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Requested Items</h3>
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-[var(--text-secondary)]">Item</th>
                        <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">Requested</th>
                        <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">Approved</th>
                        <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">Fulfilled</th>
                        {selectedRequisition.supplyingDepartmentId && selectedRequisition.status !== 'fulfilled' && selectedRequisition.status !== 'cancelled' && (
                          <>
                            <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">At {selectedRequisition.supplyingDepartment?.name || 'supplier'}</th>
                            <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">At {selectedRequisition.departments?.name || 'requester'}</th>
                          </>
                        )}
                        <th className="px-4 py-2 text-left text-xs text-[var(--text-secondary)]">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {selectedRequisition.RequisitionItem?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-[var(--text-primary)]">{item.StockItem?.name || getStockItemName(item.stockItemId)}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityRequested}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityApproved || '—'}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityFulfilled || '—'}</td>
                          {selectedRequisition.supplyingDepartmentId && selectedRequisition.status !== 'fulfilled' && selectedRequisition.status !== 'cancelled' && (
                            <>
                              <td className={`px-4 py-2 text-center font-medium ${(item.supplierQty ?? 0) >= (item.quantityApproved ?? item.quantityRequested) ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'}`}>{item.supplierQty ?? '—'}</td>
                              <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.requesterQty ?? '—'}</td>
                            </>
                          )}
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{item.purpose || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Approval Timeline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Approval Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">Created:</span>
                    <span className="text-[var(--text-primary)]">{new Date(selectedRequisition.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedRequisition.approvedAt && (
                    <div className="flex items-center gap-3">
                      <CheckCheck className="w-4 h-4 text-[var(--icon-green-text)]" />
                      <span className="text-[var(--text-secondary)]">Approved:</span>
                      <span className="text-[var(--text-primary)]">{new Date(selectedRequisition.approvedAt).toLocaleString()}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        by {selectedRequisition.User_Requisition_approvedByIdToUser?.fullName || 'Unknown'}
                      </span>
                    </div>
                  )}
                  {selectedRequisition.fulfilledAt && (
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      <span className="text-[var(--text-secondary)]">Fulfilled:</span>
                      <span className="text-[var(--text-primary)]">{new Date(selectedRequisition.fulfilledAt).toLocaleString()}</span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        by {selectedRequisition.User_Requisition_fulfilledByIdToUser?.fullName || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {selectedRequisition.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</h3>
                  <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)]">{selectedRequisition.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}