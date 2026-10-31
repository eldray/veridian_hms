// src/pages/StockTransactions.tsx - COMPLETE FIXED VERSION
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useToast } from '../store/toastStore';
import {
  RefreshCw,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  ClipboardList,
  X,
  Calendar,
  User,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  cn,
  FilterSelect,
  INPUT,
  PageHeader,
  Pagination,
  SearchInput,
  StatCard,
  TABLE_SHELL,
  TD,
  TD_MONO,
  TH,
  TH_ROW,
  TR,
  type BadgeTone,
} from '../components/ui';

export default function StockTransactions() {
  const {
    transactions,
    stockItems,
    getStockTransactions,
    getStockItems,
    isLoading
  } = useStockStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    transactionType: '',
    startDate: '',
    endDate: '',
    stockItemId: ''
  });

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        getStockTransactions(),
        getStockItems()
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
      toastError('Load failed', 'Could not load transaction data');
    }
  };

  const loadTransactions = async (queryFilters = filters) => {
    try {
      await getStockTransactions(queryFilters);
    } catch (err) {
      toastError('Load failed', 'Could not load transactions');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    void loadTransactions();
    success('Filters applied', 'Transactions filtered successfully');
  };

  const clearFilters = () => {
    // React state updates are asynchronous. Pass the cleared filters directly
    // so the reload cannot accidentally reuse the previous filter values.
    const clearedFilters = {
      transactionType: '',
      startDate: '',
      endDate: '',
      stockItemId: ''
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    void loadTransactions(clearedFilters);
    success('Filters cleared', 'Showing all transactions');
  };

  // Get stock item name by ID
  const getStockItemName = (id: string) => {
    const item = stockItems.find(i => i.id === id);
    return item?.name || 'Unknown Item';
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const itemName = transaction.StockItem?.name || getStockItemName(transaction.stockItemId);
    
    return (
      itemName.toLowerCase().includes(searchLower) ||
      (transaction.reference?.toLowerCase().includes(searchLower)) ||
      (transaction.notes?.toLowerCase().includes(searchLower)) ||
      transaction.transactionType.toLowerCase().includes(searchLower)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getTransactionTypeConfig = (type: string): { accent: BadgeTone; label: string; icon: LucideIcon; direction: string } => {
    switch (type) {
      case 'purchase':
        return { accent: 'green', label: 'Purchase', icon: TrendingUp, direction: 'in' };
      case 'sale':
        return { accent: 'red', label: 'Sale', icon: TrendingDown, direction: 'out' };
      case 'requisition':
        return { accent: 'purple', label: 'Requisition', icon: ClipboardList, direction: 'out' };
      case 'transfer_in':
        return { accent: 'green', label: 'Transfer In', icon: TrendingUp, direction: 'in' };
      case 'transfer_out':
        return { accent: 'purple', label: 'Transfer Out', icon: TrendingDown, direction: 'out' };
      case 'write_off':
        return { accent: 'red', label: 'Write-off', icon: TrendingDown, direction: 'out' };
      case 'adjustment':
        return { accent: 'yellow', label: 'Adjustment', icon: Package, direction: 'adjust' };
      default:
        return { accent: 'neutral', label: type, icon: Package, direction: 'unknown' };
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Item', 'Type', 'Quantity', 'Reference', 'Balance After', 'Performed By', 'Notes'];
      const csvData = filteredTransactions.map((t: any) => [
        new Date(t.transactionDate).toLocaleString(),
        t.StockItem?.name || getStockItemName(t.stockItemId),
        t.transactionType,
        t.transactionType === 'adjustment' ? `${t.adjustmentDirection === 'decrease' ? '-' : '+'}${Math.abs(Number(t.quantity) || 0)}` : ['purchase', 'transfer_in'].includes(t.transactionType) ? `+${Math.abs(Number(t.quantity) || 0)}` : `-${Math.abs(Number(t.quantity) || 0)}`,
        t.reference || 'N/A',
        t.balanceAfter,
        t.User 
          ? (t.User.fullName || '').trim() 
          : (t.performedBy || 'System'),
        t.notes || ''
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Exported', `${filteredTransactions.length} transactions exported to CSV`);
    } catch (err) {
      toastError('Export failed', 'Could not export transactions');
    } finally {
      setExporting(false);
    }
  };

  // Calculate summary stats from filtered transactions
  const summaryStats = {
    // Adjustments are physical stock movements too; include them according to
    // their recorded direction so the headline totals reconcile with the ledger.
    totalIncoming: filteredTransactions
      .filter(t =>
        t.transactionType === 'purchase' ||
        t.transactionType === 'transfer_in' ||
        (t.transactionType === 'adjustment' && t.adjustmentDirection === 'increase')
      )
      .reduce((sum, t) => sum + Math.abs(Number(t.quantity) || 0), 0),
    totalOutgoing: filteredTransactions
      .filter(t =>
        ['sale', 'requisition', 'write_off', 'transfer_out'].includes(t.transactionType) ||
        (t.transactionType === 'adjustment' && t.adjustmentDirection === 'decrease')
      )
      .reduce((sum, t) => sum + Math.abs(Number(t.quantity) || 0), 0),
    totalTransactions: filteredTransactions.length,
    purchases: filteredTransactions.filter(t => t.transactionType === 'purchase').length,
    sales: filteredTransactions.filter(t => t.transactionType === 'sale').length,
    requisitions: filteredTransactions.filter(t => t.transactionType === 'requisition').length,
    adjustments: filteredTransactions.filter(t => t.transactionType === 'adjustment').length,
    writeOffs: filteredTransactions.filter(t => t.transactionType === 'write_off').length,
    transfersIn: filteredTransactions.filter(t => t.transactionType === 'transfer_in').length,
    transfersOut: filteredTransactions.filter(t => t.transactionType === 'transfer_out').length
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Stock Transactions"
        subtitle="Track all stock movements and inventory changes"
        icon={FileText}
        accent="blue"
        onBack={() => navigate(-1)}
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={isLoading} onClick={() => loadTransactions(filters)}>
              Refresh
            </Button>
            <Button
              variant="soft"
              accent="green"
              icon={Download}
              disabled={exporting || filteredTransactions.length === 0}
              onClick={exportToCSV}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant={showFilters ? 'primary' : 'soft'}
              accent="cyan"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {Object.values(filters).some(f => f) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-[var(--icon-red-text)]" />
              )}
            </Button>
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Stock In" value={summaryStats.totalIncoming} icon={TrendingUp} accent="green" />
        <StatCard label="Stock Out" value={summaryStats.totalOutgoing} icon={TrendingDown} accent="red" />
        <StatCard label="Purchases" value={summaryStats.purchases} icon={FileText} accent="cyan" />
        <StatCard label="Requisitions" value={summaryStats.requisitions} icon={ClipboardList} accent="purple" />
        <StatCard label="Adjustments" value={summaryStats.adjustments} icon={Package} accent="yellow" />
        <StatCard label="Total" value={summaryStats.totalTransactions} icon={Calendar} accent="blue" />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Transactions
            </h3>
            <Button variant="ghost" iconOnly icon={X} aria-label="Close filters" onClick={() => setShowFilters(false)} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Transaction Type</label>
              <FilterSelect
                value={filters.transactionType}
                onChange={v => handleFilterChange('transactionType', v)}
                className="w-full"
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'purchase', label: 'Purchase (Stock In)' },
                  { value: 'sale', label: 'Sale (Stock Out)' },
                  { value: 'requisition', label: 'Requisition (Stock Out)' },
                  { value: 'transfer_in', label: 'Transfer In' },
                  { value: 'transfer_out', label: 'Transfer Out' },
                  { value: 'write_off', label: 'Write-off' },
                  { value: 'adjustment', label: 'Adjustment' },
                ]}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
                className={cn(INPUT, 'w-full')}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
                className={cn(INPUT, 'w-full')}
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Stock Item</label>
              <FilterSelect
                value={filters.stockItemId}
                onChange={v => handleFilterChange('stockItemId', v)}
                className="w-full"
                options={[
                  { value: '', label: 'All Items' },
                  ...stockItems.map(item => ({ value: item.id, label: item.name })),
                ]}
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button variant="soft" accent="cyan" className="flex-1" onClick={applyFilters}>
                Apply
              </Button>
              <Button variant="secondary" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Items Per Page */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          value={searchTerm}
          onChange={(v) => {
            setSearchTerm(v);
            setCurrentPage(1);
          }}
          placeholder="Search by item name, reference, or notes..."
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <FilterSelect
            value={String(itemsPerPage)}
            onChange={(v) => {
              setItemsPerPage(Number(v));
              setCurrentPage(1);
            }}
            options={[
              { value: '10', label: '10' },
              { value: '15', label: '15' },
              { value: '25', label: '25' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
          />
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

      {/* Transactions Table */}
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
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Transactions Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {Object.values(filters).some(f => f) || searchTerm
              ? 'Try adjusting your search or filter criteria'
              : 'No stock transactions have been recorded yet'}
          </p>
          {(Object.values(filters).some(f => f) || searchTerm) && (
            <Button variant="soft" accent="cyan" icon={X} onClick={clearFilters}>
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Date &amp; Time</th>
                    <th className={TH}>Item</th>
                    <th className={TH}>Type</th>
                    <th className={cn(TH, 'text-right')}>Quantity</th>
                    <th className={TH}>Reference</th>
                    <th className={cn(TH, 'text-right')}>Balance</th>
                    <th className={TH}>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction: any) => {
                    const config = getTransactionTypeConfig(transaction.transactionType);
                    const IconComponent = config.icon;
                    const itemName = transaction.StockItem?.name || getStockItemName(transaction.stockItemId);
                    const unit = transaction.StockItem?.unitOfMeasure || 'unit';
                    
                    return (
                      <tr key={transaction.id} className={TR}>
                        <td className={TD}>
                          <div className="text-sm text-[var(--text-primary)]">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {new Date(transaction.transactionDate).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className={cn(TD, 'whitespace-normal')}>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {itemName}
                            </span>
                          </div>
                          {transaction.notes && (
                            <div className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-1">
                              {transaction.notes}
                            </div>
                          )}
                        </td>
                        <td className={TD}>
                          <Badge tone={config.accent} size="sm">
                            <IconComponent className="w-3 h-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className={cn(TD, 'text-right')}>
                          <div className="flex items-center justify-end gap-1">
                            {config.direction === 'in' ? (
                              <TrendingUp className="w-3 h-3 text-[var(--icon-green-text)]" />
                            ) : config.direction === 'out' ? (
                              <TrendingDown className="w-3 h-3 text-[var(--icon-red-text)]" />
                            ) : (
                              <Package className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                            )}
                            <span className={`text-sm font-bold ${
                              config.direction === 'in' 
                                ? 'text-[var(--icon-green-text)]' 
                                : config.direction === 'out'
                                ? 'text-[var(--icon-red-text)]'
                                : 'text-[var(--icon-yellow-text)]'
                            }`}>
                              {transaction.transactionType === 'adjustment' ? (transaction.adjustmentDirection === 'decrease' ? '-' : '+') : config.direction === 'in' ? '+' : config.direction === 'out' ? '-' : '±'}
                              {transaction.quantity}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">{unit}</span>
                          </div>
                        </td>
                        <td className={cn(TD_MONO, 'text-[var(--text-secondary)]')}>
                          {transaction.reference || '—'}
                        </td>
                        <td className={cn(TD, 'text-right')}>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {transaction.balanceAfter} {unit}
                          </span>
                        </td>
                        <td className={TD}>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                              {transaction.User 
                                ? (transaction.User.fullName || '').trim() 
                                : (transaction.performedBy || 'System')}
                            </span>
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
            totalItems={filteredTransactions.length}
            noun="transactions"
            onChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}