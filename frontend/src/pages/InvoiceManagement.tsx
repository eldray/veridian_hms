// src/pages/InvoiceManagement.tsx - COMPLETE UPDATED VERSION WITH SEARCHABLE ITEMS

import { useEffect, useState, useRef } from 'react';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDepartmentStore } from '../store/departmentStore';
import { 
  Plus, 
  Search, 
  FileText, 
  Edit, 
  Trash2, 
  RefreshCw,
  ArrowLeft,
  Download,
  Eye,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Printer,
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvoiceItem {
  id?: string;
  stockItemId: string;
  quantity: number;
  unitCost: number;
  batchNumber?: string;
  expiryDate?: string;
  StockItem?: {
    name: string;
    unitOfMeasure: string;
    currentStock: number;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  invoiceDate: string;
  totalAmount: number;
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  InvoiceItem?: InvoiceItem[];
  User?: {
    fullName: string;
  };
  receivedAtDepartmentId?: string;
  receivedAtDepartment?: {
    id: string;
    name: string;
  };
}

// ==========================================
// SEARCHABLE STOCK ITEM SELECT COMPONENT
// ==========================================

interface SearchableStockItemSelectProps {
  value: string;
  onChange: (value: string) => void;
  items: any[];
  placeholder?: string;
}

function SearchableStockItemSelect({ value, onChange, items, placeholder = 'Search for an item...' }: SearchableStockItemSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Update selected label when value changes
  useEffect(() => {
    if (value) {
      const selected = items.find(item => item.id === value);
      if (selected) {
        setSelectedLabel(`${selected.name} (${selected.currentStock} ${selected.unitOfMeasure} available)`);
      } else {
        setSelectedLabel('');
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, items]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (item: any) => {
    onChange(item.id);
    setSelectedLabel(`${item.name} (${item.currentStock} ${item.unitOfMeasure} available)`);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg cursor-pointer flex items-center justify-between hover:border-[var(--icon-cyan-text)] transition-colors"
      >
        <span className={`text-sm ${selectedLabel ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, code, or category..."
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--icon-cyan-text)]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">
              {filteredItems.length} of {items.length} items found
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-[var(--text-tertiary)] text-sm">
                {searchTerm ? 'No matching items found' : 'No items available'}
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = value === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left px-3 py-2 hover:bg-[var(--bg-main)] transition-colors ${
                      isSelected ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">{item.name}</span>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                          <span>Stock: {item.currentStock} {item.unitOfMeasure}</span>
                          {item.drugCode && <span>• Code: {item.drugCode}</span>}
                          {item.category && <span>• {item.category}</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function InvoiceManagement() {
  const {
    purchaseInvoices,
    stockItems,
    getPurchaseInvoices,
    getStockItems,
    createPurchaseInvoice,
    updatePurchaseInvoice,
    deletePurchaseInvoice,
    isLoading
  } = useStockStore();
  const { departments, getDepartments } = useDepartmentStore();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const isAdmin = hasRole(['admin', 'pharmacist']);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    supplierName: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    totalAmount: 0,
    notes: '',
    receivedAtDepartmentId: '',
    invoiceItems: [{
      stockItemId: '',
      quantity: 1,
      unitCost: 0,
      batchNumber: '',
      expiryDate: ''
    }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        getPurchaseInvoices(),
        getStockItems(),
        getDepartments()
      ]);
    } catch (err) {
      console.error('Failed to load data:', err);
      toastError('Load failed', 'Could not load invoice data');
    }
  };

  // Get invoices with fallback
  const invoices = purchaseInvoices || [];

  // Get unique suppliers for filter
  const getUniqueSuppliers = () => {
    const suppliers = new Set(invoices.map(inv => inv.supplierName).filter(Boolean));
    return Array.from(suppliers).sort();
  };

  // Filter invoices with fallback
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = supplierFilter === 'all' || invoice.supplierName === supplierFilter;
    
    return matchesSearch && matchesSupplier;
  });

  // Sort by date descending
  const sortedInvoices = [...filteredInvoices].sort((a, b) => 
    new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime()
  );

  // Pagination calculations
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = sortedInvoices.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one item
    const validItems = formData.invoiceItems.filter(item => item.stockItemId && item.quantity > 0 && item.unitCost > 0);
    if (validItems.length === 0) {
      toastError('Validation', 'Please add at least one valid invoice item');
      return;
    }

    try {
      const submitData = {
        ...formData,
        totalAmount: calculateTotal(),
        receivedAtDepartmentId: formData.receivedAtDepartmentId || undefined,
        invoiceItems: validItems.map(item => ({
          stockItemId: item.stockItemId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate
        }))
      };
      
      if (editingInvoice) {
        await updatePurchaseInvoice(editingInvoice.id, submitData);
        success('Updated', 'Invoice updated successfully');
      } else {
        await createPurchaseInvoice(submitData);
        success('Created', 'Invoice created and stock updated');
      }
      
      setShowForm(false);
      setEditingInvoice(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Failed to save invoice:', err);
      toastError('Save failed', err.message || 'Could not save invoice');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this invoice? This will reverse all stock movements.')) return;
    try {
      await deletePurchaseInvoice(id);
      success('Deleted', 'Invoice deleted and stock reversed');
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete invoice:', err);
      toastError('Delete failed', err.message || 'Could not delete invoice');
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoiceNumber: invoice.invoiceNumber,
      supplierName: invoice.supplierName,
      invoiceDate: invoice.invoiceDate.split('T')[0],
      totalAmount: invoice.totalAmount,
      notes: invoice.notes || '',
      receivedAtDepartmentId: invoice.receivedAtDepartmentId || '',
      invoiceItems: invoice.InvoiceItem?.map(item => ({
        stockItemId: item.stockItemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : ''
      })) || [{
        stockItemId: '',
        quantity: 1,
        unitCost: 0,
        batchNumber: '',
        expiryDate: ''
      }]
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      supplierName: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      totalAmount: 0,
      notes: '',
      receivedAtDepartmentId: '',
      invoiceItems: [{
        stockItemId: '',
        quantity: 1,
        unitCost: 0,
        batchNumber: '',
        expiryDate: ''
      }]
    });
    setEditingInvoice(null);
  };

  const addInvoiceItem = () => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: [
        ...prev.invoiceItems,
        {
          stockItemId: '',
          quantity: 1,
          unitCost: 0,
          batchNumber: '',
          expiryDate: ''
        }
      ]
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      invoiceItems: prev.invoiceItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
    // Auto-update total
    setFormData(prev => ({
      ...prev,
      totalAmount: calculateTotalWithItems(prev.invoiceItems.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ))
    }));
  };

  const calculateTotalWithItems = (items: any[]) => {
    return items.reduce((total, item) => 
      total + (item.quantity * item.unitCost), 0
    );
  };

  const calculateTotal = () => {
    return calculateTotalWithItems(formData.invoiceItems);
  };

  const getStockItemName = (id: string) => {
    const item = stockItems.find(i => i.id === id);
    return item?.name || 'Unknown Item';
  };

  const getStockItemUnit = (id: string) => {
    const item = stockItems.find(i => i.id === id);
    return item?.unitOfMeasure || 'unit';
  };

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Supplier', 'Date', 'Total Amount', 'Items Count', 'Created By'];
    const csvData = sortedInvoices.map(inv => [
      inv.invoiceNumber,
      inv.supplierName,
      new Date(inv.invoiceDate).toLocaleDateString(),
      inv.totalAmount.toFixed(2),
      inv.InvoiceItem?.length || 0,
      inv.User?.fullName || 'Unknown'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    success('Exported', `${sortedInvoices.length} invoices exported to CSV`);
  };

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const itemsHtml = invoice.InvoiceItem?.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${getStockItemName(item.stockItemId)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.unitCost.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.unitCost).toFixed(2)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 8px; text-align: center;">No items</td></tr>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .total { margin-top: 20px; text-align: right; font-size: 18px; font-weight: bold; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PURCHASE INVOICE</h1>
        </div>
        <div class="invoice-details">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Supplier:</strong> ${invoice.supplierName}</p>
          <p><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString()}</p>
          ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="total">
          Total Amount: $${invoice.totalAmount.toFixed(2)}
        </div>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSupplierFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || supplierFilter !== 'all';

  // Calculate summary stats with fallback
  const summaryStats = {
    totalInvoices: invoices?.length || 0,
    totalSpent: invoices?.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0) || 0,
    uniqueSuppliers: getUniqueSuppliers().length,
    totalItems: invoices?.reduce((sum, inv) => sum + (inv.InvoiceItem?.length || 0), 0) || 0
  };

  // Filter active items for dropdown
  const activeStockItems = stockItems.filter(item => item.isActive);

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
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Purchase Invoices</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage supplier purchases and stock updates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportToCSV}
            disabled={sortedInvoices.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] rounded-lg hover:bg-[var(--icon-green-text)] hover:text-white disabled:opacity-50 transition-all text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] disabled:opacity-50 transition-all text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
              showFilters || hasActiveFilters
                ? 'bg-[var(--icon-cyan-text)] text-white' 
                : 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total Invoices</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{summaryStats.totalInvoices}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-green-bg)] rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[var(--icon-green-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Total Spent</p>
              <p className="text-xl font-bold text-[var(--icon-green-text)]">
                ${summaryStats.totalSpent.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-purple-bg)] rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Suppliers</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{summaryStats.uniqueSuppliers}</p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--icon-yellow-bg)] rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-[var(--icon-yellow-text)]" />
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Items Purchased</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{summaryStats.totalItems}</p>
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
              Filter Invoices
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-1 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
              >
                <option value="all">All Suppliers</option>
                {getUniqueSuppliers().map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
              >
                Clear Filters
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
            placeholder="Search by invoice number or supplier..."
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
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

      {/* Results Count */}
      {sortedInvoices.length > 0 && (
        <div className="text-sm text-[var(--text-secondary)]">
          Showing {startIndex + 1} to {Math.min(endIndex, sortedInvoices.length)} of {sortedInvoices.length} invoices
        </div>
      )}

      {/* Invoices Table */}
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
              </div>
            </div>
          ))}
        </div>
      ) : sortedInvoices.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Invoices Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            {hasActiveFilters
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by creating your first purchase invoice'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          ) : isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create First Invoice
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Invoice #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Received At</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {paginatedInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-[var(--bg-main)] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium text-[var(--text-primary)]">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-primary)]">{invoice.supplierName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {invoice.receivedAtDepartment?.name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-sm text-[var(--text-secondary)]">
                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-[var(--icon-green-text)]">
                          ${invoice.totalAmount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          <Package className="w-3 h-3" />
                          {invoice.InvoiceItem?.length || 0} items
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {invoice.User?.fullName || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailModal(true);
                            }}
                            className="p-1.5 text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => printInvoice(invoice)}
                            className="p-1.5 text-[var(--icon-purple-text)] border border-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-bg)] transition-colors"
                            title="Print"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleEdit(invoice)}
                                className="p-1.5 text-[var(--icon-yellow-text)] border border-[var(--icon-yellow-text)] rounded-lg hover:bg-[var(--icon-yellow-bg)] transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="p-1.5 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Create/Edit Invoice Modal with Searchable Items */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => {
          setShowForm(false);
          resetForm();
        }}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {editingInvoice ? 'Edit Invoice' : 'Create Purchase Invoice'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Invoice Number *
                  </label>
                  <input 
                    type="text" 
                    required 
                    disabled={!!editingInvoice}
                    placeholder="INV-001"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Supplier Name *
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Supplier Name"
                    value={formData.supplierName}
                    onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Received At Department/Store *
                  </label>
                  <select
                    required
                    disabled={!!editingInvoice}
                    value={formData.receivedAtDepartmentId}
                    onChange={e => setFormData({ ...formData, receivedAtDepartmentId: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]"
                  >
                    <option value="">Select department...</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Invoice Date *
                  </label>
                  <input 
                    type="date" 
                    required 
                    value={formData.invoiceDate}
                    onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm" 
                  />
                </div>
              </div>

              {/* Invoice Items with Searchable Select */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">Invoice Items *</h3>
                  {!editingInvoice && (
                    <button
                      type="button"
                      onClick={addInvoiceItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--icon-cyan-text)] border border-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-bg)] transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      Add Item
                    </button>
                  )}
                </div>

                {editingInvoice && (
                  <div className="mb-4 flex items-start gap-2.5 p-3 bg-[var(--icon-yellow-bg)]/20 border border-[var(--icon-yellow-bg)]/30 rounded-lg text-xs text-[var(--text-secondary)]">
                    <AlertCircle className="w-4.5 h-4.5 text-[var(--icon-yellow-text)] shrink-0 mt-0.5" />
                    <span>
                      Items cannot be modified after an invoice is created to preserve stock logs. To change items, please close this form, delete the invoice, and create a new one.
                    </span>
                  </div>
                )}
                
                <div className="space-y-3">
                  {formData.invoiceItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)]">
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Stock Item *
                        </label>
                        {/* ✅ SEARCHABLE SELECT */}
                        {editingInvoice ? (
                          <div className="w-full px-3 py-2 bg-[var(--bg-main)] rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] text-sm font-medium">
                            {getStockItemName(item.stockItemId)}
                          </div>
                        ) : (
                          <SearchableStockItemSelect
                            value={item.stockItemId}
                            onChange={(value) => updateInvoiceItem(index, 'stockItemId', value)}
                            items={activeStockItems}
                            placeholder="Search for an item..."
                          />
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Quantity *
                        </label>
                        <input 
                          type="number" 
                          min="1" 
                          required 
                          disabled={!!editingInvoice}
                          value={item.quantity}
                          onChange={e => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]" 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Unit Cost ($) *
                        </label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          required 
                          disabled={!!editingInvoice}
                          value={item.unitCost}
                          onChange={e => updateInvoiceItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]" 
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                          Batch Number
                        </label>
                        <input 
                          type="text" 
                          placeholder="Optional"
                          disabled={!!editingInvoice}
                          value={item.batchNumber}
                          onChange={e => updateInvoiceItem(index, 'batchNumber', e.target.value)}
                          className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]" 
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                            Expiry Date
                          </label>
                          <input 
                            type="date" 
                            disabled={!!editingInvoice}
                            value={item.expiryDate}
                            onChange={e => updateInvoiceItem(index, 'expiryDate', e.target.value)}
                            className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[var(--bg-main)]" 
                          />
                        </div>
                        {!editingInvoice && formData.invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(index)}
                            className="p-2 text-[var(--icon-red-text)] border border-[var(--icon-red-text)] rounded-lg hover:bg-[var(--icon-red-bg)] transition-colors self-end"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {formData.invoiceItems.length === 0 && (
                  <div className="text-center py-6 text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color)] rounded-lg">
                    <Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />
                    Click "Add Item" to add items to this invoice
                  </div>
                )}
              </div>

              {/* Total and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Notes
                  </label>
                  <textarea 
                    placeholder="Additional notes about this invoice..."
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm resize-none" 
                  />
                </div>
                <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Subtotal:</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                    <span className="text-base font-bold text-[var(--text-primary)]">Total:</span>
                    <span className="text-xl font-bold text-[var(--icon-cyan-text)]">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[var(--border-color)]">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-main)] transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formData.invoiceItems.length === 0}
                  className="flex-1 px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Invoice Details</h2>
                <p className="text-xs text-[var(--text-secondary)] font-mono">{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Supplier</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{selectedInvoice.supplierName}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Received At Department</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{selectedInvoice.receivedAtDepartment?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Invoice Date</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Created By</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{selectedInvoice.User?.fullName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)]">Created At</p>
                  <p className="text-sm text-[var(--text-primary)] mt-0.5">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Invoice Items</h3>
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-main)]">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-[var(--text-secondary)]">Item</th>
                        <th className="px-4 py-2 text-center text-xs text-[var(--text-secondary)]">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs text-[var(--text-secondary)]">Unit Cost</th>
                        <th className="px-4 py-2 text-right text-xs text-[var(--text-secondary)]">Total</th>
                        <th className="px-4 py-2 text-left text-xs text-[var(--text-secondary)]">Batch #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {selectedInvoice.InvoiceItem?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-[var(--text-primary)]">{getStockItemName(item.stockItemId)}</td>
                          <td className="px-4 py-2 text-center text-[var(--text-primary)]">{item.quantity} {getStockItemUnit(item.stockItemId)}</td>
                          <td className="px-4 py-2 text-right text-[var(--text-primary)]">${item.unitCost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-medium text-[var(--icon-green-text)]">
                            ${(item.quantity * item.unitCost).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-[var(--text-secondary)]">{item.batchNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)]">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right font-bold text-[var(--text-primary)]">Total:</td>
                        <td className="px-4 py-2 text-right font-bold text-[var(--icon-green-text)]">
                          ${selectedInvoice.totalAmount.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</h3>
                  <div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)]">{selectedInvoice.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <button
                  onClick={() => printInvoice(selectedInvoice)}
                  className="px-5 py-2.5 bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] rounded-lg hover:bg-[var(--icon-purple-text)] hover:text-white transition-all text-sm font-medium"
                >
                  <Printer className="w-4 h-4 inline mr-2" />
                  Print
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2.5 bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] rounded-lg hover:bg-[var(--icon-cyan-text)] hover:text-white transition-all text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}