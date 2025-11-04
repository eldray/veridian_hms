// src/pages/Pharmacy.tsx
import { useState, useEffect } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { StockItem, StockCategory, TransactionType } from '../types/api';
import { Search, Plus, Package, AlertTriangle, Calendar, Hospital, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pharmacy() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  
  const { stockItems, getLowStockItems, getExpiringItems, getStockItems } = useStockStore();
  const { hasRole, user } = useAuthStore();

  useEffect(() => {
    getStockItems();
  }, [getStockItems]);

  // Filter items based on search query
  const filteredItems = searchQuery
    ? stockItems.filter((item: StockItem) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stockItems;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const lowStockItems = getLowStockItems();
  const expiringItems = getExpiringItems(30);

  const canManageStock = hasRole(['admin', 'pharmacist']);

  const stats = {
    total: stockItems.length,
    medications: stockItems.filter((i: StockItem) => i.category === 'medication').length,
    lowStock: lowStockItems.length,
    expiring: expiringItems.length,
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const Pagination = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
        <div className="text-sm text-gray-700">
          Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{' '}
          <span className="font-semibold">
            {Math.min(indexOfLastItem, filteredItems.length)}
          </span>{' '}
          of <span className="font-semibold">{filteredItems.length}</span> results
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => handlePageChange(number)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                currentPage === number
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {number}
            </button>
          ))}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

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
              <h1 className="text-3xl font-bold mb-2">Pharmacy & Stock Management</h1>
              <p className="text-blue-100 text-lg">Manage medications and inventory</p>
            </div>
          </div>
          {canManageStock && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-all duration-200 border border-white/20 font-semibold"
            >
              <Plus className="w-5 h-5" />
              <span>Add Stock Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Total Items</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Medications</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.medications}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Low Stock</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.lowStock}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-gray-600 text-sm font-medium">Expiring Soon</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.expiring}</p>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="space-y-4">
          {lowStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-red-900 text-lg mb-2">Low Stock Alert</h3>
                  <p className="text-red-800">
                    {lowStockItems.length} item(s) below reorder level
                  </p>
                </div>
              </div>
            </div>
          )}

          {expiringItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <Calendar className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-900 text-lg mb-2">Expiry Alert</h3>
                  <p className="text-amber-800">
                    {expiringItems.length} item(s) expiring within 30 days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stock items by name, category, or description..."
            className="w-full pl-12 pr-4 py-4 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
          />
        </div>
      </div>

      {/* Stock Items */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">
            {searchQuery ? 'No items found' : 'No stock items yet'}
          </p>
          {canManageStock && !searchQuery && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-lg transition-colors"
            >
              Add your first stock item
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Reorder Level
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Expiry Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((item: StockItem) => {
                  const isLowStock = item.currentStock <= item.reorderLevel;
                  const isExpiringSoon =
                    item.expiryDate &&
                    new Date(item.expiryDate) <=
                      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`font-bold text-lg ${
                            isLowStock ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {item.currentStock} {item.unitOfMeasure}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.reorderLevel} {item.unitOfMeasure}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        ${item.sellingPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {item.expiryDate ? (
                          <span
                            className={`font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}`}
                          >
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLowStock ? (
                          <span className="px-3 py-2 text-sm font-bold rounded-full bg-red-100 text-red-800 border border-red-200">
                            Low Stock
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-3 py-2 text-sm font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="px-3 py-2 text-sm font-bold rounded-full bg-green-100 text-green-800 border border-green-200">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && <Pagination />}
        </div>
      )}
    </div>
  );
}
