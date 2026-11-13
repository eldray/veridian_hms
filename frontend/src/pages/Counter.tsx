// src/pages/Counter.tsx - every data its own column + sort + pagination across pages
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import { AlertCircle, ClipboardList, CheckCircle2, DollarSign, RefreshCw, Store, Wallet, Grid, List, Filter } from 'lucide-react';
import { Badge, Button, cn, FilterSelect, PageHeader, Pagination, SearchInput, Segmented, StatCard, TABLE_SHELL, TD, TH, TH_ROW, TR } from '../components/ui';
import { describeApiError } from '../utils/apiError';
import { getCounterSummary, listCounterTickets } from '../api';
import { dateTime, identityOf, ticketLabel, ticketTone, unwrap } from '../utils/counterTicket';

const CARDS = [
  { lens: 'open', summaryKey: 'open', label: 'Open tickets', icon: ClipboardList, accent: 'cyan', hint: 'Not closed yet — anything you can still sell against' },
  { lens: 'handover', summaryKey: 'awaitingHandover', label: 'Awaiting handover', icon: CheckCircle2, accent: 'yellow', hint: 'Sold, but the goods have not left the shelf' },
  { lens: 'payment', summaryKey: 'awaitingPayment', label: 'Awaiting payment', icon: DollarSign, accent: 'orange', hint: 'A raised bill still has a balance' },
  { lens: 'closedToday', summaryKey: 'closedToday', label: 'Closed today', icon: Wallet, accent: 'green', hint: 'Finished today, money and goods both settled' },
] as const;

// Sort is sent to the backend WITH page/lens/search, so page 2 is the next chunk of the
// same sort — sorting only the 25 rows on screen would re-order every time you paged.
type SortKey = 'newest' | 'oldest' | 'customerName' | 'ticketNo' | 'status';

export default function Counter() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketQuery, setTicketQuery] = useState('');
  const [listParams, setListParams] = useState({ text: '', lens: null as string | null, page: 1, size: 25 });
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const requestSeq = useRef(0);

  const loadSummary = useCallback(async () => {
    try { const r = await getCounterSummary(); setSummary(r?.data ?? r); }
    catch (err: any) { toastError('Counts not loaded', describeApiError(err, 'The ticket counts could not be read. The list below is still live.')); }
  }, [toastError]);

  const loadTickets = useCallback(async (params: { text: string; lens: string | null; page: number; size: number }, sort: SortKey, silent = false) => {
    const requestId = requestSeq.current + 1; requestSeq.current = requestId;
    if (!silent) setLoadingList(true);
    try {
      const response = await listCounterTickets({ query: params.text || undefined, lens: params.lens || undefined, page: params.page, limit: params.size, sortBy: sort, sortOrder: sort === 'oldest' ? 'asc' : 'desc' } as any);
      if (requestSeq.current !== requestId) return;
      let rows = unwrap(response);
      // If the backend ignores sortBy, sort the returned page the same way so the UI never lies about the active sort. Server sort (when honoured) wins because rows already arrive ordered.
      const nameOf = (r: any) => identityOf(r)?.label || '';
      if (sort === 'customerName') rows = [...rows].sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
      if (sort === 'ticketNo') rows = [...rows].sort((a, b) => String(a.attendanceNumber || '').localeCompare(String(b.attendanceNumber || '')));
      if (sort === 'status') rows = [...rows].sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
      const total = Number(response?.meta?.total ?? rows.length);
      const pages = Math.max(1, Number(response?.meta?.totalPages ?? Math.ceil(total / params.size)));
      setTickets(rows); setTotalTickets(total); setTotalPages(pages);
      if (params.page > pages) setListParams((c) => ({ ...c, page: pages }));
      setListError(null);
    } catch (err: any) {
      if (requestSeq.current !== requestId) return;
      setTickets([]); setListError(describeApiError(err, 'The ticket list could not be loaded.'));
    } finally { if (requestSeq.current === requestId) setLoadingList(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => { const text = ticketQuery.trim(); setListParams((c) => (c.text === text ? c : { ...c, text, page: 1 })); }, 300); return () => clearTimeout(t); }, [ticketQuery]);
  useEffect(() => { loadTickets(listParams, sortKey); }, [listParams, sortKey, loadTickets]);
  useEffect(() => { loadSummary(); }, [loadSummary]);
  useLiveRefresh(['counter', 'bills', 'encounters', 'billing'], () => { loadTickets(listParams, sortKey, true); loadSummary(); });

  const { lens } = listParams;
  const activeCard = CARDS.find((c) => c.lens === lens) ?? null;
  const pickLens = (cardLens: string) => setListParams((c) => ({ ...c, lens: c.lens === cardLens ? null : cardLens, page: 1 }));
  const clearLens = () => setListParams((c) => ({ ...c, lens: null, page: 1 }));
  const lensBtn = (key: string | null, label: string) => (<button key={label} onClick={() => setListParams((c) => ({ ...c, lens: key, page: 1 }))} className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-all ${lens === key ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'}`}>{label}</button>);
  const goToPage = (t: number) => setListParams((c) => ({ ...c, page: Math.max(1, Math.min(t, totalPages)) }));
  const phoneOf = (row: any) => row.counterClient?.phone || row.counterClient?.contact || row.CounterClient?.phone || row.CounterClient?.contact || row.patient?.contact || row.Patient?.contact || '—';
  const nameOf = (row: any) => identityOf(row).label;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <PageHeader title="Counter" subtitle="Walk-in sales, lab and scan requests for customers outside the patient register" icon={Store} accent="cyan"
        meta={<>{totalTickets} ticket(s){listParams.text ? ` matching “${listParams.text}”` : ''}{activeCard ? ` · filtered by ${activeCard.label.toLowerCase()}` : ''} · a ticket is a visit of its own: it orders, results, hands over stock and raises a bill without a folder number.</>}
        actions={<><Button variant="secondary" icon={RefreshCw} loading={loadingList} disabled={loadingList} onClick={() => { loadTickets(listParams, sortKey); loadSummary(); }}>{loadingList ? 'Refreshing...' : 'Refresh'}</Button><Button variant="soft" accent="cyan" icon={Store} onClick={() => navigate('/dashboard/counter/new')}>New counter</Button></>} />
      {listError && (<div role="alert" className="flex items-center gap-2 rounded-lg border border-[var(--icon-red-text)] bg-[var(--icon-red-bg)] px-4 py-3 text-sm text-[var(--icon-red-text)]"><AlertCircle className="h-4 w-4 shrink-0" /><span>Could not load the counter tickets: {listError}</span></div>)}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {CARDS.map((card) => (<StatCard key={card.lens} label={card.label} value={summary ? Number(summary[card.summaryKey]) : '—'} icon={card.icon} accent={card.accent} hint={card.hint} onClick={() => pickLens(card.lens)} className={cn(lens === card.lens && 'ring-2 ring-[var(--icon-cyan-text)]')} />))}
      </div>
      {/* Lens Filter Bar — same shell as Patients / Attendance date bar */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-[var(--text-secondary)]" /><span className="text-sm font-medium text-[var(--text-primary)]">Show:</span></div>
          <div className="flex gap-2 overflow-x-auto max-w-full pb-0.5">{lensBtn(null, 'View All')}{lensBtn('open', 'Open tickets')}{lensBtn('handover', 'Awaiting handover')}{lensBtn('payment', 'Awaiting payment')}{lensBtn('closedToday', 'Closed today')}</div>
          <div className="text-xs text-[var(--text-secondary)] ml-auto hidden sm:block">Showing: {activeCard ? activeCard.label : 'All counter tickets'} • {totalTickets} tickets</div>
        </div>
      </div>

      {/* Controls — Search + Sort + View — same shell as Patients / Attendance */}
      <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 shadow-sm border border-[var(--border-color)]">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <SearchInput className="w-full lg:max-w-sm" value={ticketQuery} onChange={setTicketQuery} placeholder="Search by name, phone or ticket number" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <FilterSelect aria-label="Sort counter tickets" value={sortKey} onChange={(v) => { setSortKey(v as SortKey); setListParams((c) => ({ ...c, page: 1 })); }} options={[{ value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'customerName', label: 'Customer Name A–Z' }, { value: 'ticketNo', label: 'Ticket #' }, { value: 'status', label: 'Status' }]} />
            <Segmented aria-label="Counter layout" accent="cyan" value={viewMode} onChange={(v) => setViewMode(v as 'cards' | 'list')} options={[{ value: 'cards', label: 'Cards', icon: Grid }, { value: 'list', label: 'List', icon: List }]} />
            <FilterSelect aria-label="Rows per page" value={String(listParams.size)} onChange={(v) => setListParams((c) => ({ ...c, size: Number(v), page: 1 }))} options={[{ value: '10', label: '10 per page' }, { value: '25', label: '25 per page' }, { value: '50', label: '50 per page' }, { value: '100', label: '100 per page' }]} />
          </div>
        </div>
      </div>

      {/* Stats strip — same shell as Patients / Attendance */}
      {tickets.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-3 sm:p-4 border border-[var(--border-color)]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Showing {tickets.length} of {totalTickets} ticket records {listParams.text && <span className="text-xs font-normal text-[var(--text-secondary)]">for "{listParams.text}"</span>}</p>
            <div className="flex items-center gap-2 flex-wrap"><Badge tone="cyan" dot size="sm">Open: {summary ? Number(summary.open) : '—'}</Badge><Badge tone="yellow" dot size="sm">Handover: {summary ? Number(summary.awaitingHandover) : '—'}</Badge><Badge tone="orange" dot size="sm">Payment: {summary ? Number(summary.awaitingPayment) : '—'}</Badge><Badge tone="green" dot size="sm">Closed today: {summary ? Number(summary.closedToday) : '—'}</Badge></div>
          </div>
        </div>
      )}

      {loadingList ? (<div className="space-y-2">{[1,2,3,4,5].map((i) => (<div key={i} className="h-12 bg-[var(--bg-main)] rounded-lg animate-pulse" />))}</div>)
      : tickets.length === 0 ? (<div className="bg-[var(--bg-card)] rounded-xl p-8 text-center border border-[var(--border-color)]"><ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" /><h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{listParams.text ? 'No Tickets Found' : 'No Ticket Records'}</h3><p className="text-[var(--text-secondary)] text-sm mb-4">{listParams.text ? `No ticket matches “${listParams.text}”.` : activeCard ? `Nothing is in “${activeCard.label}”. The counter is clear.` : 'No counter tickets yet. Start one with “New counter”.'}</p>{listParams.text ? <Button onClick={() => setTicketQuery('')}>Clear Search</Button> : lens ? <Button variant="soft" accent="cyan" icon={ClipboardList} onClick={clearLens}>View All Tickets</Button> : <Button variant="soft" accent="cyan" icon={Store} onClick={() => navigate('/dashboard/counter/new')}>New counter</Button>}</div>)
      : (<>
        {/* MOBILE cards — same shell as Patients / Attendance */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {tickets.map((row) => (<div key={row.id} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] cursor-pointer" onClick={() => navigate(`/dashboard/counter/${row.id}`)}><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><Store className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div><div className="min-w-0"><p className="font-semibold text-[var(--text-primary)] truncate">{nameOf(row)}</p><p className="text-xs text-[var(--text-secondary)] font-mono">#{row.attendanceNumber}</p></div></div><Badge tone={ticketTone(row.status)} dot size="sm">{ticketLabel(row.status)}</Badge></div><dl className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 text-xs"><div><dt className="text-[var(--text-tertiary)]">Phone</dt><dd className="font-medium">{phoneOf(row)}</dd></div><div><dt className="text-[var(--text-tertiary)]">Opened</dt><dd className="font-medium">{dateTime(row.dateTime)}</dd></div><div><dt className="text-[var(--text-tertiary)]">Identity</dt><dd className="font-medium">{row.counterClient || row.CounterClient ? 'Walk-in' : 'Registered patient'}</dd></div></dl></div>))}
        </div>
        {/* DESKTOP CARDS (Cards mode) — same shell as Attendance cards */}
        {viewMode === 'cards' ? (
        <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-4">{tickets.map((row) => (<div key={row.id} className="bg-[var(--bg-card)] rounded-xl p-4 shadow-sm border border-[var(--border-color)] hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/counter/${row.id}`)}><div className="flex items-start justify-between mb-3"><div className="flex items-center gap-3 min-w-0"><div className="w-10 h-10 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center"><Store className="w-5 h-5 text-[var(--icon-cyan-text)]" /></div><div className="min-w-0"><h3 className="font-semibold text-[var(--text-primary)] text-sm truncate">{nameOf(row)}</h3><p className="text-xs text-[var(--text-secondary)] font-mono">#{row.attendanceNumber}</p></div></div><Badge tone={ticketTone(row.status)} dot size="sm">{ticketLabel(row.status)}</Badge></div><dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><div><dt className="text-[var(--text-tertiary)]">Phone</dt><dd className="font-medium">{phoneOf(row)}</dd></div><div><dt className="text-[var(--text-tertiary)]">Opened</dt><dd className="font-medium">{dateTime(row.dateTime)}</dd></div><div><dt className="text-[var(--text-tertiary)]">Identity</dt><dd className="font-medium">{row.counterClient || row.CounterClient ? 'Walk-in' : 'Registered patient'}</dd></div></dl><div className="flex gap-2 pt-3 mt-3 border-t border-[var(--border-color)]"><Button size="sm" variant="soft" accent="cyan" className="flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/counter/${row.id}`); }}>Open Ticket</Button></div></div>))}</div>
        ) : (
        <div className={`${TABLE_SHELL} hidden md:block`}><div className="overflow-x-auto"><table className="w-full text-sm min-w-[950px]"><thead className={TH_ROW}><tr><th className={TH}>Customer Name</th><th className={TH}>Phone</th><th className={TH}>Ticket #</th><th className={TH}>Opened</th><th className={TH}>Identity</th><th className={cn(TH, 'text-right')}>Status</th></tr></thead><tbody>
          {tickets.map((row) => (<tr key={row.id} className={cn(TR, 'cursor-pointer')} onClick={() => navigate(`/dashboard/counter/${row.id}`)}><td className={cn(TD, 'font-medium text-[var(--text-primary)]')}><div className="flex items-center gap-3"><div className="w-8 h-8 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-[var(--icon-cyan-text)]" /></div><p className="font-semibold text-[var(--text-primary)] text-sm">{nameOf(row)}</p></div></td><td className={TD}>{phoneOf(row)}</td><td className={cn(TD, 'text-[var(--text-secondary)]')}>#{row.attendanceNumber}</td><td className={cn(TD, 'text-[var(--text-secondary)]')}>{dateTime(row.dateTime)}</td><td className={cn(TD, 'text-[var(--text-secondary)]')}>{row.counterClient || row.CounterClient ? <span className="text-[var(--icon-orange-text)]">walk-in</span> : 'registered patient'}</td><td className={cn(TD, 'text-right')}><Badge tone={ticketTone(row.status)} dot size="sm">{ticketLabel(row.status)}</Badge></td></tr>))}
        </tbody></table></div></div>
        )}
        <Pagination page={listParams.page} totalPages={totalPages} itemsPerPage={listParams.size} totalItems={totalTickets} noun="tickets" onChange={goToPage} />
      </>)}
    </div>
  );
}
