// src/pages/CounterTicket.tsx
//
// One counter ticket, worked end to end: sell, order a lab test or a scan, hand the goods
// over, raise the bill and print. The ticket is an Attendance whose identity is a
// CounterClient, and every write goes through /api/counter, which refuses anything that is
// not a walk-in — so a clinical encounter can never be edited from this screen by mistake.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import { canAccessPage, isAdminLike } from '../config/access';
import { confirmDialog } from '../context/ConfirmDialog';
import { describeApiError, describeApiErrorTitle, describeBlobError } from '../utils/apiError';
import { getScanDisplayName } from '../utils/scan';
import {
  addCounterLabOrder, addCounterSaleItem, addCounterScanOrder, closeCounterTicket, dispenseCounterItem,
  downloadDocument, generateBillStatement, generateLabResult, generatePrescription, generateReceipt,
  getCounterBill, getCounterStockAvailability, getCounterTicket, linkCounterClient, raiseCounterBill,
  removeCounterLabOrder, removeCounterSaleItem, removeCounterScanOrder, searchCounterPatients, getServiceCatalog,
} from '../api';
import {
  AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, DollarSign, FlaskConical,
  Plus, Printer, RefreshCw, Scan, Trash2, User,
} from 'lucide-react';
import { Badge, Button, cn, INPUT, PageHeader, SELECT, TD, TH, TH_ROW, TR } from '../components/ui';
import {
  CANCELLABLE_ORDER_STATUSES, CLOSED_STATUSES, dateTime, identityOf, label, LIST_KEYS, money, openedByLabel,
  pickList, shell, ticketLabel, ticketTone, unwrap,
} from '../utils/counterTicket';

type Tab = 'sell' | 'orders' | 'bill';

/** What the signed-in staff member's own store can hand over, keyed by stock item. */
type Availability = Record<string, {
  stockItemId: string;
  name: string;
  onHand: number;
  shelf: number;
  promised: number;
  available: number;
  limitedBy: string;
  storeName: string | null;
}>;

// Catalog rows are the sellable/orderable unit: they carry the price, and for a
// medicine the stock item the pharmacy deducts from.
const fetchCatalog = async (serviceType: string, search: string) => {
  const result = await getServiceCatalog({ serviceType, search, isActive: true, limit: 50 });
  return result?.data ?? [];
};

const stockItemOf = (row: any): string | null => row?.stockItem?.id || row?.StockItem?.id || row?.stockItemId || null;

export default function CounterTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [ticket, setTicket] = useState<any | null>(null);
  const [bill, setBill] = useState<any | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [tab, setTab] = useState<Tab>('sell');
  const [working, setWorking] = useState<string | null>(null);

  const [drugSearch, setDrugSearch] = useState('');
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [drugQty, setDrugQty] = useState('1');
  const [labSearch, setLabSearch] = useState('');
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scanSearch, setScanSearch] = useState('');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [priority, setPriority] = useState('routine');
  const [availability, setAvailability] = useState<Availability>({});
  const [storeName, setStoreName] = useState<string | null>(null);

  // Gates mirror the requireRole lists on /api/counter and /api/documents, admin and
  // super_admin included — `hasRole` alone implies super_admin but NOT admin, which hid
  // these controls from the administrator who can perform every one of them.
  const roleOk = (roles: string[]) => isAdminLike(user?.role) || hasRole(roles);
  const canSell = roleOk(['pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records']);
  const canDispense = roleOk(['pharmacist', 'records', 'accounts']);
  const canCancelItem = roleOk(['pharmacist', 'records']);
  const canCancelOrder = roleOk(['pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records']);
  const canTakePayment = canAccessPage(user?.role, 'billing');
  const canOpenVisit = canAccessPage(user?.role, 'attendance');
  const canPrintResults = roleOk(['lab_tech', 'sonographer', 'records']);
  const canPrintMoneyDoc = roleOk(['accounts', 'records']);
  const canPrintPrescription = roleOk(['pharmacist', 'records']);
  const canRegister = roleOk(['records']);
  const isOpen = !!ticket && !CLOSED_STATUSES.includes(String(ticket.status));

  // Handing goods over deducts from the dispenser's own department store, and the backend
  // refuses the dispense when the account has no department. So the control is not shown
  // at all — a button that can only ever fail is worse than no button.
  const hasStore = !!user?.departmentId;

  const detailRequest = useRef(0);

  const loadAvailability = useCallback(async (stockItemIds: string[]) => {
    const ids = Array.from(new Set(stockItemIds.filter(Boolean)));
    if (ids.length === 0 || !hasStore) return;
    try {
      const response = await getCounterStockAvailability(ids);
      const result = response?.data ?? response;
      setStoreName(result?.department?.name ?? null);
      setAvailability((current) => ({ ...current, ...(result?.items ?? {}) }));
    } catch {
      // Availability is a guard rail, not the ticket itself: the server still refuses an
      // uncovered sale with the same numbers, so a failed pre-check must not blank the page.
    }
  }, [hasStore]);

  /**
   * `quiet` keeps the ticket on screen while it is re-read, which is what the desk wants after
   * adding an item; a full reload clears first so a stale row from the previous ticket can never
   * be deleted against the newly selected one.
   */
  const loadTicket = useCallback(async (ticketId: string, quiet = false) => {
    const requestId = detailRequest.current + 1;
    detailRequest.current = requestId;
    if (!quiet) {
      setTicket(null);
      setBill(null);
      setDetailError(null);
      setCatalogError(null);
      setLoadingDetail(true);
    }
    try {
      const [ticketResponse, billResponse] = await Promise.all([getCounterTicket(ticketId), getCounterBill(ticketId)]);
      if (detailRequest.current !== requestId) return;
      const loaded = ticketResponse?.data ?? ticketResponse;
      setTicket(loaded);
      setBill(billResponse?.data ?? null);
      setDetailError(null);
      const basket = pickList(loaded, LIST_KEYS.medications).map(stockItemOf).filter(Boolean) as string[];
      loadAvailability(basket);
    } catch (err: any) {
      if (detailRequest.current !== requestId) return;
      if (!quiet) {
        setTicket(null);
        setBill(null);
      }
      setDetailError(describeApiError(err, 'This ticket could not be opened.'));
    } finally {
      if (detailRequest.current === requestId) setLoadingDetail(false);
    }
  }, [loadAvailability]);

  useEffect(() => {
    if (!id) return;
    loadTicket(id);
  }, [id, loadTicket]);

  useLiveRefresh(['counter', 'bills', 'encounters', 'billing'], () => {
    if (id) loadTicket(id, true);
  });

  // Catalog lookups are debounced: the counter types a drug name while the
  // customer is standing at the desk, and every keystroke should not be a request.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (drugSearch.trim().length < 2) { setDrugResults([]); return; }
      try {
        const rows = unwrap(await fetchCatalog('medication', drugSearch.trim()));
        setDrugResults(rows);
        setCatalogError(null);
        loadAvailability(rows.map(stockItemOf).filter(Boolean) as string[]);
      } catch (err: any) {
        setDrugResults([]);
        setCatalogError(describeApiError(err, 'The medicine list could not be searched.'));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [drugSearch, loadAvailability]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (labSearch.trim().length < 2) { setLabResults([]); return; }
      try {
        setLabResults(unwrap(await fetchCatalog('lab_test', labSearch.trim())));
        setCatalogError(null);
      } catch (err: any) {
        setLabResults([]);
        setCatalogError(describeApiError(err, 'The lab test list could not be searched.'));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [labSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (scanSearch.trim().length < 2) { setScanResults([]); return; }
      try {
        setScanResults(unwrap(await fetchCatalog('scan', scanSearch.trim())));
        setCatalogError(null);
      } catch (err: any) {
        setScanResults([]);
        setCatalogError(describeApiError(err, 'The scan list could not be searched.'));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [scanSearch]);

  /** Every write: show which action is running, name the server's reason when it fails, re-read on success. */
  const run = useCallback(async (
    busyLabel: string,
    action: () => Promise<any>,
    options: { failureTitle?: string; successTitle?: string; successMessage?: string } = {},
  ): Promise<boolean> => {
    setWorking(busyLabel);
    try {
      await action();
      if (id) await loadTicket(id, true);
      if (options.successTitle) success(options.successTitle, options.successMessage);
      return true;
    } catch (err: any) {
      toastError(options.failureTitle || 'Not saved', describeApiError(err, 'The change could not be saved.'));
      // The server rejected a write, so the row it touched may have moved under us.
      if (err?.response?.status === 409 && id) await loadTicket(id, true);
      return false;
    } finally {
      setWorking(null);
    }
  }, [id, loadTicket, success, toastError]);

  const confirmThen = async (options: Parameters<typeof confirmDialog>[0], action: () => Promise<boolean>) => {
    if (!await confirmDialog(options)) return;
    await action();
  };

  const medications = useMemo(() => pickList(ticket, LIST_KEYS.medications), [ticket]);
  const labs = useMemo(() => pickList(ticket, LIST_KEYS.labs), [ticket]);
  const scans = useMemo(() => pickList(ticket, LIST_KEYS.scans), [ticket]);
  const identity = identityOf(ticket);
  const hasResults = labs.some((o: any) => o.status === 'completed') || scans.some((s: any) => s.status === 'completed');
  const hasDispensed = medications.some((m: any) => m.status === 'dispensed' || m.status === 'administered');
  const balance = Number(bill?.balance ?? 0);

  const requestedQty = Number(drugQty);
  const addDrug = (catalogRow: any) => {
    const stockItemId = stockItemOf(catalogRow);
    if (!stockItemId) {
      toastError('Not sellable here', `"${catalogRow?.name || 'This item'}" has no stock item linked, so the counter cannot hand it over.`);
      return;
    }
    if (!Number.isSafeInteger(requestedQty) || requestedQty <= 0) {
      toastError('Check the quantity', 'Enter a whole number of items greater than zero.');
      return;
    }
    run('Add item', () => addCounterSaleItem(ticket.id, { stockItemId, quantity: requestedQty }), { failureTitle: 'Item not added' })
      .then((done) => { if (done) { setDrugSearch(''); setDrugResults([]); setDrugQty('1'); } });
  };

  const print = async (busyLabel: string, failureTitle: string, generate: () => Promise<any>, fileName: string) => {
    setWorking(busyLabel);
    try {
      const result: any = await generate();
      const documentId = result?.data?.documentId ?? result?.documentId;
      if (!documentId) throw new Error('The document was prepared without a file reference.');
      const blob = await downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      success('Document ready', 'Saved as a PDF — print it from the file.');
    } catch (err: any) {
      // Downloads are blob responses, so the server's reason has to be read back out of the blob.
      toastError(failureTitle, await describeBlobError(err, 'The document could not be prepared.'));
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={ticket ? `${identity.label} · ticket #${ticket.attendanceNumber}` : 'Counter ticket'}
        subtitle="Sell, order, hand over and bill — the ticket is a visit of its own"
        icon={ClipboardList}
        accent="cyan"
        meta={ticket ? `${dateTime(ticket.dateTime)}${openedByLabel(ticket) ? ` · opened by ${openedByLabel(ticket)}` : ''}` : undefined}
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={loadingDetail} disabled={loadingDetail || !!working} onClick={() => id && loadTicket(id)}>
              Refresh
            </Button>
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dashboard/counter')}>
              Back to counter
            </Button>
            <Button variant="soft" accent="cyan" icon={Plus} onClick={() => navigate('/dashboard/counter/new')}>
              New counter
            </Button>
          </>
        )}
      />

      {detailError && !ticket ? (
        <div role="alert" className={cn(shell, 'p-4 flex items-start gap-2 border-[var(--icon-red-text)]')}>
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--icon-red-text)]" />
          <div>
            <p className="text-sm font-medium text-[var(--icon-red-text)]">This ticket could not be opened</p>
            <p className="text-sm text-[var(--icon-red-text)] mt-0.5">{detailError}</p>
            {id ? (
              <Button variant="secondary" icon={RefreshCw} className="mt-2" disabled={!!working} onClick={() => loadTicket(id)}>
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      ) : loadingDetail || !ticket ? (
        <div className={`${shell} p-6 space-y-4`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--bg-main)] rounded-xl animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-[var(--bg-main)] rounded w-48 animate-pulse" />
              <div className="h-3 bg-[var(--bg-main)] rounded w-64 animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-[var(--bg-main)] rounded-lg animate-pulse" />
            <div className="h-20 bg-[var(--bg-main)] rounded-lg animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ticket header */}
          <div className={`${shell} p-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[var(--icon-cyan-text)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">{identity.label}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {identity.detail} · {identity.phone} · ticket #{ticket.attendanceNumber}
                    {openedByLabel(ticket) ? ` · opened by ${openedByLabel(ticket)}` : ''}
                  </p>
                  {ticket.complaints ? <p className="text-sm mt-1 text-[var(--text-primary)]">{ticket.complaints}</p> : null}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge tone={ticketTone(ticket.status)} dot size="sm">{ticketLabel(ticket.status)}</Badge>
                {identity.kind === 'walk_in' && identity.client && !identity.client.registeredPatientId && canRegister ? (
                  <p className="text-xs text-[var(--text-secondary)] mt-2">Not in the register — link them in “Bill” if they register.</p>
                ) : null}
              </div>
            </div>
            {!isOpen ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[var(--text-secondary)]" /> This ticket is {label(ticket.status)}. Selling, ordering, billing and closing are switched off — open a new one for anything else.
              </p>
            ) : null}
            {canDispense && !hasStore ? (
              <p className="mt-3 text-sm text-[var(--icon-orange-text)] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your account has no department, so this screen cannot hand goods over — dispensing takes the stock from your own store. Ask an administrator to assign you to the pharmacy or issuing store.</span>
              </p>
            ) : null}
            {detailError || catalogError ? (
              <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-3 py-2 text-sm text-[var(--icon-red-text)]">
                <AlertCircle className="h-4 w-4 shrink-0" /> {detailError || catalogError}
              </div>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="border-b border-[var(--border-color)]">
            <div className="flex gap-4">
              {([
                ['sell', 'Sell items', Plus, medications.length],
                ['orders', 'Labs & scans', FlaskConical, labs.length + scans.length],
                ['bill', 'Bill & print', Printer, 0],
              ] as const).map(([key, text, Icon, count]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
                  className={`px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-2 ${
                    tab === key
                      ? 'text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]'
                      : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {text}
                  {count > 0 ? <span className="bg-[var(--bg-main)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full text-xs">{count}</span> : null}
                </button>
              ))}
            </div>
          </div>

          {tab === 'sell' ? (
            <div className="space-y-4">
              <div className={shell}>
                <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add a medicine</h3>
                  {hasStore ? <span className="text-xs text-[var(--text-secondary)]">Selling from {storeName ?? 'your store'}</span> : null}
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2">
                    <input
                      className={cn(INPUT, 'w-full')}
                      placeholder="Type the item name (min. 2 letters)"
                      value={drugSearch}
                      onChange={(e) => setDrugSearch(e.target.value)}
                      disabled={!isOpen || !canSell}
                    />
                    <input
                      className={cn(INPUT, 'w-full')}
                      type="number" min={1} step={1}
                      value={drugQty}
                      onChange={(e) => setDrugQty(e.target.value)}
                      disabled={!isOpen || !canSell}
                    />
                  </div>
                  {drugResults.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                      {drugResults.slice(0, 12).map((row) => {
                        const stockItemId = stockItemOf(row);
                        const item = stockItemId ? availability[stockItemId] : undefined;
                        // Block before selling: the basket is refused by the server on exactly
                        // these numbers, so the desk finds out here rather than with the
                        // customer waiting at the desk.
                        const shortBy = item && Number.isSafeInteger(requestedQty) ? item.available - requestedQty : null;
                        const blocked = !!item && hasStore && shortBy !== null && shortBy < 0;
                        return (
                          <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                            <span className="text-sm text-[var(--text-primary)]">
                              {row?.stockItem?.name || row.name}
                              {row?.stockItem?.strength ? <span className="text-xs text-[var(--text-secondary)]"> {row.stockItem.strength}</span> : null}
                              <span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'} · {money(row?.pricing?.[0]?.cashPrice)}</span>
                              {item && hasStore ? (
                                <span className={cn('text-xs block', blocked ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-secondary)]')}>
                                  {blocked
                                    ? `Only ${item.available} in ${item.storeName ?? storeName ?? 'your store'} (${item.limitedBy}) — you asked for ${requestedQty}.`
                                    : `${item.available} available in ${item.storeName ?? storeName ?? 'your store'}`}
                                </span>
                              ) : null}
                            </span>
                            <Button
                              variant="secondary"
                              icon={Plus}
                              onClick={() => addDrug(row)}
                              disabled={!!working || !isOpen || !canSell || blocked}
                              title={blocked ? 'Your store cannot hand over this quantity' : undefined}
                            >
                              Add
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : drugSearch.trim().length >= 2 ? (
                    <p className="text-sm text-[var(--text-secondary)] px-1 py-2">Nothing on the priced list matches “{drugSearch.trim()}”.</p>
                  ) : null}
                  {!canSell ? (
                    <p className="text-xs text-[var(--text-secondary)]">Your role can read this ticket but not sell against it, so the basket is shown as it stands.</p>
                  ) : (
                    <p className="text-xs text-[var(--text-secondary)]">
                      Only priced items on the pharmacy list can be sold here — the counter hands over stock through the
                      pharmacy's own dispensing, so stock, batches and the bill all move together.
                    </p>
                  )}
                </div>
              </div>

              <div className={shell}>
                <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Basket ({medications.length})</h3>
                  {canPrintPrescription && hasDispensed ? (
                    <Button
                      variant="secondary"
                      icon={Printer}
                      onClick={() => print('Print labels', 'Labels not printed', () => generatePrescription(ticket.id), `counter_${ticket.attendanceNumber}_labels`)}
                      disabled={!!working}
                    >
                      Print dispensed labels
                    </Button>
                  ) : null}
                </div>
                {medications.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] p-4">Nothing on the ticket yet.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className={TH_ROW}>
                        <tr>
                          <th className={TH}>Item</th>
                          <th className={cn(TH, 'text-right')}>Qty</th>
                          <th className={TH}>Status</th>
                          <th className={cn(TH, 'text-center')}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medications.map((med) => {
                          const deletable = isOpen && (med.status === 'prescribed' || med.status === 'cancelled');
                          const item = availability[stockItemOf(med) ?? ''];
                          // The shelf already carries this line's own promise, so a line can be
                          // handed over while the store covers every promised line together.
                          const shelfShortsPromise = !!item && item.shelf < item.promised;
                          return (
                            <tr key={med.id} className={TR}>
                              <td className={cn(TD, 'whitespace-normal')}>
                                {med.name}
                                {item && hasStore ? (
                                  <span className={cn('text-xs', shelfShortsPromise ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-secondary)]')}>
                                    {' · '}{item.available} of {item.shelf} in {item.storeName ?? storeName ?? 'your store'}
                                  </span>
                                ) : med?.stockItem?.currentStock != null ? (
                                  <span className="text-xs text-[var(--text-secondary)]"> · {med.stockItem.currentStock} in stock hospital-wide</span>
                                ) : null}
                              </td>
                              <td className={cn(TD, 'text-right')}>{med.quantity}</td>
                              <td className={TD}><Badge tone={ticketTone(med.status)} dot size="sm">{ticketLabel(med.status)}</Badge></td>
                              <td className={TD}>
                                <div className="flex items-center justify-end gap-2">
                                  {med.status === 'prescribed' && canDispense && hasStore && isOpen ? (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      icon={CheckCircle2}
                                      disabled={!!working || shelfShortsPromise}
                                      title={shelfShortsPromise ? `${item?.promised} promised in ${item?.storeName ?? 'your store'} but only ${item?.shelf} on the shelf` : undefined}
                                      onClick={() => confirmThen(
                                        {
                                          title: 'Hand over this item?',
                                          message: `${med.quantity} × ${med.name} leaves the shelf now, and the bill picks up the price.`,
                                          confirmText: 'Hand over',
                                          type: 'info',
                                        },
                                        () => run('Hand over', () => dispenseCounterItem(ticket.id, med.id, med.quantity), { failureTitle: 'Not handed over', successTitle: 'Handed over', successMessage: `${med.name} is out of stock and ready for the customer.` }),
                                      )}
                                    >
                                      Hand over
                                    </Button>
                                  ) : null}
                                  {deletable && canCancelItem ? (
                                    <Button
                                      variant="dangerSoft"
                                      iconOnly
                                      icon={Trash2}
                                      aria-label="Delete line"
                                      title="Delete this line"
                                      disabled={!!working}
                                      onClick={() => confirmThen(
                                        {
                                          title: 'Delete this item?',
                                          message: `${med.name} has not been handed over, so it is deleted and never reaches the bill.`,
                                          confirmText: 'Delete item',
                                          type: 'danger',
                                        },
                                        () => run('Delete item', () => removeCounterSaleItem(ticket.id, med.id), { failureTitle: 'Item not deleted', successTitle: 'Item deleted', successMessage: `${med.name} is off the ticket.` }),
                                      )}
                                    />
                                  ) : null}
                                  {med.status === 'dispensed' || med.status === 'administered' ? (
                                    <span className="text-xs text-[var(--text-secondary)]">stock left the shelf — return it through the pharmacy</span>
                                  ) : med.status === 'prescribed' && !canDispense ? (
                                    <span className="text-xs text-[var(--text-secondary)]">the counter bench hands this over</span>
                                  ) : med.status === 'prescribed' && canDispense && !hasStore ? (
                                    <span className="text-xs text-[var(--icon-orange-text)]">no department on your account, so you cannot hand over</span>
                                  ) : med.status === 'prescribed' && shelfShortsPromise ? (
                                    <span className="text-xs text-[var(--icon-red-text)]">short in {item?.storeName ?? 'your store'} — {item?.shelf} on the shelf, {item?.promised} promised</span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === 'orders' ? (
            <div className="space-y-4">
              <div className={shell}>
                <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Request a lab test</h3>
                </div>
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-2">
                    <input className={cn(INPUT, 'w-full')} placeholder="Type the test name (min. 2 letters)" value={labSearch} onChange={(e) => setLabSearch(e.target.value)} disabled={!isOpen || !canSell} />
                    <select className={cn(SELECT, 'w-full')} value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!isOpen || !canSell}>
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">Stat</option>
                    </select>
                  </div>
                  {labResults.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                      {labResults.slice(0, 12).map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                          <span className="text-sm text-[var(--text-primary)]">{row?.labTestTemplate?.name || row.name}<span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'}</span></span>
                          <Button
                            variant="secondary"
                            icon={Plus}
                            disabled={!!working || !isOpen || !canSell}
                            onClick={() => run('Request test', () => addCounterLabOrder(ticket.id, { serviceCatalogId: row.id, priority }), { failureTitle: 'Test not requested' })
                              .then((done) => { if (done) { setLabSearch(''); setLabResults([]); } })}
                          >
                            Request
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : labSearch.trim().length >= 2 ? (
                    <p className="text-sm text-[var(--text-secondary)] px-1 py-2">No lab test on the price list matches “{labSearch.trim()}”.</p>
                  ) : null}
                </div>
              </div>

              <div className={shell}>
                <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2"><Scan className="w-4 h-4" /> Request a scan</h3>
                </div>
                <div className="p-4 space-y-2">
                  <input className={cn(INPUT, 'w-full')} placeholder="Type the study name (min. 2 letters)" value={scanSearch} onChange={(e) => setScanSearch(e.target.value)} disabled={!isOpen || !canSell} />
                  {scanResults.length > 0 ? (
                    <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                      {scanResults.slice(0, 12).map((row) => (
                        <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                          <span className="text-sm text-[var(--text-primary)]">{row?.scanTemplate?.name || row.name}<span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'}</span></span>
                          <Button
                            variant="secondary"
                            icon={Plus}
                            disabled={!!working || !isOpen || !canSell}
                            onClick={() => run('Request scan', () => addCounterScanOrder(ticket.id, { serviceCatalogId: row.id, priority: priority === 'stat' ? 'urgent' : priority }), { failureTitle: 'Scan not requested' })
                              .then((done) => { if (done) { setScanSearch(''); setScanResults([]); } })}
                          >
                            Request
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : scanSearch.trim().length >= 2 ? (
                    <p className="text-sm text-[var(--text-secondary)] px-1 py-2">No scan study on the price list matches “{scanSearch.trim()}”.</p>
                  ) : null}
                  <p className="text-xs text-[var(--text-secondary)]">Imaging has no stat priority, so a stat request becomes urgent for the scan.</p>
                </div>
              </div>

              <div className={shell}>
                <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Orders on this ticket ({labs.length + scans.length})</h3>
                  {canPrintResults ? (
                    <Button
                      variant="secondary"
                      icon={Printer}
                      disabled={!!working || !hasResults}
                      title={hasResults ? 'Prints the lab and scan sheet for this ticket' : 'Nothing has been reported yet'}
                      onClick={() => print('Print results', 'Results not printed', () => generateLabResult(ticket.id), `counter_${ticket.attendanceNumber}_results`)}
                    >
                      Print result sheet
                    </Button>
                  ) : null}
                </div>
                {labs.length === 0 && scans.length === 0 ? (
                  <p className="text-sm text-[var(--text-secondary)] p-4">No lab tests or scans requested.</p>
                ) : (
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className={TH_ROW}>
                        <tr>
                          <th className={TH}>Order</th>
                          <th className={TH}>Type</th>
                          <th className={TH}>Status</th>
                          <th className={cn(TH, 'text-center')}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...labs.map((order: any) => ({ ...order, kind: 'Lab test', icon: FlaskConical, nameLabel: order?.labTestTemplate?.name || order?.serviceCatalog?.name || 'Lab test' })),
                          ...scans.map((study: any) => ({ ...study, kind: 'Scan', icon: Scan, nameLabel: getScanDisplayName(study) })),
                        ].map((order: any) => {
                          const Icon = order.icon;
                          const cancellable = isOpen && CANCELLABLE_ORDER_STATUSES.includes(String(order.status));
                          return (
                            <tr key={`${order.kind}-${order.id}`} className={TR}>
                              <td className={cn(TD, 'whitespace-normal')}>
                                <span className="flex items-center gap-2">
                                  <Icon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                                  {order.nameLabel}
                                </span>
                              </td>
                              <td className={cn(TD, 'text-[var(--text-secondary)]')}>{order.kind}</td>
                              <td className={TD}><Badge tone={ticketTone(order.status)} dot size="sm">{ticketLabel(order.status)}</Badge></td>
                              <td className={TD}>
                                <div className="flex items-center justify-end gap-2">
                                  {cancellable && canCancelOrder ? (
                                    <Button
                                      variant="dangerSoft"
                                      iconOnly
                                      icon={Trash2}
                                      aria-label="Delete order"
                                      title="Delete this order"
                                      disabled={!!working}
                                      onClick={() => confirmThen(
                                        {
                                          title: `Delete this ${order.kind.toLowerCase()} order?`,
                                          message: `${order.nameLabel} has not been started yet, so it is deleted and never reaches the bill.`,
                                          confirmText: 'Delete order',
                                          type: 'danger',
                                        },
                                        () => run(
                                          'Delete order',
                                          () => (order.kind === 'Lab test' ? removeCounterLabOrder(ticket.id, order.id) : removeCounterScanOrder(ticket.id, order.id)),
                                          { failureTitle: 'Order not deleted', successTitle: 'Order deleted', successMessage: `${order.nameLabel} is off the ticket.` },
                                        ),
                                      )}
                                    />
                                  ) : null}
                                  {order.status === 'completed' || order.status === 'in_progress' ? (
                                    <span className="text-xs text-[var(--text-secondary)]">{order.status === 'completed' ? 'reported — print the result sheet above' : 'with the department — cancel it there'}</span>
                                  ) : !cancellable && !isOpen ? (
                                    <span className="text-xs text-[var(--text-secondary)]">ticket closed</span>
                                  ) : !canCancelOrder ? (
                                    <span className="text-xs text-[var(--text-secondary)]">the requesting department deletes this</span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p className="text-xs text-[var(--text-secondary)] px-4 py-3 border-t border-[var(--border-color)]">
                  Results are entered by the lab or scan room on their own screen — this ticket shows up in their
                  queue with the customer's name. A requested order can be deleted here, but once it has been
                  picked up (in progress) only the department can drop it.
                  {/* The visit screen is role-gated separately, and the pharmacy bench has no route to it, so the
                      link only appears for the roles that can actually open it. */}
                  {canOpenVisit ? (
                    <> The visit record is at{' '}
                      <button className="underline" onClick={() => navigate(`/dashboard/attendance/${ticket.id}`)}>Attendance</button>.
                    </>
                  ) : null}
                </p>
              </div>
            </div>
          ) : null}

          {tab === 'bill' ? (
            <div className={shell}>
              <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bill &amp; print</h3>
              </div>
              <div className="p-4 space-y-3">
                {!bill ? (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">No bill has been raised for this ticket yet.</p>
                    <Button
                      variant="soft"
                      accent="cyan"
                      icon={DollarSign}
                      onClick={() => run('Raise bill', () => raiseCounterBill(ticket.id), { failureTitle: 'Bill not raised', successTitle: 'Bill raised', successMessage: 'The counter can now be paid at accounts.' })}
                      disabled={!!working || !isOpen || !canSell}
                    >
                      Raise the bill
                    </Button>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Pricing uses the tariff in force on the day of the visit, the same rule every other bill follows.
                    </p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-[var(--text-secondary)]">Bill number</dt><dd className="text-[var(--text-primary)]">{bill.billNumber}</dd>
                      <dt className="text-[var(--text-secondary)]">Total</dt><dd className="text-[var(--text-primary)]">{money(bill.totalAmount)}</dd>
                      <dt className="text-[var(--text-secondary)]">Paid</dt><dd className="text-[var(--text-primary)]">{money(bill.paidAmount)}</dd>
                      <dt className="text-[var(--text-secondary)]">Balance</dt><dd className="text-[var(--text-primary)] font-semibold">{money(bill.balance)}</dd>
                      <dt className="text-[var(--text-secondary)]">Status</dt><dd><Badge tone={ticketTone(bill.status)} dot size="sm">{ticketLabel(bill.status)}</Badge></dd>
                    </dl>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {canTakePayment && balance > 0 ? (
                        <Button variant="soft" accent="cyan" icon={DollarSign} onClick={() => navigate(`/dashboard/billing/${bill.id}/payment`)}>
                          Take payment at accounts
                        </Button>
                      ) : null}
                      {canPrintMoneyDoc ? (
                        <>
                          <Button
                            variant="secondary"
                            icon={Printer}
                            disabled={!!working}
                            onClick={() => print('Print statement', 'Statement not printed', () => generateBillStatement(bill.id), `counter_${bill.billNumber}_statement`)}
                          >
                            Print statement
                          </Button>
                          <Button
                            variant="secondary"
                            icon={Printer}
                            disabled={!!working}
                            onClick={() => print('Print receipt', 'Receipt not printed', () => generateReceipt(bill.id), `counter_${bill.billNumber}_receipt`)}
                          >
                            Print receipt
                          </Button>
                        </>
                      ) : null}
                      <Button
                        variant="secondary"
                        icon={RefreshCw}
                        disabled={!!working}
                        onClick={() => run('Re-check bill', async () => {
                          const response = await getCounterBill(ticket.id);
                          setBill(response?.data ?? null);
                          return response;
                        }, { failureTitle: 'Bill not re-checked', successTitle: 'Bill re-checked', successMessage: 'The numbers shown are the ones accounts has.' })}
                      >
                        Re-check the bill
                      </Button>
                      {isOpen ? (
                        <Button
                          variant="secondary"
                          icon={DollarSign}
                          disabled={!!working}
                          title="Adds anything handed over or reported since the bill was raised, and recomputes the total"
                          onClick={() => run('Update bill', () => raiseCounterBill(ticket.id), { failureTitle: 'Bill not updated', successTitle: 'Bill updated', successMessage: 'New items are on the bill and the balance is recomputed.' })}
                        >
                          Add what is new to the bill
                        </Button>
                      ) : null}
                    </div>
                    {balance > 0 && !canTakePayment ? (
                      <p className="text-xs text-[var(--icon-orange-text)] flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Accounts takes the money on the billing screen; the counter only prices the basket.</p>
                    ) : null}
                    <p className="text-xs text-[var(--text-secondary)]">
                      Only what has left the shelf or has a filed result is charged, so an item or order cancelled
                      here never reaches the bill — and anything handed over after the bill was raised is added by
                      “Add what is new to the bill”.
                    </p>
                  </div>
                )}

                {isOpen && canSell ? (
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <Button
                      variant="dangerSoft"
                      icon={CheckCircle2}
                      disabled={!!working}
                      onClick={() => confirmThen(
                        {
                          title: 'Close this ticket?',
                          message: 'Closing is refused until every order has a result, every item has been handed over and the balance is zero.',
                          confirmText: 'Close ticket',
                          type: 'warning',
                        },
                        () => run('Close ticket', () => closeCounterTicket(ticket.id), { failureTitle: 'Ticket not closed', successTitle: 'Ticket closed', successMessage: `${identity.label}'s visit is finished.` }),
                      )}
                    >
                      Close this ticket
                    </Button>
                  </div>
                ) : null}

                {identity.kind === 'walk_in' && identity.client && canRegister ? (
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <p className="text-sm text-[var(--text-secondary)]">Registered since? Link this customer to their folder so future visits are found under one name.</p>
                    <RegisterLink clientId={identity.client.id} onDone={() => loadTicket(ticket.id, true)} />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RegisterLink({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const { success, error } = useToast();
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 2) { setMatches([]); return; }
      try {
        setMatches(unwrap(await searchCounterPatients(search.trim())));
        setSearchError(null);
      } catch (err: any) {
        setMatches([]);
        setSearchError(describeApiError(err, 'The register could not be searched.'));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const link = async (patient: any) => {
    const name = `${patient.surname || ''} ${patient.otherNames || ''}`.trim();
    setBusy(true);
    try {
      await linkCounterClient(clientId, patient.id);
      success('Linked', `${name} is now linked to this counter customer.`);
      onDone();
    } catch (err: any) {
      error(describeApiErrorTitle(err, 'Not linked'), describeApiError(err, 'The folder could not be linked to this counter customer.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <input
        className={cn(INPUT, 'w-full')}
        placeholder="Folder name, number or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-40 overflow-y-auto">
        {searchError ? (
          <li className="px-3 py-2">
            <span role="alert" className="flex items-center gap-2 text-sm text-[var(--icon-red-text)]">
              <AlertCircle className="h-4 w-4 shrink-0" /> {searchError}
            </span>
          </li>
        ) : null}
        {matches.map((patient) => (
          <li key={patient.id}>
            <button
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] disabled:opacity-50"
              disabled={busy}
              onClick={() => link(patient)}
            >
              {`${patient.surname || ''} ${patient.otherNames || ''}`.trim()}
              <span className="text-xs text-[var(--text-secondary)]"> · Folder {patient.folderNumber}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 && !searchError && search.trim().length >= 2 ? (
          <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">No registered patient matches.</li>
        ) : null}
      </ul>
      <p className="text-xs text-[var(--text-secondary)]">The link points the counter history at the folder; bills already raised keep the identity they were created with.</p>
    </div>
  );
}
