// src/pages/StockManagement.tsx - UPDATED WITH CONSISTENT UI THEME
import { useEffect, useState } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Hospital // ← ADDED HOSPITAL ICON
} from 'lucide-react';

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
  const { addToast } = useToastStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'medication',
    description: '',
    unitOfMeasure: '',
    reorderLevel: 10,
    unitPrice: 0,
    sellingPrice: 0,
    supplier: '',
  });
  const [transactionData, setTransactionData] = useState({
    transactionType: 'stock_in',
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
    } catch (error) {
      addToast('Failed to load stock items', 'error');
    }
  };

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = stockItems.filter(item => item.currentStock <= item.reorderLevel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateStockItem(editingItem._id, formData);
        addToast('Stock item updated successfully', 'success');
      } else {
        await createStockItem(formData);
        addToast('Stock item created successfully', 'success');
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'medication',
        description: '',
        unitOfMeasure: '',
        reorderLevel: 10,
        unitPrice: 0,
        sellingPrice: 0,
        supplier: '',
      });
    } catch (error) {
      addToast('Failed to save stock item', 'error');
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStockTransaction({
        stockItemId: selectedItem._id,
        ...transactionData
      });
      addToast('Stock transaction recorded successfully', 'success');
      setShowTransactionForm(false);
      setSelectedItem(null);
      setTransactionData({
        transactionType: 'stock_in',
        quantity: 0,
        reference: '',
        notes: ''
      });
      loadStockItems();
    } catch (error) {
      addToast('Failed to record transaction', 'error');
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description || '',
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel,
      unitPrice: item.unitPrice,
      sellingPrice: item.sellingPrice,
      supplier: item.supplier || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this stock item?')) {
      try {
        await deleteStockItem(id);
        addToast('Stock item deleted successfully', 'success');
      } catch (error) {
        addToast('Failed to delete stock item', 'error');
      }
    }
  };

  const isLowStock = (item: any) => item.currentStock <= item.reorderLevel;

  return (
    <div className="space-y-8 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Hospital className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Stock Management</h1>
              <p className="text-blue-100 text-lg">Manage inventory and track stock levels</p>
            </div>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-bold text-amber-800 text-lg">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need{lowStockItems.length > 1 ? '' : 's'} restocking
              </p>
              <p className="text-amber-700">
                The following items are below their reorder level: {lowStockItems.map(item => item.name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Search stock items by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
          >
            <option value="all">All Categories</option>
            <option value="medication">Medication</option>
            <option value="consumable">Consumable</option>
            <option value="equipment">Equipment</option>
            <option value="supply">Supply</option>
          </select>
          <button
            onClick={loadStockItems}
            disabled={isLoading}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-semibold"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stock Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-200 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">
            {searchTerm ? 'No stock items found' : 'No stock items yet'}
          </p>
          <p className="text-gray-400 text-sm mb-4">Get started by adding your first stock item</p>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div key={item._id} className={`bg-white rounded-2xl p-6 shadow-sm border ${
              isLowStock(item) ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
            } hover:shadow-md transition-all duration-300`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                    isLowStock(item) 
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                      : 'bg-gradient-to-r from-blue-500 to-teal-500'
                  }`}>
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-900">{item.name}</h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-800 border border-gray-200 mt-2">
                      {item.category}
                    </span>
                  </div>
                </div>
                {isLowStock(item) && (
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                )}
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">Current Stock:</span>
                  </div>
                  <span className={`font-bold text-lg ${
                    isLowStock(item) ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {item.currentStock} {item.unitOfMeasure}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Reorder Level:</span>
                  <span className="font-bold text-gray-900">{item.reorderLevel} {item.unitOfMeasure}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Unit Price:</span>
                  <span className="font-bold text-gray-900">GHS {item.unitPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-medium">Selling Price:</span>
                  <span className="font-bold text-gray-900">GHS {item.sellingPrice?.toFixed(2)}</span>
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowTransactionForm(true);
                    }}
                    className="flex-1 py-3 text-blue-600 border border-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 font-semibold"
                  >
                    Stock In/Out
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-3 text-green-600 border border-green-600 rounded-xl hover:bg-green-50 transition-all duration-200"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-3 text-red-600 border border-red-600 rounded-xl hover:bg-red-50 transition-all duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              {editingItem ? 'Edit Stock Item' : 'Add Stock Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  >
                    <option value="medication">Medication</option>
                    <option value="consumable">Consumable</option>
                    <option value="equipment">Equipment</option>
                    <option value="supply">Supply</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Unit of Measure *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Unit Price (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Selling Price (GHS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                    setFormData({
                      name: '',
                      category: 'medication',
                      description: '',
                      unitOfMeasure: '',
                      reorderLevel: 10,
                      unitPrice: 0,
                      sellingPrice: 0,
                      supplier: '',
                    });
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
                >
                  {editingItem ? 'Update' : 'Create'} Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction Form Modal */}
      {showTransactionForm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Stock Transaction - {selectedItem.name}
            </h2>
            <form onSubmit={handleTransactionSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Transaction Type *
                </label>
                <select
                  required
                  value={transactionData.transactionType}
                  onChange={(e) => setTransactionData({ ...transactionData, transactionType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                >
                  <option value="stock_in">Stock In</option>
                  <option value="stock_out">Stock Out</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transactionData.quantity}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Reference
                </label>
                <input
                  type="text"
                  value={transactionData.reference}
                  onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  placeholder="e.g., PO-12345"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Notes
                </label>
                <textarea
                  value={transactionData.notes}
                  onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base"
                  placeholder="Additional notes about this transaction..."
                />
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransactionForm(false);
                    setSelectedItem(null);
                    setTransactionData({
                      transactionType: 'stock_in',
                      quantity: 0,
                      reference: '',
                      notes: ''
                    });
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:to-teal-700 transition-all duration-200 hover:shadow-lg shadow-md font-semibold"
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
