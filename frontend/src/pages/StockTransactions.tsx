// src/pages/StockTransactions.tsx
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
  ClipboardList
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StockTransactions() {
  const {
    transactions,
    getStockTransactions,
    getStockMovementReport,
    isLoading
  } = useStockStore();
  const { user } = useAuthStore();
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
  const [itemsPerPage] = useState(15);

  // State for reports
  const [showFilters, setShowFilters] = useState(false);
  const [movementReport, setMovementReport] = useState<any>(null);

  useEffect(() => {
    loadTransactions();
    loadMovementReport();
  }, []);

  const loadTransactions = async () => {
    try {
      await getStockTransactions(filters);
    } catch {
      toastError('Load failed', 'Could not load transactions');
    }
  };

  const loadMovementReport = async () => {
    try {
      const report = await getStockMovementReport(filters);
      setMovementReport(report);
    } catch {
      toastError('Report failed', 'Could not load movement report');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadTransactions();
    loadMovementReport();
  };

  const clearFilters = () => {
    setFilters({
      transactionType: '',
      startDate: '',
      endDate: '',
      stockItemId: ''
    });
    setCurrentPage(1);
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.stockItem?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': 
        return { bg: 'bg-[var(--icon-green-bg)]', text: 'text-[var(--icon-green-text)]', border: 'border-[var(--icon-green-text)]', icon: TrendingUp };
      case 'sale':
        return { bg: 'bg-[var(--icon-red-bg)]', text: 'text-[var(--icon-red-text)]', border: 'border-[var(--icon-red-text)]', icon: TrendingDown };
      case 'requisition':
        return { bg: 'bg-[var(--icon-blue-bg)]', text: 'text-[var(--icon-blue-text)]', border: 'border-[var(--icon-blue-text)]', icon: ClipboardList };
      case 'adjustment':
        return { bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]', border: 'border-[var(--icon-yellow-text)]', icon: Package };
      default:
        return { bg: 'bg-[var(--icon-gray-bg)]', text: 'text-[var(--icon-gray-text)]', border: 'border-[var(--icon-gray-text)]', icon: Package };
    }
  };

  const getTransactionDirection = (type: string) => {
    return type === 'purchase' || type === 'adjustment' ? 'in' : 'out';
  };

  const exportToCSV = () => {
    // Simple CSV export implementation
    const headers = ['Date', 'Item', 'Type', 'Quantity', 'Reference', 'Balance After', 'Performed By'];
    const csvData = transactions.map(t => [
      new Date(t.transactionDate).toLocaleDateString(),
      t.stockItem?.name || 'N/A',
      t.transactionType,
      t.quantity,
      t.reference || 'N/A',
      t.balanceAfter,
      t.performedBy
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    success('Exported', 'Transactions exported to CSV');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Transactions</h1>
            <p className="text-[var(--text-secondary)] text-sm">Track all stock movements and changes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTransactions}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Movement Report Summary */}
      {movementReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--icon-green-text)]" />
              </div>
              <span className="text-[var(--text-secondary)] text-sm font-medium">Total Incoming</span>
            </div>
            <p className="text-2xl font-bold text-[var(--icon-green-text)]">
              {movementReport.summary?.totalIncoming || 0}
            </p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[var(--icon-red-text)]" />
              </div>
              <span className="text-[var(--text-secondary)] text-sm font-medium">Total Outgoing</span>
            </div>
            <p className="text-2xl font-bold text-[var(--icon-red-text)]">
              {movementReport.summary?.totalOutgoing || 0}
            </p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
              </div>
              <span className="text-[var(--text-secondary)] text-sm font-medium">Purchases</span>
            </div>
            <p className="text-2xl font-bold text-[var(--icon-cyan-text)]">
              {movementReport.summary?.totalPurchases || 0}
            </p>
          </div>
          <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[var(--icon-blue-text)]" />
              </div>
              <span className="text-[var(--text-secondary)] text-sm font-medium">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-[var(--icon-blue-text)]">
              {movementReport.summary?.totalTransactions || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <select
              value={filters.transactionType}
              onChange={e => handleFilterChange('transactionType', e.target.value)}
              className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            >
              <option value="">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="sale">Sale</option>
              <option value="requisition">Requisition</option>
              <option value="adjustment">Adjustment</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="End Date"
            />
            <input
              type="text"
              value={filters.stockItemId}
              onChange={e => handleFilterChange('stockItemId', e.target.value)}
              className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              placeholder="Stock Item ID"
            />
            <div className="flex gap-2">
              <button
                onClick={applyFilters}
                className="flex-1 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
              >
                Apply
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by item name, reference, or notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          />
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <FileText className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">
            {Object.values(filters).some(f => f) ? 'No transactions match your filters' : 'No transactions found'}
          </p>
          {Object.values(filters).some(f => f) && (
            <button
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 text-sm font-medium"
            >
              Clear filters
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
                    {['Date', 'Item', 'Type', 'Quantity', 'Reference', 'Balance After', 'Performed By'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedTransactions.map(transaction => {
                    const typeColor = getTransactionTypeColor(transaction.transactionType);
                    const IconComponent = typeColor.icon;
                    const direction = getTransactionDirection(transaction.transactionType);
                    
                    return (
                      <tr key={transaction.id} className="hover:bg-[var(--bg-main)] transition-colors">
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                          <br />
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {new Date(transaction.transactionDate).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-[var(--text-tertiary)]" />
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {transaction.stockItem?.name || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 w-fit capitalize ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
                            <IconComponent className="w-3 h-3" />
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {direction === 'in' ? (
                              <TrendingUp className="w-3 h-3 text-[var(--icon-green-text)]" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-[var(--icon-red-text)]" />
                            )}
                            <span className={`text-sm font-bold ${
                              direction === 'in' ? 'text-[var(--icon-green-text)]' : 'text-[var(--icon-red-text)]'
                            }`}>
                              {direction === 'in' ? '+' : '-'}{transaction.quantity}
                            </span>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {transaction.stockItem?.unitOfMeasure}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {transaction.reference || 'N/A'}
                          {transaction.notes && (
                            <div className="text-xs text-[var(--text-tertiary)] mt-1">
                              {transaction.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                          {transaction.balanceAfter} {transaction.stockItem?.unitOfMeasure}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {transaction.performedBy}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {filteredTransactions.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)]">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
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
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
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
                  className="px-3 py-1.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}