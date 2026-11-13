// src/pages/StockTransactions.tsx - COMPLETE FIXED VERSION
// Consistent with Patients / Referrals / Notifications:
//  - One data point per column (Date | Time | Item | Notes | Type | Quantity | Unit | Reference | Balance | Performed By)
//  - Pagination always rendered in the same place (not only when rows exist), totalPages never 0,
//    current page clamped to a safe page so filtering can never strand you on an empty page.
//  - Humanised labels: `transfer_in` -> `Transfer In`, raw `type` fallback no longer leaks through.
//  - var(--*) tokens only. All filters, stats, export and store calls preserved.
import { useEffect, useMemo, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import {
  RefreshCw, Filter, Download, TrendingUp, TrendingDown, Package, FileText,
  ClipboardList, X, Calendar, User, type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Badge, Button, cn, FilterSelect, INPUT, PageHeader, Pagination, SearchInput, StatCard,
  TABLE_SHELL, TD, TD_MONO, TH, TH_ROW, TR, type BadgeTone,
} from '../components/ui';

const humanize = (s: any) => String(s ?? '').replace(/_/g, ' ').replace(/-/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();
const titleCase = (s: any) => String(s ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();

export default function StockTransactions() {
  const { transactions, stockItems, getStockTransactions, getStockItems, isLoading } = useStockStore();
  const { users, getAllUsers } = useUserStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ transactionType: '', startDate: '', endDate: '', stockItemId: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [showFilters, setShowFilters] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadInitialData(); }, []);
  const loadInitialData = async () => {
    try { await Promise.all([getStockTransactions(), getStockItems(), getAllUsers()]); }
    catch (err) { console.error('Failed to load data:', err); toastError('Load failed', 'Could not load transaction data'); }
  };
  const loadTransactions = async (queryFilters = filters) => {
    try { await getStockTransactions(queryFilters); } catch (err) { toastError('Load failed', 'Could not load transactions'); }
  };
  const handleFilterChange = (key: string, value: string) => setFilters(prev => ({ ...prev, [key]: value }));
  const applyFilters = () => { setCurrentPage(1); void loadTransactions(); success('Filters applied', 'Transactions filtered successfully'); };
  const clearFilters = () => {
    const clearedFilters = { transactionType: '', startDate: '', endDate: '', stockItemId: '' };
    setFilters(clearedFilters); setItemSearch(''); setItemPickerOpen(false); setCurrentPage(1); void loadTransactions(clearedFilters);
    success('Filters cleared', 'Showing all transactions');
  };
  const getStockItemName = (id: string) => { const item = stockItems.find(i => i.id === id); return item?.name || 'Unknown Item'; };
  // performedBy is a user ID when the API does not embed User. Resolve it via the user list,
  // exactly like Notifications resolves sender ids. Never render a raw id if we can name it.
  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    (users || []).forEach((u: any) => { if (u?.id) m.set(String(u.id), (u.fullName || u.name || '').trim()); });
    return m;
  }, [users]);
  const getPerformer = (t: any) => {
    const embedded = (t.User?.fullName || t.User?.name || '').trim();
    if (embedded) return embedded;
    // performedBy / performedById / userId may each hold the id — try them all.
    const rawCandidate = t.performedById || t.userId || t.performedBy;
    // performedBy can itself be an embedded user object on some rows.
    if (rawCandidate && typeof rawCandidate === 'object') return (rawCandidate.fullName || rawCandidate.name || '').trim() || 'System';
    const candidate = rawCandidate;
    if (candidate == null || candidate === '') return 'System';
    const resolved = userNameById.get(String(candidate));
    if (resolved) return resolved;
    // If it is not an id we know, it may already be a name (older rows) — show it as-is.
    return String(candidate);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const itemName = transaction.StockItem?.name || getStockItemName(transaction.stockItemId);
    return (
      itemName.toLowerCase().includes(searchLower) ||
      (transaction.reference?.toLowerCase().includes(searchLower)) ||
      (transaction.notes?.toLowerCase().includes(searchLower)) ||
      transaction.transactionType.toLowerCase().includes(searchLower) ||
      getPerformer(transaction).toLowerCase().includes(searchLower)
    );
  });

  // Pagination — same shape as Referrals / Notifications: never 0 pages, never stranded.
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  const handlePageChange = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getTransactionTypeConfig = (type: string): { accent: BadgeTone; label: string; icon: LucideIcon; direction: string } => {
    switch (type) {
      case 'purchase': return { accent: 'green', label: 'Purchase', icon: TrendingUp, direction: 'in' };
      case 'sale': return { accent: 'red', label: 'Sale', icon: TrendingDown, direction: 'out' };
      case 'requisition': return { accent: 'purple', label: 'Requisition', icon: ClipboardList, direction: 'out' };
      case 'transfer_in': return { accent: 'green', label: 'Transfer In', icon: TrendingUp, direction: 'in' };
      case 'transfer_out': return { accent: 'purple', label: 'Transfer Out', icon: TrendingDown, direction: 'out' };
      case 'write_off': return { accent: 'red', label: 'Write-off', icon: TrendingDown, direction: 'out' };
      case 'adjustment': return { accent: 'yellow', label: 'Adjustment', icon: Package, direction: 'adjust' };
      default: return { accent: 'neutral', label: humanize(type), icon: Package, direction: 'unknown' };
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
        t.reference || 'N/A', t.balanceAfter, getPerformer(t), t.notes || '',
      ]);
      const csvContent = [headers, ...csvData].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `stock-transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      success('Exported', `${filteredTransactions.length} transactions exported to CSV`);
    } catch (err) { toastError('Export failed', 'Could not export transactions'); }
    finally { setExporting(false); }
  };

  const summaryStats = {
    totalIncoming: filteredTransactions.filter(t => t.transactionType === 'purchase' || t.transactionType === 'transfer_in' || (t.transactionType === 'adjustment' && t.adjustmentDirection === 'increase')).reduce((sum, t) => sum + Math.abs(Number(t.quantity) || 0), 0),
    totalOutgoing: filteredTransactions.filter(t => ['sale', 'requisition', 'write_off', 'transfer_out'].includes(t.transactionType) || (t.transactionType === 'adjustment' && t.adjustmentDirection === 'decrease')).reduce((sum, t) => sum + Math.abs(Number(t.quantity) || 0), 0),
    totalTransactions: filteredTransactions.length,
    purchases: filteredTransactions.filter(t => t.transactionType === 'purchase').length,
    sales: filteredTransactions.filter(t => t.transactionType === 'sale').length,
    requisitions: filteredTransactions.filter(t => t.transactionType === 'requisition').length,
    adjustments: filteredTransactions.filter(t => t.transactionType === 'adjustment').length,
    writeOffs: filteredTransactions.filter(t => t.transactionType === 'write_off').length,
    transfersIn: filteredTransactions.filter(t => t.transactionType === 'transfer_in').length,
    transfersOut: filteredTransactions.filter(t => t.transactionType === 'transfer_out').length,
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Stock Transactions" subtitle="Track all stock movements and inventory changes" icon={FileText} accent="blue" onBack={() => navigate(-1)}
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={isLoading} onClick={() => loadTransactions(filters)}>Refresh</Button>
            <Button variant="soft" accent="green" icon={Download} disabled={exporting || filteredTransactions.length === 0} onClick={exportToCSV}>{exporting ? 'Exporting...' : 'Export CSV'}</Button>
            <Button variant={showFilters ? 'primary' : 'soft'} accent="cyan" icon={Filter} onClick={() => setShowFilters(!showFilters)}>Filters{Object.values(filters).some(f => f) && (<span className="ml-1 w-2 h-2 rounded-full bg-[var(--icon-red-text)]" />)}</Button>
          </>
        )} />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Stock In" value={summaryStats.totalIncoming} icon={TrendingUp} accent="green" />
        <StatCard label="Stock Out" value={summaryStats.totalOutgoing} icon={TrendingDown} accent="red" />
        <StatCard label="Purchases" value={summaryStats.purchases} icon={FileText} accent="cyan" />
        <StatCard label="Requisitions" value={summaryStats.requisitions} icon={ClipboardList} accent="purple" />
        <StatCard label="Adjustments" value={summaryStats.adjustments} icon={Package} accent="yellow" />
        <StatCard label="Total" value={summaryStats.totalTransactions} icon={Calendar} accent="blue" />
      </div>

      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Filter className="w-4 h-4" />Filter Transactions</h3>
            <Button variant="ghost" iconOnly icon={X} aria-label="Close filters" onClick={() => setShowFilters(false)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Transaction Type</label>
              <FilterSelect value={filters.transactionType} onChange={v => handleFilterChange('transactionType', v)} className="w-full"
                options={[
                  { value: '', label: 'All Types' }, { value: 'purchase', label: 'Purchase (Stock In)' },
                  { value: 'sale', label: 'Sale (Stock Out)' }, { value: 'requisition', label: 'Requisition (Stock Out)' },
                  { value: 'transfer_in', label: 'Transfer In' }, { value: 'transfer_out', label: 'Transfer Out' },
                  { value: 'write_off', label: 'Write-off' }, { value: 'adjustment', label: 'Adjustment' },
                ]} />
            </div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label><input type="date" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} className={cn(INPUT, 'w-full')} /></div>
            <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label><input type="date" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} className={cn(INPUT, 'w-full')} /></div>
            <div className="relative">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Stock Item</label>
              <div className="relative" onClick={() => setItemPickerOpen(true)}>
                <SearchInput
                  value={itemPickerOpen ? itemSearch : (filters.stockItemId ? (stockItems.find(i => i.id === filters.stockItemId)?.name || '') : '')}
                  onChange={(v) => { setItemSearch(v); setItemPickerOpen(true); }}
                  placeholder="Search stock items…"
                />
                {filters.stockItemId && (
                  <button type="button" aria-label="Clear stock item" onClick={() => { handleFilterChange('stockItemId', ''); setItemSearch(''); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X className="w-3.5 h-3.5" /></button>
                )}
              </div>
              {itemPickerOpen && (
                <>
                  <button type="button" aria-label="Close item list" className="fixed inset-0 z-10 cursor-default" onClick={() => setItemPickerOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] shadow-lg" style={{ boxShadow: 'var(--shadow-md)', scrollbarWidth: 'thin' }}>
                    <button type="button" onClick={() => { handleFilterChange('stockItemId', ''); setItemSearch(''); setItemPickerOpen(false); }}
                      className={cn('w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-main)]', !filters.stockItemId && 'font-semibold text-[var(--text-primary)] text-[var(--text-secondary)]')}>
                      All Items
                    </button>
                    {stockItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())).map(item => (
                      <button key={item.id} type="button" onClick={() => { handleFilterChange('stockItemId', item.id); setItemSearch(''); setItemPickerOpen(false); }}
                        className={cn('w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-main)]', filters.stockItemId === item.id ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
                        {item.name}
                        {item.unitOfMeasure ? <span className="text-[var(--text-tertiary)]"> · {item.unitOfMeasure}</span> : null}
                      </button>
                    ))}
                    {stockItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                      <p className="px-3 py-3 text-xs text-[var(--text-tertiary)] text-center">No items match “{itemSearch}”</p>
                    )}
                  </div>
                </>
              )}
              <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{stockItems.length} items — type to search</p>
            </div>
            <div className="flex items-end gap-2"><Button variant="soft" accent="cyan" className="flex-1" onClick={applyFilters}>Apply</Button><Button variant="secondary" onClick={clearFilters}>Clear</Button></div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder="Search by item name, reference, or notes..." />
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <FilterSelect value={String(itemsPerPage)} onChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
            options={[{ value: '10', label: '10' }, { value: '15', label: '15' }, { value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]} />
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="flex items-center gap-4"><div className="h-10 w-10 bg-[var(--bg-main)] rounded-lg"></div><div className="flex-1"><div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2"></div><div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div></div><div className="h-8 w-20 bg-[var(--bg-main)] rounded-lg"></div></div>
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-[var(--text-tertiary)]" /></div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Transactions Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{Object.values(filters).some(f => f) || searchTerm ? 'Try adjusting your search or filter criteria' : 'No stock transactions have been recorded yet'}</p>
          {(Object.values(filters).some(f => f) || searchTerm) && (<Button variant="soft" accent="cyan" icon={X} onClick={clearFilters}>Clear All Filters</Button>)}
        </div>
      ) : (
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Time</th>
                  <th className={TH}>Item</th>
                  <th className={TH}>Notes</th>
                  <th className={TH}>Type</th>
                  <th className={cn(TH, 'text-right')}>Quantity</th>
                  <th className={TH}>Unit</th>
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
                  const d = new Date(transaction.transactionDate);
                  return (
                    <tr key={transaction.id} className={TR}>
                      <td className={TD}><span className="text-sm text-[var(--text-primary)] whitespace-nowrap">{d.toLocaleDateString()}</span></td>
                      <td className={TD}><span className="text-sm text-[var(--text-secondary)] whitespace-nowrap">{d.toLocaleTimeString()}</span></td>
                      <td className={cn(TD, 'whitespace-normal')}><div className="flex items-center gap-2"><Package className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" /><span className="text-sm font-medium text-[var(--text-primary)]">{itemName}</span></div></td>
                      <td className={TD}><span className="text-xs text-[var(--text-tertiary)] line-clamp-1">{transaction.notes || '—'}</span></td>
                      <td className={TD}><Badge tone={config.accent} size="sm"><IconComponent className="w-3 h-3" />{config.label}</Badge></td>
                      <td className={cn(TD, 'text-right')}>
                        <span className={`text-sm font-bold ${config.direction === 'in' ? 'text-[var(--icon-green-text)]' : config.direction === 'out' ? 'text-[var(--icon-red-text)]' : 'text-[var(--icon-yellow-text)]'}`}>
                          {transaction.transactionType === 'adjustment' ? (transaction.adjustmentDirection === 'decrease' ? '-' : '+') : config.direction === 'in' ? '+' : config.direction === 'out' ? '-' : '±'}{transaction.quantity}
                        </span>
                      </td>
                      <td className={TD}><span className="text-xs text-[var(--text-tertiary)]">{unit}</span></td>
                      <td className={cn(TD_MONO, 'text-[var(--text-secondary)]')}>{transaction.reference || '—'}</td>
                      <td className={cn(TD, 'text-right')}><span className="text-sm font-medium text-[var(--text-primary)] whitespace-nowrap">{transaction.balanceAfter}</span></td>
                      <td className={TD}><div className="flex items-center gap-1"><User className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" /><span className="text-sm text-[var(--text-secondary)]">{titleCase(getPerformer(transaction))}</span></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination — always in the same place, like Referrals / Notifications, even with 0 rows */}
      <Pagination page={safePage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredTransactions.length} noun="transactions" onChange={handlePageChange} />
    </div>
  );
}
