// src/pages/InvoiceManagement.tsx - COMPLETE UPDATED VERSION WITH SEARCHABLE ITEMS

import { useEffect, useState, useRef } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useWardStore } from '../store/wardStore';
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Eye,
  Filter,
  X,
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
import {
  Button, cn, INPUT, PageHeader, Pagination, SearchInput, SELECT, StatCard,
  TABLE_SHELL, TD, TD_MONO, TD_MUTED, TH, TH_ROW, TR,
} from '../components/ui';

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
  receivedAtWardId?: string;
  receivedAtWard?: { id: string; wardName: string };
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
  const { wards, getWards } = useWardStore();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

const isAdmin = hasRole(['super_admin', 'admin', 'pharmacist']);

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
    receivingLocationType: 'department' as 'department' | 'ward',
    receivedAtDepartmentId: '',
    receivedAtWardId: '',
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
        getDepartments(),
        getWards()
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
        receivedAtDepartmentId: formData.receivingLocationType === 'department' ? (formData.receivedAtDepartmentId || undefined) : undefined,
        receivedAtWardId: formData.receivingLocationType === 'ward' ? (formData.receivedAtWardId || undefined) : undefined,
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
    if (!(await confirmDialog({ title: 'Delete invoice', message: 'Delete this invoice? This will reverse all stock movements.', confirmText: 'Delete' }))) return;
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
      receivingLocationType: invoice.receivedAtWardId ? 'ward' : 'department',
      receivedAtDepartmentId: invoice.receivedAtDepartmentId || '',
      receivedAtWardId: invoice.receivedAtWardId || '',
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
      receivingLocationType: 'department',
      receivedAtDepartmentId: '',
      receivedAtWardId: '',
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
      <PageHeader
        title="Purchase Invoices"
        subtitle="Manage supplier purchases and stock updates"
        icon={FileText}
        accent="yellow"
        onBack={() => navigate(-1)}
        actions={(
          <>
            <Button variant="soft" accent="green" icon={Download} disabled={sortedInvoices.length === 0} onClick={exportToCSV}>
              Export CSV
            </Button>
            <Button icon={RefreshCw} loading={isLoading} onClick={loadData}>Refresh</Button>
            <Button
              variant={showFilters || hasActiveFilters ? 'soft' : 'secondary'}
              accent="cyan"
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-[var(--icon-red-text)] rounded-full"></span>}
            </Button>
            {isAdmin && (
              <Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>
                New Invoice
              </Button>
            )}
          </>
        )}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" icon={FileText} accent="cyan" value={summaryStats.totalInvoices} />
        <StatCard label="Total Spent" size="money" icon={DollarSign} accent="green" value={`$${summaryStats.totalSpent.toFixed(2)}`} />
        <StatCard label="Suppliers" icon={Building} accent="purple" value={summaryStats.uniqueSuppliers} />
        <StatCard label="Items Purchased" icon={Package} accent="yellow" value={summaryStats.totalItems} />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter Invoices
            </h3>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close filters" onClick={() => setShowFilters(false)} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
              <select
                value={supplierFilter}
                onChange={e => setSupplierFilter(e.target.value)}
                className={cn(SELECT, 'w-full')}
              >
                <option value="all">All Suppliers</option>
                {getUniqueSuppliers().map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end gap-2">
              <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Items Per Page */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput
          className="flex-1"
          placeholder="Search by invoice number or supplier..."
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={cn(SELECT)}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>

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
            <Button variant="soft" accent="cyan" icon={X} onClick={clearFilters}>Clear All Filters</Button>
          ) : isAdmin && (
            <Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>Create First Invoice</Button>
          )}
        </div>
      ) : (
        <>
          <div className={TABLE_SHELL}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={TH_ROW}>
                  <tr>
                    <th className={TH}>Invoice #</th>
                    <th className={TH}>Supplier</th>
                    <th className={TH}>Received At</th>
                    <th className={TH}>Date</th>
                    <th className={cn(TH, 'text-right')}>Total Amount</th>
                    <th className={cn(TH, 'text-center')}>Items</th>
                    <th className={TH}>Created By</th>
                    <th className={cn(TH, 'text-center')}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(invoice => (
                    <tr key={invoice.id} className={TR}>
                      <td className={TD_MONO}>{invoice.invoiceNumber}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-primary)]">{invoice.supplierName}</span>
                        </div>
                      </td>
                      <td className={TD_MUTED}>{invoice.receivedAtWard?.wardName || invoice.receivedAtDepartment?.name || '—'}</td>
                      <td className={TD}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                          <span className="text-[var(--text-secondary)]">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className={cn(TD, 'text-right font-bold text-[var(--icon-green-text)]')}>${invoice.totalAmount.toFixed(2)}</td>
                      <td className={cn(TD, 'text-center')}>
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          <Package className="w-3 h-3" />
                          {invoice.InvoiceItem?.length || 0} items
                        </span>
                      </td>
                      <td className={TD_MUTED}>{invoice.User?.fullName || 'Unknown'}</td>
                      <td className={cn(TD, 'text-center')}>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={Eye}
                            className="text-[var(--icon-cyan-text)]"
                            aria-label="View details"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailModal(true);
                            }}
                          />
                          <Button
                            size="xs"
                            variant="ghost"
                            iconOnly
                            icon={Printer}
                            className="text-[var(--icon-purple-text)]"
                            aria-label="Print invoice"
                            onClick={() => printInvoice(invoice)}
                          />
                          {isAdmin && (
                            <>
                              <Button
                                size="xs"
                                variant="ghost"
                                iconOnly
                                icon={Edit}
                                className="text-[var(--icon-yellow-text)]"
                                aria-label="Edit invoice"
                                onClick={() => handleEdit(invoice)}
                              />
                              <Button
                                size="xs"
                                variant="ghost"
                                iconOnly
                                icon={Trash2}
                                className="text-[var(--icon-red-text)]"
                                aria-label="Delete invoice"
                                onClick={() => handleDelete(invoice.id)}
                              />
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

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedInvoices.length}
            noun="invoices"
            onChange={handlePageChange}
          />
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
              <Button
                variant="ghost"
                iconOnly
                icon={X}
                aria-label="Close"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              />
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
                    className={cn(INPUT, 'w-full disabled:opacity-75')} 
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
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Received At Department/Store or Ward *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.receivingLocationType}
                      disabled={!!editingInvoice}
                      onChange={e => setFormData({ ...formData, receivingLocationType: e.target.value as 'department' | 'ward', receivedAtDepartmentId: '', receivedAtWardId: '' })}
                      className={cn(SELECT, 'w-full disabled:opacity-75')}
                    >
                      <option value="department">Department / Store</option>
                      <option value="ward">Ward</option>
                    </select>
                    {formData.receivingLocationType === 'department' ? (
                      <select
                        required
                        disabled={!!editingInvoice}
                        value={formData.receivedAtDepartmentId}
                        onChange={e => setFormData({ ...formData, receivedAtDepartmentId: e.target.value })}
                        className={cn(SELECT, 'w-full disabled:opacity-75')}
                      >
                        <option value="">Select department...</option>
                        {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                      </select>
                    ) : (
                      <select
                        required
                        disabled={!!editingInvoice}
                        value={formData.receivedAtWardId}
                        onChange={e => setFormData({ ...formData, receivedAtWardId: e.target.value })}
                        className={cn(SELECT, 'w-full disabled:opacity-75')}
                      >
                        <option value="">Select ward...</option>
                        {wards.filter(ward => ward.isActive).map(ward => <option key={ward.id} value={ward.id}>{ward.wardName}</option>)}
                      </select>
                    )}
                  </div>
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
                    className={cn(INPUT, 'w-full')} 
                  />
                </div>
              </div>

              {/* Invoice Items with Searchable Select */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">Invoice Items *</h3>
                  {!editingInvoice && (
                    <Button size="sm" variant="outline" icon={Plus} onClick={addInvoiceItem}>
                      Add Item
                    </Button>
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
                          className={cn(INPUT, 'w-full disabled:opacity-75')} 
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
                          className={cn(INPUT, 'w-full disabled:opacity-75')} 
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
                          className={cn(INPUT, 'w-full disabled:opacity-75')} 
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
                            className={cn(INPUT, 'w-full disabled:opacity-75')} 
                          />
                        </div>
                        {!editingInvoice && formData.invoiceItems.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            iconOnly
                            icon={Trash2}
                            aria-label="Remove item"
                            className="text-[var(--icon-red-text)] self-end"
                            onClick={() => removeInvoiceItem(index)}
                          />
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
                    className={cn(INPUT, 'w-full resize-none')} 
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
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="soft"
                  accent="cyan"
                  className="flex-1"
                  disabled={formData.invoiceItems.length === 0}
                >
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </Button>
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
              <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={() => setShowDetailModal(false)} />
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
                    <thead className={TH_ROW}>
                      <tr>
                        <th className={TH}>Item</th>
                        <th className={cn(TH, 'text-center')}>Quantity</th>
                        <th className={cn(TH, 'text-right')}>Unit Cost</th>
                        <th className={cn(TH, 'text-right')}>Total</th>
                        <th className={TH}>Batch #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.InvoiceItem?.map((item, idx) => (
                        <tr key={idx} className={TR}>
                          <td className={cn(TD, 'whitespace-normal')}>{getStockItemName(item.stockItemId)}</td>
                          <td className={cn(TD, 'text-center')}>{item.quantity} {getStockItemUnit(item.stockItemId)}</td>
                          <td className={cn(TD, 'text-right')}>${item.unitCost.toFixed(2)}</td>
                          <td className={cn(TD, 'text-right font-medium text-[var(--icon-green-text)]')}>
                            ${(item.quantity * item.unitCost).toFixed(2)}
                          </td>
                          <td className={TD_MUTED}>{item.batchNumber || '—'}</td>
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
                <Button variant="soft" accent="purple" icon={Printer} onClick={() => printInvoice(selectedInvoice)}>Print</Button>
                <Button variant="soft" accent="cyan" onClick={() => setShowDetailModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}