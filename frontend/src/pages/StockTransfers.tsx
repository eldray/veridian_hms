import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowRight,
  ClipboardList, Download, Eye, Filter, Package, Plus, RefreshCw, Search,
  Send, Truck, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { createStockTransfer, fetchAllPages, getDepartments, getStockItems, getStockTransfers, updateStockTransferStatus } from '../api';

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

const statusClass = (status: string) => ({
  requested: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  dispatched: 'bg-violet-100 text-violet-800',
  received: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-700',
}[status] || 'bg-slate-100 text-slate-700');

export default function StockTransfers() {
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const isAdmin = hasRole(['admin', 'super_admin']);
  const canManage = hasRole(['admin', 'super_admin', 'pharmacist']);
  const canRequest = hasRole(['admin', 'super_admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'records']);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [stockItems, setStockItems] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [originId, setOriginId] = useState(user?.departmentId || '');
  const [destinationId, setDestinationId] = useState('');
  const [notes, setNotes] = useState('');
  const [requestItems, setRequestItems] = useState([{ stockItemId: '', quantityRequested: '1' }]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [transferResponse, departmentResponse, stockResponse] = await Promise.all([
        getStockTransfers({ limit: 1000 }),
        fetchAllPages<any>(getDepartments, { limit: 1000 }, { maxItems: 1000 }),
        fetchAllPages<any>(getStockItems, { limit: 1000, isActive: true }, { maxItems: 1000 }),
      ]);
      setTransfers(asArray(transferResponse) as Transfer[]);
      setDepartments(asArray(departmentResponse).map((d: any) => ({
        id: d.id, name: d.name || d.departmentName || 'Unnamed department',
      })).filter((d: Option) => d.id));
      setStockItems(asArray(stockResponse).map((s: any) => ({
        id: s.id, name: s.name || 'Unnamed item', drugCode: s.drugCode,
        unitOfMeasure: s.unitOfMeasure,
      })).filter((s: Option) => s.id));
    } catch (error: any) {
      toastError('Load failed', error?.response?.data?.message || 'Could not load stock transfers. Check your access and try again.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

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

  const summary = useMemo(() => ({
    total: transfers.length,
    awaitingApproval: transfers.filter(t => t.status === 'requested').length,
    inTransit: transfers.filter(t => t.status === 'dispatched').length,
    issues: transfers.filter(t => t.hasReconciliationIssues).length,
  }), [transfers]);

  const performAction = async (transfer: Transfer, action: 'approve' | 'dispatch' | 'receive') => {
    const label = action === 'approve' ? 'approve' : action === 'dispatch' ? 'dispatch' : 'confirm receipt for';
    if (!window.confirm(`Are you sure you want to ${label} transfer ${transfer.transferNumber || ''}?`)) return;
    try {
      await updateStockTransferStatus(transfer.id, action);
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
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <ArrowLeftRight className="h-4 w-4" /> Inventory / Stock Transfers
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Stock Transfers</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Track requests, dispatches, receipts, in-transit quantities, and records requiring reconciliation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void loadData()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={exportCsv} disabled={!filteredTransfers.length} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
          {canRequest && <button onClick={() => setShowRequestForm(v => !v)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-text)] px-3 py-2 text-sm font-semibold text-white">
            {showRequestForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {showRequestForm ? 'Close form' : 'Request transfer'}
          </button>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'All transfers', value: summary.total, icon: ClipboardList },
          { label: 'Awaiting approval', value: summary.awaitingApproval, icon: Package },
          { label: 'In transit', value: summary.inTransit, icon: Truck },
          { label: 'Need reconciliation', value: summary.issues, icon: AlertTriangle },
        ].map(card => {
          const Icon = card.icon;
          return <div key={card.label} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--text-secondary)]">{card.label}</span>
              <Icon className="h-5 w-5 text-[var(--icon-cyan-text)]" />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{card.value}</div>
          </div>;
        })}
      </section>

      {showRequestForm && <form onSubmit={submitRequest} className="space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 md:p-5">
        <div>
          <h2 className="font-semibold text-[var(--text-primary)]">New transfer request</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Request stock movement between departments. Dispatch and receipt will be recorded separately.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">Origin department
            <select required disabled={!isAdmin} value={originId} onChange={e => setOriginId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]">
              <option value="">Select origin</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-[var(--text-secondary)]">Destination department
            <select required value={destinationId} onChange={e => setDestinationId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]">
              <option value="">Select destination</option>{departments.filter(d => d.id !== originId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
        </div>
        <div className="space-y-2">
          {requestItems.map((item, index) => <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_44px]">
            <label className="text-sm text-[var(--text-secondary)]">Stock item
              <select required value={item.stockItemId} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, stockItemId: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]">
                <option value="">Select item</option>{stockItems.map(s => <option key={s.id} value={s.id}>{s.name}{s.drugCode ? ` · ${s.drugCode}` : ''}</option>)}
              </select>
            </label>
            <label className="text-sm text-[var(--text-secondary)]">Quantity
              <input required type="number" min="1" step="1" value={item.quantityRequested} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, quantityRequested: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]" />
            </label>
            <button type="button" aria-label="Remove item" disabled={requestItems.length === 1} onClick={() => setRequestItems(rows => rows.filter((_, i) => i !== index))} className="mt-5 rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] disabled:opacity-30"><X className="h-4 w-4" /></button>
          </div>)}
          <button type="button" onClick={() => setRequestItems(rows => [...rows, { stockItemId: '', quantityRequested: '1' }])} className="inline-flex items-center gap-2 text-sm font-medium text-[var(--icon-cyan-text)]"><Plus className="h-4 w-4" /> Add another item</button>
        </div>
        <label className="block text-sm text-[var(--text-secondary)]">Reason / notes (optional)
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]" />
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[var(--icon-cyan-text)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            <Send className="h-4 w-4" /> {saving ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>}

      <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transfer number, department, item…" className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--text-secondary)]" />
          <select aria-label="Filter by status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] px-3 py-2.5 text-sm text-[var(--text-primary)]">
            <option value="">All statuses</option>
            <option value="requested">Requested</option><option value="approved">Approved</option><option value="dispatched">Dispatched / in transit</option><option value="received">Received</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        {loading ? <div className="p-12 text-center text-sm text-[var(--text-secondary)]"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading transfer register…</div>
          : filteredTransfers.length === 0 ? <div className="p-12 text-center"><ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-[var(--text-secondary)]" /><p className="font-medium text-[var(--text-primary)]">No stock transfers found</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Try changing your search or request a new transfer.</p></div>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-[var(--bg-main)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>{['Transfer / Date', 'Route', 'Items', 'Status', 'Actions'].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredTransfers.map(transfer => <tr key={transfer.id} className="align-top hover:bg-[var(--bg-main)]/50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-[var(--text-primary)]">{transfer.transferNumber || transfer.id}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : 'Date unavailable'}</div>
                    {transfer.hasReconciliationIssues && <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"><AlertTriangle className="h-3.5 w-3.5" /> Reconciliation required</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-[var(--text-primary)]">{transfer.origin?.name || 'Unknown origin'}</div>
                    <div className="my-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]"><ArrowRight className="h-3 w-3" /> to</div>
                    <div className="font-medium text-[var(--text-primary)]">{transfer.destination?.name || 'Unknown destination'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-[var(--text-primary)]">{transfer.items?.length || 0} item(s)</div>
                    {(transfer.items || []).slice(0, 2).map((item, i) => <div key={item.id || i} className="mt-1 max-w-[260px] truncate text-xs text-[var(--text-secondary)]">{item.stockItem?.name || item.stockItemId} · requested {item.quantityRequested ?? '—'}</div>)}
                    {(transfer.items?.length || 0) > 2 && <div className="mt-1 text-xs text-[var(--text-secondary)]">+{(transfer.items?.length || 0) - 2} more</div>}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(transfer.status)}`}>{statusLabel(transfer.status)}</span>
                    {transfer.status === 'dispatched' && <div className="mt-2 text-xs text-[var(--text-secondary)]">{(transfer.items || []).reduce((n, item) => n + (Number(item.quantityInTransit) || 0), 0)} unit(s) in transit</div>}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setExpandedId(expandedId === transfer.id ? null : transfer.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"><Eye className="h-3.5 w-3.5" /> {expandedId === transfer.id ? 'Hide' : 'Details'}</button>
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'requested' && <button onClick={() => void performAction(transfer, 'approve')} className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white">Approve</button>}
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'approved' && <button onClick={() => void performAction(transfer, 'dispatch')} className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white"><Truck className="h-3.5 w-3.5" /> Dispatch</button>}
                      {(isAdmin || user?.departmentId === transfer.destinationId) && transfer.status === 'dispatched' && <button onClick={() => void performAction(transfer, 'receive')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white"><ArrowDownToLine className="h-3.5 w-3.5" /> Receive</button>}
                    </div>
                    {expandedId === transfer.id && <div className="mt-3 min-w-[270px] rounded-lg border border-[var(--border-color)] p-3">
                      <div className="mb-2 text-xs text-[var(--text-secondary)]">Requested by: {transfer.requestedBy?.fullName || 'Not recorded'}</div>
                      {transfer.notes && <p className="mb-3 text-xs text-[var(--text-secondary)]">Notes: {transfer.notes}</p>}
                      <div className="space-y-3">
                        {(transfer.items || []).map((item, i) => <div key={item.id || i} className="border-t border-[var(--border-color)] pt-2">
                          <div className="font-medium text-[var(--text-primary)]">{item.stockItem?.name || item.stockItemId}</div>
                          <div className="mt-1 grid grid-cols-2 gap-1 text-xs text-[var(--text-secondary)]">
                            <span>Requested: {item.quantityRequested ?? '—'}</span><span>Sent: {item.quantitySent ?? '—'}</span>
                            <span>Received: {item.quantityReceived ?? '—'}</span><span>In transit: {item.quantityInTransit ?? 0}</span>
                          </div>
                          {(item.batchAllocations || []).length > 0 && <div className="mt-2 text-xs text-[var(--text-secondary)]">Lots: {item.batchAllocations?.map(b => `${b.batchNumber || 'Unknown lot'} (qty ${b.quantity ?? '—'})`).join(', ')}</div>}
                          {(item.reconciliationIssues || []).map((issue, issueIndex) => <div key={issueIndex} className="mt-2 flex items-start gap-1 rounded-md bg-amber-50 p-2 text-xs text-amber-900"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue}</div>)}
                        </div>)}
                      </div>
                      {(transfer.reconciliationIssues || []).map((issue, i) => <div key={i} className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900">{issue.stockItemName}: {issue.issue}</div>)}
                    </div>}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>
      <p className="text-xs text-[var(--text-secondary)]">Internal transfers move stock between locations; they must not be counted as new purchases or additional hospital-wide stock. Reconciliation warnings are diagnostic and require review rather than automatic correction.</p>
    </div>
  );
}
