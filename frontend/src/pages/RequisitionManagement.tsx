// src/pages/RequisitionManagement.tsx - COMPLETE FIXED VERSION + REDESIGNED CREATE MODAL
import { useEffect, useMemo, useRef, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import AsyncSelect from 'react-select/async';
import { lookupRequisitionStock, getRequisition as apiGetRequisition, type RequisitionStockLookupItem } from '../api';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useWardStore } from '../store/wardStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  ClipboardList,
  Trash2,
  RefreshCw,
  XCircle,
  Clock,
  Eye,
  Filter,
  X,
  ChevronRight,
  AlertCircle,
  Package,
  User,
  Calendar,
  Send,
  CheckCheck,
  Truck,
  Building2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  cn,
  FilterSelect,
  humanStatus,
  INPUT,
  PageHeader,
  Pagination,
  SearchInput,
  SELECT,
  StatCard,
  statusTone,
  TABLE_SHELL,
  TD,
  TH,
  TH_ROW,
  TR,
} from '../components/ui';
import type { BadgeTone } from '../components/ui';

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
  // The stock store declares its own narrower `Requisition` (no supplier relation, no
  // requester user), but the API returns both — the page's interface is the wider one,
  // so the list is read through it. Purely a type-level cast; the data is untouched.
  const filteredRequisitions = ((requisitions || []) as unknown as Requisition[]).filter(requisition => {
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
      if (!(await confirmDialog({ title: 'Insufficient stock', message: `${supplierName} does not currently hold enough of:\n\n${list}\n\nSubmit anyway?`, confirmText: 'Submit anyway', type: 'warning' }))) return;
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
    if (!(await confirmDialog({ title: 'Delete requisition', message: 'Delete this requisition? This action cannot be undone.', confirmText: 'Delete' }))) return;
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

  /**
   * Urgency is not a workflow status, so `statusTone` has no mapping for it and the
   * tones stay here. "Routine" reads as a neutral chip.
   */
  const getUrgencyTone = (urgency: string): BadgeTone => {
    switch (urgency) {
      case 'urgent': return 'yellow';
      case 'emergency': return 'red';
      default: return 'neutral';
    }
  };

  const isRequesterSide = (r: Requisition) =>
    r.requestedById === user?.id || (!!user?.departmentId && user.departmentId === r.requestingDepartmentId);
  // The supplying department approves/fulfils. Admins always can. Old requisitions (no supplier) fall back to pharmacist/admin.
  const isSupplierSide = (r: Requisition) =>
    hasRole(['admin']) || (r.supplyingDepartmentId ? user?.departmentId === r.supplyingDepartmentId : isAdmin);

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

  // Count of items in the form that have an actual stock item selected
  const pickedItemCount = formData.requisitionItems.filter(i => i.stockItemId).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Requisitions"
        subtitle="Manage internal stock requests and approvals"
        icon={ClipboardList}
        accent="blue"
        onBack={() => navigate(-1)}
        actions={(
          <>
            <Button icon={RefreshCw} loading={isLoading} onClick={loadData}>
              Refresh
            </Button>
            <Button
              variant={showFilters || hasActiveFilters ? 'soft' : 'outline'}
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 bg-[var(--icon-red-text)] rounded-full" aria-hidden="true" />
              )}
            </Button>
            <Button variant="soft" icon={Plus} onClick={() => { resetForm(); setShowForm(true); }}>
              New Requisition
            </Button>
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total" value={requisitions?.length || 0} icon={ClipboardList} />
        <StatCard
          label="Submitted"
          value={requisitions?.filter(r => r.status === 'submitted').length || 0}
          icon={Send}
          accent="blue"
        />
        <StatCard
          label="Approved"
          value={requisitions?.filter(r => r.status === 'approved').length || 0}
          icon={CheckCheck}
          accent="green"
        />
        <StatCard
          label="Fulfilled"
          value={requisitions?.filter(r => r.status === 'fulfilled').length || 0}
          icon={Truck}
          accent="cyan"
        />
        <StatCard
          label="Cancelled"
          value={requisitions?.filter(r => r.status === 'cancelled').length || 0}
          icon={XCircle}
          accent="red"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card
          title="Filter Requisitions"
          icon={Filter}
          actions={(
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={X}
              aria-label="Hide filters"
              onClick={() => setShowFilters(false)}
            />
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <FilterSelect
                aria-label="Filter by status"
                className="w-full"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'fulfilled', label: 'Fulfilled' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Urgency</label>
              <FilterSelect
                aria-label="Filter by urgency"
                className="w-full"
                value={urgencyFilter}
                onChange={setUrgencyFilter}
                options={[
                  { value: 'all', label: 'All Urgencies' },
                  { value: 'routine', label: 'Routine' },
                  { value: 'urgent', label: 'Urgent' },
                  { value: 'emergency', label: 'Emergency' },
                ]}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Items Per Page */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <SearchInput
          className="flex-1"
          placeholder="Search by requisition number, purpose, or department..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <FilterSelect
            aria-label="Requisitions per page"
            value={String(itemsPerPage)}
            onChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
            options={[
              { value: '10', label: '10' },
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
          />
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

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
        <Card className="py-12 text-center">
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
            <Button variant="soft" icon={X} onClick={clearFilters}>
              Clear All Filters
            </Button>
          ) : (
            <Button variant="soft" icon={Plus} onClick={() => { resetForm(); setShowForm(true); }}>
              Create First Requisition
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Req #</th>
                    <th className={TH}>Requested By</th>
                    <th className={TH}>Requester → Supplier</th>
                    <th className={cn(TH, 'text-center')}>Urgency</th>
                    <th className={cn(TH, 'text-center')}>Status</th>
                    <th className={TH}>Required By</th>
                    <th className={cn(TH, 'text-center')}>Items</th>
                    <th className={TH}>Created</th>
                    <th className={cn(TH, 'text-right')}>Total</th>
                    <th className={cn(TH, 'text-center')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequisitions.map(requisition => {
                    // Requester / supplier labels
                    const requesterLabel =
                      requisition.departments?.name ||
                      requisition.ward?.wardName ||
                      '—';
                    const supplierLabel =
                      requisition.supplyingDepartment?.name ||
                      'Not set';

                    // Required-by status
                    let requiredBy: Date | null = null;
                    if (requisition.requiredDate) {
                      const d = new Date(requisition.requiredDate);
                      if (!isNaN(d.getTime())) requiredBy = d;
                    }
                    const overdue =
                      !!requiredBy &&
                      requiredBy < new Date() &&
                      requisition.status !== 'fulfilled' &&
                      requisition.status !== 'cancelled';

                    // Item count + best-effort total
                    const itemCount = requisition.RequisitionItem?.length || 0;
                    const totalValue = (requisition.RequisitionItem || []).reduce((sum, it: any) => {
                      const qty = Number(it.quantityApproved ?? it.quantityRequested ?? 0);
                      const unit = Number(it.unitCost ?? it.StockItem?.costPrice ?? 0);
                      return sum + (Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0);
                    }, 0);
                    const hasTotal = (requisition.RequisitionItem || []).some(
                      (it: any) => it.unitCost != null || it.StockItem?.costPrice != null
                    );

                    return (
                      <tr key={requisition.id} className={TR}>

                        {/* Req # + purpose subtitle */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="font-mono font-semibold whitespace-nowrap">
                            {requisition.requisitionNumber}
                          </div>
                          {requisition.purpose && (
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 max-w-[200px] truncate" title={requisition.purpose}>
                              {requisition.purpose}
                            </div>
                          )}
                        </td>

                        {/* Requested by + requester department/ward */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                            <span className="font-medium truncate max-w-[160px]">
                              {requisition.User_Requisition_requestedByIdToUser?.fullName || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate max-w-[180px]">
                            {requesterLabel}
                          </div>
                        </td>

                        {/* Requester → Supplier chips */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-color)] text-[11px] text-[var(--text-primary)] max-w-[130px]">
                              <Building2 className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                              <span className="truncate">{requesterLabel}</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] text-[11px] font-semibold max-w-[140px]">
                              <Package className="w-3 h-3 shrink-0" />
                              <span className="truncate">{supplierLabel}</span>
                            </span>
                          </div>
                        </td>

                        {/* Urgency */}
                        <td className={cn(TD, 'align-top text-center')}>
                          <Badge tone={getUrgencyTone(requisition.urgency)} size="sm">{humanStatus(requisition.urgency)}</Badge>
                        </td>

                        {/* Status */}
                        <td className={cn(TD, 'align-top text-center')}>
                          <Badge tone={statusTone(requisition.status)} dot size="sm">{humanStatus(requisition.status)}</Badge>
                        </td>

                        {/* Required by */}
                        <td className={cn(TD, 'align-top')}>
                          {requiredBy ? (
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Calendar className={cn('w-3 h-3 shrink-0', overdue ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]')} />
                              <span className={cn(overdue ? 'text-[var(--icon-red-text)] font-semibold' : 'text-[var(--text-secondary)]')}>
                                {requiredBy.toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>

                        {/* Items */}
                        <td className={cn(TD, 'align-top text-center')}>
                          <span className="font-medium">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </td>

                        {/* Created */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                            <span className="text-[var(--text-secondary)]">
                              {new Date(requisition.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Total (best effort — shows "—" if no per-item cost is available) */}
                        <td className={cn(TD, 'align-top text-right')}>
                          {hasTotal && totalValue > 0 ? (
                            <span className="font-semibold">
                              GHS {totalValue.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details */}
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Eye}
                              className="text-[var(--icon-cyan-text)]"
                              title="View Details"
                              aria-label={`View details for ${requisition.requisitionNumber}`}
                              onClick={() => { openDetails(requisition); }}
                            />

                            {/* Submit (Draft only) */}
                            {canSubmit(requisition) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Send}
                                className="text-[var(--icon-blue-text)]"
                                title="Submit for Approval"
                                aria-label={`Submit ${requisition.requisitionNumber} for approval`}
                                onClick={() => handleStatusUpdate(requisition.id, 'submitted')}
                              />
                            )}

                            {/* Approve (Submitted only) */}
                            {canApprove(requisition) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={CheckCheck}
                                className="text-[var(--icon-green-text)]"
                                title="Approve"
                                aria-label={`Approve ${requisition.requisitionNumber}`}
                                onClick={() => handleStatusUpdate(requisition.id, 'approved')}
                              />
                            )}

                            {/* Fulfill (Approved only) */}
                            {canFulfill(requisition) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Truck}
                                className="text-[var(--icon-cyan-text)]"
                                title="Fulfill"
                                aria-label={`Fulfill ${requisition.requisitionNumber}`}
                                onClick={() => handleStatusUpdate(requisition.id, 'fulfilled')}
                              />
                            )}

                            {/* Cancel */}
                            {(canSubmit(requisition) || canApprove(requisition)) && (
                              <Button
                                size="sm"
                                variant="dangerSoft"
                                iconOnly
                                icon={XCircle}
                                title="Cancel"
                                aria-label={`Cancel ${requisition.requisitionNumber}`}
                                onClick={() => handleStatusUpdate(requisition.id, 'cancelled')}
                              />
                            )}

                            {/* Delete */}
                            {canDelete(requisition) && (
                              <Button
                                size="sm"
                                variant="dangerSoft"
                                iconOnly
                                icon={Trash2}
                                title="Delete"
                                aria-label={`Delete ${requisition.requisitionNumber}`}
                                onClick={() => handleDelete(requisition.id)}
                              />
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedRequisitions.length}
            noun="requisitions"
            onChange={handlePageChange}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE REQUISITION MODAL — REDESIGNED
          ═══════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-color)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">New Requisition</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Fill the four steps below to raise a stock request
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={X}
                aria-label="Close form"
                onClick={() => setShowForm(false)}
              />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">

              {/* ─── Sticky context bar ──────────────────────────────────── */}
              <div className="sticky top-0 z-10 bg-[var(--bg-main)] border-b border-[var(--border-color)] px-6 py-2.5 flex items-center gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                  <span className="text-[var(--text-secondary)] shrink-0">From</span>
                  <span className="font-semibold text-[var(--text-primary)] truncate">
                    {formData.requesterType === 'ward'
                      ? (wards.find(w => w.id === formData.requestingWardId)?.wardName || 'Select a ward')
                      : (myDepartmentName || 'Your department')}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                  <span className="text-[var(--text-secondary)] shrink-0">To</span>
                  <span className="font-semibold text-[var(--text-primary)] truncate">
                    {formData.supplyingDepartmentId
                      ? (departments.find(d => d.id === formData.supplyingDepartmentId)?.name || 'Selected store')
                      : 'Select a supplier'}
                  </span>
                </div>
                {formData.urgency !== 'routine' && (
                  <Badge
                    className="ml-auto"
                    tone={formData.urgency === 'emergency' ? 'red' : 'yellow'}
                  >
                    <AlertCircle className="w-3 h-3" />
                    {formData.urgency === 'emergency' ? 'EMERGENCY' : 'URGENT'}
                  </Badge>
                )}
              </div>

              {/* ─── Scrollable body ─────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">

                {/* ═══════════ 1. WHO IS REQUESTING ═══════════ */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Who is requesting</h3>
                  </div>

                  <div className="pl-8 space-y-3">
                    {/* Toggle: department vs ward */}
                    <div className="inline-flex rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-main)]">
                      {(['department', 'ward'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, requesterType: type })}
                          className={`px-4 py-2 text-xs font-semibold transition-colors ${formData.requesterType === type
                              ? 'bg-[var(--icon-cyan-text)] text-white'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                            }`}
                        >
                          {type === 'department' ? 'My department' : 'A ward'}
                        </button>
                      ))}
                    </div>

                    {/* The actual picker, full width */}
                    {formData.requesterType === 'department' ? (
                      myDepartmentId || hasRole(['admin']) === false ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]">
                          <Building2 className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {myDepartmentName || 'Your department'}
                          </span>
                          <span className="ml-auto text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">
                            Locked to your account
                          </span>
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.requestingDepartmentId}
                          onChange={e => setFormData({ ...formData, requestingDepartmentId: e.target.value })}
                          className={cn(SELECT, 'w-full')}
                        >
                          <option value="">Select department…</option>
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
                        className={cn(SELECT, 'w-full')}
                      >
                        <option value="">Select ward…</option>
                        {wards.map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </section>

                {/* ═══════════ 2. WHERE FROM ═══════════ */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Where to request from</h3>
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">Store / department</span>
                  </div>

                  <div className="pl-8">
                    <select
                      required
                      value={formData.supplyingDepartmentId}
                      onChange={e => changeSupplier(e.target.value)}
                      className={cn(SELECT, 'w-full')}
                    >
                      <option value="">Select supplying department / store…</option>
                      {supplierOptions.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}{(dept as any).isStore ? ' — Main Store' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                      Item search will use this department's live stock levels.
                    </p>
                  </div>
                </section>

                {/* ═══════════ 3. ITEMS ═══════════ */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">What you need</h3>
                      {pickedItemCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          {pickedItemCount}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Plus}
                      disabled={!formData.supplyingDepartmentId}
                      onClick={addRequisitionItem}
                    >
                      Add item
                    </Button>
                  </div>

                  <div className="pl-8 space-y-3">
                    {!formData.supplyingDepartmentId && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] text-xs">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Choose the supplying department in step 2 first, then add items here.</span>
                      </div>
                    )}

                    {formData.requisitionItems.map((item, index) => {
                      const picked = item.picked;
                      const over = !!picked && item.quantityRequested > picked.supplierQty;
                      const chosenIds = new Set(formData.requisitionItems.map(l => l.stockItemId).filter(Boolean));
                      const displayIndex = formData.requisitionItems.slice(0, index + 1).filter(i => i.stockItemId).length || index + 1;

                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden"
                        >
                          {/* Item header */}
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] shrink-0">
                                Item #{displayIndex || index + 1}
                              </span>
                              {picked && (
                                <span className="text-[10px] text-[var(--text-tertiary)] truncate">
                                  · {picked.name}{picked.strength && picked.strength !== 'N/A' ? ` ${picked.strength}` : ''}
                                </span>
                              )}
                            </div>
                            <Button
                              size="xs"
                              variant="ghost"
                              iconOnly
                              icon={Trash2}
                              className="text-[var(--text-tertiary)] hover:bg-[var(--icon-red-bg)] hover:text-[var(--icon-red-text)]"
                              title="Remove item"
                              aria-label={`Remove item ${displayIndex || index + 1}`}
                              onClick={() => removeRequisitionItem(index)}
                            />
                          </div>

                          {/* Item body */}
                          <div className="p-3 space-y-3">
                            {/* Picker — full width */}
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                                Item
                              </label>
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
                                        <div className={cn('font-semibold', o.supplierQty > 0 ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]')}>
                                          {supplierName}: {o.supplierQty}
                                        </div>
                                        <div className="opacity-70">You: {o.requesterQty}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                placeholder={formData.supplyingDepartmentId ? 'Search by name or code…' : 'Select the supplier first'}
                                noOptionsMessage={({ inputValue }) => (inputValue ? `No items match "${inputValue}"` : 'Type to search items')}
                                loadingMessage={() => 'Searching…'}
                                isClearable
                                className="text-sm"
                                classNamePrefix="react-select"
                                styles={{
                                  control: (base) => ({ ...base, backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', minHeight: '38px', fontSize: '13px' }),
                                  option: (base) => ({ ...base, fontSize: '13px' }),
                                  menu: (base) => ({ ...base, zIndex: 9999, minWidth: 380 }),
                                  singleValue: (base) => ({ ...base, color: 'var(--text-primary)' }),
                                  input: (base) => ({ ...base, color: 'var(--text-primary)' })
                                }}
                              />
                            </div>

                            {/* Quantity + item-level purpose */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                                  Quantity
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={item.quantityRequested}
                                    onChange={e => updateRequisitionItem(index, { quantityRequested: parseInt(e.target.value) || 0 })}
                                    className={cn(INPUT, 'flex-1', over && 'border-[var(--icon-red-text)]')}
                                  />
                                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap min-w-[40px]">
                                    {picked?.unitOfMeasure || '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                                  Reason for this item <span className="normal-case font-normal">(optional)</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. For Ward 3 deliveries this week"
                                  value={item.purpose}
                                  onChange={e => updateRequisitionItem(index, { purpose: e.target.value })}
                                  className={cn(INPUT, 'w-full')}
                                />
                              </div>
                            </div>

                            {/* Live quantities — stable info block */}
                            {picked && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className={`rounded-lg px-3 py-2 border ${picked.supplierQty > 0
                                    ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]/30'
                                    : 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]/30'
                                  }`}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    At {supplierName}
                                  </p>
                                  <p className={`text-lg font-bold leading-tight ${picked.supplierQty > 0 ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'
                                    }`}>
                                    {picked.supplierQty} <span className="text-xs font-normal">{picked.unitOfMeasure}</span>
                                  </p>
                                </div>
                                <div className="rounded-lg px-3 py-2 border border-[var(--border-color)] bg-[var(--icon-blue-bg)]">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    At {requesterDeptName}
                                  </p>
                                  <p className="text-lg font-bold leading-tight text-[var(--icon-blue-text)]">
                                    {picked.requesterQty} <span className="text-xs font-normal">{picked.unitOfMeasure}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Warnings / hints */}
                            {picked && (
                              <div className="flex flex-wrap gap-2 text-[11px]">
                                {over && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] font-semibold">
                                    <AlertCircle className="w-3 h-3" />
                                    Only {picked.supplierQty} available — you are asking for {item.quantityRequested}
                                  </span>
                                )}
                                {!over && item.quantityRequested > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                                    After receiving: <strong className="text-[var(--text-primary)]">{picked.requesterQty + item.quantityRequested} {picked.unitOfMeasure}</strong>
                                  </span>
                                )}
                                {picked.requesterQty <= picked.reorderLevel && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
                                    Below reorder level ({picked.reorderLevel})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {formData.requisitionItems.length === 0 && (
                      <div className="text-center py-8 text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color)] rounded-lg">
                        <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                        Click "Add item" above to add items to this requisition
                      </div>
                    )}
                  </div>
                </section>

                {/* ═══════════ 4. DETAILS ═══════════ */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">4</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Details</h3>
                  </div>

                  <div className="pl-8 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          Purpose <span className="text-[var(--icon-red-text)]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Replenishment for delivery ward"
                          value={formData.purpose}
                          onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                          className={cn(INPUT, 'w-full')}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Urgency</label>
                        <select
                          value={formData.urgency}
                          onChange={e => setFormData({ ...formData, urgency: e.target.value as any })}
                          className={cn(SELECT, 'w-full')}
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Required by <span className="text-[10px] font-normal text-[var(--text-tertiary)]">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formData.requiredDate}
                        onChange={e => setFormData({ ...formData, requiredDate: e.target.value })}
                        className={cn(INPUT, 'w-full md:w-64')}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Additional notes <span className="text-[10px] font-normal text-[var(--text-tertiary)]">(optional)</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Any additional information or special instructions…"
                        value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        className={cn(INPUT, 'w-full resize-none')}
                      />
                    </div>
                  </div>
                </section>
              </div>

              {/* ─── Sticky footer ──────────────────────────────────────── */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
                <div className="text-xs text-[var(--text-tertiary)] hidden sm:block">
                  {pickedItemCount} item{pickedItemCount === 1 ? '' : 's'} ·{' '}
                  {formData.supplyingDepartmentId ? 'Supplier selected' : 'No supplier yet'} ·{' '}
                  {formData.purpose ? 'Purpose set' : 'Purpose required'}
                </div>
                <div className="flex gap-3 ml-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => { setShowForm(false); resetForm(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="soft"
                    disabled={pickedItemCount === 0}
                  >
                    Create Requisition
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW DETAILS MODAL (unchanged)
          ═══════════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Requisition Details</h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">{selectedRequisition.requisitionNumber}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={X}
                aria-label="Close details"
                onClick={() => setShowDetailModal(false)}
              />
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