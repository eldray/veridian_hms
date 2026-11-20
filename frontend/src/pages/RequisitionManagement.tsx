import { useSmartBack } from '../utils/useSmartBack';
// src/pages/RequisitionManagement.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, RefreshCw, Filter, Plus, X, Send, CheckCheck, Truck,
  XCircle, Trash2, Eye, User, Building2, Package, ChevronRight,
  Calendar, Clock, AlertCircle
} from 'lucide-react';
import AsyncSelect from 'react-select/async';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import {
  getRequisition as apiGetRequisition,
  lookupRequisitionStock,
  updateRequisitionStatus,
  updateRequisition as apiUpdateRequisition,
  getDepartments,
  getWards,
  type Requisition,
  type RequisitionStockLookupItem,
} from '../api';
import {
  PageHeader, Button, Card, StatCard, SearchInput, FilterSelect, Badge, Pagination,
  cn, TABLE_SHELL, TH_ROW, TH, TD, TR, INPUT, SELECT, statusTone, humanStatus,
} from '../components/ui';
import type { BadgeTone } from '../components/ui';
import { useToast } from '../store/toastStore';
import { confirmDialog } from '../context/ConfirmDialog';

// ─────────────────────────────────────────────────────────────
// Types for the form
// ─────────────────────────────────────────────────────────────
interface FormLine {
  stockItemId: string;
  quantityRequested: number;
  purpose: string;
  picked: RequisitionStockLookupItem | null;
}

const emptyLine = (): FormLine => ({
  stockItemId: '',
  quantityRequested: 1,
  purpose: '',
  picked: null,
});

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function RequisitionsPage() {
  const goBack = useSmartBack('/dashboard/stock');
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { user, hasRole } = useAuthStore(); // adjust to your auth shape
  const {
    requisitions,
    isLoading,
    getRequisitions,
    createRequisition,
    deleteRequisition,
    approveRequisition,
  } = useStockStore();

  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);

  // Supporting data for the form
  const [departments, setDepartments] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]); // only used for name fallback

  const myDepartmentId = user?.departmentId || '';
  const myDepartmentName = departments.find(d => d.id === myDepartmentId)?.name || '';

  const [formData, setFormData] = useState({
    requesterType: 'department' as 'department' | 'ward',
    requestingDepartmentId: myDepartmentId,
    requestingWardId: '',
    supplyingDepartmentId: '',
    purpose: '',
    urgency: 'routine' as 'routine' | 'urgent' | 'emergency',
    requiredDate: '',
    notes: '',
    requisitionItems: [emptyLine()] as FormLine[],
  });

  // ─────────────────────────────────────────────────────────────
  // Load
  // ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [requisitionResult, departmentResult, wardResult] = await Promise.all([
        getRequisitions(),
        getDepartments(),
        getWards(),
      ]);
      // The API helpers normalize paginated and wrapped responses. Keep a final
      // defensive unwrap here because the wards endpoint has legacy envelopes.
      const rows = (value: any) => Array.isArray(value) ? value
        : Array.isArray(value?.data) ? value.data
        : Array.isArray(value?.items) ? value.items
        : Array.isArray(value?.wards) ? value.wards
        : Array.isArray(value?.departments) ? value.departments : [];
      setDepartments(rows(departmentResult).filter((item: any) => item?.isActive !== false));
      setWards(rows(wardResult).filter((item: any) => item?.isActive !== false));
      void requisitionResult;
    } catch (error) {
      console.error('Failed to load data:', error);
      toastError('Load failed', 'Could not load requisition data');
    }
  }, [getRequisitions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (myDepartmentId) {
      setFormData(prev => ({ ...prev, requestingDepartmentId: myDepartmentId }));
    }
  }, [myDepartmentId]);

  // ─────────────────────────────────────────────────────────────
  // Derived lists
  // ─────────────────────────────────────────────────────────────
  const filteredRequisitions = useMemo(() => {
    return ((requisitions || []) as Requisition[]).filter(r => {
      const matchesSearch =
        r.requisitionNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.departments?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.ward?.wardName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.supplyingDepartment?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesUrgency = urgencyFilter === 'all' || r.urgency === urgencyFilter;
      return matchesSearch && matchesStatus && matchesUrgency;
    });
  }, [requisitions, searchTerm, statusFilter, urgencyFilter]);

  const sortedRequisitions = useMemo(
    () => [...filteredRequisitions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [filteredRequisitions]
  );

  const totalPages = Math.ceil(sortedRequisitions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequisitions = sortedRequisitions.slice(startIndex, startIndex + itemsPerPage);

  const supplierOptions = useMemo(
    () => departments.filter(d => d.id !== myDepartmentId),
    [departments, myDepartmentId]
  );

  const supplierName = departments.find(d => d.id === formData.supplyingDepartmentId)?.name || 'Supplier';
  const requesterDeptName =
    formData.requesterType === 'ward'
      ? (wards.find(w => w.id === formData.requestingWardId)?.wardName || 'Ward')
      : (myDepartmentName || 'Your department');

  // ─────────────────────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────────────────────
  const isRequesterSide = (r: Requisition) =>
    r.requestedById === user?.id ||
    (!!user?.departmentId && user.departmentId === r.requestingDepartmentId);

  const isSupplierSide = (r: Requisition) =>
    hasRole(['admin', 'super_admin']) ||
    (r.supplyingDepartmentId
      ? user?.departmentId === r.supplyingDepartmentId
      : hasRole(['admin', 'super_admin', 'pharmacist']));

  const canSubmit = (r: Requisition) => r.status === 'draft' && isRequesterSide(r);
  const canApprove = (r: Requisition) => r.status === 'submitted' && isSupplierSide(r);
  const canFulfill = (r: Requisition) => r.status === 'approved' && isSupplierSide(r);
  const canCancel = (r: Requisition) =>
    (r.status === 'draft' || r.status === 'submitted' || r.status === 'approved') &&
    (isRequesterSide(r) || isSupplierSide(r));
  const canDelete = (r: Requisition) =>
    (r.status === 'draft' && r.requestedById === user?.id) || hasRole(['admin', 'super_admin']);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (id: string, status: string, additionalData?: any) => {
    try {
      await updateRequisitionStatus(id, status, additionalData);
      const messages: Record<string, string> = {
        submitted: 'Requisition submitted for approval',
        fulfilled: 'Requisition fulfilled — stock moved',
        cancelled: 'Requisition cancelled',
      };
      success('Success', messages[status] || `Requisition ${status}`);
      await loadData();
    } catch (error: any) {
      console.error(`Failed to ${status} requisition:`, error);
      toastError('Action failed', error?.response?.data?.message || error.message || `Could not ${status} requisition`);
    }
  };

  /** Approve via the audited item-approval endpoint (all lines at requested qty) */
  const handleApprove = async (requisition: Requisition) => {
    try {
      await approveRequisition(requisition.id);
      success('Approved', 'All lines approved at requested quantities');
      await loadData();
    } catch (error: any) {
      console.error('Failed to approve requisition:', error);
      toastError('Approve failed', error?.response?.data?.message || error.message || 'Could not approve requisition');
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({
      title: 'Delete requisition',
      message: 'Delete this draft requisition? This cannot be undone.',
      confirmText: 'Delete',
    }))) return;

    try {
      await deleteRequisition(id);
      success('Deleted', 'Requisition deleted');
      await loadData();
    } catch (error: any) {
      toastError('Delete failed', error?.response?.data?.message || error.message);
    }
  };

  const handleEdit = (requisition: Requisition) => {
    if (requisition.status !== 'draft' || !(requisition.requestedById === user?.id || hasRole(['admin', 'super_admin']))) return;
    setEditingRequisition(requisition);
    setFormData(prev => ({
      ...prev,
      requesterType: requisition.requestingWardId ? 'ward' : 'department',
      requestingDepartmentId: requisition.requestingDepartmentId || myDepartmentId,
      requestingWardId: requisition.requestingWardId || '',
      supplyingDepartmentId: requisition.supplyingDepartmentId || '',
      purpose: requisition.purpose || '',
      urgency: requisition.urgency || 'routine',
      requiredDate: requisition.requiredDate ? String(requisition.requiredDate).slice(0, 10) : '',
      notes: requisition.notes || '',
      requisitionItems: (requisition.RequisitionItem || []).map((item: any) => ({
        stockItemId: item.stockItemId,
        quantityRequested: item.quantityRequested,
        purpose: item.purpose || '',
        picked: null,
      })),
    }));
    setShowForm(true);
  };

  const openDetails = async (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setShowDetailModal(true);
    try {
      const res: any = await apiGetRequisition(requisition.id);
      const full = res?.data ?? res;
      if (full) {
        setSelectedRequisition(prev => (prev && prev.id === requisition.id ? { ...prev, ...full } : prev));
      }
    } catch (err) {
      console.error('Could not load requisition details:', err);
    }
  };

  const resetForm = () => {
    setEditingRequisition(null);
    setFormData({
      requesterType: 'department',
      requestingDepartmentId: myDepartmentId,
      requestingWardId: '',
      supplyingDepartmentId: '',
      purpose: '',
      urgency: 'routine',
      requiredDate: '',
      notes: '',
      requisitionItems: [emptyLine()],
    });
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
    if (editingRequisition) {
      try {
        await apiUpdateRequisition(editingRequisition.id, {
          purpose: formData.purpose,
          urgency: formData.urgency,
          notes: formData.notes,
        });
        success('Updated', 'Draft requisition updated successfully');
        setShowForm(false);
        resetForm();
        await loadData();
      } catch (error: any) {
        toastError('Update failed', error?.response?.data?.message || error.message || 'Could not update requisition');
      }
      return;
    }
    if (validItems.length === 0) {
      toastError('Validation', 'Please add at least one item');
      return;
    }

    // Warn when asking for more than supplier currently holds
    const short = validItems.filter(i => i.picked && i.quantityRequested > i.picked.supplierQty);
    if (short.length > 0) {
      const list = short
        .map(i => `• ${i.picked!.name}: asking ${i.quantityRequested}, ${supplierName} has ${i.picked!.supplierQty}`)
        .join('\n');
      if (!(await confirmDialog({
        title: 'Insufficient stock',
        message: `${supplierName} does not currently hold enough of:\n\n${list}\n\nSubmit anyway?`,
        confirmText: 'Submit anyway',
        type: 'warning',
      }))) return;
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
          stockItemId,
          quantityRequested,
          purpose: purpose || undefined,
        })),
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

  // Form helpers
  const addRequisitionItem = () => {
    setFormData(prev => ({ ...prev, requisitionItems: [...prev.requisitionItems, emptyLine()] }));
  };

  const removeRequisitionItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems:
        prev.requisitionItems.length > 1
          ? prev.requisitionItems.filter((_, i) => i !== index)
          : [emptyLine()],
    }));
  };

  const updateRequisitionItem = (index: number, patch: Partial<FormLine>) => {
    setFormData(prev => ({
      ...prev,
      requisitionItems: prev.requisitionItems.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const changeSupplier = (id: string) => {
    setFormData(prev => ({
      ...prev,
      supplyingDepartmentId: id,
      requisitionItems: prev.requisitionItems.some(i => i.stockItemId) ? [emptyLine()] : prev.requisitionItems,
    }));
  };

  const loadItemOptions = async (inputValue: string): Promise<RequisitionStockLookupItem[]> => {
    if (!formData.supplyingDepartmentId) return [];
    try {
      return await lookupRequisitionStock({
        supplierDepartmentId: formData.supplyingDepartmentId,
        requesterDepartmentId: formData.requesterType === 'department' ? formData.requestingDepartmentId : undefined,
        q: inputValue,
        limit: 25,
      });
    } catch {
      return [];
    }
  };

  const getStockItemName = (id: string) => {
    const item = stockItems.find(i => i.id === id);
    return item?.name || 'Unknown Item';
  };

  const getUrgencyTone = (urgency: string): BadgeTone => {
    switch (urgency) {
      case 'urgent': return 'yellow';
      case 'emergency': return 'red';
      default: return 'neutral';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setUrgencyFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || urgencyFilter !== 'all';
  const pickedItemCount = formData.requisitionItems.filter(i => i.stockItemId).length;

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Requisitions"
        subtitle="Manage internal stock requests and approvals"
        icon={ClipboardList}
        accent="blue"
        onBack={goBack}
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

      {/* Stats */}
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

      {/* Filters */}
      {showFilters && (
        <Card
          title="Filter Requisitions"
          icon={Filter}
          actions={(
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Hide filters" onClick={() => setShowFilters(false)} />
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
            <div className="flex items-end">
              <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Search + page size */}
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
            onChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}
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

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-[var(--bg-main)] rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2" />
                  <div className="h-3 bg-[var(--bg-main)] rounded w-1/2" />
                </div>
                <div className="h-8 w-20 bg-[var(--bg-main)] rounded-lg" />
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
            {hasActiveFilters ? 'Try adjusting your search or filter criteria' : 'Get started by creating your first requisition'}
          </p>
          {hasActiveFilters ? (
            <Button variant="soft" icon={X} onClick={clearFilters}>Clear All Filters</Button>
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
                    const requesterLabel = requisition.departments?.name || requisition.ward?.wardName || '—';
                    const supplierLabel = requisition.supplyingDepartment?.name || 'Not set';

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
                        <td className={cn(TD, 'align-top')}>
                          <div className="font-mono font-semibold whitespace-nowrap">
                            {requisition.requisitionNumber}
                          </div>
                          {requisition.purpose && (
                            <div className="text-xs text-[var(--text-tertiary)] mt-0.5 max-w-[180px] truncate" title={requisition.purpose}>
                              {requisition.purpose}
                            </div>
                          )}
                        </td>

                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                            <span className="font-medium truncate max-w-[140px]">
                              {requisition.User_Requisition_requestedByIdToUser?.fullName || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate max-w-[140px]">
                            {requesterLabel}
                          </div>
                        </td>

                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--bg-main)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] max-w-[110px]">
                              <Building2 className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                              <span className="truncate">{requesterLabel}</span>
                            </span>
                            <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] text-xs font-semibold max-w-[110px]">
                              <Package className="w-3 h-3 shrink-0" />
                              <span className="truncate">{supplierLabel}</span>
                            </span>
                          </div>
                        </td>

                        <td className={cn(TD, 'align-top text-center')}>
                          <Badge tone={getUrgencyTone(requisition.urgency)} size="sm">
                            {humanStatus(requisition.urgency)}
                          </Badge>
                        </td>

                        <td className={cn(TD, 'align-top text-center')}>
                          <Badge tone={statusTone(requisition.status)} dot size="sm">
                            {humanStatus(requisition.status)}
                          </Badge>
                        </td>

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

                        <td className={cn(TD, 'align-top text-center')}>
                          <span className="font-medium">
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </td>

                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                            <span className="text-[var(--text-secondary)]">
                              {new Date(requisition.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        <td className={cn(TD, 'align-top text-right')}>
                          {hasTotal && totalValue > 0 ? (
                            <span className="font-semibold">GHS {totalValue.toFixed(2)}</span>
                          ) : (
                            <span className="text-xs text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className={cn(TD, 'align-top')}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              iconOnly
                              icon={Eye}
                              className="text-[var(--icon-cyan-text)]"
                              title="View Details"
                              aria-label={`View details for ${requisition.requisitionNumber}`}
                              onClick={() => openDetails(requisition)}
                            />

                            {requisition.status === 'draft' && (requisition.requestedById === user?.id || hasRole(['admin', 'super_admin'])) && (
                              <Button size="sm" variant="ghost" iconOnly icon={Edit} className="text-[var(--icon-yellow-text)]" title="Edit draft details" aria-label={`Edit ${requisition.requisitionNumber}`} onClick={() => handleEdit(requisition)} />
                            )}

                            {canSubmit(requisition) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={Send}
                                className="text-[var(--icon-blue-text)]"
                                title="Submit for Approval"
                                aria-label={`Submit ${requisition.requisitionNumber}`}
                                onClick={() => handleStatusUpdate(requisition.id, 'submitted')}
                              />
                            )}

                            {canApprove(requisition) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                iconOnly
                                icon={CheckCheck}
                                className="text-[var(--icon-green-text)]"
                                title="Approve all lines at requested quantities"
                                aria-label={`Approve ${requisition.requisitionNumber}`}
                                onClick={() => handleApprove(requisition)}
                              />
                            )}

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

                            {canCancel(requisition) && (
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
            onChange={setCurrentPage}
          />
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          CREATE FORM MODAL
          ═══════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div
            className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-color)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">New Requisition</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Fill the four steps below to raise a stock request
                </p>
              </div>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close form" onClick={() => setShowForm(false)} />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              {/* Sticky context bar */}
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
                  <Badge className="ml-auto" tone={formData.urgency === 'emergency' ? 'red' : 'yellow'}>
                    <AlertCircle className="w-3 h-3" />
                    {formData.urgency === 'emergency' ? 'EMERGENCY' : 'URGENT'}
                  </Badge>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
                {/* 1. Who is requesting */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">1</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Who is requesting</h3>
                  </div>
                  <div className="pl-8 space-y-3">
                    <div className="inline-flex rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-main)]">
                      {(['department', 'ward'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, requesterType: type })}
                          className={`px-4 py-2 text-xs font-semibold transition-colors ${
                            formData.requesterType === type
                              ? 'bg-[var(--icon-cyan-text)] text-white'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          {type === 'department' ? 'My department' : 'A ward'}
                        </button>
                      ))}
                    </div>

                    {formData.requesterType === 'department' ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <Building2 className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {myDepartmentName || 'Your department'}
                        </span>
                        <span className="ml-auto text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                          Locked to your account
                        </span>
                      </div>
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

                {/* 2. Supplier */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">2</span>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Where to request from</h3>
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
                    <p className="mt-1.5 text-xs text-[var(--text-tertiary)]">
                      Item search will use this department's live stock levels.
                    </p>
                  </div>
                </section>

                {/* 3. Items */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">What you need</h3>
                      {pickedItemCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
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

                      return (
                        <div key={index} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Package className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />
                              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                Item #{index + 1}
                              </span>
                              {picked && (
                                <span className="text-xs text-[var(--text-tertiary)] truncate">
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
                              onClick={() => removeRequisitionItem(index)}
                            />
                          </div>

                          <div className="p-3 space-y-3">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                                Item
                              </label>
                              <AsyncSelect<RequisitionStockLookupItem, false>
                                key={`${formData.supplyingDepartmentId}-${index}`}
                                cacheOptions={false}
                                defaultOptions
                                isDisabled={!formData.supplyingDepartmentId}
                                loadOptions={loadItemOptions}
                                value={picked || null}
                                onChange={(sel) => updateRequisitionItem(index, {
                                  stockItemId: sel?.id || '',
                                  picked: sel || null,
                                })}
                                getOptionValue={(o) => o.id}
                                getOptionLabel={(o) => `${o.name}${o.strength && o.strength !== 'N/A' ? ' ' + o.strength : ''}`}
                                isOptionDisabled={(o) => chosenIds.has(o.id) && o.id !== item.stockItemId}
                                formatOptionLabel={(o, meta) => (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="truncate">{o.name}{o.strength && o.strength !== 'N/A' ? ` ${o.strength}` : ''}</div>
                                      <div className="text-xs opacity-60">{o.drugCode} · {o.unitOfMeasure}</div>
                                    </div>
                                    {meta.context === 'menu' && (
                                      <div className="text-right text-xs shrink-0">
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
                                  input: (base) => ({ ...base, color: 'var(--text-primary)' }),
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
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
                                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                                    {picked?.unitOfMeasure || '—'}
                                  </span>
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
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

                            {picked && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className={`rounded-lg px-3 py-2 border ${
                                  picked.supplierQty > 0
                                    ? 'bg-[var(--icon-green-bg)] border-[var(--icon-green-text)]/30'
                                    : 'bg-[var(--icon-red-bg)] border-[var(--icon-red-text)]/30'
                                }`}>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    At {supplierName}
                                  </p>
                                  <p className={`text-lg font-bold leading-tight ${
                                    picked.supplierQty > 0 ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'
                                  }`}>
                                    {picked.supplierQty} <span className="text-xs font-normal">{picked.unitOfMeasure}</span>
                                  </p>
                                </div>
                                <div className="rounded-lg px-3 py-2 border border-[var(--border-color)] bg-[var(--icon-blue-bg)]">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                                    At {requesterDeptName}
                                  </p>
                                  <p className="text-lg font-bold leading-tight text-[var(--icon-blue-text)]">
                                    {picked.requesterQty} <span className="text-xs font-normal">{picked.unitOfMeasure}</span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {picked && over && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] text-xs font-semibold">
                                <AlertCircle className="w-3 h-3" />
                                Only {picked.supplierQty} available — you are asking for {item.quantityRequested}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* 4. Details */}
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
                        Required by <span className="text-xs font-normal text-[var(--text-tertiary)]">(optional)</span>
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
                        Additional notes <span className="text-xs font-normal text-[var(--text-tertiary)]">(optional)</span>
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

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card)] shrink-0">
                <div className="text-xs text-[var(--text-tertiary)] hidden sm:block">
                  {pickedItemCount} item{pickedItemCount === 1 ? '' : 's'} ·{' '}
                  {formData.supplyingDepartmentId ? 'Supplier selected' : 'No supplier yet'} ·{' '}
                  {formData.purpose ? 'Purpose set' : 'Purpose required'}
                </div>
                <div className="flex gap-3 ml-auto">
                  <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="soft" disabled={pickedItemCount === 0}>
                    Create Requisition
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          DETAIL MODAL
          ═══════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div
            className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Requisition Details</h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">{selectedRequisition.requisitionNumber}</p>
              </div>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close details" onClick={() => setShowDetailModal(false)} />
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Purpose</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selectedRequisition.purpose || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedRequisition.ward?.wardName ? 'Ward' : 'Department'}
                  </p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">
                    {selectedRequisition.departments?.name || selectedRequisition.ward?.wardName || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Requested from</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">
                    {selectedRequisition.supplyingDepartment?.name || '—'}
                  </p>
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
                        {selectedRequisition.supplyingDepartmentId &&
                          selectedRequisition.status !== 'fulfilled' &&
                          selectedRequisition.status !== 'cancelled' && (
                          <>
                            <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">
                              At {selectedRequisition.supplyingDepartment?.name || 'supplier'}
                            </th>
                            <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">
                              At {selectedRequisition.departments?.name || 'requester'}
                            </th>
                          </>
                        )}
                        <th className="px-4 py-2 text-left text-xs text-[var(--text-secondary)]">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {selectedRequisition.RequisitionItem?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-[var(--text-primary)]">
                            {item.StockItem?.name || getStockItemName(item.stockItemId)}
                          </td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityRequested}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityApproved ?? '—'}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantityFulfilled ?? '—'}</td>
                          {selectedRequisition.supplyingDepartmentId &&
                            selectedRequisition.status !== 'fulfilled' &&
                            selectedRequisition.status !== 'cancelled' && (
                            <>
                              <td className={`px-4 py-2 text-center font-medium ${
                                (item.supplierQty ?? 0) >= (item.quantityApproved ?? item.quantityRequested)
                                  ? 'text-[var(--icon-green-text)]'
                                  : 'text-[var(--icon-red-text)]'
                              }`}>
                                {item.supplierQty ?? '—'}
                              </td>
                              <td className="px-4 py-2 text-center text-[var(--text-primary)]">
                                {item.requesterQty ?? '—'}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{item.purpose || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Approval Timeline</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[var(--text-tertiary)]" />
                    <span className="text-[var(--text-secondary)]">Created:</span>
                    <span className="text-[var(--text-primary)]">
                      {new Date(selectedRequisition.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedRequisition.approvedAt && (
                    <div className="flex items-center gap-3">
                      <CheckCheck className="w-4 h-4 text-[var(--icon-green-text)]" />
                      <span className="text-[var(--text-secondary)]">Approved:</span>
                      <span className="text-[var(--text-primary)]">
                        {new Date(selectedRequisition.approvedAt).toLocaleString()}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        by {selectedRequisition.User_Requisition_approvedByIdToUser?.fullName || 'Unknown'}
                      </span>
                    </div>
                  )}
                  {selectedRequisition.fulfilledAt && (
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      <span className="text-[var(--text-secondary)]">Fulfilled:</span>
                      <span className="text-[var(--text-primary)]">
                        {new Date(selectedRequisition.fulfilledAt).toLocaleString()}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        by {selectedRequisition.User_Requisition_fulfilledByIdToUser?.fullName || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRequisition.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</h3>
                  <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)]">{selectedRequisition.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-[var(--border-color)]">
                <Button variant="soft" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}