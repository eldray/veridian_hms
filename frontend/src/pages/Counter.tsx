// src/pages/Counter.tsx
//
// The counter: someone walks in, wants a drug, a lab test or a scan, pays at
// accounts and collects a printed sheet. They are not joining the clinical
// register, so the ticket is held against a CounterClient (name, and age or
// phone when given) instead of a Patient. Everything after the identity —
// ordering, results, dispensing, the bill, the printed paper — is the same
// pipeline the clinical screens use, reached through /api/counter.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import { canAccessPage, isAdminLike } from '../config/access';
import { confirmDialog } from '../context/ConfirmDialog';
import { describeApiError, describeApiErrorTitle, describeBlobError } from '../utils/apiError';
import { formatCurrency } from '../utils/currency';
import {
  addCounterLabOrder, addCounterSaleItem, addCounterScanOrder, closeCounterTicket,
  createCounterTicket, dispenseCounterItem, downloadDocument, generateBillStatement,
  generateLabResult, generatePrescription, generateReceipt, getCounterBill, getCounterTicket,
  getServiceCatalog, linkCounterClient, listCounterTickets, raiseCounterBill, removeCounterLabOrder,
  removeCounterSaleItem, removeCounterScanOrder, searchCounterClients, searchCounterPatients,
} from '../api';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ClipboardList, DollarSign, FlaskConical,
  Plus, Printer, RefreshCw, Scan, Search, Store, User, UserPlus, X,
} from 'lucide-react';
import {
  Badge,
  Button,
  cn,
  humanStatus,
  INPUT,
  PageHeader,
  SearchInput,
  SELECT,
  statusTone,
  TD,
  TH,
  TH_ROW,
  TR,
  type Accent,
  type BadgeTone,
} from '../components/ui';

const unwrap = (response: any): any[] => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const pickList = (record: any, keys: string[]): any[] => {
  for (const key of keys) {
    const value = record?.[key];
    if (Array.isArray(value)) return value;
  }
  return [];
};

const money = (value: any) => formatCurrency(value);

const dateTime = (value: any) => (value ? new Date(value).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const label = (value: any) => String(value ?? '').replace(/_/g, ' ');

// The API answers with Prisma's relation names, lower-cased by the response
// normaliser, so both spellings are tried rather than silently showing nothing.
const LIST_KEYS = {
  medications: ['medication', 'Medication', 'medications'],
  labs: ['labTest', 'LabTest', 'labTests'],
  scans: ['scan', 'Scan', 'scans'],
};

/**
 * The statuses that stop every ticket write.
 *
 * This is the set backend CounterService.requireOpenTicket refuses on — not just
 * completed/cancelled — so a button here never offers an action the server answers with 409.
 */
const CLOSED_STATUSES = ['completed', 'cancelled', 'discharged', 'referred', 'absconded'];

/** The orders the encounter repository will still cancel: requested, or in progress but not reported. */
const CANCELLABLE_ORDER_STATUSES = ['requested', 'in_progress'];

const openedByLabel = (ticket: any): string =>
  ticket?.openedBy
  || ticket?.user_Attendance_createdByIdToUser?.fullName
  || ticket?.User_Attendance_createdByIdToUser?.fullName
  || '';

const identityOf = (ticket: any) => {
  const client = ticket?.counterClient || ticket?.CounterClient || null;
  const patient = ticket?.patient || ticket?.Patient || null;
  if (client) return { label: client.name, detail: client.ageYears != null ? `${client.ageYears} years` : 'age not given', phone: client.phone || 'no phone', kind: 'walk_in' as const, client, patient };
  if (patient) {
    const name = `${patient.surname || ''} ${patient.otherNames || ''}`.trim() || 'Registered patient';
    return { label: name, detail: `Folder ${patient.folderNumber || '—'}`, phone: patient.contact || 'no phone', kind: 'patient' as const, client, patient };
  }
  return { label: 'Unnamed customer', detail: '—', phone: '—', kind: 'walk_in' as const, client, patient };
};

// The only ticket statuses Badge's STATUS_TONES does not carry: keep their
// local colours here rather than editing the shared primitive (rule R13).
const LOCAL_TONES: Record<string, Accent> = {
  requested: 'yellow',
  prescribed: 'yellow',
  administered: 'green',
};

const ticketTone = (value: any): BadgeTone => {
  const key = label(value).toLowerCase();
  return LOCAL_TONES[key] ?? statusTone(key);
};

const ticketLabel = (value: any): string => (value ? humanStatus(value) : 'unknown');

const shell = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm';

type Tab = 'sell' | 'orders' | 'bill';

export default function Counter() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketQuery, setTicketQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any | null>(null);
  const [bill, setBill] = useState<any | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState<Tab>('sell');
  const [working, setWorking] = useState<string | null>(null);

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [identityMode, setIdentityMode] = useState<'new' | 'existing' | 'patient'>('new');
  const [form, setForm] = useState({ name: '', ageYears: '', phone: '', reason: '' });
  const [clientSearch, setClientSearch] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [clientMatches, setClientMatches] = useState<any[]>([]);
  const [patientMatches, setPatientMatches] = useState<any[]>([]);
  const [chosenClient, setChosenClient] = useState<any | null>(null);
  const [chosenPatient, setChosenPatient] = useState<any | null>(null);
  const [identitySearchError, setIdentitySearchError] = useState<string | null>(null);

  const [drugSearch, setDrugSearch] = useState('');
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [drugQty, setDrugQty] = useState('1');
  const [labSearch, setLabSearch] = useState('');
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scanSearch, setScanSearch] = useState('');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [priority, setPriority] = useState('routine');

  // Gates mirror the requireRole lists on /api/counter and /api/documents, admin and
  // super_admin included — `hasRole` alone implies super_admin but NOT admin, which hid
  // these controls from the administrator who can perform every one of them.
  const roleOk = (roles: string[]) => isAdminLike(user?.role) || hasRole(roles);
  const canSell = roleOk(['pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records']);
  const canDispense = roleOk(['pharmacist']);
  const canCancelItem = roleOk(['pharmacist', 'records']);
  const canCancelOrder = roleOk(['pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records']);
  const canTakePayment = canAccessPage(user?.role, 'billing');
  const canOpenVisit = canAccessPage(user?.role, 'attendance');
  const canPrintResults = roleOk(['lab_tech', 'sonographer', 'records']);
  const canPrintMoneyDoc = roleOk(['accounts', 'records']);
  const canPrintPrescription = roleOk(['pharmacist', 'records']);
  const canRegister = roleOk(['records']);
  const isOpen = !!ticket && !CLOSED_STATUSES.includes(String(ticket.status));

  const detailRequest = useRef(0);

  const loadTickets = useCallback(async (query: string, silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const response = await listCounterTickets({ query: query || undefined, limit: 50 });
      setTickets(unwrap(response));
      setPage(1);
      setHasNext(!!response?.meta?.hasNext);
      setTotalTickets(Number(response?.meta?.total ?? unwrap(response).length));
      setListError(null);
    } catch (err: any) {
      setTickets([]);
      setListError(describeApiError(err, 'The ticket list could not be loaded.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMoreTickets = useCallback(async () => {
    setLoadingMore(true);
    try {
      const response = await listCounterTickets({ query: debouncedQuery || undefined, page: page + 1, limit: 50 });
      setTickets((current) => [...current, ...unwrap(response)]);
      setPage((current) => current + 1);
      setHasNext(!!response?.meta?.hasNext);
    } catch (err: any) {
      toastError('No more tickets', describeApiError(err, 'The next page of tickets could not be loaded.'));
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedQuery, page, toastError]);

  /**
   * `quiet` keeps the ticket on screen while it is re-read, which is what the desk wants after
   * adding an item; a full reload clears first so a stale row from the previous ticket can never
   * be deleted against the newly selected one.
   */
  const loadTicket = useCallback(async (id: string, quiet = false) => {
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
      const [ticketResponse, billResponse] = await Promise.all([getCounterTicket(id), getCounterBill(id)]);
      if (detailRequest.current !== requestId) return;
      setTicket(ticketResponse?.data ?? ticketResponse);
      setBill(billResponse?.data ?? null);
      setDetailError(null);
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(ticketQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [ticketQuery]);

  useEffect(() => { loadTickets(debouncedQuery); }, [debouncedQuery, loadTickets]);

  useEffect(() => {
    if (!selectedId) return;
    loadTicket(selectedId);
  }, [selectedId, loadTicket]);

  // The visit screen sends a walk-in ticket here for anything its patient screens key on a
  // folder number — ordering, results, billing and printing all live on the ticket itself.
  // The param is consumed once, otherwise it keeps re-selecting the ticket and the desk
  // cannot click away from it.
  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    if (!ticketParam) return;
    setSelectedId(ticketParam);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('ticket');
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  useLiveRefresh(['counter', 'bills', 'encounters', 'billing'], () => {
    loadTickets(debouncedQuery, true);
    if (selectedId) loadTicket(selectedId, true);
  });

  // Catalog lookups are debounced: the counter types a drug name while the
  // customer is standing at the desk, and every keystroke should not be a request.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (drugSearch.trim().length < 2) { setDrugResults([]); return; }
      try {
        setDrugResults(unwrap(await fetchCatalog('medication', drugSearch.trim())));
        setCatalogError(null);
      } catch (err: any) {
        setDrugResults([]);
        setCatalogError(describeApiError(err, 'The medicine list could not be searched.'));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [drugSearch]);

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      // A swallowed search failure would read as "nobody of that name exists" and send the desk
      // into creating a second identity for a customer who already has one.
      if (identityMode === 'existing' && clientSearch.trim().length >= 2) {
        try {
          setClientMatches(unwrap(await searchCounterClients(clientSearch.trim())));
          setIdentitySearchError(null);
        } catch (err: any) {
          setClientMatches([]);
          setIdentitySearchError(describeApiError(err, 'The counter book could not be searched.'));
        }
      }
      if (identityMode === 'patient' && patientSearch.trim().length >= 2) {
        try {
          setPatientMatches(unwrap(await searchCounterPatients(patientSearch.trim())));
          setIdentitySearchError(null);
        } catch (err: any) {
          setPatientMatches([]);
          setIdentitySearchError(describeApiError(err, 'The patient register could not be searched.'));
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, patientSearch, identityMode]);

  /** Every write: show which action is running, name the server's reason when it fails, re-read on success. */
  const run = useCallback(async (
    busyLabel: string,
    action: () => Promise<any>,
    options: { failureTitle?: string; successTitle?: string; successMessage?: string } = {},
  ): Promise<boolean> => {
    setWorking(busyLabel);
    try {
      await action();
      if (selectedId) await loadTicket(selectedId, true);
      await loadTickets(debouncedQuery, true);
      if (options.successTitle) success(options.successTitle, options.successMessage);
      return true;
    } catch (err: any) {
      toastError(options.failureTitle || 'Not saved', describeApiError(err, 'The change could not be saved.'));
      // The server rejected a write, so the row it touched may have moved under us.
      if (err?.response?.status === 409 && selectedId) await loadTicket(selectedId, true);
      return false;
    } finally {
      setWorking(null);
    }
  }, [debouncedQuery, loadTickets, loadTicket, selectedId, success, toastError]);

  const confirmThen = async (options: Parameters<typeof confirmDialog>[0], action: () => Promise<boolean>) => {
    if (!await confirmDialog(options)) return;
    await action();
  };

  const submitNewTicket = async () => {
    const payload: any = { reason: form.reason.trim() || undefined };
    if (identityMode === 'new') {
      if (!form.name.trim()) { toastError('A name is required', 'Type the customer name before opening the ticket.'); return false; }
      const age = form.ageYears.trim();
      if (age !== '' && (!Number.isSafeInteger(Number(age)) || Number(age) < 0 || Number(age) > 120)) {
        toastError('Check the age', 'Enter a whole age between 0 and 120, or leave it blank.');
        return false;
      }
      payload.client = {
        name: form.name.trim(),
        ageYears: age === '' ? undefined : Number(age),
        phone: form.phone.trim() || undefined,
      };
    } else if (identityMode === 'existing') {
      if (!chosenClient) { toastError('Pick a customer', 'Search and select the returning customer.'); return false; }
      payload.clientId = chosenClient.id;
    } else {
      if (!chosenPatient) { toastError('Pick a patient', 'Search and select the registered patient.'); return false; }
      payload.patientId = chosenPatient.id;
    }

    let createdTicket: any = null;
    const done = await run('Open ticket', async () => {
      const response = await createCounterTicket(payload);
      createdTicket = response?.data ?? response;
      if (createdTicket?.id) setSelectedId(createdTicket.id);
      setShowNewTicket(false);
      setForm({ name: '', ageYears: '', phone: '', reason: '' });
      setChosenClient(null); setChosenPatient(null); setClientSearch(''); setPatientSearch('');
      setTab('sell');
      return createdTicket;
    }, { failureTitle: 'Ticket not opened' });
    if (done) success('Ticket open', `Now selling for ${identityOf(createdTicket).label}.`);
    return done;
  };

  const addDrug = (catalogRow: any) => {
    const stockItemId = catalogRow?.stockItem?.id || catalogRow?.stockItemId;
    if (!stockItemId) {
      toastError('Not sellable here', `"${catalogRow?.name || 'This item'}" has no stock item linked, so the counter cannot hand it over.`);
      return;
    }
    const quantity = Number(drugQty);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      toastError('Check the quantity', 'Enter a whole number of items greater than zero.');
      return;
    }
    run('Add item', () => addCounterSaleItem(ticket.id, { stockItemId, quantity }), { failureTitle: 'Item not added' })
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

  const medications = useMemo(() => pickList(ticket, LIST_KEYS.medications), [ticket]);
  const labs = useMemo(() => pickList(ticket, LIST_KEYS.labs), [ticket]);
  const scans = useMemo(() => pickList(ticket, LIST_KEYS.scans), [ticket]);
  const identity = identityOf(ticket);
  const hasResults = labs.some((o: any) => o.status === 'completed') || scans.some((s: any) => s.status === 'completed');
  const hasDispensed = medications.some((m: any) => m.status === 'dispensed' || m.status === 'administered');
  const balance = Number(bill?.balance ?? 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Counter"
        subtitle="Walk-in sales, lab and scan requests for customers outside the patient register"
        icon={Store}
        accent="cyan"
        meta={(
          <>
            {totalTickets} ticket(s){debouncedQuery ? ` matching “${debouncedQuery}”` : ''} · a ticket is a visit of its own: it orders, results, hands over stock and raises a bill without a folder number.
          </>
        )}
        actions={(
          <>
            <Button
              variant="secondary"
              icon={RefreshCw}
              loading={loadingList || working === 'Open ticket'}
              disabled={!!working || loadingList}
              onClick={() => loadTickets(debouncedQuery)}
            >
              Refresh
            </Button>
            <Button variant="soft" accent="cyan" icon={UserPlus} onClick={() => { setIdentitySearchError(null); setShowNewTicket(true); }}>
              New ticket
            </Button>
          </>
        )}
      />

      {listError && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Could not load the counter tickets: {listError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start">
        {/* Ticket list */}
        <section className={shell}>
          <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] rounded-t-xl">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[var(--text-secondary)]" /> Tickets
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <SearchInput
              value={ticketQuery}
              onChange={setTicketQuery}
              placeholder="Search by name, phone or ticket number"
            />

            {loadingList ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-[var(--bg-main)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-4 text-center">
                {debouncedQuery ? `No ticket matches “${debouncedQuery}”.` : 'No counter tickets yet. Start one with “New ticket”.'}
              </p>
            ) : (
              <>
                <ul className="space-y-1 max-h-[60vh] overflow-auto">
                  {tickets.map((row) => (
                    <li key={row.id}>
                      <button
                        onClick={() => setSelectedId(row.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${selectedId === row.id ? 'border-[var(--icon-cyan-text)] bg-[var(--bg-main)]' : 'border-transparent hover:bg-[var(--bg-main)]'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{identityOf(row).label}</span>
                          <Badge tone={ticketTone(row.status)} dot size="sm">{ticketLabel(row.status)}</Badge>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                          <span>#{row.attendanceNumber}</span>
                          <span>·</span>
                          <span>{dateTime(row.dateTime)}</span>
                          {row.counterClient || row.CounterClient
                            ? <><span>·</span><span className="text-[var(--icon-orange-text)]">walk-in</span></>
                            : <><span>·</span><span>registered</span></>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {hasNext ? (
                  <Button variant="secondary" fullWidth loading={loadingMore} icon={Search} onClick={loadMoreTickets}>
                    Load older tickets
                  </Button>
                ) : null}
              </>
            )}
          </div>
        </section>

        {/* Workspace */}
        <section className="space-y-4 min-w-0">
          {detailError && !ticket ? (
            <div role="alert" className={cn(shell, 'p-4 flex items-start gap-2 border-[var(--icon-red-text)]')}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[var(--icon-red-text)]" />
              <div>
                <p className="text-sm font-medium text-[var(--icon-red-text)]">This ticket could not be opened</p>
                <p className="text-sm text-[var(--icon-red-text)] mt-0.5">{detailError}</p>
                {selectedId ? (
                  <Button variant="secondary" icon={RefreshCw} className="mt-2" disabled={!!working} onClick={() => loadTicket(selectedId)}>
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
              {!selectedId ? (
                <p className="text-sm text-[var(--text-secondary)] text-center flex items-center justify-center gap-2">
                  <User className="w-4 h-4" /> Pick a ticket on the left, or open a new one for the customer at the desk.
                </p>
              ) : null}
            </div>
          ) : (
            <>
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
                    <div className="bg-[var(--bg-main)] px-6 py-3 border-b border-[var(--border-color)] rounded-t-xl">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Add a medicine</h3>
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
                          {drugResults.slice(0, 12).map((row) => (
                            <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                              <span className="text-sm text-[var(--text-primary)]">
                                {row?.stockItem?.name || row.name}
                                {row?.stockItem?.strength ? <span className="text-xs text-[var(--text-secondary)]"> {row.stockItem.strength}</span> : null}
                                <span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'} · {money(row?.pricing?.[0]?.cashPrice)}</span>
                              </span>
                              <Button variant="secondary" icon={Plus} onClick={() => addDrug(row)} disabled={!!working || !isOpen || !canSell}>
                                Add
                              </Button>
                            </li>
                          ))}
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
                              const cancellable = isOpen && med.status === 'prescribed';
                              return (
                                <tr key={med.id} className={TR}>
                                  <td className={cn(TD, 'whitespace-normal')}>
                                    {med.name}
                                    {med?.stockItem?.currentStock != null ? <span className="text-xs text-[var(--text-secondary)]"> · {med.stockItem.currentStock} in stock</span> : null}
                                  </td>
                                  <td className={cn(TD, 'text-right')}>{med.quantity}</td>
                                  <td className={TD}><Badge tone={ticketTone(med.status)} dot size="sm">{ticketLabel(med.status)}</Badge></td>
                                  <td className={TD}>
                                    <div className="flex items-center justify-end gap-2">
                                      {med.status === 'prescribed' && canDispense && isOpen ? (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          icon={CheckCircle2}
                                          disabled={!!working}
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
                                      {cancellable && canCancelItem ? (
                                        <Button
                                          variant="dangerSoft"
                                          iconOnly
                                          icon={X}
                                          aria-label="Cancel line"
                                          title="Cancel this line"
                                          disabled={!!working}
                                          onClick={() => confirmThen(
                                            {
                                              title: 'Cancel this item?',
                                              message: `${med.name} has not been handed over, so it is cancelled and never reaches the bill.`,
                                              confirmText: 'Cancel item',
                                              type: 'danger',
                                            },
                                            () => run('Cancel item', () => removeCounterSaleItem(ticket.id, med.id), { failureTitle: 'Item not cancelled', successTitle: 'Item cancelled', successMessage: `${med.name} is off the ticket.` }),
                                          )}
                                        />
                                      ) : null}
                                      {med.status === 'dispensed' || med.status === 'administered' ? (
                                        <span className="text-xs text-[var(--text-secondary)]">stock left the shelf — return it through the pharmacy</span>
                                      ) : med.status === 'prescribed' && !canDispense ? (
                                        <span className="text-xs text-[var(--text-secondary)]">the pharmacy hands this over</span>
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
                              ...scans.map((study: any) => ({ ...study, kind: 'Scan', icon: Scan, nameLabel: study?.scanTemplate?.name || study?.serviceCatalog?.name || study.scanType || 'Scan' })),
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
                                          icon={X}
                                          aria-label="Cancel order"
                                          title="Cancel this order"
                                          disabled={!!working}
                                          onClick={() => confirmThen(
                                            {
                                              title: `Cancel this ${order.kind.toLowerCase()} order?`,
                                              message: `${order.nameLabel} has not been reported yet, so it is cancelled and never reaches the bill.`,
                                              confirmText: 'Cancel order',
                                              type: 'danger',
                                            },
                                            () => run(
                                              'Cancel order',
                                              () => (order.kind === 'Lab test' ? removeCounterLabOrder(ticket.id, order.id) : removeCounterScanOrder(ticket.id, order.id)),
                                              { failureTitle: 'Order not cancelled', successTitle: 'Order cancelled', successMessage: `${order.nameLabel} is off the ticket.` },
                                            ),
                                          )}
                                        />
                                      ) : null}
                                      {order.status === 'completed' || order.status === 'cancelled' ? (
                                        <span className="text-xs text-[var(--text-secondary)]">{order.status === 'completed' ? 'reported — print the result sheet above' : 'already cancelled'}</span>
                                      ) : !cancellable && !isOpen ? (
                                        <span className="text-xs text-[var(--text-secondary)]">ticket closed</span>
                                      ) : !canCancelOrder ? (
                                        <span className="text-xs text-[var(--text-secondary)]">the requesting department cancels this</span>
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
                      queue with the customer's name. An order that has been picked up (in progress) can still be
                      cancelled here until its result is filed.
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
            </>
          )}
        </section>
      </div>

      {showNewTicket ? (
        <NewTicketDialog
          identityMode={identityMode}
          setIdentityMode={setIdentityMode}
          form={form}
          setForm={setForm}
          clientSearch={clientSearch}
          setClientSearch={setClientSearch}
          patientSearch={patientSearch}
          setPatientSearch={setPatientSearch}
          clientMatches={clientMatches}
          patientMatches={patientMatches}
          chosenClient={chosenClient}
          setChosenClient={setChosenClient}
          chosenPatient={chosenPatient}
          setChosenPatient={setChosenPatient}
          searchError={identitySearchError}
          busy={!!working}
          onClose={() => setShowNewTicket(false)}
          onSubmit={submitNewTicket}
        />
      ) : null}
    </div>
  );
}

/** The counter's own modal: themed, closes on Escape, and keeps focus inside itself. */
function NewTicketDialog({
  identityMode, setIdentityMode, form, setForm,
  clientSearch, setClientSearch, patientSearch, setPatientSearch,
  clientMatches, patientMatches, chosenClient, setChosenClient, chosenPatient, setChosenPatient,
  searchError, busy, onClose, onSubmit,
}: {
  identityMode: 'new' | 'existing' | 'patient';
  setIdentityMode: (mode: 'new' | 'existing' | 'patient') => void;
  form: { name: string; ageYears: string; phone: string; reason: string };
  setForm: (form: { name: string; ageYears: string; phone: string; reason: string }) => void;
  clientSearch: string;
  setClientSearch: (value: string) => void;
  patientSearch: string;
  setPatientSearch: (value: string) => void;
  clientMatches: any[];
  patientMatches: any[];
  chosenClient: any | null;
  setChosenClient: (client: any) => void;
  chosenPatient: any | null;
  setChosenPatient: (patient: any) => void;
  searchError: string | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<any>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button, input, select, [href]'))
        .filter((el) => !el.hasAttribute('disabled'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-label="Open a counter ticket">
      <div ref={panelRef} className={`${shell} p-5 w-full max-w-lg max-h-[90vh] overflow-auto`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Who is at the counter?</h2>
          <Button variant="ghost" iconOnly icon={X} aria-label="Close" onClick={onClose} />
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([['new', 'New name'], ['existing', 'Returning'], ['patient', 'Registered patient']] as const).map(([key, text]) => (
            <button
              key={key}
              onClick={() => setIdentityMode(key as 'new' | 'existing' | 'patient')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${identityMode === key ? 'border-[var(--icon-cyan-text)] bg-[var(--bg-main)] font-medium text-[var(--text-primary)]' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}
            >
              {text}
            </button>
          ))}
        </div>

        {identityMode === 'new' ? (
          <div className="space-y-3">
            <input ref={firstFieldRef} className={cn(INPUT, 'w-full')} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={cn(INPUT, 'w-full')} type="number" min={0} max={120} placeholder="Age (optional)" value={form.ageYears} onChange={(e) => setForm({ ...form, ageYears: e.target.value })} />
              <input className={cn(INPUT, 'w-full')} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Only the name is needed. Nothing is invented for them — no folder number, no date of birth.</p>
          </div>
        ) : (
          <div ref={firstFieldRef} tabIndex={-1} />
        )}

        {identityMode === 'existing' ? (
          <div className="space-y-3">
            <input className={cn(INPUT, 'w-full')} placeholder="Search the counter book by name or phone" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {clientMatches.map((client) => (
                <li key={client.id}>
                  <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenClient?.id === client.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenClient(client)}>
                    {client.name} <span className="text-xs text-[var(--text-secondary)]">· {client.ticketCount} visit(s) · {client.ageYears != null ? `${client.ageYears} yrs` : 'age not given'} · {client.phone || 'no phone'}</span>
                    {client.registeredPatientId ? <span className="text-xs text-[var(--icon-orange-text)]"> · has a folder</span> : null}
                  </button>
                </li>
              ))}
              {clientMatches.length === 0 && !searchError ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">{clientSearch.trim().length >= 2 ? 'No counter customer matches.' : 'Type at least two letters to search.'}</li> : null}
            </ul>
          </div>
        ) : null}

        {identityMode === 'patient' ? (
          <div className="space-y-3">
            <input className={cn(INPUT, 'w-full')} placeholder="Search the register by name, folder or phone" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
            <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
              {patientMatches.map((patient) => (
                <li key={patient.id}>
                  <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenPatient?.id === patient.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenPatient(patient)}>
                    {`${patient.surname || ''} ${patient.otherNames || ''}`.trim()}
                    <span className="text-xs text-[var(--text-secondary)]"> · Folder {patient.folderNumber} · {patient.gender}</span>
                  </button>
                </li>
              ))}
              {patientMatches.length === 0 && !searchError ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">{patientSearch.trim().length >= 2 ? 'No registered patient matches.' : 'Type at least two letters to search.'}</li> : null}
            </ul>
          </div>
        ) : null}

        {searchError ? (
          <div role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-3 py-2 text-sm text-[var(--icon-red-text)]">
            <AlertCircle className="h-4 w-4 shrink-0" /> {searchError} An empty list here may be this failure, not a missing name.
          </div>
        ) : null}

        <div className="mt-3">
          <input className={cn(INPUT, 'w-full')} placeholder="What are they here for? (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="soft" accent="cyan" icon={UserPlus} loading={busy} onClick={onSubmit}>Open ticket</Button>
        </div>
      </div>
    </div>
  );
}

// Catalog rows are the sellable/orderable unit: they carry the price, and for a
// medicine the stock item the pharmacy deducts from.
const fetchCatalog = async (serviceType: string, search: string) => {
  const result = await getServiceCatalog({ serviceType, search, isActive: true, limit: 50 });
  return result?.data ?? [];
};

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
