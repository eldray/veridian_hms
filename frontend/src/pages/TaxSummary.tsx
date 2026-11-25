// src/pages/TaxSummary.tsx
//
// The filing view for VAT and levies. Every figure is read from the tax trail
// stored on each bill, so a return filed today reports the rates that were
// actually charged in the period — not today's settings applied backwards.
import { useCallback, useEffect, useState } from 'react';
import { Calculator, FileText, Percent, Receipt, RefreshCw, ShieldCheck } from 'lucide-react';
import { getBillingTaxSummary, type BillingTaxSummary } from '../api';
import { Button, Card, cn, INPUT, PageHeader, StatCard, TABLE_SHELL, TD, TH, TH_ROW, TR } from '../components/ui';
import { useToast } from '../store/toastStore';
import { useSmartBack } from '../utils/useSmartBack';

const money = (value: number | string | null | undefined) =>
  `GHS ${(Number(value) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const EMPTY: BillingTaxSummary = {
  period: { start: '', end: '' },
  summary: { invoiceCount: 0, invoicesWithTax: 0, grossSales: 0, taxableSales: 0, exemptSales: 0, taxCollected: 0 },
  byComponent: [],
  byPayer: [],
  daily: [],
};

const humanMode = (mode: string) => mode.replace(/_/g, ' ');

export default function TaxSummary() {
  const goBack = useSmartBack('/dashboard/billing');
  const { error: toastError } = useToast();
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);
  const [report, setReport] = useState<BillingTaxSummary>(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    if (dateFrom > dateTo) {
      toastError('Invalid period', 'The start date must be on or before the end date.');
      return;
    }
    setLoading(true);
    try {
      const data = await getBillingTaxSummary({
        dateFrom: new Date(`${dateFrom}T00:00:00`).toISOString(),
        dateTo: new Date(`${dateTo}T23:59:59.999`).toISOString(),
      });
      setReport(data || EMPTY);
    } catch (err: any) {
      toastError('Tax summary failed', err?.response?.data?.message || err?.message || 'Could not load the tax summary.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, toastError]);

  useEffect(() => { load(); }, [load]);

  const summary = report.summary;
  const componentTotal = report.byComponent.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const rate = summary.taxableSales > 0 ? (summary.taxCollected / summary.taxableSales) * 100 : 0;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <PageHeader
        title="Tax Summary"
        subtitle="VAT and levies charged on patient bills for a filing period"
        icon={Calculator}
        accent="cyan"
        backTo="/dashboard/billing"
        actions={(
          <Button variant="secondary" icon={RefreshCw} loading={loading} onClick={load}>Refresh</Button>
        )}
      />

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block">
            <span className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">From</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={cn(INPUT, 'w-auto')} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">To</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={cn(INPUT, 'w-auto')} />
          </label>
          <p className="text-xs text-[var(--text-tertiary)] sm:ml-auto sm:pb-2">
            {summary.invoicesWithTax} of {summary.invoiceCount} invoice{summary.invoiceCount === 1 ? '' : 's'} carried tax
            {rate > 0 ? ` · effective rate on taxable sales ${rate.toFixed(2)}%` : ''}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard label="Gross sales" value={money(summary.grossSales)} size="money" icon={Receipt} accent="cyan" />
        <StatCard label="Taxable sales" value={money(summary.taxableSales)} size="money" icon={Percent} accent="yellow" />
        <StatCard label="Exempt sales" value={money(summary.exemptSales)} size="money" icon={ShieldCheck} accent="green" />
        <StatCard label="Tax collected" value={money(summary.taxCollected)} size="money" icon={FileText} accent="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <Card title="Tax by component" icon={Percent}>
          <div className={cn(TABLE_SHELL, "overflow-x-auto")}>
            <table className="w-full text-sm">
              <thead>
                <tr className={TH_ROW}>
                  <th className={TH}>Code</th>
                  <th className={TH}>Component</th>
                  <th className={cn(TH, 'text-right')}>Rate</th>
                  <th className={cn(TH, 'text-right')}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.byComponent.map((row) => (
                  <tr key={row.code} className={TR}>
                    <td className={cn(TD, 'font-mono text-xs')}>{row.code}</td>
                    <td className={TD}>{row.name}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{row.rate ? `${Number(row.rate).toFixed(2)}%` : '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-medium')}>{money(row.amount)}</td>
                  </tr>
                ))}
                {report.byComponent.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No tax was charged in this period.</td></tr>
                )}
              </tbody>
              {report.byComponent.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[var(--border-color)]">
                    <td className={cn(TD, 'font-semibold')} colSpan={3}>Total tax</td>
                    <td className={cn(TD, 'text-right tabular-nums font-bold')}>{money(componentTotal)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        <Card title="By payer type" icon={Receipt}>
          <div className={cn(TABLE_SHELL, "overflow-x-auto")}>
            <table className="w-full text-sm">
              <thead>
                <tr className={TH_ROW}>
                  <th className={TH}>Payer</th>
                  <th className={cn(TH, 'text-right')}>Bills</th>
                  <th className={cn(TH, 'text-right')}>Taxable</th>
                  <th className={cn(TH, 'text-right')}>Exempt</th>
                  <th className={cn(TH, 'text-right')}>Tax</th>
                </tr>
              </thead>
              <tbody>
                {report.byPayer.map((row) => (
                  <tr key={row.paymentMode} className={TR}>
                    <td className={cn(TD, 'capitalize')}>{humanMode(row.paymentMode)}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{row.invoiceCount}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{money(row.taxableSales)}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{money(row.exemptSales)}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-medium')}>{money(row.taxCollected)}</td>
                  </tr>
                ))}
                {report.byPayer.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No bills in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Daily filing" icon={FileText}>
        <div className={cn(TABLE_SHELL, "overflow-x-auto")}>
          <table className="w-full text-sm">
            <thead>
              <tr className={TH_ROW}>
                <th className={TH}>Date</th>
                <th className={cn(TH, 'text-right')}>Bills</th>
                <th className={cn(TH, 'text-right')}>Taxable sales</th>
                <th className={cn(TH, 'text-right')}>Exempt sales</th>
                <th className={cn(TH, 'text-right')}>Tax collected</th>
              </tr>
            </thead>
            <tbody>
              {report.daily.map((row) => (
                <tr key={row.date} className={TR}>
                  <td className={TD}>{new Date(`${row.date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{row.invoiceCount}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{money(row.taxableSales)}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{money(row.exemptSales)}</td>
                  <td className={cn(TD, 'text-right tabular-nums font-medium')}>{money(row.taxCollected)}</td>
                </tr>
              ))}
              {report.daily.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-[var(--text-tertiary)]">No bills in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={goBack}>Back to billing</Button>
      </div>
    </div>
  );
}
