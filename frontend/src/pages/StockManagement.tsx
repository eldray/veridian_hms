// src/pages/StockManagement.tsx - FULLY FIXED VERSION
import { useEffect, useMemo, useState } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useStockStore } from '../store/stockStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  FileText,
  ClipboardList,
  History,
  TrendingUp,
  Grid,
  List,
  X,
  Warehouse
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  cn,
  FilterSelect,
  INPUT,
  LinkButton,
  PageHeader,
  Pagination,
  SearchInput,
  SELECT,
  StatCard,
  TABLE_SHELL,
  TD,
  TH,
  TH_ROW,
  TR,
} from '../components/ui';
import type { BadgeTone } from '../components/ui';

/**
 * The shape the stock store actually hands back. `../types` declares a stricter,
 * Prisma-shaped `StockItem`, and the two are not assignable to each other, so the
 * page annotates against its data source instead.
 */
type StockItem = ReturnType<typeof useStockStore.getState>['stockItems'][number];

export default function StockManagement() {
  const {
    stockItems,
    getStockItems,
    createStockItem,
    updateStockItem,
    deleteStockItem,
    createStockTransaction,
    allocateStockToDepartment,
    getLowStockItems,
    isLoading
  } = useStockStore();
  const { user, hasRole } = useAuthStore();
  const { departments, getDepartments } = useDepartmentStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State for search, filters, and forms
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, low-stock, in-stock
  const [showForm, setShowForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [allocationData, setAllocationData] = useState({ quantity: 0, departmentId: '' });
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // State for pagination and view mode
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'line'>('line');

  // Admins and pharmacists can add/edit stock; only admins can delete (matches the backend route)
  const isAdmin = hasRole(['admin', 'pharmacist']);
  const canDelete = hasRole(['admin', 'super_admin']);
  const canAllocateStock = hasRole(['admin', 'super_admin']);

  // Show the server's message (e.g. "Drug code already in use") instead of axios' generic one
  const apiError = (err: any, fallback: string): string =>
    err?.response?.data?.message || err?.message || fallback;

  // Form data aligned with StockItem schema
  const [formData, setFormData] = useState({
    name: '',
    drugCode: '',
    category: 'medication',
    description: '',
    strength: '',
    unitOfMeasure: '',
    reorderLevel: 10,
    costPrice: 0,
    // Patient prices as text so "blank" (keep / use the default) differs from 0
    cashPrice: '',
    nhisPrice: '',
    insurancePrice: '',
    corporatePrice: '',
    supplier: '',
    batchNumber: '',
    expiryDate: '',
    isMedication: true,
    isActive: true
  });

  // Transaction data aligned with StockTransaction schema
  const [transactionData, setTransactionData] = useState({
    transactionType: 'purchase' as 'purchase' | 'adjustment' | 'requisition' | 'sale' | 'write_off',
    quantity: 0,
    adjustmentDirection: 'increase' as 'increase' | 'decrease',
    reference: '',
    notes: '',
    batchNumber: '',
    departmentId: (user as any)?.departmentId || ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        getStockItems(),
        getLowStockItems(),
        getDepartments({ isActive: true })
      ]);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load stock data:', err);
      toastError('Load failed', 'Could not load stock data');
    }
  };

  // Get unique categories from stock items
  const getUniqueCategories = () => {
    const categories = new Set(stockItems.map(item => item.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  // Apply filters
  // Memoised: this component also holds the item-form state, so without it every
  // keystroke in the modal re-scanned the whole stock list.
  const filteredItems = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return stockItems.filter(item => {
      // Search filter
      const matchesSearch = item.name.toLowerCase().includes(q) ||
                           (item.description?.toLowerCase().includes(q)) ||
                           (item.drugCode?.toLowerCase().includes(q));

      // Category filter
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'low-stock') {
        matchesStatus = item.currentStock <= item.reorderLevel;
      } else if (filterStatus === 'in-stock') {
        matchesStatus = item.currentStock > item.reorderLevel;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [stockItems, searchTerm, filterCategory, filterStatus]);

  const lowStockItems = useMemo(
    () => stockItems.filter(item => item.currentStock <= item.reorderLevel),
    [stockItems]
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Blank drugCode: the server generates one on create, and keeps the existing one on edit
      const { drugCode, cashPrice, nhisPrice, insurancePrice, corporatePrice, ...rest } = formData;
      // Only send the patient prices that were filled in; the server keeps the rest as they are
      const priceFields: Record<string, number> = {};
      (Object.entries({ cashPrice, nhisPrice, insurancePrice, corporatePrice }) as [string, string][]).forEach(([k, v]) => {
        if (String(v).trim() !== '') priceFields[k] = Number(v);
      });
      const submitData = {
        ...rest,
        ...priceFields,
        ...(drugCode.trim() ? { drugCode: drugCode.trim().toUpperCase() } : {}),
        reorderLevel: Number(formData.reorderLevel),
        costPrice: Number(formData.costPrice)
      };
      
      if (editingItem) {
        await updateStockItem(editingItem.id, submitData);
        success('Updated', 'Stock item updated successfully');
      } else {
        await createStockItem(submitData);
        success('Created', 'Stock item added successfully');
      }
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      toastError('Save failed', apiError(err, 'Could not save stock item'));
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      // The API records the issuing/receiving department; the store's local
      // StockTransaction type has not caught up, so only the payload is cast.
      await createStockTransaction({
        stockItemId: selectedItem.id,
        ...transactionData,
        quantity: transactionData.transactionType === 'adjustment' && transactionData.adjustmentDirection === 'decrease' ? -Math.abs(transactionData.quantity) : transactionData.quantity,
        departmentId: transactionData.departmentId || (user as any)?.departmentId || undefined,
        ...(transactionData.transactionType === 'write_off' ? { batchNumber: transactionData.batchNumber.trim() } : {})
      } as Parameters<typeof createStockTransaction>[0]);
      success('Recorded', 'Transaction completed successfully');
      setShowTransactionForm(false);
      setSelectedItem(null);
      resetTransactionForm();
      await loadAllData();
    } catch (err: any) {
      toastError('Transaction failed', apiError(err, 'Could not record transaction'));
    }
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await allocateStockToDepartment(selectedItem.id, allocationData);
      success('Allocated', 'Stock moved to the selected department; hospital total is unchanged');
      setShowAllocationForm(false);
      setSelectedItem(null);
      setAllocationData({ quantity: 0, departmentId: '' });
      await loadAllData();
    } catch (err: any) {
      toastError('Allocation failed', apiError(err, 'Could not allocate unassigned stock'));
    }
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    const currentPrice = (item as any).ServiceCatalog?.[0]?.pricing?.[0];
    const priceText = (v: unknown) => (currentPrice && v !== undefined && v !== null ? String(Number(v)) : '');
    setFormData({
      name: item.name,
      drugCode: item.drugCode || '',
      cashPrice: priceText(currentPrice?.cashPrice),
      nhisPrice: priceText(currentPrice?.nhisPrice),
      insurancePrice: priceText(currentPrice?.insurancePrice),
      corporatePrice: priceText(currentPrice?.corporatePrice),
      category: item.category,
      description: item.description || '',
      strength: item.strength || '',
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel,
      costPrice: item.costPrice || 0,
      supplier: item.supplier || '',
      batchNumber: item.batchNumber || '',
      expiryDate: item.expiryDate?.split('T')[0] || '',
      isMedication: item.isMedication ?? true,
      isActive: item.isActive ?? true
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    if (!(await confirmDialog({ title: 'Delete stock item', message: 'Delete this item? This action cannot be undone.', confirmText: 'Delete' }))) return;
    try {
      await deleteStockItem(id);
      success('Deleted', 'Item removed successfully');
      await loadAllData();
    } catch (err: any) {
      toastError('Delete failed', apiError(err, 'Could not delete item'));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      drugCode: '',
      cashPrice: '',
      nhisPrice: '',
      insurancePrice: '',
      corporatePrice: '',
      category: 'medication',
      description: '',
      strength: '',
      unitOfMeasure: '',
      reorderLevel: 10,
      costPrice: 0,
      supplier: '',
      batchNumber: '',
      expiryDate: '',
      isMedication: true,
      isActive: true
    });
  };

  const resetTransactionForm = () => {
    setTransactionData({
      transactionType: 'purchase',
      quantity: 0,
      adjustmentDirection: 'increase',
      reference: '',
      notes: '',
      batchNumber: '',
      departmentId: (user as any)?.departmentId || ''
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
    resetForm();
  };

  const handleTransactionCancel = () => {
    setShowTransactionForm(false);
    setSelectedItem(null);
    resetTransactionForm();
  };

  const getRelevantStockQuantity = (item: StockItem) => {
    const inventory = getInventoryBreakdown(item);
    return hasRole(['admin', 'super_admin'])
      ? inventory.hospitalTotal
      : (inventory.currentDepartment ?? inventory.hospitalTotal);
  };

  const isLowStock = (item: StockItem) => getRelevantStockQuantity(item) <= item.reorderLevel;

  // Stock levels are not workflow statuses, so Badge's status map does not cover them;
  // the page keeps the tone here and Badge keeps the shape.
  const getStockStatusBadge = (item: StockItem): { label: string; tone: BadgeTone } => {
    const quantity = getRelevantStockQuantity(item);
    if (quantity === 0) {
      return { label: 'OUT OF STOCK', tone: 'red' };
    }
    if (isLowStock(item)) {
      return { label: 'LOW STOCK', tone: 'yellow' };
    }
    return { label: 'IN STOCK', tone: 'green' };
  };

  // Balances are the source of truth; currentStock remains the synchronized aggregate cache.
  const getInventoryBreakdown = (item: StockItem) => {
    const balances = ((item as any).stockBalances || []) as Array<any>;
    const locations = new Map<string, { id: string; name: string; quantity: number; departmentId?: string }>();
    let ledgerTotal = 0;
    for (const balance of balances) {
      const quantity = Math.max(0, Number(balance.quantity) || 0);
      ledgerTotal += quantity;
      const id = String(balance.locationKey || balance.departmentId || (balance.wardId ? `WARD:${balance.wardId}` : '__UNASSIGNED__'));
      const name = balance.department?.name || balance.ward?.wardName || 'Unassigned stock';
      const current = locations.get(id) || { id, name, quantity: 0, departmentId: balance.departmentId || undefined };
      current.quantity += quantity;
      locations.set(id, current);
    }
    // Department users receive only their own balance rows; currentStock is the synchronized hospital aggregate.
    // Admins can calculate the total directly from all returned locations.
    const adminView = hasRole(['admin', 'super_admin']);
    const hospitalTotal = adminView && balances.length > 0
      ? ledgerTotal
      : Math.max(0, Number(item.currentStock) || 0);
    const departmentId = (user as any)?.departmentId;
    const currentDepartment = departmentId
      ? [...locations.values()].filter(location => location.departmentId === String(departmentId)).reduce((sum, location) => sum + location.quantity, 0)
      : null;
    return {
      hospitalTotal,
      currentDepartment,
      departments: [...locations.values()].sort((a, b) => a.name.localeCompare(b.name)),
      hasDepartmentBatches: locations.size > 0
    };
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Stock Management"
        subtitle="Track inventory and manage stock levels"
        icon={Warehouse}
        accent="blue"
        onBack={() => navigate(-1)}
        actions={(
          <>
            <LinkButton to="/dashboard/invoices" icon={FileText}>Invoices</LinkButton>
            <LinkButton to="/dashboard/requisitions" icon={ClipboardList}>Requisitions</LinkButton>
            <LinkButton to="/dashboard/transactions" icon={History}>Transactions</LinkButton>
            {isAdmin && (
              <Button variant="soft" icon={Plus} onClick={() => setShowForm(true)}>Add Item</Button>
            )}
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stockItems.length} icon={Package} />
        <StatCard label="Low Stock Items" value={lowStockItems.length} icon={AlertTriangle} accent="yellow" />
        <StatCard label="Categories" value={getUniqueCategories().length} icon={Grid} accent="purple" />
        <StatCard
          label="Total Value"
          size="money"
          icon={TrendingUp}
          accent="green"
          value={`$${stockItems.reduce((sum, item) => sum + (item.costPrice * item.currentStock), 0).toFixed(0)}`}
        />
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-[var(--icon-yellow-bg)] border-l-4 border-[var(--icon-yellow-text)] rounded-r-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0" />
            <div>
              <p className="font-bold text-[var(--icon-yellow-text)] text-sm">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
              </p>
              <p className="text-xs text-[var(--icon-yellow-text)] truncate max-w-md">
                {lowStockItems.map(i => i.name).join(', ')}
              </p>
            </div>
            <Button
              variant="soft"
              accent="yellow"
              size="sm"
              className="ml-auto"
              onClick={() => setFilterStatus('low-stock')}
            >
              View All
            </Button>
          </div>
        </div>
      )}

      {/* Search, Filters & Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <SearchInput
            className="flex-1"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search by name, description, or code..."
          />

          <FilterSelect
            aria-label="Filter by category"
            value={filterCategory}
            onChange={setFilterCategory}
            className="min-w-[140px]"
            options={[
              { value: 'all', label: 'All Categories' },
              ...getUniqueCategories().map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))
            ]}
          />

          <FilterSelect
            aria-label="Filter by stock status"
            value={filterStatus}
            onChange={setFilterStatus}
            className="min-w-[130px]"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'low-stock', label: 'Low Stock' },
              { value: 'in-stock', label: 'In Stock' }
            ]}
          />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid' 
                  ? 'bg-[var(--icon-cyan-text)] text-white' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('line')}
              aria-label="List view"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'line' 
                  ? 'bg-[var(--icon-cyan-text)] text-white' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button icon={RefreshCw} loading={isLoading} onClick={loadAllData}>Refresh</Button>
        </div>

        {/* Items Per Page Selector */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span id="stock-items-per-page-label">Show:</span>
            <select
              aria-labelledby="stock-items-per-page-label"
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className={cn(SELECT, 'py-1 text-xs')}
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
            <span>per page</span>
          </div>
        </div>
      </Card>

      {/* Stock Items Display */}
      {/* The list streams in page by page: show skeletons only until the first rows exist,
          otherwise the already-loaded items stay hidden behind the walk for its whole duration. */}
      {isLoading && filteredItems.length === 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[var(--bg-main)] rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-[var(--bg-main)] rounded w-full"></div>
                  <div className="h-3 bg-[var(--bg-main)] rounded w-2/3"></div>
                </div>
              </div>
            ) : (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[var(--bg-main)] rounded-lg"></div>
                    <div className="h-4 bg-[var(--bg-main)] rounded w-32"></div>
                  </div>
                  <div className="h-4 bg-[var(--bg-main)] rounded w-20"></div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="py-10 text-center">
          <Package className="w-14 h-14 text-[var(--text-tertiary)] mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No items found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first stock item'}
          </p>
          {isAdmin && !searchTerm && filterCategory === 'all' && filterStatus === 'all' && (
            <Button variant="soft" icon={Plus} onClick={() => setShowForm(true)}>
              Add First Item
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map(item => {
            const statusBadge = getStockStatusBadge(item);
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-[var(--bg-card)] rounded-xl border transition-all hover:shadow-md',
                  isLowStock(item) ? 'border-[var(--icon-yellow-text)]' : 'border-[var(--border-color)]',
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isLowStock(item) ? 'bg-[var(--icon-yellow-bg)]' : 'bg-[var(--icon-cyan-bg)]'
                      }`}>
                        <Package className={`w-5 h-5 ${
                          isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-cyan-text)]'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">{item.name}</h3>
                        <Badge>{item.category}</Badge>
                      </div>
                    </div>
                    <Badge tone={statusBadge.tone} dot size="sm">{statusBadge.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[var(--text-secondary)]">Department Stock:</span>
                      <span className="font-bold text-[var(--text-primary)] text-right">
                        {getInventoryBreakdown(item).currentDepartment === null
                          ? (hasRole(['admin', 'super_admin']) ? 'See breakdown' : 'Not assigned')
                          : `${getInventoryBreakdown(item).currentDepartment} ${item.unitOfMeasure}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-[var(--text-secondary)]">Hospital Total:</span>
                      <span className="font-bold text-[var(--icon-cyan-text)] text-right">
                        {getInventoryBreakdown(item).hospitalTotal} {item.unitOfMeasure}
                      </span>
                    </div>
                    {hasRole(['admin', 'super_admin']) && getInventoryBreakdown(item).departments.length > 0 && (
                      <div className="border-t border-[var(--border-color)] pt-2 mt-2">
                        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">Stock location breakdown</p>
                        {getInventoryBreakdown(item).departments.map(d => (
                          <div key={d.id} className="flex justify-between gap-2 text-xs">
                            <span className="text-[var(--text-secondary)]">{d.name}</span>
                            <span className="text-[var(--text-primary)]">{d.quantity} {item.unitOfMeasure}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Reorder Level:</span>
                      <span className="font-medium text-[var(--text-primary)]">{item.reorderLevel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Cost Price:</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        ₵{(item.costPrice || 0).toFixed(2)}
                      </span>
                    </div>
                    {item.strength && (
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Strength:</span>
                        <span className="text-[var(--text-primary)]">{item.strength}</span>
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowTransactionForm(true);
                        }}
                      >
                        Stock In/Out
                      </Button>
                      {canAllocateStock && (
                        <Button
                          variant="soft"
                          accent="green"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedItem(item);
                            setAllocationData({ quantity: 0, departmentId: departments[0]?.id || '' });
                            setShowAllocationForm(true);
                          }}
                        >
                          Allocate
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon={Edit}
                        aria-label={`Edit ${item.name}`}
                        className="text-[var(--icon-green-text)]"
                        onClick={() => handleEdit(item)}
                      />
                      {canDelete && (
                        <Button
                          variant="dangerSoft"
                          size="sm"
                          iconOnly
                          icon={Trash2}
                          aria-label={`Delete ${item.name}`}
                          onClick={() => handleDelete(item.id)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Item</th>
                  <th className={cn(TH, 'text-center')}>Category</th>
                  <th className={cn(TH, 'text-center')}>Department / Hospital Total</th>
                  <th className={cn(TH, 'text-right')}>Reorder</th>
                  <th className={cn(TH, 'text-right')}>Cost</th>
                  <th className={cn(TH, 'text-center')}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map(item => {
                  return (
                    <tr key={item.id} className={cn(TR, isLowStock(item) && 'bg-[var(--icon-yellow-bg)]')}>
                      <td className={cn(TD, 'whitespace-normal')}>
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            isLowStock(item) ? 'bg-[var(--icon-yellow-bg)]' : 'bg-[var(--icon-cyan-bg)]',
                          )}>
                            <Package className={cn('w-3.5 h-3.5', isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-cyan-text)]')} />
                          </div>
                          <div>
                            <p className="font-medium text-[var(--text-primary)] text-sm">{item.name}</p>
                            {item.strength && (
                              <p className="text-xs text-[var(--text-tertiary)]">{item.strength}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={cn(TD, 'text-center')}>
                        <Badge>{item.category}</Badge>
                      </td>
                      <td className={cn(TD, 'text-center whitespace-normal')}>
                        <div className="text-xs text-[var(--text-secondary)]">This department</div>
                        <div className="font-semibold text-sm text-[var(--text-primary)]">
                          {getInventoryBreakdown(item).currentDepartment === null ? '—' : getInventoryBreakdown(item).currentDepartment}
                          <span className="text-xs text-[var(--text-tertiary)] ml-1">{item.unitOfMeasure}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] mt-1">Hospital total</div>
                        <div className="font-bold text-sm text-[var(--icon-cyan-text)]">
                          {getInventoryBreakdown(item).hospitalTotal}
                          <span className="text-xs text-[var(--text-tertiary)] ml-1">{item.unitOfMeasure}</span>
                        </div>
                        {hasRole(['admin', 'super_admin']) && getInventoryBreakdown(item).departments.length > 0 && (
                          <details className="mt-1 text-left">
                            <summary className="cursor-pointer text-xs text-[var(--icon-cyan-text)]">By location</summary>
                            {getInventoryBreakdown(item).departments.map(d => (
                              <div key={d.id} className="flex justify-between gap-2 text-xs mt-1">
                                <span>{d.name}</span><span>{d.quantity}</span>
                              </div>
                            ))}
                          </details>
                        )}
                      </td>
                      <td className={cn(TD, 'text-right')}>{item.reorderLevel}</td>
                      <td className={cn(TD, 'text-right font-medium')}>₵{(item.costPrice || 0).toFixed(2)}</td>
                      <td className={cn(TD, 'text-center')}>
                        {isAdmin && (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={TrendingUp}
                              aria-label={`Stock in/out for ${item.name}`}
                              className="text-[var(--icon-cyan-text)]"
                              onClick={() => {
                                setSelectedItem(item);
                                setShowTransactionForm(true);
                              }}
                            />
                            {canAllocateStock && (
                              <Button
                                variant="soft"
                                accent="green"
                                size="sm"
                                iconOnly
                                icon={Package}
                                aria-label={`Allocate unassigned stock for ${item.name}`}
                                onClick={() => {
                                  setSelectedItem(item);
                                  setAllocationData({ quantity: 0, departmentId: departments[0]?.id || '' });
                                  setShowAllocationForm(true);
                                }}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              iconOnly
                              icon={Edit}
                              aria-label={`Edit ${item.name}`}
                              className="text-[var(--icon-green-text)]"
                              onClick={() => handleEdit(item)}
                            />
                            {canDelete && (
                              <Button
                                variant="dangerSoft"
                                size="sm"
                                iconOnly
                                icon={Trash2}
                                aria-label={`Delete ${item.name}`}
                                onClick={() => handleDelete(item.id)}
                              />
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={filteredItems.length}
        noun="items"
        onChange={handlePageChange}
      />

      {/* Add/Edit Modal - Updated with all schema fields */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCancel}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h2>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close form" onClick={handleCancel} />
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={cn(INPUT, 'w-full')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Drug / Item Code</label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate"
                    value={formData.drugCode}
                    onChange={e => setFormData({ ...formData, drugCode: e.target.value.toUpperCase() })}
                    className={cn(INPUT, 'w-full')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={cn(SELECT, 'w-full')}
                  >
                    {getUniqueCategories().map(c => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Unit of Measure *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g., Tablet, Bottle, Box"
                    value={formData.unitOfMeasure}
                    onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Strength</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 500mg, 10ml"
                    value={formData.strength}
                    onChange={e => setFormData({ ...formData, strength: e.target.value })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reorder Level *</label>
                  <input 
                    type="number" 
                    min="0" 
                    required 
                    value={formData.reorderLevel} 
                    onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Cost Price *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    required 
                    value={formData.costPrice} 
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className={cn(INPUT, 'w-full')}
                  />
                </div>

                {/* Patient prices: what each payer is charged. Blank on a new item = cash is cost + 20%, insurance = cash;
                    a blank NHIS or corporate price is billed at the cash price (or the corporate account's discount). */}
                <div className="md:col-span-2">
                  <p className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Patient prices (₵) <span className="font-normal">— leave NHIS / Corporate blank to bill at the cash price</span>
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {([
                      ['cashPrice', 'Cash'],
                      ['nhisPrice', 'NHIS'],
                      ['insurancePrice', 'Insurance'],
                      ['corporatePrice', 'Corporate']
                    ] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{label}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData[key]}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                          className={cn(INPUT, 'w-full')}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
                  <input 
                    type="text" 
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Batch Number</label>
                  <input 
                    type="text" 
                    placeholder="Batch/Lot number"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expiry Date</label>
                  <input 
                    type="date" 
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea 
                  rows={3} 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className={cn(INPUT, 'w-full resize-none')} 
                  placeholder="Optional description"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.isMedication}
                    onChange={e => setFormData({ ...formData, isMedication: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Is Medication</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">Active</span>
                </label>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" className="flex-1">
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legacy stock allocation: moves stock from unassigned to a department without changing hospital total. */}
      {showAllocationForm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAllocationForm(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Allocate Unassigned Stock</h2>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close allocation form" onClick={() => setShowAllocationForm(false)} />
            </div>
            <form onSubmit={handleAllocationSubmit} className="p-6 space-y-4">
              <div className="bg-[var(--bg-main)] rounded-lg p-3">
                <p className="text-sm text-[var(--text-secondary)]">Selected item</p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedItem.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Unassigned balance: {getInventoryBreakdown(selectedItem).departments.find(d => d.id === '__UNASSIGNED__')?.quantity || 0} {selectedItem.unitOfMeasure}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">This is an internal allocation; the hospital total will not change.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Receiving department *</label>
                <select required value={allocationData.departmentId} onChange={e => setAllocationData({ ...allocationData, departmentId: e.target.value })}
                  className={cn(SELECT, 'w-full')}>
                  <option value="">Choose department</option>
                  {departments.filter((d: any) => d.isActive !== false).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity to allocate *</label>
                <input type="number" min="1" step="1" required value={allocationData.quantity || ''} onChange={e => setAllocationData({ ...allocationData, quantity: Number(e.target.value) || 0 })}
                  className={cn(INPUT, 'w-full')} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAllocationForm(false)}>Cancel</Button>
                <Button type="submit" variant="soft" accent="green" className="flex-1">Allocate Stock</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionForm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleTransactionCancel}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Stock Transaction
              </h2>
              <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close transaction form" onClick={handleTransactionCancel} />
            </div>
            
            <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
              <div className="bg-[var(--bg-main)] rounded-lg p-3 mb-2">
                <p className="text-sm text-[var(--text-secondary)]">Selected Item</p>
                <p className="font-semibold text-[var(--text-primary)]">{selectedItem.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Current stock: {selectedItem.currentStock} {selectedItem.unitOfMeasure}</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Transaction Type *</label>
                <select 
                  required 
                  value={transactionData.transactionType}
                  onChange={e => setTransactionData({ ...transactionData, transactionType: e.target.value as any })}
                  className={cn(SELECT, 'w-full')}
                >
                  <option value="purchase">Purchase (Add Stock)</option>
                  <option value="sale">Sale (Remove Stock)</option>
                  <option value="adjustment">Adjustment (Manual)</option>
                  <option value="requisition">Requisition (Remove Stock)</option>
                  <option value="write_off">Expiry / Damage Write-off (Remove Stock)</option>
                </select>
              </div>
              
              {transactionData.transactionType === 'adjustment' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Adjustment Direction *</label>
                  <select required value={transactionData.adjustmentDirection} onChange={e => setTransactionData({ ...transactionData, adjustmentDirection: e.target.value as 'increase' | 'decrease' })} className={cn(SELECT, 'w-full')}>
                    <option value="increase">Increase stock</option>
                    <option value="decrease">Decrease stock</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Issuing / Receiving Department</label>
                <select
                  value={transactionData.departmentId}
                  onChange={e => setTransactionData({ ...transactionData, departmentId: e.target.value })}
                  className={cn(SELECT, 'w-full')}
                >
                  <option value="">Choose department</option>
                  {departments.filter((d: any) => d.isActive !== false).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">For sales from batch-tracked stock, choose the department issuing the item. Hospital total reduces automatically.</p>
              </div>

              {transactionData.transactionType === 'write_off' && (
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Batch Number {selectedItem && (selectedItem as any).StockBatch?.length ? '*' : '(required for batch-tracked items)'}</label>
                  <input
                    type="text"
                    required={Boolean((selectedItem as any)?.StockBatch?.length)}
                    value={transactionData.batchNumber}
                    onChange={e => setTransactionData({ ...transactionData, batchNumber: e.target.value })}
                    placeholder="Enter the exact affected batch number"
                    className={cn(INPUT, 'w-full')}
                  />
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">For batch-tracked stock, enter the exact affected batch number. Expired or inactive batches can be written off for reconciliation.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={transactionData.quantity} 
                  onChange={e => setTransactionData({ ...transactionData, quantity: parseInt(e.target.value) || 0 })}
                  className={cn(INPUT, 'w-full')} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reference (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., PO-123, INV-456"
                  value={transactionData.reference}
                  onChange={e => setTransactionData({ ...transactionData, reference: e.target.value })}
                  className={cn(INPUT, 'w-full')} 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    {['write_off', 'adjustment'].includes(transactionData.transactionType) ? 'Reason *' : 'Notes'}
                  </label>
                <textarea 
                  rows={2}
                  required={['write_off', 'adjustment'].includes(transactionData.transactionType)}
                  value={transactionData.notes}
                  onChange={e => setTransactionData({ ...transactionData, notes: e.target.value })}
                  className={cn(INPUT, 'w-full resize-none')} 
                  placeholder="Optional notes"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button type="button" variant="secondary" className="flex-1" onClick={handleTransactionCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="soft" className="flex-1">
                  Record Transaction
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}