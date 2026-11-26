// src/pages/StockTransfers.tsx - SAME UI UPDATE as StockTransactions / StockManagement
//  - One data point per column (Transfer No. | Date | Time | Origin | Destination | Items | Status | Actions)
//    — was: Transfer/Date stacked, Route (origin -> destination) stacked.
//  - Date and Time are separate columns (was: date + time stacked in one Date cell).
//  - Details opens a modal, NOT an inline expand (was: a 270px box cramped inside the Actions
//    column — item names wrapped, quantities stacked 2x2, and the reconciliation warning
//    repeated twice). The modal gives the items a real table and the warning one banner.
//  - Row actions are a single segmented pill tab-group (Details | Approve | Dispatch | Receive),
//    not loose buttons — one container, one height, active Details state, icon + label on each tab.
//  - Pagination always rendered in the same place (not only when rows exist), totalPages never 0,
//    current page clamped to a safe page so filtering/search can never strand you on an empty page.
//  - Search / status filter reset to page 1. Per-page selector like StockTransactions.
//  - var(--*) tokens only, shared PageHeader / StatCard / TABLE_SHELL / Pagination.
//  - All handlers, API calls, CSV export, picker cap, permissions and reconciliation logic preserved.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowRight,
  Check, ClipboardList, Download, Eye, Package, Plus, RefreshCw,
  Send, Truck, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useStockStore } from '../store/stockStore';
import { capPickerRows, MAX_PICKER_ROWS } from '../components/reusable/PickerLimit';
import { getStockTransfers, getDepartments, createStockTransfer, approveStockTransfer, dispatchStockTransfer, receiveStockTransfer } from '../api';
import {
  Badge, Button, cn, FilterSelect, humanStatus, INPUT, PageHeader, Pagination, SearchInput, SELECT, StatCard, statusTone,
  TABLE_SHELL, TD, TH, TH_ROW, TR,
  type Accent, type BadgeTone,
} from '../components/ui';

type TransferItem = {
  id?: string;
  stockItemId: string;
  quantityRequested?: number;
  quantitySent?: number;
  quantityReceived?: number;
  quantityInTransit?: number;
  batchAllocations?: Array<{ batchNumber?: string; quantity?: number; expiryDate?: string; costPrice?: number }>;
  reconciliationIssues?: string[];
  hasReconciliationIssues?: boolean;
  stockItem?: { id?: string; name?: string; drugCode?: string; unitOfMeasure?: string };
};
type Transfer = {
  id: string;
  transferNumber?: string;
  status: string;
  originId?: string;
  destinationId?: string;
  origin?: { id?: string; name?: string };
  destination?: { id?: string; name?: string };
  requestedBy?: { fullName?: string };
  approvedBy?: { fullName?: string };
  createdAt?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  notes?: string;
  items?: TransferItem[];
  hasStockInTransit?: boolean;
  hasReconciliationIssues?: boolean;
  reconciliationIssues?: Array<{ itemId?: string; stockItemId?: string; stockItemName?: string; issue: string }>;
};
type Option = { id: string; name: string; drugCode?: string; unitOfMeasure?: string };

const asArray = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.departments)) return payload.data.departments;
  if (Array.isArray(payload?.data?.stockItems)) return payload.data.stockItems;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.departments)) return payload.departments;
  if (Array.isArray(payload?.stockItems)) return payload.stockItems;
  return [];
};

const statusLabel = (status: string) => ({
  requested: 'Requested',
  approved: 'Approved',
  dispatched: 'Dispatched / In transit',
  received: 'Received',
  cancelled: 'Cancelled',
}[status] || status || 'Unknown');

// requested, dispatched and received have no entry in the shared STATUS_TONES map,
// so keep a local tone for exactly those; every other status defers to statusTone().
const LOCAL_TONES: Record<string, Accent> = {
  requested: 'yellow',
  dispatched: 'purple',
  received: 'green',
};
const transferTone = (status: string): BadgeTone =>
  LOCAL_TONES[status] ?? statusTone(status);

export default function StockTransfers() {
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const isAdmin = hasRole(['admin', 'super_admin']);
  const canManage = hasRole(['admin', 'super_admin', 'pharmacist']);
  const canRequest = hasRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'records']);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  // The formulary comes from the shared stock store, which walks the endpoint page by page.
  // Asking for `limit: 1000` in one request looked complete but stopped at the server's
  // page size, so a large hospital could not requisition the items below that line.
  const formulary = useStockStore((s) => s.stockItems);
  const loadFormulary = useStockStore((s) => s.getStockItems);
  const stockItems = useMemo<Option[]>(() => formulary
    .filter((item: any) => item.isActive !== false)
    .map((item: any) => ({
      id: item.id, name: item.name || 'Unnamed item', drugCode: item.drugCode,
      unitOfMeasure: item.unitOfMeasure,
    }))
    .filter((item: Option) => item.id), [formulary]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [originId, setOriginId] = useState(user?.departmentId || '');
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [requestItems, setRequestItems] = useState([{ stockItemId: '', quantityRequested: '1' }]);
  const [itemQuery, setItemQuery] = useState('');

  // Every requisition line renders this list, so an uncapped formulary multiplied into
  // thousands of <option> nodes per keystroke. The rows already chosen stay in the list
  // even when the search narrows past them, or a filled line would blank itself.
  const selectedItemIds = useMemo(
    () => new Set(requestItems.map((row) => row.stockItemId).filter(Boolean)),
    [requestItems],
  );
  const pickerItems = useMemo(() => {
    const q = itemQuery.trim().toLowerCase();
    const matches = q
      ? stockItems.filter((s) => `${s.name} ${s.drugCode ?? ''}`.toLowerCase().includes(q))
      : stockItems;
    const capped = capPickerRows(matches);
    for (const id of selectedItemIds) {
      if (!capped.some((s) => s.id === id)) {
        const chosen = stockItems.find((s) => s.id === id);
        if (chosen) capped.push(chosen);
      }
    }
    return capped;
  }, [stockItems, itemQuery, selectedItemIds]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [transferResponse, departmentResponse] = await Promise.all([
        getStockTransfers({ limit: 1000 }),
        getDepartments(),
        loadFormulary({ isActive: true }),
      ]);
      setTransfers(asArray(transferResponse) as Transfer[]);
      setDepartments(asArray(departmentResponse).map((d: any) => ({
        id: d.id, name: d.name || d.departmentName || 'Unnamed department',
      })).filter((d: Option) => d.id));
    } catch (error: any) {
      toastError('Load failed', error?.response?.data?.message || 'Could not load stock transfers. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, [toastError, loadFormulary]);

  useEffect(() => { void loadData(); }, [loadData]);

  const filteredTransfers = useMemo(() => transfers.filter(transfer => {
    if (statusFilter && transfer.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [
      transfer.transferNumber, transfer.origin?.name, transfer.destination?.name,
      transfer.status, transfer.notes,
      ...(transfer.items || []).map(item => item.stockItem?.name),
    ].some(value => String(value || '').toLowerCase().includes(q));
  }), [transfers, statusFilter, search]);

  // Pagination — same shape as StockTransactions / Referrals: never 0 pages, never stranded.
  const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTransfers = filteredTransfers.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const handlePageChange = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const summary = useMemo(() => ({
    total: transfers.length,
    awaitingApproval: transfers.filter(t => t.status === 'requested').length,
    inTransit: transfers.filter(t => t.status === 'dispatched').length,
    issues: transfers.filter(t => t.hasReconciliationIssues).length,
  }), [transfers]);

  const performAction = async (transfer: Transfer, action: 'approve' | 'dispatch' | 'receive') => {
    const label = action === 'approve' ? 'approve' : action === 'dispatch' ? 'dispatch' : 'confirm receipt for';
    if (!(await confirmDialog({ title: 'Update stock transfer', message: `Are you sure you want to ${label} transfer ${transfer.transferNumber || ''}?`, confirmText: 'Continue', type: 'warning' }))) return;
    try {
      const actions = { approve: approveStockTransfer, dispatch: dispatchStockTransfer, receive: receiveStockTransfer };
      await actions[action](transfer.id);
      success('Transfer updated', `Transfer ${transfer.transferNumber || ''} was updated.`);
      await loadData();
    } catch (error: any) {
      toastError('Action failed', error?.response?.data?.message || `Could not ${label} this transfer.`);
    }
  };

  const submitRequest = async (event: FormEvent) => {
    event.preventDefault();
    const items = requestItems.map(item => ({
      stockItemId: item.stockItemId,
      quantityRequested: Number(item.quantityRequested),
    }));
    if (!originId || !destinationId || originId === destinationId) {
      toastError('Check departments', 'Choose different origin and destination departments.');
      return;
    }
    if (items.some(item => !item.stockItemId || !Number.isSafeInteger(item.quantityRequested) || item.quantityRequested <= 0)) {
      toastError('Check items', 'Select a stock item and enter a positive whole-number quantity for every row.');
      return;
    }
    if (new Set(items.map(item => item.stockItemId)).size !== items.length) {
      toastError('Duplicate items', 'Each stock item should appear once. Combine quantities for duplicate items.');
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({ originId, destinationId, items, notes: notes.trim() || undefined });
      success('Transfer requested', 'The transfer request has been recorded.');
      setShowRequestForm(false);
      setNotes('');
      setDestinationId('');
      setRequestItems([{ stockItemId: '', quantityRequested: '1' }]);
      setCurrentPage(1);
      await loadData();
    } catch (error: any) {
      toastError('Request failed', error?.response?.data?.message || 'Could not create the transfer request.');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ['Transfer No.', 'Status', 'Origin', 'Destination', 'Requested Date', 'Item', 'Qty Requested', 'Qty Sent', 'Qty Received', 'Qty In Transit', 'Reconciliation Issues'],
      ...filteredTransfers.flatMap(t => (t.items?.length ? t.items : [{} as TransferItem]).map(item => [
        t.transferNumber || t.id, statusLabel(t.status), t.origin?.name || t.originId || '',
        t.destination?.name || t.destinationId || '', t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
        item.stockItem?.name || item.stockItemId || '', item.quantityRequested ?? '',
        item.quantitySent ?? '', item.quantityReceived ?? '', item.quantityInTransit ?? '',
        (item.reconciliationIssues || []).join('; '),
      ])),
    ];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <ArrowLeftRight className="h-4 w-4" /> Inventory / Stock Transfers
      </div>

      <PageHeader
        title="Stock Transfers"
        subtitle="Track requests, dispatches, receipts, in-transit quantities, and records requiring reconciliation."
        icon={ArrowLeftRight}
        accent="blue"
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={loading} onClick={() => void loadData()}>Refresh</Button>
            <Button variant="secondary" icon={Download} disabled={!filteredTransfers.length} onClick={exportCsv}>Export CSV</Button>
            {canRequest && (
              <Button variant="primary" icon={showRequestForm ? X : Plus} onClick={() => setShowRequestForm((v) => !v)}>
                {showRequestForm ? 'Close form' : 'Request transfer'}
              </Button>
            )}
          </>
        )}
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="All transfers" value={summary.total} icon={ClipboardList} />
        <StatCard label="Awaiting approval" value={summary.awaitingApproval} icon={Package} />
        <StatCard label="In transit" value={summary.inTransit} icon={Truck} />
        <StatCard label="Need reconciliation" value={summary.issues} icon={AlertTriangle} />
      </section>

      {showRequestForm && <form onSubmit={submitRequest} className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 md:p-5">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">New transfer request</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Request stock movement between departments. Dispatch and receipt will be recorded separately.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">Origin department
            <select required disabled={!isAdmin} value={originId} onChange={e => setOriginId(e.target.value)} className={cn(SELECT, 'mt-1 w-full')}>
              <option value="">Select origin</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--text-secondary)]">Destination department
            <select required value={destinationId} onChange={e => setDestinationId(e.target.value)} className={cn(SELECT, 'mt-1 w-full')}>
              <option value="">Select destination</option>{departments.filter(d => d.id !== originId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        </div>
        <div className="space-y-2">
          <label className="block text-sm text-[var(--text-secondary)]">Find stock item
            <input
              value={itemQuery}
              onChange={e => setItemQuery(e.target.value)}
              placeholder="Name or drug code"
              className={cn(INPUT, 'mt-1 w-full')}
            />
          </label>
          {requestItems.map((item, index) => <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_44px]">
            <label className="text-sm text-[var(--text-secondary)]">Stock item
              <select required value={item.stockItemId} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, stockItemId: e.target.value } : row))} className={cn(SELECT, 'mt-1 w-full')}>
                <option value="">Select item</option>{pickerItems.map(s => <option key={s.id} value={s.id}>{s.name}{s.drugCode ? ` · ${s.drugCode}` : ''}</option>)}
              </select>
            </label>
            <label className="text-sm text-[var(--text-secondary)]">Quantity
              <input required type="number" min="1" step="1" value={item.quantityRequested} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, quantityRequested: e.target.value } : row))} className={cn(INPUT, 'mt-1 w-full')} />
            </label>
            <Button variant="ghost" iconOnly icon={X} aria-label="Remove item" className="mt-5" disabled={requestItems.length === 1} onClick={() => setRequestItems(rows => rows.filter((_, i) => i !== index))} />
          </div>)}
          {stockItems.length > MAX_PICKER_ROWS && (
            <p className="text-xs text-[var(--text-tertiary)]">
              Showing {Math.min(stockItems.length, MAX_PICKER_ROWS)} of {stockItems.length} items &mdash; type to narrow the list.
            </p>
          )}
          <Button type="button" variant="ghost" icon={Plus} className="text-[var(--icon-cyan-text)]" onClick={() => setRequestItems(rows => [...rows, { stockItemId: '', quantityRequested: '1' }])}>Add another item</Button>
        </div>
        <label className="block text-sm text-[var(--text-secondary)]">Reason / notes (optional)
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className={cn(INPUT, 'mt-1 w-full resize-none')} />
        </label>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Send} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>}

      <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 md:flex-row">
        <SearchInput value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Search transfer number, department, item…" />
        <FilterSelect
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'requested', label: 'Requested' },
            { value: 'approved', label: 'Approved' },
            { value: 'dispatched', label: 'Dispatched / in transit' },
            { value: 'received', label: 'Received' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)]">Show:</span>
          <FilterSelect value={String(itemsPerPage)} onChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
            options={[{ value: '10', label: '10' }, { value: '15', label: '15' }, { value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]} />
          <span className="text-sm text-[var(--text-secondary)]">per page</span>
        </div>
      </section>

      <section className={TABLE_SHELL}>
        {loading ? <div className="p-8 text-center text-sm text-[var(--text-secondary)]"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading transfer register…</div>
          : filteredTransfers.length === 0 ? <div className="p-12 text-center"><ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-[var(--text-secondary)]" /><p className="font-medium text-[var(--text-primary)]">No stock transfers found</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Try changing your search or request a new transfer.</p></div>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className={TH_ROW}>
                <tr>{['Transfer No.', 'Date', 'Time', 'Origin', 'Destination', 'Items', 'Status', 'Actions'].map(h => <th key={h} className={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {paginatedTransfers.map(transfer => <tr key={transfer.id} className={cn(TR, 'align-top')}>
                  <td className={cn(TD, 'align-top')}>
                    <div className="font-semibold text-[var(--text-primary)] font-mono">{transfer.transferNumber || transfer.id}</div>
                    {transfer.hasReconciliationIssues && <div className="mt-2"><Badge tone="orange" size="sm"><AlertTriangle className="w-3 h-3" /> Reconciliation required</Badge></div>}
                  </td>
                  <td className={cn(TD, 'align-top whitespace-nowrap')}>
                    <span className="text-[var(--text-primary)]">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'Date unavailable'}</span>
                  </td>
                  <td className={cn(TD, 'align-top whitespace-nowrap')}>
                    <span className="text-[var(--text-secondary)]">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </td>
                  <td className={cn(TD, 'align-top')}><div className="font-medium text-[var(--text-primary)]">{transfer.origin?.name || 'Unknown origin'}</div></td>
                  <td className={cn(TD, 'align-top')}>
                    <div className="flex items-center gap-1 font-medium text-[var(--text-primary)]"><ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-secondary)]" />{transfer.destination?.name || 'Unknown destination'}</div>
                  </td>
                  <td className={cn(TD, 'align-top whitespace-normal')}>
                    <div className="font-medium text-[var(--text-primary)]">{transfer.items?.length || 0} item(s)</div>
                    {(transfer.items || []).slice(0, 2).map((item, i) => <div key={item.id || i} className="mt-1 max-w-[260px] truncate text-xs text-[var(--text-secondary)]">{item.stockItem?.name || item.stockItemId} · requested {item.quantityRequested ?? '—'}</div>)}
                    {(transfer.items?.length || 0) > 2 && <div className="mt-1 text-xs text-[var(--text-secondary)]">+{(transfer.items?.length || 0) - 2} more</div>}
                  </td>
                  <td className={cn(TD, 'align-top')}>
                    <Badge tone={transferTone(transfer.status)} dot size="sm">{humanStatus(transfer.status)}</Badge>
                    {transfer.status === 'dispatched' && <div className="mt-2 text-xs text-[var(--text-secondary)]">{(transfer.items || []).reduce((n, item) => n + (Number(item.quantityInTransit) || 0), 0)} unit(s) in transit</div>}
                  </td>
                  <td className={cn(TD, 'align-top whitespace-nowrap')}>
                    {/* Action tabs — one segmented pill group per row, same height / padding / radius
                        on every tab. Details is the toggle tab (active = expanded, card wash);
                        Approve / Dispatch / Receive only appear for the status that allows them. */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-main)] p-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTransfer(transfer)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"
                      >
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'requested' && (
                        <button type="button" onClick={() => void performAction(transfer, 'approve')}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--icon-blue-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--icon-blue-text)] transition-colors hover:brightness-95">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                      )}
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'approved' && (
                        <button type="button" onClick={() => void performAction(transfer, 'dispatch')}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--icon-purple-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--icon-purple-text)] transition-colors hover:brightness-95">
                          <Truck className="h-3.5 w-3.5" /> Dispatch
                        </button>
                      )}
                      {(isAdmin || user?.departmentId === transfer.destinationId) && transfer.status === 'dispatched' && (
                        <button type="button" onClick={() => void performAction(transfer, 'receive')}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--icon-green-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--icon-green-text)] transition-colors hover:brightness-95">
                          <ArrowDownToLine className="h-3.5 w-3.5" /> Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>

      {/* Pagination — always in the same place, like StockTransactions, even with 0 rows */}
      <Pagination page={safePage} totalPages={totalPages} itemsPerPage={itemsPerPage} totalItems={filteredTransfers.length} noun="transfers" onChange={handlePageChange} />

      <p className="text-xs text-[var(--text-secondary)]">Internal transfers move stock between locations; they must not be counted as new purchases or additional hospital-wide stock. Reconciliation warnings are diagnostic and require review rather than automatic correction.</p>

      {/* ----- Transfer details modal ----- */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedTransfer(null)}>
          <div
            role="dialog" aria-modal="true" aria-label={`Transfer ${selectedTransfer.transferNumber || selectedTransfer.id} details`}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-[var(--bg-card)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: number + status, close */}
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-4">
              <div>
                <h2 className="font-mono text-lg font-semibold text-[var(--text-primary)]">{selectedTransfer.transferNumber || selectedTransfer.id}</h2>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {selectedTransfer.createdAt ? new Date(selectedTransfer.createdAt).toLocaleDateString() : 'Date unavailable'}
                  {selectedTransfer.createdAt ? ` · ${new Date(selectedTransfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={transferTone(selectedTransfer.status)} dot size="sm">{humanStatus(selectedTransfer.status)}</Badge>
                <Button variant="ghost" iconOnly icon={X} aria-label="Close details" onClick={() => setSelectedTransfer(null)} />
              </div>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Route + who asked — one fact per line, nothing repeated later */}
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div><dt className="text-xs text-[var(--text-tertiary)]">Origin</dt><dd className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{selectedTransfer.origin?.name || 'Unknown origin'}</dd></div>
                <div><dt className="text-xs text-[var(--text-tertiary)]">Destination</dt><dd className="mt-0.5 flex items-center gap-1 text-sm font-medium text-[var(--text-primary)]"><ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />{selectedTransfer.destination?.name || 'Unknown destination'}</dd></div>
                <div><dt className="text-xs text-[var(--text-tertiary)]">Requested by</dt><dd className="mt-0.5 text-sm text-[var(--text-primary)]">{selectedTransfer.requestedBy?.fullName || 'Not recorded'}</dd></div>
                <div><dt className="text-xs text-[var(--text-tertiary)]">Items</dt><dd className="mt-0.5 text-sm text-[var(--text-primary)]">{selectedTransfer.items?.length || 0} item(s)</dd></div>
              </dl>
              {selectedTransfer.notes && (
                <div className="rounded-lg bg-[var(--bg-main)] p-3">
                  <p className="text-xs font-medium text-[var(--text-tertiary)]">Notes</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{selectedTransfer.notes}</p>
                </div>
              )}

              {/* One reconciliation banner for the whole transfer — the per-item warning
                  used to repeat the same message a second time underneath. */}
              {selectedTransfer.hasReconciliationIssues && (
                <div className="flex items-start gap-2 rounded-lg bg-[var(--icon-yellow-bg)] p-3 text-sm text-[var(--icon-yellow-text)]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Reconciliation required</p>
                    {(selectedTransfer.reconciliationIssues || []).length > 0
                      ? (selectedTransfer.reconciliationIssues || []).map((issue, i) => <p key={i} className="mt-0.5">{issue.stockItemName ? `${issue.stockItemName}: ` : ''}{issue.issue}</p>)
                      : <p className="mt-0.5">Quantities do not match across the request, dispatch and receipt. Review the rows below.</p>}
                  </div>
                </div>
              )}

              {/* Items — a real table now: one column per quantity, lots on their own line */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Items</h3>
                {(selectedTransfer.items || []).length === 0
                  ? <p className="text-sm text-[var(--text-secondary)]">No items on this transfer.</p>
                  : <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                    <table className="w-full text-left text-sm">
                      <thead className={TH_ROW}>
                        <tr><th className={TH}>Item</th><th className={cn(TH, 'text-right')}>Requested</th><th className={cn(TH, 'text-right')}>Sent</th><th className={cn(TH, 'text-right')}>Received</th><th className={cn(TH, 'text-right')}>In transit</th></tr>
                      </thead>
                      <tbody>
                        {(selectedTransfer.items || []).map((item, i) => {
                          const mismatch = Number(item.quantitySent ?? item.quantityRequested) !== Number(item.quantityRequested);
                          return (
                            <tr key={item.id || i} className={cn(TR, 'align-top')}>
                              <td className={cn(TD, 'whitespace-normal')}>
                                <div className="font-medium text-[var(--text-primary)]">{item.stockItem?.name || item.stockItemId}</div>
                                {(item.batchAllocations || []).length > 0 && (
                                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                    Lots: {item.batchAllocations?.map(b => `${b.batchNumber || 'Unknown lot'} (qty ${b.quantity ?? '—'})`).join(', ')}
                                  </div>
                                )}
                                {(item.reconciliationIssues || []).map((issue, issueIndex) => (
                                  <div key={issueIndex} className="mt-2 flex items-start gap-1 text-xs text-[var(--icon-yellow-text)]">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue}
                                  </div>
                                ))}
                                {/* Per-item issue only if it says something the banner above didn't already say */}
                                {mismatch && !(item.reconciliationIssues || []).length && (
                                  <div className="mt-2 flex items-start gap-1 text-xs text-[var(--icon-yellow-text)]">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Quantity sent does not match the originally requested quantity.
                                  </div>
                                )}
                              </td>
                              <td className={cn(TD, 'text-right')}>{item.quantityRequested ?? '—'}</td>
                              <td className={cn(TD, 'text-right')}>{item.quantitySent ?? '—'}</td>
                              <td className={cn(TD, 'text-right')}>{item.quantityReceived ?? '—'}</td>
                              <td className={cn(TD, 'text-right')}>{item.quantityInTransit ?? 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
              </div>

              <div className="flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedTransfer(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
