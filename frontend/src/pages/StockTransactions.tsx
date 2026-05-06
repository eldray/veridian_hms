// src/pages/StockTransactions.tsx - COMPLETE FIXED VERSION
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { 
  Search, 
  RefreshCw,
  ArrowLeft,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  ClipboardList,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tag,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockTransactions() {
  const {
    transactions,
    stockItems,
    getStockTransactions,
    getStockMovementReport,
    getStockItems,
    isLoading
  } = useStockStore();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const isAdmin = hasRole(['admin', 'pharmacist', 'accounts']);

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

  // State for reports
  const [showFilters, setShowFilters] = useState(false);
  const [movementReport, setMovementReport] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        getStockTransactions(),
        getStockItems(),
        loadMovementReport()
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
      toastError('Load failed', 'Could not load transaction data');
    }
  };

  const loadTransactions = async () => {
    try {
      await getStockTransactions(filters);
    } catch (err) {
      toastError('Load failed', 'Could not load transactions');
    }
  };

  const loadMovementReport = async () => {
    try {
      const report = await getStockMovementReport(filters);
      setMovementReport(report);
    } catch (err) {
      console.error('Report failed:', err);
      // Don't show error toast for report failure - it's not critical
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadTransactions();
    loadMovementReport();
    success('Filters applied', 'Transactions filtered successfully');
  };

  const clearFilters = () => {
    setFilters({
      transactionType: '',
      startDate: '',
      endDate: '',
      stockItemId: ''
    });
    setCurrentPage(1);
    loadTransactions();
    loadMovementReport();
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

  const getTransactionTypeConfig = (type: string) => {
    switch (type) {
      case 'purchase': 
        return { 
          bg: 'bg-[var(--icon-green-bg)]', 
          text: 'text-[var(--icon-green-text)]', 
          border: 'border-[var(--icon-green-text)]',
          label: 'Purchase',
          icon: TrendingUp,
          direction: 'in'
        };
      case 'sale':
        return { 
          bg: 'bg-[var(--icon-red-bg)]', 
          text: 'text-[var(--icon-red-text)]', 
          border: 'border-[var(--icon-red-text)]',
          label: 'Sale',
          icon: TrendingDown,
          direction: 'out'
        };
      case 'requisition':
        return { 
          bg: 'bg-[var(--icon-purple-bg)]', 
          text: 'text-[var(--icon-purple-text)]', 
          border: 'border-[var(--icon-purple-text)]',
          label: 'Requisition',
          icon: ClipboardList,
          direction: 'out'
        };
      case 'adjustment':
        return { 
          bg: 'bg-[var(--icon-yellow-bg)]', 
          text: 'text-[var(--icon-yellow-text)]', 
          border: 'border-[var(--icon-yellow-text)]',
          label: 'Adjustment',
          icon: Package,
          direction: 'adjust'
        };
      default:
        return { 
          bg: 'bg-[var(--bg-main)]', 
          text: 'text-[var(--text-secondary)]', 
          border: 'border-[var(--border-color)]',
          label: type,
          icon: Package,
          direction: 'unknown'
        };
    }
  };

  const exportToCSV = async () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Item', 'Type', 'Quantity', 'Reference', 'Balance After', 'Performed By', 'Notes'];
      const csvData = filteredTransactions.map(t => [
        new Date(t.transactionDate).toLocaleString(),
        t.StockItem?.name || getStockItemName(t.stockItemId),
        t.transactionType,
        t.transactionType === 'purchase' ? `+${t.quantity}` : `-${t.quantity}`,
        t.reference || 'N/A',
        t.balanceAfter,
        t.performedBy || 'System',
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
    totalIncoming: filteredTransactions
      .filter(t => t.transactionType === 'purchase')
      .reduce((sum, t) => sum + t.quantity, 0),
    totalOutgoing: filteredTransactions
      .filter(t => t.transactionType === 'sale' || t.transactionType === 'requisition')
      .reduce((sum, t) => sum + t.quantity, 0),
    totalTransactions: filteredTransactions.length,
    purchases: filteredTransactions.filter(t => t.transactionType === 'purchase').length,
    sales: filteredTransactions.filter(t => t.transactionType === 'sale').length,
    requisitions: filteredTransactions.filter(t => t.transactionType === 'requisition').length,
    adjustments: filteredTransactions.filter(t => t.transactionType === 'adjustment').length
  };

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Transactions</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Track all stock movements and inventory changes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            disabled={exporting || filteredTransactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              showFilters 
                ? 'bg-[var(--icon-cyan-text)] text-white' 
                : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.values(filters).some(f => f) && (
              <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Stock In</p>
              <p className="text-xl font-bold text-[var(--icon-green-text)]">
                {summaryStats.totalIncoming}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[var(--icon-red-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Stock Out</p>
              <p className="text-xl font-bold text-[var(--icon-red-text)]">
                {summaryStats.totalOutgoing}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Purchases</p>
              <p className="text-xl font-bold text-[var(--icon-cyan-text)]">
                {summaryStats.purchases}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Requisitions</p>
              <p className="text-xl font-bold text-[var(--icon-purple-text)]">
                {summaryStats.requisitions}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Adjustments</p>
              <p className="text-xl font-bold text-[var(--icon-yellow-text)]">
                {summaryStats.adjustments}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--icon-blue-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total</p>
              <p className="text-xl font-bold text-[var(--icon-blue-text)]">
                {summaryStats.totalTransactions}
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
              Filter Transactions
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Transaction Type</label>
              <select
                value={filters.transactionType}
                onChange={e => handleFilterChange('transactionType', e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="">All Types</option>
                <option value="purchase">Purchase (Stock In)</option>
                <option value="sale">Sale (Stock Out)</option>
                <option value="requisition">Requisition (Stock Out)</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Stock Item</label>
              <select
                value={filters.stockItemId}
                onChange={e => handleFilterChange('stockItemId', e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="">All Items</option>
                {stockItems.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                Clear
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
            placeholder="Search by item name, reference, or notes..."
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
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

      {/* Results Count */}
      {filteredTransactions.length > 0 && (
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
        </div>
      )}

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
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear All Filters
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedTransactions.map(transaction => {
                    const config = getTransactionTypeConfig(transaction.transactionType);
                    const IconComponent = config.icon;
                    const itemName = transaction.StockItem?.name || getStockItemName(transaction.stockItemId);
                    const unit = transaction.StockItem?.unitOfMeasure || 'unit';
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm text-[var(--text-primary)]">
                            {new Date(transaction.transactionDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-[var(--text-tertiary)]">
                            {new Date(transaction.transactionDate).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
                            <IconComponent className="w-3 h-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
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
                              {config.direction === 'in' ? '+' : config.direction === 'out' ? '-' : '±'}
                              {transaction.quantity}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">{unit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--text-secondary)] font-mono">
                            {transaction.reference || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {transaction.balanceAfter} {unit}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[var(--text-tertiary)]" />
                            <span className="text-sm text-[var(--text-secondary)]">
                              {transaction.performedBy || 'System'}
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
    </div>
  );
}