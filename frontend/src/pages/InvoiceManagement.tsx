import { useSmartBack } from '../utils/useSmartBack';
// src/pages/InvoiceManagement.tsx - COMPLETE UPDATED VERSION WITH SEARCHABLE ITEMS
// Consistency fixes vs pasted version:
//  - Pagination: always rendered in one place (was only inside the non-empty branch),
//    totalPages never 0, safePage clamps so filtering can't strand you on an empty page.
//  - Created By: resolved from createdById via useUserStore when User is not embedded
//    (same id-instead-of-name bug as StockTransactions) + titleCase names.
//  - Detail modal: Received At shows Ward OR Department (was Department only).
//  - Search also matches the resolved creator name.
// Searchable item picker, form, print, export and store calls preserved.
import { useEffect, useState, useRef, useMemo } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useDepartmentStore } from '../store/departmentStore';
import { useWardStore } from '../store/wardStore';
import { useUserStore } from '../store/userStore';
import {
  Plus, Search, FileText, Edit, Trash2, RefreshCw, Download, Eye, Filter, X, Package,
  Building, Calendar, DollarSign, AlertCircle, CheckCircle, Printer, ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Button, cn, INPUT, PageHeader, Pagination, SearchInput, SELECT, StatCard,
  TABLE_SHELL, TD, TD_MONO, TD_MUTED, TH, TH_ROW, TR,
} from '../components/ui';

const getLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const getDefaultInvoiceDateRange = () => {
  const today = new Date();
  return {
    startDate: getLocalDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: getLocalDateInputValue(today),
  };
};

const titleCase = (s: any) => String(s ?? '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).trim();

interface InvoiceItem { id?: string; stockItemId: string; quantity: number; unitCost: number; batchNumber?: string; expiryDate?: string; StockItem?: { name: string; unitOfMeasure: string; currentStock: number }; }
interface Invoice {
  id: string; invoiceNumber: string; supplierName: string; invoiceDate: string; totalAmount: number; notes?: string;
  createdById: string; createdAt: string; updatedAt: string; InvoiceItem?: InvoiceItem[];
  User?: { fullName: string }; receivedAtDepartmentId?: string; receivedAtDepartment?: { id: string; name: string };
  receivedAtWardId?: string; receivedAtWard?: { id: string; wardName: string };
}

interface SearchableStockItemSelectProps { value: string; onChange: (value: string) => void; items: any[]; placeholder?: string; }

function SearchableStockItemSelect({ value, onChange, items, placeholder = 'Search for an item...' }: SearchableStockItemSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value) { const selected = items.find(item => item.id === value); setSelectedLabel(selected ? `${selected.name} (${selected.currentStock} ${selected.unitOfMeasure} available)` : ''); }
    else setSelectedLabel('');
  }, [value, items]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) { if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false); }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.drugCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleSelect = (item: any) => { onChange(item.id); setSelectedLabel(`${item.name} (${item.currentStock} ${item.unitOfMeasure} available)`); setIsOpen(false); setSearchTerm(''); };
  return (
    <div ref={wrapperRef} className="relative w-full">
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg cursor-pointer flex items-center justify-between hover:border-[var(--icon-cyan-text)] transition-colors">
        <span className={`text-sm ${selectedLabel ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>{selectedLabel || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[var(--border-color)]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name, code, or category..." className="w-full pl-10 pr-4 py-2 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--icon-cyan-text)]" autoFocus onClick={(e) => e.stopPropagation()} />
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{filteredItems.length} of {items.length} items found</div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-[var(--text-tertiary)] text-sm">{searchTerm ? 'No matching items found' : 'No items available'}</div>
            ) : filteredItems.map((item) => {
              const isSelected = value === item.id;
              return (
                <button key={item.id} onClick={() => handleSelect(item)} className={`w-full text-left px-3 py-2 hover:bg-[var(--bg-main)] transition-colors ${isSelected ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{item.name}</span>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        <span>Stock: {item.currentStock} {item.unitOfMeasure}</span>
                        {item.drugCode && <span>• Code: {item.drugCode}</span>}
                        {item.category && <span>• {item.category}</span>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-[var(--icon-cyan-text)]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoiceManagement() {
  const goBack = useSmartBack('/dashboard/stock');
  const { purchaseInvoices, stockItems, getPurchaseInvoices, getStockItems, createPurchaseInvoice, updatePurchaseInvoice, deletePurchaseInvoice, isLoading } = useStockStore();
  const { departments, getDepartments } = useDepartmentStore();
  const { wards, getWards } = useWardStore();
  const { hasRole } = useAuthStore();
  const { users, getAllUsers } = useUserStore();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  // Match API permissions: Pharmacy/Admin may create or edit; only Admin may delete.
  const canManageInvoices = hasRole(['super_admin', 'admin', 'pharmacist']);
  const canDeleteInvoices = hasRole(['super_admin', 'admin']);
  const canViewStaffDirectory = hasRole(['super_admin', 'admin', 'hr_officer']);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [invoiceDateRange, setInvoiceDateRange] = useState(getDefaultInvoiceDateRange);
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    invoiceNumber: '', supplierName: '', invoiceDate: new Date().toISOString().split('T')[0], totalAmount: 0, notes: '',
    receivingLocationType: 'department' as 'department' | 'ward', receivedAtDepartmentId: '', receivedAtWardId: '',
    invoiceItems: [{ stockItemId: '', quantity: 1, unitCost: 0, batchNumber: '', expiryDate: '' }],
  });

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      // Pharmacy and Records can read purchase invoices but are not allowed to
      // browse the staff directory. Do not make invoice loading depend on that
      // separately protected HR endpoint.
      const requests = [getPurchaseInvoices(), getStockItems(), getDepartments(), getWards()];
      if (canViewStaffDirectory) requests.push(getAllUsers());
      await Promise.all(requests);
    } catch (err) {
      console.error('Failed to load purchase invoice data:', err);
      toastError('Load failed', 'Could not load purchase invoice data');
    }
  };

  // Created By — resolve id to name when User is not embedded.
  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    (users || []).forEach((u: any) => { if (u?.id) m.set(String(u.id), (u.fullName || u.name || '').trim()); });
    return m;
  }, [users]);
  const getCreator = (inv: Invoice) => {
    const embedded = (inv.User?.fullName || '').trim();
    if (embedded) return titleCase(embedded);
    const resolved = inv.createdById ? userNameById.get(String(inv.createdById)) : undefined;
    return resolved ? titleCase(resolved) : 'Unknown';
  };

  const invoices = purchaseInvoices || [];
  const getUniqueSuppliers = () => { const suppliers = new Set(invoices.map(inv => inv.supplierName).filter(Boolean)); return Array.from(suppliers).sort(); };
  const dateFilteredInvoices = invoices.filter(invoice => {
    // Invoice dates are calendar dates; compare their YYYY-MM-DD portion to avoid
    // timezone shifts moving an invoice into the previous/next day.
    const invoiceDate = String(invoice.invoiceDate || '').slice(0, 10);
    return (!invoiceDateRange.startDate || invoiceDate >= invoiceDateRange.startDate) &&
      (!invoiceDateRange.endDate || invoiceDate <= invoiceDateRange.endDate);
  });
  const filteredInvoices = dateFilteredInvoices.filter(invoice => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      invoice.invoiceNumber?.toLowerCase().includes(q) ||
      invoice.supplierName?.toLowerCase().includes(q) ||
      getCreator(invoice).toLowerCase().includes(q);
    const matchesSupplier = supplierFilter === 'all' || invoice.supplierName === supplierFilter;
    return matchesSearch && matchesSupplier;
  });
  const sortedInvoices = [...filteredInvoices].sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = sortedInvoices.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const handlePageChange = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = formData.invoiceItems.filter(item => item.stockItemId && item.quantity > 0 && item.unitCost > 0);
    if (validItems.length === 0) { toastError('Validation', 'Please add at least one valid invoice item'); return; }
    try {
      const submitData = {
        ...formData, totalAmount: calculateTotal(),
        receivedAtDepartmentId: formData.receivingLocationType === 'department' ? (formData.receivedAtDepartmentId || undefined) : undefined,
        receivedAtWardId: formData.receivingLocationType === 'ward' ? (formData.receivedAtWardId || undefined) : undefined,
        invoiceItems: validItems.map(item => ({ stockItemId: item.stockItemId, quantity: item.quantity, unitCost: item.unitCost, batchNumber: item.batchNumber, expiryDate: item.expiryDate })),
      };
      if (editingInvoice) { await updatePurchaseInvoice(editingInvoice.id, submitData); success('Updated', 'Invoice updated successfully'); }
      else { await createPurchaseInvoice(submitData); success('Created', 'Invoice created and stock updated'); }
      setShowForm(false); setEditingInvoice(null); resetForm(); await loadData();
    } catch (err: any) { console.error('Failed to save invoice:', err); toastError('Save failed', err.message || 'Could not save invoice'); }
  };
  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ title: 'Delete invoice', message: 'Delete this invoice? This will reverse all stock movements.', confirmText: 'Delete' }))) return;
    try { await deletePurchaseInvoice(id); success('Deleted', 'Invoice deleted and stock reversed'); await loadData(); }
    catch (err: any) { console.error('Failed to delete invoice:', err); toastError('Delete failed', err.message || 'Could not delete invoice'); }
  };
  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      invoiceNumber: invoice.invoiceNumber, supplierName: invoice.supplierName, invoiceDate: invoice.invoiceDate.split('T')[0],
      totalAmount: invoice.totalAmount, notes: invoice.notes || '',
      receivingLocationType: invoice.receivedAtWardId ? 'ward' : 'department',
      receivedAtDepartmentId: invoice.receivedAtDepartmentId || '', receivedAtWardId: invoice.receivedAtWardId || '',
      invoiceItems: invoice.InvoiceItem?.map(item => ({ stockItemId: item.stockItemId, quantity: item.quantity, unitCost: item.unitCost, batchNumber: item.batchNumber || '', expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '' })) || [{ stockItemId: '', quantity: 1, unitCost: 0, batchNumber: '', expiryDate: '' }],
    });
    setShowForm(true);
  };
  const resetForm = () => {
    setFormData({ invoiceNumber: '', supplierName: '', invoiceDate: new Date().toISOString().split('T')[0], totalAmount: 0, notes: '', receivingLocationType: 'department', receivedAtDepartmentId: '', receivedAtWardId: '', invoiceItems: [{ stockItemId: '', quantity: 1, unitCost: 0, batchNumber: '', expiryDate: '' }] });
    setEditingInvoice(null);
  };
  const addInvoiceItem = () => setFormData(prev => ({ ...prev, invoiceItems: [...prev.invoiceItems, { stockItemId: '', quantity: 1, unitCost: 0, batchNumber: '', expiryDate: '' }] }));
  const removeInvoiceItem = (index: number) => setFormData(prev => ({ ...prev, invoiceItems: prev.invoiceItems.filter((_, i) => i !== index) }));
  const updateInvoiceItem = (index: number, field: string, value: any) => {
    // Single functional update — the pasted version called setFormData twice, the second
    // one recomputing the total from stale items. One update keeps item + total in sync.
    setFormData(prev => {
      const invoiceItems = prev.invoiceItems.map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, invoiceItems, totalAmount: calculateTotalWithItems(invoiceItems) };
    });
  };
  const calculateTotalWithItems = (items: any[]) => items.reduce((total, item) => total + (item.quantity * item.unitCost), 0);
  const calculateTotal = () => calculateTotalWithItems(formData.invoiceItems);
  const getStockItemName = (id: string) => { const item = stockItems.find(i => i.id === id); return item?.name || 'Unknown Item'; };
  const getStockItemUnit = (id: string) => { const item = stockItems.find(i => i.id === id); return item?.unitOfMeasure || 'unit'; };
  const getReceivedAt = (inv: Invoice) => inv.receivedAtWard?.wardName || inv.receivedAtDepartment?.name || '—';

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Supplier', 'Date', 'Total Amount', 'Items Count', 'Created By'];
    const csvData = sortedInvoices.map(inv => [inv.invoiceNumber, inv.supplierName, new Date(inv.invoiceDate).toLocaleDateString(), inv.totalAmount.toFixed(2), inv.InvoiceItem?.length || 0, getCreator(inv)]);
    const csvContent = [headers, ...csvData].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    success('Exported', `${sortedInvoices.length} invoices exported to CSV`);
  };
  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const escape = (value: unknown) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const items = invoice.InvoiceItem || [];
    const total = Number(invoice.totalAmount) || items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
    const rows = items.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || 0;
      return `<tr><td class="muted">${index + 1}</td><td>${escape(getStockItemName(item.stockItemId))}</td><td class="num">${quantity.toLocaleString('en-GH')}</td><td class="num">GHS ${unitCost.toFixed(2)}</td><td class="num">GHS ${(quantity * unitCost).toFixed(2)}</td><td>${escape(item.batchNumber || '—')}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">No invoice items recorded.</td></tr>';
    const hospital = useHospitalStore.getState?.().hospital;
    const hospitalName = hospital?.name || 'Hospital';
    const hospitalMeta = [hospital?.address, hospital?.phone && `Tel: ${hospital.phone}`, hospital?.email].filter(Boolean).map(escape).join(' · ');
    printWindow.document.write(`<!DOCTYPE html><html lang="en-GH"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Purchase invoice ${escape(invoice.invoiceNumber)}</title>
<style>
:root{--ink:#17211b;--muted:#647067;--rule:#d7ded8;--wash:#f3f6f3;--accent:#14532d}
*{box-sizing:border-box}body{margin:0;background:#e9eeea;color:var(--ink);font:10pt/1.45 "Segoe UI",Arial,sans-serif}
.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:8px;padding:12px;background:#fff;border-bottom:1px solid var(--rule)}
.toolbar button{padding:8px 18px;border:1px solid var(--accent);border-radius:6px;background:var(--accent);color:#fff;font-weight:600;cursor:pointer}.toolbar .alt{background:#fff;color:var(--accent)}
.page{width:210mm;min-height:260mm;margin:14px auto;padding:15mm;background:#fff;box-shadow:0 1px 8px #0002}
.letterhead{padding-bottom:10px;border-bottom:2px solid var(--accent)}.hospital{font-size:17pt;font-weight:750;color:var(--accent)}.hospital-meta{font-size:8.5pt;color:var(--muted);margin-top:3px}
.title{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:18px 0 12px}.title h1{font-size:16pt;margin:0;letter-spacing:.04em}.ref{text-align:right;font-size:9pt;color:var(--muted)}
.details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border:1px solid var(--rule);margin-bottom:16px}.detail{padding:8px 10px;border-right:1px solid var(--rule);border-bottom:1px solid var(--rule)}.label{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700}.value{font-weight:600}
table{width:100%;border-collapse:collapse;font-size:9pt}th{background:var(--wash);font-size:8pt;text-transform:uppercase;letter-spacing:.04em;text-align:left}th,td{padding:8px;border:1px solid var(--rule);vertical-align:top}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.muted{color:var(--muted)}.empty{text-align:center;color:var(--muted);padding:20px}
.total{margin:14px 0 0 auto;width:280px;padding:12px;border:1px solid var(--rule);background:var(--wash);display:flex;justify-content:space-between;font-size:12pt;font-weight:750}
.notes{margin-top:18px;padding:10px;border-left:3px solid var(--accent);background:var(--wash);white-space:pre-wrap}.signatures{display:flex;gap:24px;margin-top:48px}.signature{flex:1;border-top:1px solid var(--ink);padding-top:6px;font-size:8.5pt}.footer{margin-top:24px;padding-top:8px;border-top:1px solid var(--rule);display:flex;justify-content:space-between;gap:10px;color:var(--muted);font-size:8pt}
@page{size:A4;margin:0}@media print{body{background:#fff}.toolbar{display:none!important}.page{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}.details,.total,table{break-inside:avoid}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="toolbar"><button onclick="window.print()">Print invoice</button><button class="alt" onclick="window.close()">Close</button></div><main class="page">
<header class="letterhead"><div class="hospital">${escape(hospitalName)}</div><div class="hospital-meta">${hospitalMeta}</div></header>
<div class="title"><h1>PURCHASE INVOICE</h1><div class="ref">Supplier invoice record<br><b>${escape(invoice.invoiceNumber)}</b></div></div>
<section class="details"><div class="detail"><span class="label">Invoice number</span><span class="value">${escape(invoice.invoiceNumber)}</span></div><div class="detail"><span class="label">Supplier</span><span class="value">${escape(invoice.supplierName)}</span></div><div class="detail"><span class="label">Invoice date</span><span class="value">${escape(new Date(invoice.invoiceDate).toLocaleDateString('en-GB'))}</span></div><div class="detail"><span class="label">Received at</span><span class="value">${escape(getReceivedAt(invoice))}</span></div><div class="detail"><span class="label">Recorded by</span><span class="value">${escape(getCreator(invoice))}</span></div><div class="detail"><span class="label">Items recorded</span><span class="value">${items.length}</span></div></section>
<table><thead><tr><th style="width:5%">#</th><th>Item description</th><th class="num">Qty</th><th class="num">Unit cost</th><th class="num">Line total</th><th>Batch</th></tr></thead><tbody>${rows}</tbody></table>
<div class="total"><span>Total amount</span><span>GHS ${total.toFixed(2)}</span></div>
${invoice.notes ? `<div class="notes"><span class="label">Notes</span>${escape(invoice.notes)}</div>` : ''}
<div class="signatures"><div class="signature">Received / checked by</div><div class="signature">Authorised by</div></div>
<footer class="footer"><span>${escape(hospitalName)} · Purchase invoice ${escape(invoice.invoiceNumber)}</span><span>Printed ${escape(new Date().toLocaleString('en-GB'))}</span></footer>
</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
  };
  const clearFilters = () => {
    setSearchTerm('');
    setSupplierFilter('all');
    setInvoiceDateRange(getDefaultInvoiceDateRange());
    setCurrentPage(1);
  };
  const hasActiveFilters = searchTerm !== '' || supplierFilter !== 'all' ||
    invoiceDateRange.startDate !== getDefaultInvoiceDateRange().startDate ||
    invoiceDateRange.endDate !== getDefaultInvoiceDateRange().endDate;
  const summaryStats = {
    totalInvoices: filteredInvoices.length,
    totalSpent: filteredInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
    uniqueSuppliers: new Set(filteredInvoices.map(inv => inv.supplierName).filter(Boolean)).size,
    totalItems: filteredInvoices.reduce((sum, inv) => sum + (inv.InvoiceItem?.length || 0), 0),
  };
  const activeStockItems = stockItems.filter(item => item.isActive);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Purchase Invoices" subtitle="Manage supplier purchases and stock updates" icon={FileText} accent="yellow" onBack={goBack}
        actions={(
          <>
            <Button variant="soft" accent="green" icon={Download} disabled={sortedInvoices.length === 0} onClick={exportToCSV}>Export CSV</Button>
            <Button icon={RefreshCw} loading={isLoading} onClick={loadData}>Refresh</Button>
            <Button variant={showFilters || hasActiveFilters ? 'soft' : 'secondary'} accent="cyan" icon={Filter} onClick={() => setShowFilters(!showFilters)}>Filters{hasActiveFilters && <span className="ml-1 w-2 h-2 bg-[var(--icon-red-text)] rounded-full"></span>}</Button>
            {canManageInvoices && (<Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>New Invoice</Button>)}
          </>
        )} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Invoices" icon={FileText} accent="cyan" value={summaryStats.totalInvoices} />
        <StatCard label="Total Spent" size="money" icon={DollarSign} accent="green" value={`$${summaryStats.totalSpent.toFixed(2)}`} />
        <StatCard label="Suppliers" icon={Building} accent="purple" value={summaryStats.uniqueSuppliers} />
        <StatCard label="Items Purchased" icon={Package} accent="yellow" value={summaryStats.totalItems} />
      </div>
      {showFilters && (
        <div className="bg-[var(--bg-card)] rounded-xl p-5 shadow-sm border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Filter className="w-4 h-4" />Filter Invoices</h3>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close filters" onClick={() => setShowFilters(false)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">From date</label>
              <input type="date" value={invoiceDateRange.startDate} max={invoiceDateRange.endDate || undefined}
                onChange={e => { setInvoiceDateRange(prev => ({ ...prev, startDate: e.target.value })); setCurrentPage(1); }}
                className={cn(INPUT, 'w-full')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">To date</label>
              <input type="date" value={invoiceDateRange.endDate} min={invoiceDateRange.startDate || undefined}
                max={getLocalDateInputValue(new Date())}
                onChange={e => { setInvoiceDateRange(prev => ({ ...prev, endDate: e.target.value })); setCurrentPage(1); }}
                className={cn(INPUT, 'w-full')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier</label>
              <select value={supplierFilter} onChange={e => { setSupplierFilter(e.target.value); setCurrentPage(1); }} className={cn(SELECT, 'w-full')}>
                <option value="all">All Suppliers</option>
                {getUniqueSuppliers().map(supplier => (<option key={supplier} value={supplier}>{supplier}</option>))}
              </select>
            </div>
            <div className="flex items-end gap-2"><Button variant="secondary" onClick={clearFilters}>Clear Filters</Button></div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput className="flex-1" placeholder="Search by invoice number, supplier, or creator..." value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} />
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className={cn(SELECT)}>
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          </select>
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => (<div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse"><div className="flex items-center gap-4"><div className="h-10 w-10 bg-[var(--bg-main)] rounded-lg"></div><div className="flex-1"><div className="h-4 bg-[var(--bg-main)] rounded w-1/4 mb-2"></div><div className="h-3 bg-[var(--bg-main)] rounded w-1/2"></div></div></div></div>))}</div>
      ) : sortedInvoices.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-[var(--text-tertiary)]" /></div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Invoices Found</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{hasActiveFilters ? 'Try adjusting your search or filter criteria' : 'Get started by creating your first purchase invoice'}</p>
          {hasActiveFilters ? (<Button variant="soft" accent="cyan" icon={X} onClick={clearFilters}>Clear All Filters</Button>) : canManageInvoices && (<Button variant="soft" accent="cyan" icon={Plus} onClick={() => setShowForm(true)}>Create First Invoice</Button>)}
        </div>
      ) : (
        <div className={TABLE_SHELL}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={TH_ROW}><tr>
                <th className={TH}>Invoice #</th><th className={TH}>Supplier</th><th className={TH}>Received At</th><th className={TH}>Date</th>
                <th className={cn(TH, 'text-right')}>Total Amount</th><th className={cn(TH, 'text-center')}>Items</th><th className={TH}>Created By</th><th className={cn(TH, 'text-center')}>Actions</th>
              </tr></thead>
              <tbody>
                {paginatedInvoices.map(invoice => (
                  <tr key={invoice.id} className={TR}>
                    <td className={TD_MONO}>{invoice.invoiceNumber}</td>
                    <td className={TD}><div className="flex items-center gap-2"><Building className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /><span className="text-[var(--text-primary)]">{invoice.supplierName}</span></div></td>
                    <td className={TD_MUTED}>{getReceivedAt(invoice)}</td>
                    <td className={TD}><div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /><span className="text-[var(--text-secondary)]">{new Date(invoice.invoiceDate).toLocaleDateString()}</span></div></td>
                    <td className={cn(TD, 'text-right font-bold text-[var(--icon-green-text)]')}>${invoice.totalAmount.toFixed(2)}</td>
                    <td className={cn(TD, 'text-center')}><span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]"><Package className="w-3 h-3" />{invoice.InvoiceItem?.length || 0} items</span></td>
                    <td className={TD_MUTED}>{getCreator(invoice)}</td>
                    <td className={cn(TD, 'text-center')}>
                      <div className="flex items-center justify-center gap-1.5">
                        <Button size="xs" variant="ghost" iconOnly icon={Eye} className="text-[var(--icon-cyan-text)]" aria-label="View details" onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }} />
                        <Button size="xs" variant="ghost" iconOnly icon={Printer} className="text-[var(--icon-purple-text)]" aria-label="Print invoice" onClick={() => printInvoice(invoice)} />
                        {canManageInvoices && <Button size="xs" variant="ghost" iconOnly icon={Edit} className="text-[var(--icon-yellow-text)]" aria-label="Edit invoice" onClick={() => handleEdit(invoice)} />}
                        {canDeleteInvoices && <Button size="xs" variant="ghost" iconOnly icon={Trash2} className="text-[var(--icon-red-text)]" aria-label="Delete invoice" onClick={() => handleDelete(invoice.id)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Pagination — always in the same place, like StockTransactions / Referrals, even with 0 rows */}
      <Pagination page={safePage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={sortedInvoices.length} noun="invoices" onChange={handlePageChange} />

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl border border-[var(--border-color)]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-20 bg-[var(--bg-card)] border-b-[3px] border-[var(--icon-cyan-text)] px-6 md:px-10 py-5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-bold tracking-[3px] uppercase text-[var(--icon-cyan-text)]">Purchase Invoice</p>
                <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">{editingInvoice ? 'Edit Invoice' : 'Create Purchase Invoice'}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Record supplier details, received location and stock items.</p>
              </div>
              <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={() => { setShowForm(false); resetForm(); }} />
            </div>
            <form onSubmit={handleSubmit} className="px-5 md:px-8 py-5 space-y-4 bg-[var(--bg-main)] overflow-y-auto min-h-0">
              <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]"><Building className="w-4 h-4 text-[var(--icon-cyan-text)]" /><h3 className="text-sm font-bold text-[var(--text-primary)]">Invoice Information</h3></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1.2fr_2.1fr_1fr] gap-3 items-end">
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Invoice Number *</label><input type="text" required disabled={!!editingInvoice} placeholder="INV-001" value={formData.invoiceNumber} onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })} className={cn(INPUT, 'w-full disabled:opacity-75')} /></div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Supplier Name *</label><input type="text" required placeholder="Supplier Name" value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })} className={cn(INPUT, 'w-full')} /></div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Received At Department/Store or Ward *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={formData.receivingLocationType} disabled={!!editingInvoice} onChange={e => setFormData({ ...formData, receivingLocationType: e.target.value as 'department' | 'ward', receivedAtDepartmentId: '', receivedAtWardId: '' })} className={cn(SELECT, 'w-full disabled:opacity-75')}>
                      <option value="department">Department / Store</option><option value="ward">Ward</option>
                    </select>
                    {formData.receivingLocationType === 'department' ? (
                      <select required disabled={!!editingInvoice} value={formData.receivedAtDepartmentId} onChange={e => setFormData({ ...formData, receivedAtDepartmentId: e.target.value })} className={cn(SELECT, 'w-full disabled:opacity-75')}><option value="">Select department...</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select>
                    ) : (
                      <select required disabled={!!editingInvoice} value={formData.receivedAtWardId} onChange={e => setFormData({ ...formData, receivedAtWardId: e.target.value })} className={cn(SELECT, 'w-full disabled:opacity-75')}><option value="">Select ward...</option>{wards.filter(ward => ward.isActive).map(ward => <option key={ward.id} value={ward.id}>{ward.wardName}</option>)}</select>
                    )}
                  </div>
                </div>
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Invoice Date *</label><input type="date" required value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className={cn(INPUT, 'w-full')} /></div>
              </div>
              </section>
              <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 md:p-6 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-[var(--border-color)]">
                  <h3 className="font-semibold text-[var(--text-primary)] text-sm">Invoice Items *</h3>
                  {!editingInvoice && (<Button type="button" size="sm" variant="outline" icon={Plus} onClick={addInvoiceItem}>Add Item</Button>)}
                </div>
                {editingInvoice && (
                  <div className="mb-4 flex items-start gap-2.5 p-3 bg-[var(--icon-yellow-bg)]/20 border border-[var(--icon-yellow-bg)]/30 rounded-lg text-xs text-[var(--text-secondary)]">
                    <AlertCircle className="w-4.5 h-4.5 text-[var(--icon-yellow-text)] shrink-0 mt-0.5" />
                    <span>Items cannot be modified after an invoice is created to preserve stock logs. To change items, please close this form, delete the invoice, and create a new one.</span>
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead className={TH_ROW}><tr>
                      <th className={TH}>Stock item</th><th className={cn(TH, 'w-28 text-center')}>Quantity</th>
                      <th className={cn(TH, 'w-36 text-right')}>Unit cost</th><th className={cn(TH, 'w-40')}>Batch number</th>
                      <th className={cn(TH, 'w-44')}>Expiry date</th><th className={cn(TH, 'w-12 text-center')}></th>
                    </tr></thead>
                    <tbody>
                      {formData.invoiceItems.map((item, index) => (
                        <tr key={index} className={TR}>
                          <td className={cn(TD, 'min-w-[320px]')}>
                            {editingInvoice ? <span className="font-medium">{getStockItemName(item.stockItemId)}</span>
                              : <SearchableStockItemSelect value={item.stockItemId} onChange={(value) => updateInvoiceItem(index, 'stockItemId', value)} items={activeStockItems} placeholder="Search stock item…" />}
                          </td>
                          <td className={TD}><input type="number" min="1" required disabled={!!editingInvoice} value={item.quantity}
                            onChange={e => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className={cn(INPUT, 'w-full text-center disabled:opacity-75')} /></td>
                          <td className={TD}><input type="number" step="0.01" min="0" required disabled={!!editingInvoice} value={item.unitCost}
                            onChange={e => updateInvoiceItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                            className={cn(INPUT, 'w-full text-right disabled:opacity-75')} /></td>
                          <td className={TD}><input type="text" placeholder="Optional" disabled={!!editingInvoice} value={item.batchNumber}
                            onChange={e => updateInvoiceItem(index, 'batchNumber', e.target.value)}
                            className={cn(INPUT, 'w-full disabled:opacity-75')} /></td>
                          <td className={TD}><input type="date" disabled={!!editingInvoice} value={item.expiryDate}
                            onChange={e => updateInvoiceItem(index, 'expiryDate', e.target.value)}
                            className={cn(INPUT, 'w-full disabled:opacity-75')} /></td>
                          <td className={cn(TD, 'text-center')}>{!editingInvoice && <Button type="button" variant="ghost" size="xs" iconOnly icon={Trash2}
                            aria-label="Remove item" className="text-[var(--icon-red-text)]" onClick={() => removeInvoiceItem(index)} />}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)]"><tr>
                      <td colSpan={5} className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--text-secondary)]">Invoice total</td>
                      <td className="px-3 py-2.5 text-right font-bold text-[var(--icon-cyan-text)]">${calculateTotal().toFixed(2)}</td>
                    </tr></tfoot>
                  </table>
                </div>
                {formData.invoiceItems.length === 0 && (<div className="text-center py-6 text-[var(--text-secondary)] text-sm border border-dashed border-[var(--border-color)] rounded-lg"><Package className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)]" />Click "Add Item" to add items to this invoice</div>)}
              </div>
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm items-end">
                <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Notes</label><textarea placeholder="Additional notes about this invoice..." rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={cn(INPUT, 'w-full resize-none')} /></div>
                <div className="bg-[var(--bg-main)] rounded-lg p-4 border border-[var(--border-color)]">
                  <div className="flex justify-between items-center mb-2"><span className="text-sm text-[var(--text-secondary)]">Subtotal:</span><span className="text-sm font-medium text-[var(--text-primary)]">${calculateTotal().toFixed(2)}</span></div>
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]"><span className="text-base font-bold text-[var(--text-primary)]">Total:</span><span className="text-xl font-bold text-[var(--icon-cyan-text)]">${calculateTotal().toFixed(2)}</span></div>
                </div>
              </section>
              <div className="sticky bottom-0 flex gap-3 pt-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                <Button variant="secondary" className="flex-1" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" variant="soft" accent="cyan" className="flex-1" disabled={formData.invoiceItems.length === 0}>{editingInvoice ? 'Update Invoice' : 'Create Invoice'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border-color)] px-6 py-4 flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-[var(--text-primary)]">Invoice Details</h2><p className="text-xs text-[var(--text-secondary)] font-mono">{selectedInvoice.invoiceNumber}</p></div>
              <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={() => setShowDetailModal(false)} />
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-xs text-[var(--text-secondary)]">Supplier</p><p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{selectedInvoice.supplierName}</p></div>
                <div><p className="text-xs text-[var(--text-secondary)]">Received At</p><p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{getReceivedAt(selectedInvoice)}</p></div>
                <div><p className="text-xs text-[var(--text-secondary)]">Invoice Date</p><p className="text-sm text-[var(--text-primary)] mt-0.5">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-[var(--text-secondary)]">Created By</p><p className="text-sm text-[var(--text-primary)] mt-0.5">{getCreator(selectedInvoice)}</p></div>
                <div><p className="text-xs text-[var(--text-secondary)]">Created At</p><p className="text-sm text-[var(--text-primary)] mt-0.5">{new Date(selectedInvoice.createdAt).toLocaleString()}</p></div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Invoice Items</h3>
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className={TH_ROW}><tr><th className={TH}>Item</th><th className={cn(TH, 'text-center')}>Quantity</th><th className={cn(TH, 'text-right')}>Unit Cost</th><th className={cn(TH, 'text-right')}>Total</th><th className={TH}>Batch #</th></tr></thead>
                    <tbody>
                      {selectedInvoice.InvoiceItem?.map((item, idx) => (
                        <tr key={idx} className={TR}>
                          <td className={cn(TD, 'whitespace-normal')}>{getStockItemName(item.stockItemId)}</td>
                          <td className={cn(TD, 'text-center')}>{item.quantity} {getStockItemUnit(item.stockItemId)}</td>
                          <td className={cn(TD, 'text-right')}>${item.unitCost.toFixed(2)}</td>
                          <td className={cn(TD, 'text-right font-medium text-[var(--icon-green-text)]')}>${(item.quantity * item.unitCost).toFixed(2)}</td>
                          <td className={TD_MUTED}>{item.batchNumber || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[var(--bg-main)] border-t border-[var(--border-color)]"><tr><td colSpan={3} className="px-4 py-2 text-right font-bold text-[var(--text-primary)]">Total:</td><td className="px-4 py-2 text-right font-bold text-[var(--icon-green-text)]">${selectedInvoice.totalAmount.toFixed(2)}</td><td></td></tr></tfoot>
                  </table>
                </div>
              </div>
              {selectedInvoice.notes && (<div><h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Notes</h3><div className="bg-[var(--bg-main)] p-3 rounded-lg border border-[var(--border-color)]"><p className="text-sm text-[var(--text-secondary)]">{selectedInvoice.notes}</p></div></div>)}
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
