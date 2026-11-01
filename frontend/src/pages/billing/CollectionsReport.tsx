// src/pages/billing/CollectionsReport.tsx
//
// The cashbook for a period, in the shape the accounts desk has always read a day off:
// who took the money and how much (Cashier Collections), what the money was for
// (Financial Breakdown), and the individual receipts behind both (Details).
//
// The three grids are not three separate queries. Every figure comes from the same
// /billing/collections payload, so a subtotal here can never disagree with the receipt list
// underneath it — which is exactly how the report gets trusted or thrown away.
import { useMemo, useState } from 'react';
import {
  ArrowDownToLine, Banknote, Download, Layers, Receipt, RefreshCw, Undo2, Users, X,
} from 'lucide-react';
import {
  Badge, Button, Card, cn, INPUT, Pagination, SearchInput, StatCard, TD, TH, TH_ROW, TR,
} from '../../components/ui';
import type {
  BillingCashierRow, BillingCollectionPayment, BillingCollectionsReport,
} from '../../types/billing';

const money = (value: number) => `₵${(Number(value) || 0).toFixed(2)}`;

const dateOnly = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const timeOnly = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const humanMethod = (method: string) => method.replace(/_/g, ' ');

/** What a receipt was for, in one line — the legacy report's "Narration" column. */
const narrationOf = (payment: BillingCollectionPayment) => {
  const items = payment.items.map((item) => item.description).filter(Boolean);
  const head = items.slice(0, 2).join(', ');
  const rest = items.length > 2 ? ` +${items.length - 2} more` : '';
  return [`${payment.bill.billNumber}${head ? ` · ${head}${rest}` : ''}`, payment.notes].filter(Boolean).join(' — ');
};

type DetailRow = {
  payment: BillingCollectionPayment;
  kind: 'collection' | 'reversal';
  text: string;
};

const NUM = 'text-right tabular-nums';
// The breakdown sits in the narrower of the two bottom cards, so its money cells are tighter
// than a normal table's — otherwise the Balance column falls off the edge of the card.
const CELL = 'px-2 py-2 text-sm';
const TOTAL_ROW = 'bg-[var(--bg-main)] border-y border-[var(--border-color)] font-semibold';

export interface CollectionsReportProps {
  report: BillingCollectionsReport;
  loading: boolean;
  /** yyyy-mm-dd, so the pickers and the request share one source of truth. */
  dateFrom: string;
  dateTo: string;
  onRangeChange: (from: string, to: string) => void;
  periodLabel: string;
  onRefresh: () => void;
  onClose: () => void;
  onExported: (count: number) => void;
  onExportFailed: (message: string) => void;
}

export default function CollectionsReport({
  report, loading, dateFrom, dateTo, onRangeChange, periodLabel, onRefresh, onClose, onExported, onExportFailed,
}: CollectionsReportProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const details = useMemo<DetailRow[]>(() => {
    const rows: DetailRow[] = [
      ...report.payments.map((payment) => ({ payment, kind: 'collection' as const, text: '' })),
      ...report.reversals.map((payment) => ({ payment, kind: 'reversal' as const, text: '' })),
    ];
    for (const row of rows) {
      const { payment } = row;
      row.text = [
        payment.reference, payment.bill.billNumber, payment.bill.customer.name, payment.bill.customer.reference,
        // Walk-in payers have no folder, so "walk-in" has to be searchable or the only way to
        // find them is to read the Folder # column row by row.
        payment.bill.customer.kind === 'walk_in' ? 'walk-in walk in' : 'patient folder',
        payment.collector?.fullName, payment.collector?.username, narrationOf(payment), payment.notes,
        payment.paymentMethod,
      ].filter(Boolean).join(' ').toLowerCase();
    }
    return rows
      .filter((row) => !search.trim() || row.text.includes(search.trim().toLowerCase()))
      .sort((a, b) => new Date(b.payment.transactionDate).getTime() - new Date(a.payment.transactionDate).getTime());
  }, [report.payments, report.reversals, search]);

  const totalDetailPages = Math.max(1, Math.ceil(details.length / rowsPerPage));
  const safePage = Math.min(page, totalDetailPages);
  const pagedDetails = details.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  const exportCsv = () => {
    try {
      const header = ['Receipt #', 'Date', 'Time', 'Type', 'Folder #', 'Paid by', 'Bill #', 'Method', 'Collected by', 'Breakdown group', 'Breakdown line', 'Line', 'Qty', 'Amount'];
      const lines: string[][] = [];
      for (const payment of [...report.payments.map((p) => ({ p, kind: 'Collection' })), ...report.reversals.map((p) => ({ p, kind: 'Reversal' }))]) {
        for (const item of payment.p.items) {
          const group = report.groups.find((g) => g.lines.some((l) => l.key === item.breakdownRow));
          lines.push([
            payment.p.reference || payment.p.id,
            dateOnly(payment.p.transactionDate),
            timeOnly(payment.p.transactionDate),
            payment.kind,
            payment.p.bill.customer.reference || 'walk-in',
            payment.p.bill.customer.name,
            payment.p.bill.billNumber,
            humanMethod(payment.p.paymentMethod),
            payment.p.collector?.fullName || payment.p.collector?.username || '',
            group?.label || '',
            item.breakdownLabel,
            item.description,
            String(item.quantity),
            item.amount.toFixed(2),
          ]);
        }
      }
      const csv = [header, ...lines]
        .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `collections-${dateFrom || 'from'}-${dateTo || 'to'}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onExported(lines.length);
    } catch (err: any) {
      onExportFailed(err?.message || 'The collections rows could not be written out.');
    }
  };

  const totalsRow = (label: string, cells: (string | number)[], cell = TD) => (
    <tr className={TOTAL_ROW}>
      <td className={cn(cell, 'text-[var(--text-primary)]')}>{label}</td>
      {cells.map((value, index) => (
        <td key={index} className={cn(cell, NUM, index === 0 ? 'text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]')}>
          {value}
        </td>
      ))}
    </tr>
  );

  return (
    <section className="space-y-4">
      <Card
        title="Collections report"
        description={`Receipts, reversals and what the money bought · ${periodLabel}`}
        icon={Banknote}
        accent="green"
        actions={(
          <>
            <Button size="sm" variant="secondary" icon={RefreshCw} loading={loading} onClick={onRefresh}>Refresh</Button>
            <Button size="sm" variant="secondary" icon={Download} onClick={exportCsv} disabled={details.length === 0}>Export</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={onClose}>Close</Button>
          </>
        )}
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)]">Starting date</span>
            <input
              type="date"
              aria-label="Collections starting date"
              value={dateFrom}
              onChange={(e) => { setPage(1); onRangeChange(e.target.value, dateTo); }}
              className={cn(INPUT, 'w-auto')}
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs font-medium text-[var(--text-secondary)]">Ending date</span>
            <input
              type="date"
              aria-label="Collections ending date"
              value={dateTo}
              onChange={(e) => { setPage(1); onRangeChange(dateFrom, e.target.value); }}
              className={cn(INPUT, 'w-auto')}
            />
          </label>
          <SearchInput
            className="w-full sm:max-w-sm flex-1"
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder="Search receipt, patient, folder, bill or collector..."
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Collections" size="money" value={money(report.totalAmount)} icon={ArrowDownToLine} accent="green" hint={`${report.paymentCount} receipt(s)`} />
        <StatCard label="Reversals" size="money" value={money(report.totalReversals)} icon={Undo2} accent="red" hint={`${report.reversalCount} voided payment(s)`} />
        <StatCard label="Net taken" size="money" value={money(report.netCollected)} icon={Receipt} accent="cyan" hint="Collections less reversals" />
        <StatCard label="Cash at hand" size="money" value={money(report.cashAtHand)} icon={Banknote} accent="yellow" hint="Cash receipts only — not mobile money, card, transfer or cheque" />
        <StatCard label="Cashiers" value={report.cashiers.length} icon={Users} accent="purple" hint="Staff who received money in this period" />
      </div>

      <Card title="Cashier Collections" icon={Users} accent="purple" padded={false}>
        {report.cashiers.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)] p-4">No money was received in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={TH}>Cashier</th>
                  <th className={cn(TH, NUM)}>Receipts</th>
                  <th className={cn(TH, NUM)}>Collections</th>
                  <th className={cn(TH, NUM)}>Reversals</th>
                  <th className={cn(TH, NUM)}>Balance</th>
                  <th className={cn(TH, NUM)}>Cash at hand</th>
                </tr>
              </thead>
              <tbody>
                {report.cashiers.map((cashier: BillingCashierRow) => (
                  <tr key={cashier.id} className={TR}>
                    <td className={TD}>
                      <p className="font-medium text-[var(--text-primary)]">{cashier.name}</p>
                      {cashier.username ? <p className="text-xs text-[var(--text-secondary)]">{cashier.username}</p> : null}
                    </td>
                    <td className={cn(TD, NUM, 'text-[var(--text-secondary)]')}>{cashier.receipts}</td>
                    <td className={cn(TD, NUM, 'text-[var(--icon-green-text)]')}>{money(cashier.collections)}</td>
                    <td className={cn(TD, NUM, cashier.reversals > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]')}>{money(cashier.reversals)}</td>
                    <td className={cn(TD, NUM, 'font-semibold')}>{money(cashier.balance)}</td>
                    <td className={cn(TD, NUM, 'text-[var(--text-secondary)]')}>{money(cashier.cashAtHand)}</td>
                  </tr>
                ))}
                {totalsRow('*** TOTALS ***', [
                  report.cashiers.reduce((sum, cashier) => sum + cashier.receipts, 0),
                  money(report.totalAmount),
                  money(report.totalReversals),
                  money(report.netCollected),
                  money(report.cashAtHand),
                ])}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Card title="Financial Breakdown" description="What the receipts were spent on, grouped by the service catalog each line was charged against" icon={Layers} accent="cyan" padded={false} className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TH_ROW}>
                <tr>
                  <th className={cn(TH, 'px-2')}>Description</th>
                  <th className={cn(TH, NUM, 'px-2')}>Collections</th>
                  <th className={cn(TH, NUM, 'px-2')}>Reversals</th>
                  <th className={cn(TH, NUM, 'px-2')}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {report.groups.map((group) => (
                  <GroupRows key={group.key} group={group} />
                ))}
                {totalsRow('*** TOTALS ***', [money(report.totalAmount), money(report.totalReversals), money(report.netCollected)], CELL)}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-xs text-[var(--text-tertiary)] border-t border-[var(--border-color)]">
            A payment is split across its bill's charged lines in proportion to what the patient owed on each, so the
            group totals add back to the receipts above to the cent. Bed days are counted under the ward that billed
            them; every other line is counted under its catalog sub-type.
          </p>
        </Card>

        <Card title="Details" description={`${details.length} receipt(s) and reversal(s) behind the totals`} icon={Receipt} accent="green" padded={false} className="xl:col-span-3">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-10 bg-[var(--bg-main)] rounded-lg animate-pulse" />)}
            </div>
          ) : details.length === 0 ? (
            <p className="text-sm text-[var(--text-tertiary)] p-4">
              {search ? `Nothing matches “${search}” in this period.` : 'No payments were recorded between these dates.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={TH_ROW}>
                    <tr>
                      <th className={cn(TH, 'w-10')}>#</th>
                      <th className={TH}>Receipt #</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Time</th>
                      <th className={TH}>Folder #</th>
                      <th className={TH}>Patient</th>
                      <th className={TH}>Narration</th>
                      <th className={cn(TH, NUM)}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDetails.map((row, index) => (
                      <tr key={`${row.kind}-${row.payment.id}`} className={TR}>
                        <td className={cn(TD, 'text-[var(--text-tertiary)]')}>{(safePage - 1) * rowsPerPage + index + 1}</td>
                        <td className={cn(TD, 'font-mono')}>
                          <p className="font-medium text-[var(--text-primary)]">{row.payment.reference || '—'}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{humanMethod(row.payment.paymentMethod)}</p>
                        </td>
                        <td className={cn(TD, 'text-[var(--text-secondary)]')}>{dateOnly(row.payment.transactionDate)}</td>
                        <td className={cn(TD, 'text-[var(--text-secondary)]')}>{timeOnly(row.payment.transactionDate)}</td>
                        <td className={cn(TD, 'font-mono text-[var(--text-secondary)]')}>{row.payment.bill.customer.reference || '—'}</td>
                        <td className={TD}>
                          <p className="font-medium text-[var(--text-primary)]">{row.payment.bill.customer.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{row.payment.collector?.fullName || row.payment.collector?.username || 'Unknown cashier'}</p>
                        </td>
                        <td className={cn(TD, 'whitespace-normal max-w-xs')}>
                          <div className="flex items-start gap-2">
                            {row.kind === 'reversal' ? (
                              <Badge tone="red" size="sm" dot>reversed</Badge>
                            ) : (
                              <Badge tone="green" size="sm" dot>paid</Badge>
                            )}
                            <span className="text-[var(--text-secondary)] truncate" title={narrationOf(row.payment)}>{narrationOf(row.payment)}</span>
                          </div>
                        </td>
                        <td className={cn(TD, NUM, row.kind === 'reversal' ? 'text-[var(--icon-red-text)]' : 'font-semibold text-[var(--icon-green-text)]')}>
                          {row.kind === 'reversal' ? `-${money(row.payment.amount)}` : money(row.payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center gap-3 p-3 border-t border-[var(--border-color)] flex-wrap">
                <Pagination
                  page={safePage}
                  totalPages={totalDetailPages}
                  itemsPerPage={rowsPerPage}
                  totalItems={details.length}
                  noun="receipts"
                  onChange={setPage}
                  className="flex-1"
                />
                <select
                  aria-label="Receipts per page"
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                  className={cn(INPUT, 'w-auto text-xs')}
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
                </select>
              </div>
            </>
          )}
        </Card>
      </div>
    </section>
  );
}

/** One breakdown group: its heading, its rows, and the sub-total the report is read by. */
function GroupRows({ group }: { group: BillingCollectionsReport['groups'][number] }) {
  // Nothing was charged against this group in the period, so one flat line says so rather than
  // spending a heading, a blank row and a sub-total on it.
  if (group.lines.length === 0) {
    return (
      <tr className={TR}>
        <td className={cn(CELL, 'whitespace-normal text-[var(--text-secondary)]')}>{group.label}</td>
        {['collections', 'reversals', 'balance'].map((column) => (
          <td key={column} className={cn(CELL, NUM, 'text-[var(--text-tertiary)]')}>{money(0)}</td>
        ))}
      </tr>
    );
  }

  return (
    <>
      <tr className="bg-[var(--bg-main)]">
        <td className={cn(CELL, 'font-semibold text-[var(--text-primary)]')} colSpan={4}>* {group.label} *</td>
      </tr>
      {group.lines.map((line) => (
        <tr key={line.key} className={TR}>
          <td className={cn(CELL, 'pl-6 whitespace-normal text-[var(--text-secondary)]')}>{line.label}</td>
          <td className={cn(CELL, NUM, 'text-[var(--icon-green-text)]')}>{money(line.collections)}</td>
          <td className={cn(CELL, NUM, line.reversals > 0 ? 'text-[var(--icon-red-text)]' : 'text-[var(--text-tertiary)]')}>{money(line.reversals)}</td>
          <td className={cn(CELL, NUM)}>{money(line.balance)}</td>
        </tr>
      ))}
      <tr className="border-b border-[var(--border-color)] bg-[var(--bg-main)]/50">
        <td className={cn(CELL, 'text-xs italic text-[var(--text-secondary)]')}>** Sub-Totals **</td>
        <td className={cn(CELL, NUM, 'text-xs font-semibold text-[var(--text-primary)]')}>{money(group.subtotal.collections)}</td>
        <td className={cn(CELL, NUM, 'text-xs font-semibold text-[var(--text-primary)]')}>{money(group.subtotal.reversals)}</td>
        <td className={cn(CELL, NUM, 'text-xs font-semibold text-[var(--text-primary)]')}>{money(group.subtotal.balance)}</td>
      </tr>
    </>
  );
}
