// src/pages/Counter.tsx
//
// The counter: someone walks in, wants a drug, a lab test or a scan, pays at
// accounts and collects a printed sheet. They are not joining the clinical
// register, so the ticket is held against a CounterClient (name, and age or
// phone when given) instead of a Patient. Everything after the identity —
// ordering, results, dispensing, the bill, the printed paper — is the same
// pipeline the clinical screens use, reached through /api/counter.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import { canAccessPage } from '../config/access';
import { formatCurrency } from '../utils/currency';
import {
  addCounterLabOrder, addCounterSaleItem, addCounterScanOrder, closeCounterTicket,
  createCounterTicket, dispenseCounterItem, downloadDocument, generateBillStatement,
  generateLabResult, generatePrescription, generateReceipt, getCounterBill, getCounterTicket,
  getServiceCatalog, linkCounterClient, listCounterTickets, raiseCounterBill, removeCounterLabOrder,
  removeCounterSaleItem, removeCounterScanOrder, searchCounterClients, searchCounterPatients,
} from '../api';
import {
  AlertTriangle, CheckCircle2, ClipboardList, DollarSign, FlaskConical, Loader, Plus,
  Printer, RefreshCw, Scan, Search, User, UserPlus, X,
} from 'lucide-react';

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

// The API answers with Prisma's relation names, lower-cased by the response
// normaliser, so both spellings are tried rather than silently showing nothing.
const LIST_KEYS = {
  medications: ['medication', 'Medication', 'medications'],
  labs: ['labTest', 'LabTest', 'labTests'],
  scans: ['scan', 'Scan', 'scans'],
};

const openedByLabel = (ticket: any): string =>
  ticket?.user_Attendance_createdByIdToUser?.fullName
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

const statusTone: Record<string, string> = {
  pending: 'bg-[var(--bg-main)] text-[var(--text-primary)]',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

type Tab = 'sell' | 'orders' | 'bill';

export default function Counter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketQuery, setTicketQuery] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<any | null>(null);
  const [bill, setBill] = useState<any | null>(null);
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

  const [drugSearch, setDrugSearch] = useState('');
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [drugQty, setDrugQty] = useState('1');
  const [labSearch, setLabSearch] = useState('');
  const [labResults, setLabResults] = useState<any[]>([]);
  const [scanSearch, setScanSearch] = useState('');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [priority, setPriority] = useState('routine');

  const canDispense = hasRole(['pharmacist']);
  const canRemoveItem = hasRole(['pharmacist', 'records']);
  const canTakePayment = canAccessPage(user?.role, 'billing');
  const canPrintLab = hasRole(['lab_tech', 'sonographer', 'records']);
  const canPrintMoneyDoc = hasRole(['accounts', 'records']);
  const canPrintPrescription = hasRole(['pharmacist', 'records']);
  const canRegister = hasRole(['records']);
  const isOpen = !!ticket && !['completed', 'cancelled'].includes(ticket.status);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const response = await listCounterTickets({ query: ticketQuery || undefined, limit: 50 });
      setTickets(unwrap(response));
    } catch (err: any) {
      toastError('Could not load tickets', err?.response?.data?.message || err?.message || 'Please retry');
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [ticketQuery, toastError]);

  const loadTicket = useCallback(async (id: string) => {
    try {
      const response = await getCounterTicket(id);
      const detail = response?.data ?? response;
      setTicket(detail);
      const billResponse = await getCounterBill(id);
      setBill(billResponse?.data ?? null);
    } catch (err: any) {
      toastError('Could not open the ticket', err?.response?.data?.message || err?.message || 'Please retry');
    }
  }, [toastError]);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { if (selectedId) loadTicket(selectedId); }, [selectedId, loadTicket]);
  // The visit screen sends a walk-in ticket here for anything its patient screens key on a
  // folder number — ordering, results, billing and printing all live on the ticket itself.
  useEffect(() => {
    const ticketParam = searchParams.get('ticket');
    if (ticketParam && ticketParam !== selectedId) setSelectedId(ticketParam);
  }, [searchParams, selectedId]);
  useLiveRefresh(['encounters', 'billing'], () => { if (selectedId) loadTicket(selectedId); });

  // Catalog lookups are debounced: the counter types a drug name while the
  // customer is standing at the desk, and every keystroke should not be a request.
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (drugSearch.trim().length < 2) { setDrugResults([]); return; }
      try {
        const response = await fetchCatalog('medication', drugSearch.trim());
        setDrugResults(unwrap(response));
      } catch { setDrugResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [drugSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (labSearch.trim().length < 2) { setLabResults([]); return; }
      try {
        setLabResults(unwrap(await fetchCatalog('lab_test', labSearch.trim())));
      } catch { setLabResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [labSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (scanSearch.trim().length < 2) { setScanResults([]); return; }
      try {
        setScanResults(unwrap(await fetchCatalog('scan', scanSearch.trim())));
      } catch { setScanResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [scanSearch]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (identityMode === 'existing' && clientSearch.trim().length >= 2) {
        try { setClientMatches(unwrap(await searchCounterClients(clientSearch.trim()))); } catch { setClientMatches([]); }
      }
      if (identityMode === 'patient' && patientSearch.trim().length >= 2) {
        try { setPatientMatches(unwrap(await searchCounterPatients(patientSearch.trim()))); } catch { setPatientMatches([]); }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch, patientSearch, identityMode]);

  const run = async (label: string, action: () => Promise<any>) => {
    setWorking(label);
    try {
      await action();
      if (selectedId) await loadTicket(selectedId);
      await loadTickets(true);
      return true;
    } catch (err: any) {
      toastError(label, err?.response?.data?.message || err?.message || 'Please retry');
      return false;
    } finally {
      setWorking(null);
    }
  };

  const submitNewTicket = async () => {
    const payload: any = { reason: form.reason.trim() || undefined };
    if (identityMode === 'new') {
      if (!form.name.trim()) { toastError('A name is required', 'Type the customer name before opening the ticket.'); return; }
      payload.client = {
        name: form.name.trim(),
        ageYears: form.ageYears.trim() === '' ? undefined : Number(form.ageYears),
        phone: form.phone.trim() || undefined,
      };
    } else if (identityMode === 'existing') {
      if (!chosenClient) { toastError('Pick a customer', 'Search and select the returning customer.'); return; }
      payload.clientId = chosenClient.id;
    } else {
      if (!chosenPatient) { toastError('Pick a patient', 'Search and select the registered patient.'); return; }
      payload.patientId = chosenPatient.id;
    }

    const ok = await run('Opening the ticket', async () => {
      const response = await createCounterTicket(payload);
      const created = response?.data ?? response;
      if (created?.id) setSelectedId(created.id);
      setShowNewTicket(false);
      setForm({ name: '', ageYears: '', phone: '', reason: '' });
      setChosenClient(null); setChosenPatient(null); setClientSearch(''); setPatientSearch('');
      success('Ticket open', `Now selling for ${identityOf(created).label}.`);
    });
    return ok;
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
    run('Adding the item', () => addCounterSaleItem(selectedId!, { stockItemId, quantity }))
      .then((ok) => { if (ok) { setDrugSearch(''); setDrugResults([]); setDrugQty('1'); } });
  };

  const print = async (label: string, generate: () => Promise<any>, fallbackName: string) => {
    setWorking(label);
    try {
      const result: any = await generate();
      const documentId = result?.data?.documentId ?? result?.documentId;
      if (!documentId) throw new Error('The document was prepared without a file reference.');
      const blob = await downloadDocument(documentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fallbackName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      success('Document ready', 'Saved as a PDF — print it from the file.');
    } catch (err: any) {
      toastError(label, err?.response?.data?.message || err?.message || 'The document could not be prepared.');
    } finally {
      setWorking(null);
    }
  };

  const medications = useMemo(() => pickList(ticket, LIST_KEYS.medications), [ticket]);
  const labs = useMemo(() => pickList(ticket, LIST_KEYS.labs), [ticket]);
  const scans = useMemo(() => pickList(ticket, LIST_KEYS.scans), [ticket]);
  const identity = identityOf(ticket);

  const shell = 'bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl';
  const input = 'w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#6366f1)]';
  const primaryButton = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[var(--accent-color,#6366f1)] text-white disabled:opacity-50';
  const quietButton = 'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] disabled:opacity-50';

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Counter
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            Walk-in sales, lab and scan requests for people who are not in the patient register. A ticket is a visit
            of its own: it takes an order, records a result, hands over stock, and raises a bill — without a folder number.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className={quietButton} onClick={() => loadTickets()} disabled={!!working}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button className={primaryButton} onClick={() => setShowNewTicket(true)}>
            <UserPlus className="w-4 h-4" /> New ticket
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <section className={`${shell} p-3`}>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className={`${input} pl-9`}
              placeholder="Search by name, phone or ticket number"
              value={ticketQuery}
              onChange={(e) => setTicketQuery(e.target.value)}
            />
          </div>
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] p-4"><Loader className="w-4 h-4 animate-spin" /> Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] p-4">No counter tickets yet. Start one with “New ticket”.</p>
          ) : (
            <ul className="space-y-1 max-h-[60vh] overflow-auto">
              {tickets.map((row) => (
                <li key={row.id}>
                  <button
                    onClick={() => setSelectedId(row.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${selectedId === row.id ? 'border-[var(--accent-color,#6366f1)] bg-[var(--bg-main)]' : 'border-transparent hover:bg-[var(--bg-main)]'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">{identityOf(row).label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusTone[row.status] || statusTone.pending}`}>{String(row.status || '').replace('_', ' ')}</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                      <span>#{row.attendanceNumber}</span>
                      <span>·</span>
                      <span>{dateTime(row.dateTime)}</span>
                      {row.counterClient ? <><span>·</span><span className="text-amber-600">walk-in</span></> : <><span>·</span><span>registered</span></>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-4">
          {!ticket ? (
            <div className={`${shell} p-8 text-center text-[var(--text-secondary)]`}>
              <User className="w-8 h-8 mx-auto mb-2 opacity-60" />
              <p className="text-sm">Pick a ticket on the left, or open a new one for the customer at the desk.</p>
            </div>
          ) : (
            <>
              <div className={`${shell} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{identity.label}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {identity.detail} · {identity.phone} · ticket #{ticket.attendanceNumber}
                      {openedByLabel(ticket) ? ` · opened by ${openedByLabel(ticket)}` : ''}
                    </p>
                    {ticket.complaints ? <p className="text-sm mt-1 text-[var(--text-primary)]">{ticket.complaints}</p> : null}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusTone[ticket.status] || statusTone.pending}`}>
                      {String(ticket.status || '').replace('_', ' ')}
                    </span>
                    {identity.kind === 'walk_in' && identity.client && !identity.client.registeredPatientId && canRegister ? (
                      <p className="text-xs text-[var(--text-secondary)] mt-2">Not in the register — link them in “Bill &amp; print” if they register.</p>
                    ) : null}
                  </div>
                </div>
                {!isOpen ? (
                  <p className="mt-3 text-sm text-[var(--text-secondary)] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> This ticket is closed. Open a new one for anything else.
                  </p>
                ) : null}
              </div>

              <nav className="flex gap-2">
                {([['sell', 'Sell items', Plus], ['orders', 'Labs & scans', FlaskConical], ['bill', 'Bill & print', DollarSign]] as const).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key as Tab)}
                    className={`px-3 py-2 rounded-lg text-sm border flex items-center gap-2 ${tab === key ? 'border-[var(--accent-color,#6366f1)] bg-[var(--bg-main)] text-[var(--text-primary)] font-medium' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </nav>

              {tab === 'sell' ? (
                <div className="space-y-4">
                  <div className={`${shell} p-4`}>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Add a medicine</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_110px_auto] gap-2">
                      <input
                        className={input}
                        placeholder="Type the item name (min. 2 letters)"
                        value={drugSearch}
                        onChange={(e) => setDrugSearch(e.target.value)}
                        disabled={!isOpen}
                      />
                      <input
                        className={input}
                        type="number" min={1} step={1}
                        value={drugQty}
                        onChange={(e) => setDrugQty(e.target.value)}
                        disabled={!isOpen}
                      />
                      <span className="text-xs text-[var(--text-secondary)] self-center">quantity</span>
                    </div>
                    {drugResults.length > 0 ? (
                      <ul className="mt-2 divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                        {drugResults.slice(0, 12).map((row) => (
                          <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                            <span className="text-sm text-[var(--text-primary)]">
                              {row?.stockItem?.name || row.name}
                              {row?.stockItem?.strength ? <span className="text-xs text-[var(--text-secondary)]"> {row.stockItem.strength}</span> : null}
                              <span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'} · {money(row?.pricing?.[0]?.cashPrice)}</span>
                            </span>
                            <button className={quietButton} onClick={() => addDrug(row)} disabled={!!working || !isOpen}>
                              <Plus className="w-4 h-4" /> Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Only priced items on the pharmacy list can be sold here — the counter hands over stock through the
                      pharmacy's own dispensing, so stock, batches and the bill all move together.
                    </p>
                  </div>

                  <div className={`${shell} p-4`}>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Basket ({medications.length})</h3>
                    {medications.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">Nothing on the ticket yet.</p>
                    ) : (
                      <div className="overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs text-[var(--text-secondary)]">
                            <tr><th className="py-2 pr-3">Item</th><th className="py-2 pr-3">Qty</th><th className="py-2 pr-3">Status</th><th className="py-2">Actions</th></tr>
                          </thead>
                          <tbody className="text-[var(--text-primary)]">
                            {medications.map((med) => (
                              <tr key={med.id} className="border-t border-[var(--border-color)]">
                                <td className="py-2 pr-3">
                                  {med.name}
                                  {med?.stockItem?.currentStock != null ? <span className="text-xs text-[var(--text-secondary)]"> · {med.stockItem.currentStock} in stock</span> : null}
                                </td>
                                <td className="py-2 pr-3">{med.quantity}</td>
                                <td className="py-2 pr-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${med.status === 'dispensed' ? 'bg-green-100 text-green-700' : med.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>
                                    {med.status}
                                  </span>
                                </td>
                                <td className="py-2 flex gap-2">
                                  {med.status === 'prescribed' && canDispense && isOpen ? (
                                    <button className={quietButton} onClick={() => run('Handing over', () => dispenseCounterItem(selectedId!, med.id, med.quantity))} disabled={!!working}>
                                      <CheckCircle2 className="w-4 h-4" /> Hand over
                                    </button>
                                  ) : null}
                                  {med.status !== 'dispensed' && canRemoveItem && isOpen ? (
                                    <button className="p-2 text-red-600 hover:bg-[var(--bg-main)] rounded-lg" title="Remove from the ticket" onClick={() => run('Removing the item', () => removeCounterSaleItem(selectedId!, med.id))} disabled={!!working}>
                                      <X className="w-4 h-4" />
                                    </button>
                                  ) : null}
                                  {med.status === 'prescribed' && !canDispense ? (
                                    <span className="text-xs text-[var(--text-secondary)] self-center">pharmacy hands this over</span>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {canPrintPrescription && medications.some((m: any) => m.status === 'dispensed') ? (
                      <button className={`${quietButton} mt-3`} onClick={() => print('Printing the label sheet', () => generatePrescription(ticket.id), `counter_${ticket.attendanceNumber}_labels`)} disabled={!!working}>
                        <Printer className="w-4 h-4" /> Print dispensed labels
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {tab === 'orders' ? (
                <div className="space-y-4">
                  <div className={`${shell} p-4`}>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2"><FlaskConical className="w-4 h-4" /> Request a lab test</h3>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-2">
                      <input className={input} placeholder="Type the test name (min. 2 letters)" value={labSearch} onChange={(e) => setLabSearch(e.target.value)} disabled={!isOpen} />
                      <select className={input} value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!isOpen}>
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">Stat</option>
                      </select>
                    </div>
                    {labResults.length > 0 ? (
                      <ul className="mt-2 divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                        {labResults.slice(0, 12).map((row) => (
                          <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                            <span className="text-sm text-[var(--text-primary)]">{row?.labTestTemplate?.name || row.name}<span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'}</span></span>
                            <button className={quietButton} disabled={!!working || !isOpen} onClick={() => run('Requesting the test', () => addCounterLabOrder(selectedId!, { serviceCatalogId: row.id, priority })).then((ok) => { if (ok) { setLabSearch(''); setLabResults([]); } })}>
                              <Plus className="w-4 h-4" /> Request
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>

                  <div className={`${shell} p-4`}>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2"><Scan className="w-4 h-4" /> Request a scan</h3>
                    <input className={input} placeholder="Type the study name (min. 2 letters)" value={scanSearch} onChange={(e) => setScanSearch(e.target.value)} disabled={!isOpen} />
                    {scanResults.length > 0 ? (
                      <ul className="mt-2 divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden">
                        {scanResults.slice(0, 12).map((row) => (
                          <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-[var(--bg-main)]">
                            <span className="text-sm text-[var(--text-primary)]">{row?.scanTemplate?.name || row.name}<span className="text-xs text-[var(--text-secondary)]"> · {row.code || 'no code'}</span></span>
                            <button className={quietButton} disabled={!!working || !isOpen} onClick={() => run('Requesting the scan', () => addCounterScanOrder(selectedId!, { serviceCatalogId: row.id, priority: priority === 'stat' ? 'urgent' : priority })).then((ok) => { if (ok) { setScanSearch(''); setScanResults([]); } })}>
                              <Plus className="w-4 h-4" /> Request
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">Imaging has no stat priority, so a stat request becomes urgent for the scan.</p>
                  </div>

                  <div className={`${shell} p-4`}>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Orders on this ticket</h3>
                    {labs.length === 0 && scans.length === 0 ? (
                      <p className="text-sm text-[var(--text-secondary)]">No lab tests or scans requested.</p>
                    ) : (
                      <ul className="space-y-2">
                        {labs.map((order) => (
                          <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border-color)] rounded-lg px-3 py-2">
                            <span className="text-sm text-[var(--text-primary)]">
                              <FlaskConical className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {order?.labTestTemplate?.name || order?.serviceCatalog?.name || 'Lab test'}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>{order.status}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              {canPrintLab ? <button className={quietButton} onClick={() => print('Printing the result sheet', () => generateLabResult(ticket.id), `counter_${ticket.attendanceNumber}_results`)} disabled={!!working || order.status !== 'completed'}><Printer className="w-4 h-4" /> Print results</button> : null}
                              {isOpen && canRemoveItem && order.status === 'requested' ? <button className="p-2 text-red-600 hover:bg-[var(--bg-main)] rounded-lg" onClick={() => run('Cancelling the order', () => removeCounterLabOrder(selectedId!, order.id))} disabled={!!working}><X className="w-4 h-4" /></button> : null}
                            </span>
                          </li>
                        ))}
                        {scans.map((study) => (
                          <li key={study.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border-color)] rounded-lg px-3 py-2">
                            <span className="text-sm text-[var(--text-primary)]">
                              <Scan className="w-4 h-4 inline mr-2 text-[var(--text-secondary)]" />
                              {study?.scanTemplate?.name || study?.serviceCatalog?.name || study.scanType || 'Scan'}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${study.status === 'completed' ? 'bg-green-100 text-green-700' : study.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-[var(--bg-main)] text-[var(--text-primary)]'}`}>{study.status}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              {canPrintLab ? <button className={quietButton} onClick={() => print('Printing the report', () => generateLabResult(ticket.id), `counter_${ticket.attendanceNumber}_report`)} disabled={!!working || study.status !== 'completed'}><Printer className="w-4 h-4" /> Print report</button> : null}
                              {isOpen && canRemoveItem && study.status === 'requested' ? <button className="p-2 text-red-600 hover:bg-[var(--bg-main)] rounded-lg" onClick={() => run('Cancelling the study', () => removeCounterScanOrder(selectedId!, study.id))} disabled={!!working}><X className="w-4 h-4" /></button> : null}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      Results are entered by the lab or scan room on their own screen — this ticket shows up in their
                      queue with the customer's name. The visit record is at{' '}
                      <button className="underline" onClick={() => navigate(`/dashboard/attendance/${ticket.id}`)}>Attendance</button>.
                    </p>
                  </div>
                </div>
              ) : null}

              {tab === 'bill' ? (
                <div className={`${shell} p-4 space-y-3`}>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Bill</h3>
                  {!bill ? (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">No bill has been raised for this ticket yet.</p>
                      <button className={primaryButton} onClick={() => run('Raising the bill', () => raiseCounterBill(selectedId!))} disabled={!!working || !isOpen}>
                        <DollarSign className="w-4 h-4" /> Raise the bill
                      </button>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Pricing uses the tariff in force on the day of the visit, the same rule every other bill follows.
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <dt className="text-[var(--text-secondary)]">Bill number</dt><dd className="text-[var(--text-primary)]">{bill.billNumber}</dd>
                        <dt className="text-[var(--text-secondary)]">Total</dt><dd className="text-[var(--text-primary)]">{money(bill.totalAmount)}</dd>
                        <dt className="text-[var(--text-secondary)]">Paid</dt><dd className="text-[var(--text-primary)]">{money(bill.paidAmount)}</dd>
                        <dt className="text-[var(--text-secondary)]">Balance</dt><dd className="text-[var(--text-primary)] font-semibold">{money(bill.balance)}</dd>
                        <dt className="text-[var(--text-secondary)]">Status</dt><dd className="text-[var(--text-primary)]">{bill.status}</dd>
                      </dl>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {canTakePayment && Number(bill.balance) > 0 ? (
                          <button className={primaryButton} onClick={() => navigate(`/dashboard/billing/${bill.id}/payment`)}>
                            <DollarSign className="w-4 h-4" /> Take payment at accounts
                          </button>
                        ) : null}
                        {canPrintMoneyDoc ? (
                          <>
                            <button className={quietButton} onClick={() => print('Printing the statement', () => generateBillStatement(bill.id), `counter_${bill.billNumber}_statement`)} disabled={!!working}>
                              <Printer className="w-4 h-4" /> Print statement
                            </button>
                            <button className={quietButton} onClick={() => print('Printing the receipt', () => generateReceipt(bill.id), `counter_${bill.billNumber}_receipt`)} disabled={!!working}>
                              <Printer className="w-4 h-4" /> Print receipt
                            </button>
                          </>
                        ) : null}
                        {!canTakePayment || Number(bill.balance) === 0 ? (
                          <button className={quietButton} onClick={() => run('Refreshing the bill', async () => setBill(await getCounterBill(selectedId!).then((r: any) => r?.data ?? null)))} disabled={!!working}>
                            <RefreshCw className="w-4 h-4" /> Re-check the bill
                          </button>
                        ) : null}
                      </div>
                      {Number(bill.balance) > 0 && !canTakePayment ? (
                        <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Accounts takes the money on the billing screen; the counter only prices the basket.</p>
                      ) : null}
                    </div>
                  )}

                  {isOpen ? (
                    <div className="pt-3 border-t border-[var(--border-color)]">
                      <button className={quietButton} onClick={() => run('Closing the ticket', () => closeCounterTicket(selectedId!))} disabled={!!working}>
                        <CheckCircle2 className="w-4 h-4" /> Close this ticket
                      </button>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        Closing refuses until every order has a result, every item has been handed over and the balance is zero.
                      </p>
                    </div>
                  ) : null}

                  {identity.kind === 'walk_in' && identity.client && canRegister ? (
                    <div className="pt-3 border-t border-[var(--border-color)]">
                      <p className="text-sm text-[var(--text-secondary)]">Registered since? Link this customer to their folder so future visits are found under one name.</p>
                      <RegisterLink clientId={identity.client.id} onDone={() => loadTicket(selectedId!)} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>

      {showNewTicket ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
          <div className={`${shell} p-5 w-full max-w-lg max-h-[90vh] overflow-auto`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Who is at the counter?</h2>
              <button className="p-2 hover:bg-[var(--bg-main)] rounded-lg" onClick={() => setShowNewTicket(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {([['new', 'New name'], ['existing', 'Returning'], ['patient', 'Registered patient']] as const).map(([key, label]) => (
                <button key={key} onClick={() => setIdentityMode(key as any)} className={`px-3 py-1.5 rounded-lg text-sm border ${identityMode === key ? 'border-[var(--accent-color,#6366f1)] bg-[var(--bg-main)] font-medium' : 'border-[var(--border-color)]'} text-[var(--text-primary)]`}>{label}</button>
              ))}
            </div>

            {identityMode === 'new' ? (
              <div className="space-y-3">
                <input className={input} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} type="number" min={0} max={120} placeholder="Age (optional)" value={form.ageYears} onChange={(e) => setForm({ ...form, ageYears: e.target.value })} />
                  <input className={input} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Only the name is needed. Nothing is invented for them — no folder number, no date of birth.</p>
              </div>
            ) : null}

            {identityMode === 'existing' ? (
              <div className="space-y-3">
                <input className={input} placeholder="Search the counter book by name or phone" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  {clientMatches.map((client) => (
                    <li key={client.id}>
                      <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenClient?.id === client.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenClient(client)}>
                        {client.name} <span className="text-xs text-[var(--text-secondary)]">· {client.ticketCount} visit(s) · {client.ageYears != null ? `${client.ageYears} yrs` : 'age not given'} · {client.phone || 'no phone'}</span>
                        {client.registeredPatientId ? <span className="text-xs text-amber-600"> · has a folder</span> : null}
                      </button>
                    </li>
                  ))}
                  {clientMatches.length === 0 ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">No match yet.</li> : null}
                </ul>
              </div>
            ) : null}

            {identityMode === 'patient' ? (
              <div className="space-y-3">
                <input className={input} placeholder="Search the register by name, folder or phone" value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  {patientMatches.map((patient) => (
                    <li key={patient.id}>
                      <button className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-main)] ${chosenPatient?.id === patient.id ? 'bg-[var(--bg-main)]' : ''} text-[var(--text-primary)]`} onClick={() => setChosenPatient(patient)}>
                        {`${patient.surname || ''} ${patient.otherNames || ''}`.trim()}
                        <span className="text-xs text-[var(--text-secondary)]"> · Folder {patient.folderNumber} · {patient.gender}</span>
                      </button>
                    </li>
                  ))}
                  {patientMatches.length === 0 ? <li className="px-3 py-2 text-sm text-[var(--text-secondary)]">No match yet.</li> : null}
                </ul>
              </div>
            ) : null}

            <div className="mt-3">
              <input className={input} placeholder="What are they here for? (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className={quietButton} onClick={() => setShowNewTicket(false)}>Cancel</button>
              <button className={primaryButton} onClick={submitNewTicket} disabled={!!working}>{working ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Open ticket</button>
            </div>
          </div>
        </div>
      ) : null}
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
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length < 2) { setMatches([]); return; }
      try { setMatches(unwrap(await searchCounterPatients(search.trim()))); } catch { setMatches([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="mt-2 space-y-2">
      <input
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-primary)] text-sm"
        placeholder="Folder name, number or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden max-h-40 overflow-y-auto">
        {matches.map((patient) => (
          <li key={patient.id}>
            <button
              className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await linkCounterClient(clientId, patient.id);
                  success('Linked', `${patient.surname || ''} ${patient.otherNames || ''}`.trim() + ' is now linked to this counter customer.');
                  onDone();
                } catch (err: any) {
                  error('Could not link', err?.response?.data?.message || err?.message || 'Please retry');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {`${patient.surname || ''} ${patient.otherNames || ''}`.trim()}
              <span className="text-xs text-[var(--text-secondary)]"> · Folder {patient.folderNumber}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--text-secondary)]">The link points the counter history at the folder; bills already raised keep the identity they were created with.</p>
    </div>
  );
}
