// src/pages/Pharmacy.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { StockItem } from '../types/api';
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  Calendar, 
  Hospital, 
  ChevronLeft, 
  ChevronRight,
  Warehouse 
} from 'lucide-react';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const { stockItems, getLowStockItems, getExpiringItems, getStockItems } = useStockStore();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    getStockItems().catch(() => {
      toastError('Load failed', 'Could not fetch stock items');
    });
  }, [getStockItems]);

  // Filter items
  const filteredItems = searchQuery
    ? stockItems.filter((item: StockItem) =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stockItems;

  // Pagination
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

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const Pagination = () => {
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-5 py-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
        <p className="text-sm text-[var(--text-secondary)] mb-2 sm:mb-0">
          Showing <span className="font-semibold">{indexOfFirstItem + 1}</span> to{' '}
          <span className="font-semibold">{Math.min(indexOfLastItem, filteredItems.length)}</span> of{' '}
          <span className="font-semibold">{filteredItems.length}</span> results
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? 'bg-[var(--icon-cyan-text)] text-white'
                  : 'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-main)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Pharmacy & Stock</h1>
          <p className="text-[var(--text-secondary)] text-sm">Manage medications and inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/stock"
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm text-[var(--text-primary)]"
          >
            <Warehouse className="w-4 h-4" />
            Manage Stock
          </Link>
          {canManageStock && (
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Total Items</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Medications</span>
          </div>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.medications}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-red-bg)] rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)]" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Low Stock</span>
          </div>
          <p className="text-2xl font-bold text-[var(--icon-red-text)]">{stats.lowStock}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            </div>
            <span className="text-[var(--text-secondary)] text-sm font-medium">Expiring Soon</span>
          </div>
          <p className="text-2xl font-bold text-[var(--icon-yellow-text)]">{stats.expiring}</p>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="space-y-3">
          {lowStockItems.length > 0 && (
            <div className="bg-[var(--icon-red-bg)] border border-[var(--icon-red-text)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[var(--icon-red-text)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[var(--icon-red-text)] text-sm mb-1">Low Stock Alert</h3>
                  <p className="text-[var(--icon-red-text)] text-xs">
                    {lowStockItems.length} item(s) below reorder level
                  </p>
                </div>
              </div>
            </div>
          )}
          {expiringItems.length > 0 && (
            <div className="bg-[var(--icon-yellow-bg)] border border-[var(--icon-yellow-text)] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[var(--icon-yellow-text)] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-[var(--icon-yellow-text)] text-sm mb-1">Expiry Alert</h3>
                  <p className="text-[var(--icon-yellow-text)] text-xs">
                    {expiringItems.length} item(s) expiring within 30 days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, category, or description..."
            className="w-full pl-10 pr-4 py-2.5 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
          />
        </div>
      </div>

      {/* Stock Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-8 text-center shadow-sm border border-[var(--border-color)]">
          <Package className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
          <p className="text-[var(--text-secondary)] text-sm mb-1">
            {searchQuery ? 'No items found' : 'No stock items yet'}
          </p>
          {canManageStock && !searchQuery && (
            <button className="inline-flex items-center gap-2 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 font-medium text-sm transition-colors">
              Add your first item
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                <tr>
                  {['Item Name', 'Category', 'Current Stock', 'Reorder Level', 'Unit Price', 'Expiry Date', 'Status'].map(header => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {currentItems.map((item: StockItem) => {
                  const isLowStock = item.currentStock <= item.reorderLevel;
                  const isExpiringSoon = item.expiryDate && new Date(item.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                  return (
                    <tr key={item._id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">{item.category}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`font-bold ${isLowStock ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-primary)]'}`}>
                          {item.currentStock} {item.unitOfMeasure}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {item.reorderLevel} {item.unitOfMeasure}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                        ${item.sellingPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.expiryDate ? (
                          <span className={`font-medium ${isExpiringSoon ? 'text-[var(--icon-yellow-text)]' : 'text-[var(--text-secondary)]'}`}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isLowStock ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-[var(--icon-red-bg)] text-[var(--icon-red-text)] border border-[var(--icon-red-text)]">
                            Low Stock
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)]">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] border border-[var(--icon-green-text)]">
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
          {totalPages > 1 && <Pagination />}
        </div>
      )}
    </div>
  );
}