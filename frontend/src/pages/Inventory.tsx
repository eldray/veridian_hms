// src/pages/Inventory.tsx - FIXED REPORTS LINK
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus,
  Package,
  AlertTriangle,
  Calendar,
  Warehouse,
  ClipboardList,
  BarChart3,
  ShoppingCart,
  History,
  RefreshCw,
  DollarSign,
  Clock,
  Boxes,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  cn,
  LinkButton,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TABLE_SHELL,
  TD,
  TH,
  TH_ROW,
  TR,
  type BadgeTone,
} from '../components/ui';

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item Name</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Category</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Current Stock</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Reorder Level</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Cost Price</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Expiry Date</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-color)]">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="animate-pulse">
              {[...Array(7)].map((_, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-3/4"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsPerPage = 15;
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  const { 
    stockItems, 
    getStockItems, 
    isLoading,
    getLowStockItems
  } = useStockStore();

  const { hasRole } = useAuthStore();
  const { error: toastError, success } = useToast();

  // Calculate stats locally
  const { lowStockItems, stats } = useMemo(() => {
    const lowStock = stockItems.filter(item => 
      item.currentStock <= item.reorderLevel
    );
    
    const expiring = stockItems.filter(item => {
      if (!item.expiryDate) return false;
      try {
        const expiryDate = new Date(item.expiryDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
      } catch {
        return false;
      }
    });
    
    const stats = {
      total: stockItems.length,
      medications: stockItems.filter(item => item.isMedication).length,
      lowStock: lowStock.length,
      expiring: expiring.length,
      totalValue: stockItems.reduce((sum, item) => 
        sum + (Number(item.costPrice || 0) * item.currentStock), 0
      )
    };

    return { lowStockItems: lowStock, expiringItems: expiring, stats };
  }, [stockItems]);

  // Filtered items based on search
  const filteredItems = useMemo(() => {
    if (!debouncedSearchQuery) return stockItems;
    
    const searchLower = debouncedSearchQuery.toLowerCase();
    return stockItems.filter((item) => 
      item.name?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }, [stockItems, debouncedSearchQuery]);

  // Pagination
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const loadStockItems = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        getStockItems(),
        getLowStockItems()
      ]);
      setCurrentPage(1);
      success('Refreshed', 'Stock data updated successfully');
    } catch (error) {
      console.error('Failed to load stock items:', error);
      toastError('Load failed', 'Could not fetch stock items');
    } finally {
      setIsRefreshing(false);
    }
  }, [getStockItems, getLowStockItems, toastError, success]);

  useEffect(() => {
    loadStockItems();
  }, []);

  const canManageStock = hasRole(['admin', 'pharmacist']);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const getStockStatus = (item: { currentStock: number; reorderLevel: number }): { label: string; tone: BadgeTone; icon: LucideIcon } => {
    if (item.currentStock === 0) {
      return { label: 'OUT OF STOCK', tone: 'red', icon: AlertTriangle };
    }
    if (item.currentStock <= item.reorderLevel) {
      return { label: 'LOW STOCK', tone: 'yellow', icon: AlertTriangle };
    }
    return { label: 'IN STOCK', tone: 'green', icon: Package };
  };

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false;
    try {
      const expiry = new Date(expiryDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiry <= thirtyDaysFromNow && expiry >= new Date();
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Inventory Dashboard"
        subtitle="Manage medications, track inventory, and monitor stock levels"
        icon={Package}
        accent="blue"
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={isRefreshing} onClick={loadStockItems}>
              Refresh
            </Button>
            {canManageStock && (
              <LinkButton to="/dashboard/stock" variant="soft" accent="cyan" icon={Warehouse}>
                Manage Stock
              </LinkButton>
            )}
          </>
        )}
      />

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Link
          to="/dashboard/invoices"
          className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center group-hover:bg-[var(--icon-green-text)] transition-colors">
              <ShoppingCart className="w-5 h-5 text-[var(--icon-green-text)] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Purchase</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Create purchase invoice and receive stock</p>
        </Link>

        <Link
          to="/dashboard/requisitions"
          className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center group-hover:bg-[var(--icon-purple-text)] transition-colors">
              <ClipboardList className="w-5 h-5 text-[var(--icon-purple-text)] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Requisition</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Request stock items from inventory</p>
        </Link>

        <Link
          to="/dashboard/transactions"
          className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center group-hover:bg-[var(--icon-cyan-text)] transition-colors">
              <History className="w-5 h-5 text-[var(--icon-cyan-text)] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Transactions</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">View stock movement history</p>
        </Link>

        {/* ✅ FIXED: Reports link - Now clickable and navigates to Stock Reports */}
        <Link
          to="/dashboard/stock/reports"
          className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-lg flex items-center justify-center group-hover:bg-[var(--icon-yellow-text)] transition-colors">
              <BarChart3 className="w-5 h-5 text-[var(--icon-yellow-text)] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Reports</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Stock analytics and performance reports</p>
        </Link>

        <Link
          to="/dashboard/stock"
          className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-lg flex items-center justify-center group-hover:bg-[var(--icon-blue-text)] transition-colors">
              <Package className="w-5 h-5 text-[var(--icon-blue-text)] group-hover:text-white transition-colors" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Manage Items</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Add/edit stock items</p>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Total Items" value={stats.total} icon={Package} />
        <StatCard label="Medications" value={stats.medications} icon={Boxes} accent="green" />
        <StatCard label="Low Stock" value={stats.lowStock} icon={AlertTriangle} accent="red" />
        <StatCard label="Expiring Soon" value={stats.expiring} icon={Calendar} accent="yellow" />
        <StatCard
          label="Inventory Value"
          value={`₵${(stats.totalValue / (stats.total || 1)).toFixed(2)}`}
          icon={DollarSign}
          accent="purple"
          size="money"
        />
      </div>

      {/* Alert Banners */}
      {(lowStockItems.length > 0 || stats.expiring > 0) && (
        <div className="space-y-3">
          {lowStockItems.length > 0 && (
            <div className="bg-[var(--icon-red-bg)] border-l-4 border-[var(--icon-red-text)] rounded-r-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[var(--icon-red-text)] text-sm mb-1">Low Stock Alert</h3>
                  <p className="text-sm text-[var(--icon-red-text)]">
                    {lowStockItems.length} item(s) are below their reorder level.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lowStockItems.slice(0, 3).map(item => (
                      <span key={item.id} className="text-xs px-2 py-1 bg-[var(--bg-card)]/20 rounded-full text-[var(--icon-red-text)]">
                        {item.name}: {item.currentStock} {item.unitOfMeasure}
                      </span>
                    ))}
                    {lowStockItems.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-[var(--bg-card)]/20 rounded-full text-[var(--icon-red-text)]">
                        +{lowStockItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
                <LinkButton to="/dashboard/stock" size="sm" variant="secondary">
                  View All
                </LinkButton>
              </div>
            </div>
          )}
          
          {stats.expiring > 0 && (
            <div className="bg-[var(--icon-yellow-bg)] border-l-4 border-[var(--icon-yellow-text)] rounded-r-xl p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-bold text-[var(--icon-yellow-text)] text-sm mb-1">Expiry Alert</h3>
                  <p className="text-sm text-[var(--icon-yellow-text)]">
                    {stats.expiring} item(s) will expire within the next 30 days.
                  </p>
                </div>
                <LinkButton to="/dashboard/stock" size="sm" variant="secondary">
                  Review Stock
                </LinkButton>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Stock Section */}
      <div className={TABLE_SHELL}>
        <div className="px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Package className="w-4 h-4 text-[var(--icon-cyan-text)]" />
              Current Stock Inventory
            </h2>
            <SearchInput
              className="w-64"
              value={searchQuery}
              onChange={(v) => {
                setSearchQuery(v);
                setCurrentPage(1);
              }}
              placeholder="Search by name, category, or description..."
            />
          </div>
        </div>

        {/* Stock Table */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[var(--text-secondary)] text-sm mb-1">
              {searchQuery ? 'No items match your search' : 'No stock items found'}
            </p>
            {canManageStock && !searchQuery && (
              <Link
                to="/dashboard/stock"
                className="inline-flex items-center gap-2 mt-3 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add your first item
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Item Name</th>
                    <th className={TH}>Category</th>
                    <th className={cn(TH, 'text-center')}>Current Stock</th>
                    <th className={cn(TH, 'text-center')}>Reorder Level</th>
                    <th className={cn(TH, 'text-right')}>Cost Price</th>
                    <th className={TH}>Expiry Date</th>
                    <th className={cn(TH, 'text-center')}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item) => {
                    const status = getStockStatus(item);
                    const StatusIcon = status.icon;
                    const expiring = isExpiringSoon(item.expiryDate);
                    const isOutOfStock = item.currentStock === 0;

                    return (
                      <tr key={item.id} className={TR}>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                            {item.strength && (
                              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.strength}</p>
                            )}
                          </div>
                        </td>
                        <td className={TD}>
                          <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)] capitalize">
                            {item.category}
                          </span>
                        </td>
                        <td className={cn(TD, 'text-center')}>
                          <span className={`text-sm font-bold ${isOutOfStock || status.label === 'LOW STOCK' ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'}`}>
                            {item.currentStock}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)] ml-1">{item.unitOfMeasure}</span>
                        </td>
                        <td className={cn(TD, 'text-center text-[var(--text-secondary)]')}>
                          {item.reorderLevel}
                        </td>
                        <td className={cn(TD, 'text-right font-medium')}>
                          ₵{Number(item.costPrice || 0).toFixed(2)}
                        </td>
                        <td className={TD}>
                          {item.expiryDate ? (
                            <span className={`text-sm ${expiring ? 'text-[var(--icon-yellow-text)] font-medium' : 'text-[var(--text-secondary)]'}`}>
                              {new Date(item.expiryDate).toLocaleDateString()}
                              {expiring && <Clock className="w-3 h-3 inline ml-1" />}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className={cn(TD, 'text-center')}>
                          <Badge tone={status.tone} size="sm">
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={filteredItems.length}
              noun="items"
              onChange={handlePageChange}
            />
          </>
        )}
      </div>

      {/* Footer Stats */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Average Stock Value</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                ₵{(stats.totalValue / (stats.total || 1)).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Stock Turnover Rate</p>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {stats.total > 0 ? (stats.lowStock / stats.total * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Health Score</p>
              <p className="text-lg font-bold text-[var(--icon-green-text)]">
                {stats.total > 0 ? Math.max(0, 100 - (stats.lowStock / stats.total * 50)).toFixed(0) : 100}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}