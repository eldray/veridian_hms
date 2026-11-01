// src/pages/Counter.tsx
//
// The counter dashboard: what the bench needs before it picks a ticket — what is open,
// what is waiting to be handed over, what is waiting for money, what closed today.
// Selling, ordering and billing happen on the ticket itself (/dashboard/counter/:id);
// opening a ticket happens on /dashboard/counter/new.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { useLiveRefresh } from '../api/realtime';
import {
  AlertCircle, ClipboardList, CheckCircle2, DollarSign, RefreshCw, Store, Wallet,
} from 'lucide-react';
import { Badge, Button, cn, PageHeader, Pagination, SearchInput, StatCard, TD, TH, TH_ROW, TR } from '../components/ui';
import { describeApiError } from '../utils/apiError';
import { getCounterSummary, listCounterTickets } from '../api';
import { dateTime, identityOf, ticketLabel, ticketTone, unwrap } from '../utils/counterTicket';

// The cards, in the order the counter's own work runs. `lens` is the filter the list is
// opened with, and the backend counts with the same where-clause — so a card can never
// promise a number the list it opens disagrees with.
const CARDS = [
  { lens: 'open', summaryKey: 'open', label: 'Open tickets', icon: ClipboardList, accent: 'cyan', hint: 'Not closed yet — anything you can still sell against' },
  { lens: 'handover', summaryKey: 'awaitingHandover', label: 'Awaiting handover', icon: CheckCircle2, accent: 'yellow', hint: 'Sold, but the goods have not left the shelf' },
  { lens: 'payment', summaryKey: 'awaitingPayment', label: 'Awaiting payment', icon: DollarSign, accent: 'orange', hint: 'A raised bill still has a balance' },
  { lens: 'closedToday', summaryKey: 'closedToday', label: 'Closed today', icon: Wallet, accent: 'green', hint: 'Finished today, money and goods both settled' },
] as const;

export default function Counter() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();

  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketQuery, setTicketQuery] = useState('');
  // Search text, lens, page and page size travel together: changing any filter has to reset the
  // page in the same update, or the list fetches once with the dying page and again with page
  // one — and the first response can land last and repaint a page that no longer exists.
  const [listParams, setListParams] = useState({ text: '', lens: null as string | null, page: 1, size: 25 });
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const requestSeq = useRef(0);

  const loadSummary = useCallback(async () => {
    try {
      const response = await getCounterSummary();
      setSummary(response?.data ?? response);
    } catch (err: any) {
      // Four zeros would read as "nothing is waiting"; a failed count has to say so.
      toastError('Counts not loaded', describeApiError(err, 'The ticket counts could not be read. The list below is still live.'));
    }
  }, [toastError]);

  const loadTickets = useCallback(async (
    params: { text: string; lens: string | null; page: number; size: number },
    silent = false,
  ) => {
    // Rapid page clicks put several requests in flight; whichever resolves last is not
    // necessarily the one the screen asked for, so only the newest request may write.
    const requestId = requestSeq.current + 1;
    requestSeq.current = requestId;
    if (!silent) setLoadingList(true);
    try {
      const response = await listCounterTickets({
        query: params.text || undefined, lens: params.lens || undefined, page: params.page, limit: params.size,
      });
      if (requestSeq.current !== requestId) return;
      const rows = unwrap(response);
      const total = Number(response?.meta?.total ?? rows.length);
      const pages = Math.max(1, Number(response?.meta?.totalPages ?? Math.ceil(total / params.size)));
      setTickets(rows);
      setTotalTickets(total);
      setTotalPages(pages);
      // Another desk closing a ticket can shrink the list under the page you are standing on.
      if (params.page > pages) setListParams((current) => ({ ...current, page: pages }));
      setListError(null);
    } catch (err: any) {
      if (requestSeq.current !== requestId) return;
      setTickets([]);
      setListError(describeApiError(err, 'The ticket list could not be loaded.'));
    } finally {
      if (requestSeq.current === requestId) setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const text = ticketQuery.trim();
      setListParams((current) => (current.text === text ? current : { ...current, text, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketQuery]);

  useEffect(() => {
    loadTickets(listParams);
  }, [listParams, loadTickets]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useLiveRefresh(['counter', 'bills', 'encounters', 'billing'], () => {
    loadTickets(listParams, true);
    loadSummary();
  });

  const { lens } = listParams;
  const activeCard = CARDS.find((card) => card.lens === lens) ?? null;
  const pickLens = (cardLens: string) => setListParams((current) => ({
    ...current,
    lens: current.lens === cardLens ? null : cardLens,
    page: 1,
  }));
  const clearLens = () => setListParams((current) => ({ ...current, lens: null, page: 1 }));
  const goToPage = (target: number) => setListParams((current) => ({ ...current, page: Math.max(1, Math.min(target, totalPages)) }));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Counter"
        subtitle="Walk-in sales, lab and scan requests for customers outside the patient register"
        icon={Store}
        accent="cyan"
        meta={(
          <>
            {totalTickets} ticket(s){listParams.text ? ` matching “${listParams.text}”` : ''}
            {activeCard ? ` · filtered by ${activeCard.label.toLowerCase()}` : ''} · a ticket is a visit of its own: it orders, results, hands over stock and raises a bill without a folder number.
          </>
        )}
        actions={(
          <>
            <Button variant="secondary" icon={RefreshCw} loading={loadingList} disabled={loadingList} onClick={() => { loadTickets(listParams); loadSummary(); }}>
              Refresh
            </Button>
            <Button variant="soft" accent="cyan" icon={Store} onClick={() => navigate('/dashboard/counter/new')}>
              New counter
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {CARDS.map((card) => (
          <StatCard
            key={card.lens}
            label={card.label}
            value={summary ? Number(summary[card.summaryKey]) : '—'}
            icon={card.icon}
            accent={card.accent}
            hint={card.hint}
            onClick={() => pickLens(card.lens)}
            className={cn(lens === card.lens && 'ring-2 ring-[var(--icon-cyan-text)]')}
          />
        ))}
      </div>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-sm">
        <div className="bg-[var(--bg-main)] px-4 py-3 border-b border-[var(--border-color)] rounded-t-xl flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--text-secondary)]" />
            {activeCard ? activeCard.label : 'All counter tickets'}
          </h2>
          {lens ? <Button variant="ghost" size="sm" onClick={clearLens}>Show every ticket</Button> : null}
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,420px)_auto] gap-2 items-center">
            <SearchInput value={ticketQuery} onChange={setTicketQuery} placeholder="Search by name, phone or ticket number" />
            <span className="text-xs text-[var(--text-secondary)]">Click a ticket to sell, order, hand over and bill.</span>
          </div>

          {loadingList ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-[var(--bg-main)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
              {listParams.text
                ? `No ticket matches “${listParams.text}”.`
                : activeCard
                  ? `Nothing is in “${activeCard.label}”. The counter is clear.`
                  : 'No counter tickets yet. Start one with “New counter”.'}
            </p>
          ) : (
            <>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className={TH_ROW}>
                    <tr>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Ticket</th>
                      <th className={TH}>Opened</th>
                      <th className={TH}>Identity</th>
                      <th className={cn(TH, 'text-right')}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(TR, 'cursor-pointer')}
                        onClick={() => navigate(`/dashboard/counter/${row.id}`)}
                      >
                        <td className={cn(TD, 'font-medium text-[var(--text-primary)]')}>{identityOf(row).label}</td>
                        <td className={cn(TD, 'text-[var(--text-secondary)]')}>#{row.attendanceNumber}</td>
                        <td className={cn(TD, 'text-[var(--text-secondary)]')}>{dateTime(row.dateTime)}</td>
                        <td className={cn(TD, 'text-[var(--text-secondary)]')}>
                          {row.counterClient || row.CounterClient
                            ? <span className="text-[var(--icon-orange-text)]">walk-in</span>
                            : 'registered patient'}
                        </td>
                        <td className={cn(TD, 'text-right')}>
                          <Badge tone={ticketTone(row.status)} dot size="sm">{ticketLabel(row.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={listParams.page}
                totalPages={totalPages}
                itemsPerPage={listParams.size}
                totalItems={totalTickets}
                noun="tickets"
                onChange={goToPage}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageSizeChange={(size) => setListParams((current) => ({ ...current, size, page: 1 }))}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
