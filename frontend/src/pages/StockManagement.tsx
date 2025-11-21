// src/pages/StockManagement.tsx - FIXED VERSION
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  RefreshCw,
  FileText,
  ClipboardList,
  History,
  TrendingUp,
  TrendingDown, 
  Calendar,
  Grid,
  List,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import type { StockItem } from '../types';

export default function StockManagement() {
  const {
    stockItems,
    getStockItems,
    createStockItem,
    updateStockItem,
    deleteStockItem,
    createStockTransaction,
    isLoading
  } = useStockStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State for search, filters, and forms
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // State for pagination and view mode
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'line'>('grid');

  // ✅ ALIGNED WITH BACKEND StockItem INTERFACE
  const [formData, setFormData] = useState({
    name: '',
    category: 'medication',
    description: '',
    unitOfMeasure: '',
    reorderLevel: 10,
    costPrice: 0,
    cashPrice: 0,
    nhisPrice: 0,
    insurancePrice: 0,
    supplier: '',
    isNHISCovered: false,
    isPrivateInsExempted: false,
    nhisRequiresAuth: false,
    privateInsRequiresAuth: false,
  });

  // ✅ ALIGNED WITH BACKEND StockTransaction INTERFACE
  const [transactionData, setTransactionData] = useState({
    transactionType: 'purchase' as 'purchase' | 'adjustment' | 'requisition' | 'sale',
    quantity: 0,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadStockItems();
  }, []);

  const loadStockItems = async () => {
    try {
      await getStockItems();
      setCurrentPage(1);
    } catch {
      toastError('Load failed', 'Could not load stock items');
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = stockItems.filter(item => item.currentStock <= item.reorderLevel);

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
      if (editingItem) {
        // ✅ Use consistent ID field
        await updateStockItem(editingItem.id, formData);
        success('Updated', 'Stock item updated');
      } else {
        await createStockItem(formData);
        success('Created', 'Stock item added');
      }
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      loadStockItems();
    } catch {
      toastError('Save failed', 'Could not save stock item');
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      // ✅ Aligned transaction data
      await createStockTransaction({
        stockItemId: selectedItem.id, // ✅ Use 'id' not '_id'
        ...transactionData
      });
      success('Recorded', 'Transaction completed');
      setShowTransactionForm(false);
      setSelectedItem(null);
      resetTransactionForm();
      loadStockItems();
    } catch {
      toastError('Transaction failed', 'Could not record');
    }
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel,
      costPrice: item.costPrice || 0,
      cashPrice: item.cashPrice || 0,
      nhisPrice: item.nhisPrice || 0,
      insurancePrice: item.insurancePrice || 0,
      supplier: item.supplier || '',
      isNHISCovered: item.isNHISCovered || false,
      isPrivateInsExempted: item.isPrivateInsExempted || false,
      nhisRequiresAuth: item.nhisRequiresAuth || false,
      privateInsRequiresAuth: item.privateInsRequiresAuth || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await deleteStockItem(id);
      success('Deleted', 'Item removed');
      loadStockItems();
    } catch {
      toastError('Delete failed', 'Could not delete');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', 
      category: 'medication', 
      description: '', 
      unitOfMeasure: '',
      reorderLevel: 10, 
      costPrice: 0, 
      cashPrice: 0,
      nhisPrice: 0,
      insurancePrice: 0, 
      supplier: '', 
      isNHISCovered: false,
      isPrivateInsExempted: false,
      nhisRequiresAuth: false,
      privateInsRequiresAuth: false,
    });
  };

  const resetTransactionForm = () => {
    setTransactionData({
      transactionType: 'purchase',
      quantity: 0,
      reference: '',
      notes: ''
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

  const isLowStock = (item: StockItem) => item.currentStock <= item.reorderLevel;

  return (
    <div className="space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] rounded-lg transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          {/* ✅ FIXED: Proper JSX for navigation buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/invoices"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
            >
              <FileText className="w-4 h-4" />
              Invoices
            </Link>
            <Link
              to="/dashboard/requisitions"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
            >
              <ClipboardList className="w-4 h-4" />
              Requisitions
            </Link>
            <Link
              to="/dashboard/transactions"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
            >
              <History className="w-4 h-4" />
              Transactions
            </Link>
          </div>
          
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Management</h1>
            <p className="text-[var(--text-secondary)] text-sm">Track inventory and reorder levels</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0" />
            <div>
              <p className="font-bold text-[var(--icon-yellow-text)] text-sm">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
              </p>
              <p className="text-xs text-[var(--icon-yellow-text)] line-clamp-1">
                {lowStockItems.map(i => i.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters with View Toggle */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          >
            <option value="all">All Categories</option>
            {['medication', 'consumable', 'equipment', 'supply'].map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
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
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'line' 
                  ? 'bg-[var(--icon-cyan-text)] text-white' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={loadStockItems}
            disabled={isLoading}
            className="px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Items Per Page Selector */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded focus:ring-1 focus:ring-[var(--icon-cyan-text)] text-xs"
            >
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
            </select>
            <span>items per page</span>
          </div>

          {/* Results Count */}
          <div className="text-sm text-[var(--text-secondary)]">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
          </div>
        </div>
      </div>

      {/* Stock Items Display */}
      {isLoading ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
          : "space-y-3"
        }>
          {[...Array(itemsPerPage)].map((_, i) => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
                <div className="h-4 bg-[var(--bg-main)] rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div>
              </div>
            ) : (
              <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/4"></div>
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/6"></div>
                </div>
              </div>
            )
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm">No items found</p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Item
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <>
          {/* Grid View */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedItems.map(item => (
              <div
                key={item.id}
                className={`bg-[var(--bg-card)] rounded-xl p-4 border ${
                  isLowStock(item) ? 'border-[var(--icon-yellow-text)] bg-[var(--icon-yellow-bg)]' : 'border-[var(--border-color)]'
                } hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isLowStock(item) ? 'bg-[var(--icon-yellow-text)]' : 'bg-[var(--icon-cyan-text)]'
                    }`}>
                      <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm">{item.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  {isLowStock(item) && <AlertTriangle className="w-4 h-4 text-[var(--icon-yellow-text)]" />}
                </div>

                <div className="space-y-2 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Stock:</span>
                    <span className={`font-bold ${isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-primary)]'}`}>
                      {item.currentStock} {item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Reorder:</span>
                    <span className="font-medium text-[var(--text-primary)]">{item.reorderLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Cost Price:</span>
                    <span className="font-medium">
                      ${(item.costPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Cash Price:</span>
                    <span className="font-medium">
                      ${(item.cashPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  {item.nhisPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">NHIS Price:</span>
                      <span className="font-medium text-green-600">
                        ${item.nhisPrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {user?.role === 'admin' && (
                  <div className="flex gap-2 pt-3 border-t border-[var(--border-color)]">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowTransactionForm(true);
                      }}
                      className="flex-1 py-2 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] text-xs font-medium"
                    >
                      Stock In/Out
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)]"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Line/List View */}
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)]">
              <div className="col-span-4">Item</div>
              <div className="col-span-2 text-center">Stock</div>
              <div className="col-span-2 text-center">Reorder Level</div>
              <div className="col-span-2 text-center">Cost Price</div>
              <div className="col-span-2 text-center">Actions</div>
            </div>
            <div className="divide-y divide-[var(--border-color)]">
              {paginatedItems.map(item => (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-4 p-4 items-center ${
                    isLowStock(item) ? 'bg-[var(--icon-yellow-bg)]' : ''
                  }`}
                >
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isLowStock(item) ? 'bg-[var(--icon-yellow-text)]' : 'bg-[var(--icon-cyan-text)]'
                      }`}>
                        <Package className="w-3 h-3 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)] text-sm">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">
                            {item.category}
                          </span>
                          {isLowStock(item) && (
                            <AlertTriangle className="w-3 h-3 text-[var(--icon-yellow-text)]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`font-bold text-sm ${isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-primary)]'}`}>
                      {item.currentStock} {item.unitOfMeasure}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm text-[var(--text-primary)]">{item.reorderLevel}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-medium">
                      ${(item.costPrice || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    {user?.role === 'admin' && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowTransactionForm(true);
                          }}
                          className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)]"
                          title="Stock In/Out"
                        >
                          <TrendingUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)]"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)]"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {filteredItems.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="text-sm text-[var(--text-secondary)]">
            Page {currentPage} of {totalPages}
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

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  required 
                  placeholder="Name *" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <select 
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                >
                  {['medication', 'consumable', 'equipment', 'supply'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <input 
                  type="text" 
                  required 
                  placeholder="Unit *" 
                  value={formData.unitOfMeasure}
                  onChange={e => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="number" 
                  min="0" 
                  required 
                  placeholder="Reorder Level *"
                  value={formData.reorderLevel} 
                  onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  required 
                  placeholder="Cost Price *"
                  value={formData.costPrice} 
                  onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  required 
                  placeholder="Cash Price *"
                  value={formData.cashPrice} 
                  onChange={e => setFormData({ ...formData, cashPrice: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="NHIS Price"
                  value={formData.nhisPrice} 
                  onChange={e => setFormData({ ...formData, nhisPrice: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  placeholder="Insurance Price"
                  value={formData.insurancePrice} 
                  onChange={e => setFormData({ ...formData, insurancePrice: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
                <input 
                  type="text" 
                  placeholder="Supplier" 
                  value={formData.supplier}
                  onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                  className="px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
              </div>
              
              {/* Insurance Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={formData.isNHISCovered}
                    onChange={e => setFormData({ ...formData, isNHISCovered: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span>NHIS Covered</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={formData.nhisRequiresAuth}
                    onChange={e => setFormData({ ...formData, nhisRequiresAuth: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span>NHIS Requires Authorization</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={formData.isPrivateInsExempted}
                    onChange={e => setFormData({ ...formData, isPrivateInsExempted: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span>Private Insurance Exempted</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input 
                    type="checkbox" 
                    checked={formData.privateInsRequiresAuth}
                    onChange={e => setFormData({ ...formData, privateInsRequiresAuth: e.target.checked })}
                    className="rounded border-[var(--border-color)]"
                  />
                  <span>Private Insurance Requires Auth</span>
                </label>
              </div>
              
              <textarea 
                placeholder="Description" 
                rows={2} 
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
              />
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="px-5 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionForm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-card)] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
              Transaction - {selectedItem.name}
            </h2>
            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <select 
                required 
                value={transactionData.transactionType}
                onChange={e => setTransactionData({ ...transactionData, transactionType: e.target.value as any })}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="purchase">Purchase (Stock In)</option>
                <option value="sale">Sale (Stock Out)</option>
                <option value="adjustment">Adjustment</option>
                <option value="requisition">Requisition</option>
              </select>
              <input 
                type="number" 
                min="1" 
                required 
                placeholder="Quantity *"
                value={transactionData.quantity} 
                onChange={e => setTransactionData({ ...transactionData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
              />
              <input 
                type="text" 
                placeholder="Reference (e.g., PO-123)" 
                value={transactionData.reference}
                onChange={e => setTransactionData({ ...transactionData, reference: e.target.value })}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
              />
              <textarea 
                placeholder="Notes" 
                rows={2} 
                value={transactionData.notes}
                onChange={e => setTransactionData({ ...transactionData, notes: e.target.value })}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
              />
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={handleTransactionCancel}
                  className="px-5 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}