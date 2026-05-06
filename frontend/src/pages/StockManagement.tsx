// src/pages/StockManagement.tsx - FULLY FIXED VERSION
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
  Calendar,
  Grid,
  List,
  ArrowLeft,
  X,
  CheckCircle,
  Clock
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
    getLowStockItems,
    lowStockAlerts,
    isLoading
  } = useStockStore();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  // State for search, filters, and forms
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, low-stock, in-stock
  const [showForm, setShowForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  // State for pagination and view mode
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [viewMode, setViewMode] = useState<'grid' | 'line'>('grid');

  const isAdmin = hasRole(['admin', 'pharmacist']);

  // Form data aligned with StockItem schema
  const [formData, setFormData] = useState({
    name: '',
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

  // Transaction data aligned with StockTransaction schema
  const [transactionData, setTransactionData] = useState({
    transactionType: 'purchase' as 'purchase' | 'adjustment' | 'requisition' | 'sale',
    quantity: 0,
    reference: '',
    notes: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.all([
        getStockItems(),
        getLowStockItems()
      ]);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to load stock data:', err);
      toastError('Load failed', 'Could not load stock data');
    }
  };

  const loadStockItems = async () => {
    try {
      await getStockItems();
    } catch {
      toastError('Load failed', 'Could not load stock items');
    }
  };

  // Get unique categories from stock items
  const getUniqueCategories = () => {
    const categories = new Set(stockItems.map(item => item.category).filter(Boolean));
    return Array.from(categories).sort();
  };

  // Apply filters
  const filteredItems = stockItems.filter(item => {
    // Search filter
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (item.drugCode?.toLowerCase().includes(searchTerm.toLowerCase()));
    
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
      const submitData = {
        ...formData,
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
      toastError('Save failed', err.message || 'Could not save stock item');
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await createStockTransaction({
        stockItemId: selectedItem.id,
        ...transactionData
      });
      success('Recorded', 'Transaction completed successfully');
      setShowTransactionForm(false);
      setSelectedItem(null);
      resetTransactionForm();
      await loadAllData();
    } catch (err: any) {
      toastError('Transaction failed', err.message || 'Could not record transaction');
    }
  };

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
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
    if (!window.confirm('Delete this item? This action cannot be undone.')) return;
    try {
      await deleteStockItem(id);
      success('Deleted', 'Item removed successfully');
      await loadAllData();
    } catch (err: any) {
      toastError('Delete failed', err.message || 'Could not delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
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
  
  const getStockStatusBadge = (item: StockItem) => {
    if (item.currentStock === 0) {
      return { label: 'OUT OF STOCK', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    }
    if (isLowStock(item)) {
      return { label: 'LOW STOCK', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
    return { label: 'IN STOCK', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-main)] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Stock Management</h1>
            <p className="text-sm text-[var(--text-secondary)]">Track inventory and manage stock levels</p>
          </div>
        </div>
        
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
          
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Items</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stockItems.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Low Stock Items</p>
              <p className="text-2xl font-bold text-[var(--icon-yellow-text)]">{lowStockItems.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-yellow-bg)] flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Categories</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{getUniqueCategories().length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-purple-bg)] flex items-center justify-center">
              <Grid className="w-5 h-5 text-[var(--icon-purple-text)]" />
            </div>
          </div>
        </div>
        
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Value</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">
                ${stockItems.reduce((sum, item) => sum + (item.costPrice * item.currentStock), 0).toFixed(0)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[var(--icon-green-bg)] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
          </div>
        </div>
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
            <button
              onClick={() => setFilterStatus('low-stock')}
              className="ml-auto px-3 py-1 text-xs font-medium text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-text)] hover:text-white transition-all"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* Search, Filters & Controls */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, description, or code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
            />
          </div>
          
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm min-w-[140px]"
          >
            <option value="all">All Categories</option>
            {getUniqueCategories().map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm min-w-[130px]"
          >
            <option value="all">All Status</option>
            <option value="low-stock">Low Stock</option>
            <option value="in-stock">In Stock</option>
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
            onClick={loadAllData}
            disabled={isLoading}
            className="px-4 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Items Per Page Selector */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-color)]">
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
              <option value={48}>48</option>
            </select>
            <span>per page</span>
          </div>

          {/* Results Count */}
          <div className="text-sm text-[var(--text-secondary)]">
            Showing {filteredItems.length === 0 ? 0 : startIndex + 1}-
            {Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
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
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center shadow-sm border border-[var(--border-color)]">
          <Package className="w-16 h-16 text-[var(--text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No items found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first stock item'}
          </p>
          {isAdmin && !searchTerm && filterCategory === 'all' && filterStatus === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Item
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedItems.map(item => {
            const statusBadge = getStockStatusBadge(item);
            return (
              <div
                key={item.id}
                className={`bg-[var(--bg-card)] rounded-xl border transition-all hover:shadow-md ${
                  isLowStock(item) ? 'border-[var(--icon-yellow-text)]' : 'border-[var(--border-color)]'
                }`}
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
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-secondary)]">Current Stock:</span>
                      <span className={`font-bold ${isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-primary)]'}`}>
                        {item.currentStock} {item.unitOfMeasure}
                      </span>
                    </div>
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
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowTransactionForm(true);
                        }}
                        className="flex-1 py-2 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all text-xs font-medium"
                      >
                        Stock In/Out
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)] transition-all"
                        title="Edit"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-main)]">
            <div className="col-span-4">Item</div>
            <div className="col-span-2 text-center">Category</div>
            <div className="col-span-2 text-center">Current Stock</div>
            <div className="col-span-1 text-center">Reorder</div>
            <div className="col-span-1 text-center">Cost</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>
          <div className="divide-y divide-[var(--border-color)]">
            {paginatedItems.map(item => {
              const statusBadge = getStockStatusBadge(item);
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                    isLowStock(item) ? 'bg-[var(--icon-yellow-bg)]' : ''
                  }`}
                >
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isLowStock(item) ? 'bg-[var(--icon-yellow-bg)]' : 'bg-[var(--icon-cyan-bg)]'
                      }`}>
                        <Package className={`w-3.5 h-3.5 ${
                          isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--icon-cyan-text)]'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)] text-sm">{item.name}</p>
                        {item.strength && (
                          <p className="text-xs text-[var(--text-tertiary)]">{item.strength}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--bg-main)] text-[var(--text-secondary)]">
                      {item.category}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`font-medium text-sm ${isLowStock(item) ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-primary)]'}`}>
                      {item.currentStock}
                    </span>
                    <span className="text-xs text-[var(--text-tertiary)] ml-1">{item.unitOfMeasure}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm text-[var(--text-primary)]">{item.reorderLevel}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-medium">₵{(item.costPrice || 0).toFixed(2)}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    {isAdmin && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowTransactionForm(true);
                          }}
                          className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all"
                          title="Stock In/Out"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-[var(--icon-green-text)] border border-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-bg)] transition-all"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                  className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-all ${
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

      {/* Add/Edit Modal - Updated with all schema fields */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={handleCancel}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
              </h2>
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
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
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                  >
                    <option value="medication">Medication</option>
                    <option value="consumable">Consumable</option>
                    <option value="equipment">Equipment</option>
                    <option value="supply">Supply</option>
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
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Strength</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 500mg, 10ml"
                    value={formData.strength}
                    onChange={e => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
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
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
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
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
                  <input 
                    type="text" 
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Batch Number</label>
                  <input 
                    type="text" 
                    placeholder="Batch/Lot number"
                    value={formData.batchNumber}
                    onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Expiry Date</label>
                  <input 
                    type="date" 
                    value={formData.expiryDate}
                    onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
                <textarea 
                  rows={3} 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none" 
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
                <button 
                  type="button" 
                  onClick={handleCancel}
                  className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </button>
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
              <button
                onClick={handleTransactionCancel}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
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
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                >
                  <option value="purchase">Purchase (Add Stock)</option>
                  <option value="sale">Sale (Remove Stock)</option>
                  <option value="adjustment">Adjustment (Manual)</option>
                  <option value="requisition">Requisition (Remove Stock)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Quantity *</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={transactionData.quantity} 
                  onChange={e => setTransactionData({ ...transactionData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reference (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g., PO-123, INV-456"
                  value={transactionData.reference}
                  onChange={e => setTransactionData({ ...transactionData, reference: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label>
                <textarea 
                  rows={2} 
                  value={transactionData.notes}
                  onChange={e => setTransactionData({ ...transactionData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none" 
                  placeholder="Optional notes"
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={handleTransactionCancel}
                  className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white text-sm font-medium"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}