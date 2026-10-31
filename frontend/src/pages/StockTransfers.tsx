import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { confirmDialog } from '../context/ConfirmDialog';
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowRight,
  ClipboardList, Download, Eye, Package, Plus, RefreshCw,
  Send, Truck, X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useStockStore } from '../store/stockStore';
import { capPickerRows, MAX_PICKER_ROWS } from '../components/reusable/PickerLimit';
import { getStockTransfers, getDepartments, createStockTransfer, approveStockTransfer, dispatchStockTransfer, receiveStockTransfer } from '../api';
import {
  Badge, Button, cn, FilterSelect, humanStatus, PageHeader, SearchInput, StatCard, statusTone,
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          <label className="block text-sm text-[var(--text-secondary)]">Find stock item
            <input
              value={itemQuery}
              onChange={e => setItemQuery(e.target.value)}
              placeholder="Name or drug code"
              className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]"
            />
          </label>
          {requestItems.map((item, index) => <div key={index} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_44px]">
            <label className="text-sm text-[var(--text-secondary)]">Stock item
              <select required value={item.stockItemId} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, stockItemId: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]">
                <option value="">Select item</option>{pickerItems.map(s => <option key={s.id} value={s.id}>{s.name}{s.drugCode ? ` · ${s.drugCode}` : ''}</option>)}
              </select>
            </label>
            <label className="text-sm text-[var(--text-secondary)]">Quantity
              <input required type="number" min="1" step="1" value={item.quantityRequested} onChange={e => setRequestItems(rows => rows.map((row, i) => i === index ? { ...row, quantityRequested: e.target.value } : row))} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]" />
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
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={1000} className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] p-2.5 text-[var(--text-primary)]" />
        </label>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={Send} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>}

      <section className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 md:flex-row">
        <SearchInput value={search} onChange={setSearch} placeholder="Search transfer number, department, item…" />
        <FilterSelect
          aria-label="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'requested', label: 'Requested' },
            { value: 'approved', label: 'Approved' },
            { value: 'dispatched', label: 'Dispatched / in transit' },
            { value: 'received', label: 'Received' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </section>

      <section className={TABLE_SHELL}>
        {loading ? <div className="p-12 text-center text-sm text-[var(--text-secondary)]"><RefreshCw className="mx-auto mb-3 h-5 w-5 animate-spin" />Loading transfer register…</div>
          : filteredTransfers.length === 0 ? <div className="p-12 text-center"><ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-[var(--text-secondary)]" /><p className="font-medium text-[var(--text-primary)]">No stock transfers found</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Try changing your search or request a new transfer.</p></div>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className={TH_ROW}>
                <tr>{['Transfer / Date', 'Route', 'Items', 'Status', 'Actions'].map(h => <th key={h} className={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filteredTransfers.map(transfer => <tr key={transfer.id} className={cn(TR, 'align-top')}>
                  <td className={cn(TD, 'align-top')}>
                    <div className="font-semibold text-[var(--text-primary)] font-mono">{transfer.transferNumber || transfer.id}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">{transfer.createdAt ? new Date(transfer.createdAt).toLocaleString() : 'Date unavailable'}</div>
                    {transfer.hasReconciliationIssues && <div className="mt-2"><Badge tone="orange" size="sm"><AlertTriangle className="w-3 h-3" /> Reconciliation required</Badge></div>}
                  </td>
                  <td className={cn(TD, 'align-top')}>
                    <div className="font-medium text-[var(--text-primary)]">{transfer.origin?.name || 'Unknown origin'}</div>
                    <div className="my-1 flex items-center gap-1 text-xs text-[var(--text-secondary)]"><ArrowRight className="h-3 w-3" /> to</div>
                    <div className="font-medium text-[var(--text-primary)]">{transfer.destination?.name || 'Unknown destination'}</div>
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
                  <td className={cn(TD, 'align-top whitespace-normal')}>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setExpandedId(expandedId === transfer.id ? null : transfer.id)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]"><Eye className="h-3.5 w-3.5" /> {expandedId === transfer.id ? 'Hide' : 'Details'}</button>
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'requested' && <Button size="sm" variant="soft" accent="blue" onClick={() => void performAction(transfer, 'approve')}>Approve</Button>}
                      {canManage && (isAdmin || user?.departmentId === transfer.originId) && transfer.status === 'approved' && <Button size="sm" variant="soft" accent="purple" icon={Truck} onClick={() => void performAction(transfer, 'dispatch')}>Dispatch</Button>}
                      {(isAdmin || user?.departmentId === transfer.destinationId) && transfer.status === 'dispatched' && <Button size="sm" variant="soft" accent="green" icon={ArrowDownToLine} onClick={() => void performAction(transfer, 'receive')}>Receive</Button>}
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
                          {(item.reconciliationIssues || []).map((issue, issueIndex) => <div key={issueIndex} className="mt-2 flex items-start gap-1 rounded-md bg-[var(--icon-yellow-bg)] p-2 text-xs text-[var(--icon-yellow-text)]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{issue}</div>)}
                        </div>)}
                      </div>
                      {(transfer.reconciliationIssues || []).map((issue, i) => <div key={i} className="mt-2 rounded-md bg-[var(--icon-yellow-bg)] p-2 text-xs text-[var(--icon-yellow-text)]">{issue.stockItemName}: {issue.issue}</div>)}
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
