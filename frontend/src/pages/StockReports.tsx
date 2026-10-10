// src/pages/StockReports.tsx — Clean flow, no step numbers
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStockStore } from '../store/stockStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  ArrowLeft, Package, TrendingUp, AlertTriangle, Calendar,
  DollarSign, Building, FileText, RefreshCw, BarChart3,
  Printer, Boxes, Clock, CheckCircle, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, Search, X, Sparkles,
  FileSpreadsheet, ArrowRight, Play, Filter
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types & Config
// ─────────────────────────────────────────────────────────────────────────────

type ReportType =
  | 'stock-status' | 'stock-movement' | 'expiry' | 'financial'
  | 'usage' | 'supplier' | 'requisition';

type AccentKey = 'cyan' | 'green' | 'yellow' | 'purple' | 'orange' | 'red';

interface ReportConfig {
  id: ReportType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: AccentKey;
  supportsDateRange: boolean;
  supportsPeriod: boolean;
  popular?: boolean;
}

const REPORT_CONFIGS: ReportConfig[] = [
  { id: 'stock-status',   name: 'Stock Status',   description: 'Current levels & low stock alerts',   icon: Package,     accent: 'cyan',   supportsDateRange: false, supportsPeriod: false, popular: true },
  { id: 'stock-movement', name: 'Stock Movement', description: 'In & out transactions over time',     icon: TrendingUp,  accent: 'green',  supportsDateRange: true,  supportsPeriod: false, popular: true },
  { id: 'expiry',         name: 'Expiry',         description: 'Expiring & expired products',         icon: Calendar,    accent: 'yellow', supportsDateRange: false, supportsPeriod: false },
  { id: 'financial',      name: 'Financial',      description: 'Inventory value & purchase summary',  icon: DollarSign,  accent: 'purple', supportsDateRange: false, supportsPeriod: false },
  { id: 'usage',          name: 'Usage',          description: 'Most dispensed & consumption trends', icon: BarChart3,   accent: 'cyan',   supportsDateRange: false, supportsPeriod: true, popular: true },
  { id: 'supplier',       name: 'Supplier',       description: 'Purchase history by supplier',        icon: Building,    accent: 'orange', supportsDateRange: false, supportsPeriod: false },
  { id: 'requisition',    name: 'Requisition',    description: 'Department requisitions & rates',     icon: FileText,    accent: 'purple', supportsDateRange: true,  supportsPeriod: false },
];

const ACCENT: Record<AccentKey, { bg: string; text: string; border: string }> = {
  cyan:   { bg: 'var(--icon-cyan-bg)',   text: 'var(--icon-cyan-text)',   border: 'var(--icon-cyan-text)' },
  green:  { bg: 'var(--icon-green-bg)',  text: 'var(--icon-green-text)',  border: 'var(--icon-green-text)' },
  yellow: { bg: 'var(--icon-yellow-bg)', text: 'var(--icon-yellow-text)', border: 'var(--icon-yellow-text)' },
  purple: { bg: 'var(--icon-purple-bg)', text: 'var(--icon-purple-text)', border: 'var(--icon-purple-text)' },
  orange: { bg: 'var(--icon-orange-bg)', text: 'var(--icon-orange-text)', border: 'var(--icon-orange-text)' },
  red:    { bg: 'var(--icon-red-bg)',    text: 'var(--icon-red-text)',    border: 'var(--icon-red-text)' },
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderColor: 'var(--border-color)',
  boxShadow: 'var(--shadow-sm)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable pieces (compact)
// ─────────────────────────────────────────────────────────────────────────────

function StatTile({
  label, value, accent, icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  accent: AccentKey;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  const a = ACCENT[accent];
  return (
    <div
      className="rounded-lg px-3 py-2.5 border relative overflow-hidden transition-all hover:shadow-md group"
      style={cardStyle}
    >
      <div
        className="absolute top-0 left-0 w-1 h-full opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: a.text }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
            {label}
          </p>
          <p className="text-base font-bold truncate" style={{ color: a.text }}>
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: a.bg }}
          >
            <Icon className="w-3 h-3" style={{ color: a.text }} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReportTable({
  caption, columns, rows, empty, searchable = false,
}: {
  caption: string;
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right'; sortable?: boolean }[];
  rows: Record<string, React.ReactNode>[];
  empty?: string;
  searchable?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filteredRows = useMemo(() => {
    if (!searchable || !search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, search, searchable]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filteredRows, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 rounded-lg border border-dashed" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--bg-card)' }}>
          <Package className="w-5 h-5 opacity-40" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>
          {empty || 'No data available'}
        </p>
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Try adjusting your filters or date range
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {searchable && rows.length > 5 && (
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-7 py-1.5 rounded-md border text-[11px] focus:outline-none focus:ring-2 transition-all"
            style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-main)' }}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    c.sortable ? 'cursor-pointer select-none hover:opacity-80' : ''
                  }`}
                  style={{ color: 'var(--text-tertiary)', textAlign: c.align || 'left' }}
                  onClick={() => c.sortable && handleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && sortKey === c.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, idx) => (
              <tr
                key={idx}
                className="transition-colors"
                style={{
                  borderTop: '1px solid var(--border-color)',
                  background: idx % 2 === 0 ? 'transparent' : 'var(--bg-main)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--icon-cyan-bg)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'var(--bg-main)')
                }
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-2.5 py-2" style={{ textAlign: c.align || 'left', color: 'var(--text-primary)' }}>
                    {row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {searchable && search && (
        <p className="text-[10px] text-center" style={{ color: 'var(--text-tertiary)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>{sortedRows.length}</span> of {rows.length} rows
        </p>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon, title, accent = 'cyan', count,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  accent?: AccentKey;
  count?: number;
}) {
  const a = ACCENT[accent];
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-primary)' }}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: a.bg }}>
          <Icon className="w-3 h-3" style={{ color: a.text }} />
        </div>
        {title}
        {count !== undefined && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: a.bg, color: a.text }}>
            {count}
          </span>
        )}
      </h3>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export default function StockReports() {
  const navigate = useNavigate();
  const { hasRole } = useAuthStore();
  const { success, error: toastError } = useToast();
  const {
    getStockValueSummary, getExpiryReport, getMovementSummary,
    getUsageReport, getSupplierReport, getRequisitionSummary, isLoading,
  } = useStockStore();

  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [period, setPeriod] = useState('month');
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const configRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isAdmin = hasRole(['admin', 'pharmacist', 'accounts']);

  const activeConfig = useMemo(
    () => (selectedReport ? REPORT_CONFIGS.find((r) => r.id === selectedReport)! : null),
    [selectedReport],
  );

  useEffect(() => {
    if (selectedReport && configRef.current) {
      configRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedReport]);

  useEffect(() => {
    setReportData(null);
    setReportError(null);
    setGeneratedAt(null);
  }, [selectedReport]);

  const generateReport = useCallback(async () => {
    if (!selectedReport || !activeConfig) return;
    setGenerating(true);
    setReportError(null);
    try {
      let data: any = null;
      switch (selectedReport) {
        case 'stock-status':
        case 'financial':
          data = await getStockValueSummary();
          break;
        case 'stock-movement':
          data = await getMovementSummary(dateRange.startDate || undefined, dateRange.endDate || undefined);
          break;
        case 'expiry':
          data = await getExpiryReport(30);
          break;
        case 'usage':
          data = await getUsageReport(period, 20);
          break;
        case 'supplier':
          data = await getSupplierReport();
          break;
        case 'requisition':
          data = await getRequisitionSummary(dateRange.startDate || undefined, dateRange.endDate || undefined);
          break;
      }
      setReportData(data);
      setGeneratedAt(new Date());
      success('Report ready', `${activeConfig.name} generated successfully`);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not generate report';
      setReportError(msg);
      toastError('Generation failed', msg);
    } finally {
      setGenerating(false);
    }
  }, [selectedReport, activeConfig, dateRange, period, getStockValueSummary, getMovementSummary, getExpiryReport, getUsageReport, getSupplierReport, getRequisitionSummary, success, toastError]);

  // ── CSV export ─────────────────────────────────────────────────────────
  const buildExportRows = (): { headers: string[]; rows: (string | number)[][] } => {
    if (!reportData || !selectedReport) return { headers: [], rows: [] };

    switch (selectedReport) {
      case 'stock-status':
      case 'financial': {
        if (reportData.lowStockItems?.length) {
          return {
            headers: ['Item Name', 'Category', 'Current Stock', 'Reorder Level', 'Cost Price'],
            rows: reportData.lowStockItems.map((i: any) => [i.name, i.category, i.currentStock, i.reorderLevel, i.costPrice ?? 0]),
          };
        }
        if (reportData.byCategory) {
          return {
            headers: ['Category', 'Count', 'Value'],
            rows: Object.entries(reportData.byCategory).map(([cat, d]: [string, any]) => [cat, d.count, (d.value || 0).toFixed(2)]),
          };
        }
        return { headers: [], rows: [] };
      }
      case 'stock-movement':
        return {
          headers: ['Item', 'Quantity', 'Type'],
          rows: (reportData.topMovements || []).map((i: any) => [i.name, i.quantity, i.type]),
        };
      case 'expiry':
        return {
          headers: ['Item Name', 'Category', 'Expiry Date', 'Current Stock'],
          rows: (reportData.expiringSoon || []).map((i: any) => [i.name, i.category, new Date(i.expiryDate).toLocaleDateString(), i.currentStock]),
        };
      case 'supplier':
        return {
          headers: ['Supplier', 'Total Spent', 'Invoices', 'Last Order'],
          rows: (reportData.suppliers || []).map((s: any) => [
            s.name, (s.totalSpent || 0).toFixed(2), s.invoiceCount || 0,
            s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : 'N/A',
          ]),
        };
      case 'requisition':
        return {
          headers: ['Department', 'Total', 'Fulfilled', 'Items'],
          rows: (reportData.byDepartment || []).map((d: any) => [d.name, d.total, d.fulfilled, d.items]),
        };
      case 'usage':
        return {
          headers: ['Item', 'Category', 'Quantity', 'Transactions'],
          rows: (reportData.topItems || []).map((i: any) => [i.name, i.category || 'N/A', i.quantity, i.transactions || 0]),
        };
      default:
        return { headers: [], rows: [] };
    }
  };

  const exportToCSV = () => {
    const { headers, rows } = buildExportRows();
    if (rows.length === 0) { toastError('Export failed', 'No data to export'); return; }
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success('Exported', 'Report downloaded as CSV');
  };

  // ── Print ──────────────────────────────────────────────────────────────
  const printReport = () => {
    if (!reportData || !activeConfig) return;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) { toastError('Print blocked', 'Allow pop-ups for this site to print'); return; }

    const { headers, rows } = buildExportRows();
    const summaryHtml = buildPrintSummary();
    const tableHtml = rows.length
      ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${String(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
      : '<p class="empty">No tabular data for this report.</p>';

    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8" />
        <title>${activeConfig.name} — ${new Date().toLocaleDateString()}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, Segoe UI, Arial, sans-serif; margin: 40px; color: #111; }
          h1 { font-size: 20px; margin: 0; }
          .meta { color: #666; font-size: 12px; margin-top: 4px; }
          .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 20px; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
          .summary .item { border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; }
          .summary .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
          .summary .value { font-size: 18px; font-weight: 700; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; padding: 8px 10px; border-bottom: 1px solid #ddd; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; }
          .empty { color: #888; font-style: italic; }
          .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #666; }
          @media print { body { margin: 20px; } }
        </style></head><body>
        <div class="header"><h1>${activeConfig.name} Report</h1><p class="meta">Generated ${new Date().toLocaleString()}</p></div>
        ${summaryHtml}${tableHtml}
        <div class="footer">Confidential — Internal Use Only</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  // ── Summary tiles ─────────────────────────────────────────────────────
  const summaryTiles = useMemo(() => {
    if (!reportData || !selectedReport) return [] as { label: string; value: React.ReactNode; accent: AccentKey; icon?: any }[];
    const tiles: { label: string; value: React.ReactNode; accent: AccentKey; icon?: any }[] = [];
    const add = (label: string, value: any, accent: AccentKey, format?: (v: any) => React.ReactNode, icon?: any) => {
      if (value === undefined || value === null) return;
      tiles.push({ label, value: format ? format(value) : value, accent, icon });
    };

    if (selectedReport === 'financial' || selectedReport === 'stock-status') {
      add('Total Items', reportData.totalItems, 'cyan', undefined, Package);
      add('Medications', reportData.medications, 'green', undefined, Boxes);
      add('Total Value', reportData.totalValue, 'purple', (v) => `₵${Number(v).toFixed(2)}`, DollarSign);
      add('Low Stock', reportData.lowStockItems, 'red', undefined, AlertTriangle);
      add('Out of Stock', reportData.outOfStockItems, 'red', undefined, AlertTriangle);
      add('Expiring Soon', reportData.expiringSoon, 'yellow', undefined, Calendar);
    }
    if (selectedReport === 'requisition' && reportData.summary) {
      const s = reportData.summary;
      add('Total Requisitions', s.total ?? 0, 'cyan', undefined, FileText);
      add('Submitted', s.byStatus?.submitted ?? 0, 'cyan', undefined, Clock);
      add('Approved', s.byStatus?.approved ?? 0, 'green', undefined, CheckCircle);
      add('Fulfilled', s.byStatus?.fulfilled ?? 0, 'purple', undefined, CheckCircle);
      add('Fulfillment Rate', s.fulfillmentRate || '0%', 'green', undefined, TrendingUp);
    }
    if (selectedReport === 'supplier' && reportData.summary) {
      const s = reportData.summary;
      add('Total Suppliers', s.totalSuppliers ?? 0, 'cyan', undefined, Building);
      add('Total Spent', s.totalSpent ?? 0, 'green', (v) => `₵${Number(v).toFixed(2)}`, DollarSign);
      add('Total Invoices', s.totalInvoices ?? 0, 'purple', undefined, FileText);
    }
    if (selectedReport === 'stock-movement' && reportData.summary) {
      const s = reportData.summary;
      add('Transactions', s.totalTransactions ?? 0, 'cyan', undefined, TrendingUp);
      add('Stock In', s.totalIn ?? 0, 'green', undefined, ArrowUpRight);
      add('Stock Out', s.totalOut ?? 0, 'red', undefined, ArrowDownRight);
      add('Purchases', s.byType?.purchases ?? 0, 'purple', undefined, Package);
    }
    if (selectedReport === 'expiry' && reportData.summary) {
      const s = reportData.summary;
      add('With Expiry', s.totalWithExpiry ?? 0, 'cyan', undefined, Calendar);
      add('Expiring Soon', s.expiringSoon ?? 0, 'yellow', undefined, AlertTriangle);
      add('Expired', s.expired ?? 0, 'red', undefined, AlertTriangle);
      add('Expiring Value', s.expiringValue ?? 0, 'purple', (v) => `₵${Number(v).toFixed(2)}`, DollarSign);
    }
    if (selectedReport === 'usage' && reportData.summary) {
      const s = reportData.summary;
      add('Items Dispensed', s.totalItemsDispensed ?? 0, 'cyan', undefined, BarChart3);
      add('Total Quantity', s.totalQuantity ?? 0, 'green', undefined, Package);
      if (s.topItem?.name) add('Top Item', s.topItem.name, 'purple', undefined, Sparkles);
    }
    return tiles;
  }, [reportData, selectedReport]);

  const buildPrintSummary = () => {
    if (summaryTiles.length === 0) return '';
    const items = summaryTiles.map((t) => `<div class="item"><div class="label">${t.label}</div><div class="value">${String(t.value)}</div></div>`).join('');
    return `<div class="summary">${items}</div>`;
  };

  // ── Applied filter chips ──────────────────────────────────────────────
  const appliedFilters = useMemo(() => {
    if (!activeConfig) return [] as string[];
    const chips: string[] = [];
    if (activeConfig.supportsDateRange && (dateRange.startDate || dateRange.endDate)) {
      chips.push(`${dateRange.startDate || '…'} → ${dateRange.endDate || '…'}`);
    }
    if (activeConfig.supportsPeriod) {
      const label = ({ week: 'Last 7 days', month: 'Last 30 days', quarter: 'Last 3 months', year: 'Last 12 months' } as Record<string, string>)[period] || period;
      chips.push(label);
    }
    return chips;
  }, [activeConfig, dateRange, period]);

  // ── Render report body ────────────────────────────────────────────────
  const renderReportBody = () => {
    if (!reportData || !selectedReport) return null;

    switch (selectedReport) {
      case 'stock-status': {
        const low = reportData.lowStockItems || [];
        const byCat = reportData.byCategory || {};
        return (
          <>
            <section className="mb-4">
              <SectionHeader icon={AlertTriangle} title="Low Stock Items" accent="red" count={low.length} />
              <ReportTable
                caption="Low stock inventory items"
                empty="All inventory levels are healthy"
                searchable
                columns={[
                  { key: 'name', label: 'Item', sortable: true },
                  { key: 'category', label: 'Category', sortable: true },
                  { key: 'currentStock', label: 'Stock', align: 'center', sortable: true },
                  { key: 'reorderLevel', label: 'Reorder', align: 'center', sortable: true },
                  { key: 'cost', label: 'Cost', align: 'right', sortable: true },
                ]}
                rows={low.map((i: any) => ({
                  name: <span className="font-medium">{i.name}</span>,
                  category: <span className="capitalize">{i.category}</span>,
                  currentStock: <span style={{ color: 'var(--icon-red-text)', fontWeight: 600 }}>{i.currentStock}</span>,
                  reorderLevel: i.reorderLevel,
                  cost: `₵${Number(i.costPrice || 0).toFixed(2)}`,
                }))}
              />
            </section>
            {Object.keys(byCat).length > 0 && (
              <section>
                <SectionHeader icon={Boxes} title="Category Summary" count={Object.keys(byCat).length} />
                <ReportTable
                  caption="Stock value by category"
                  columns={[
                    { key: 'cat', label: 'Category', sortable: true },
                    { key: 'count', label: 'Count', align: 'center', sortable: true },
                    { key: 'value', label: 'Value', align: 'right', sortable: true },
                  ]}
                  rows={Object.entries(byCat).map(([cat, d]: [string, any]) => ({
                    cat: <span className="font-medium">{cat}</span>,
                    count: d.count,
                    value: `₵${Number(d.value || 0).toFixed(2)}`,
                  }))}
                />
              </section>
            )}
          </>
        );
      }

      case 'stock-movement':
        return (
          <section>
            <SectionHeader icon={TrendingUp} title="Top Moving Items" accent="green" count={(reportData.topMovements || []).length} />
            <ReportTable
              caption="Items with the highest stock movement"
              empty="No movement recorded in this period"
              searchable
              columns={[
                { key: 'name', label: 'Item', sortable: true },
                { key: 'quantity', label: 'Quantity', align: 'center', sortable: true },
                { key: 'type', label: 'Type', sortable: true },
              ]}
              rows={(reportData.topMovements || []).map((i: any) => ({
                name: <span className="font-medium">{i.name}</span>,
                quantity: <span style={{ fontWeight: 700 }}>{i.quantity}</span>,
                type: (
                  <span className="capitalize px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                    style={{
                      background: i.type === 'in' ? 'var(--icon-green-bg)' : 'var(--icon-red-bg)',
                      color: i.type === 'in' ? 'var(--icon-green-text)' : 'var(--icon-red-text)',
                    }}>
                    {i.type}
                  </span>
                ),
              }))}
            />
          </section>
        );

      case 'expiry':
        return (
          <section>
            <SectionHeader icon={Calendar} title={`Expiring within ${reportData.reportPeriod || 30} days`} accent="yellow" count={(reportData.expiringSoon || []).length} />
            <ReportTable
              caption="Items expiring soon"
              empty="No items expiring in this window"
              searchable
              columns={[
                { key: 'name', label: 'Item', sortable: true },
                { key: 'category', label: 'Category', sortable: true },
                { key: 'expiry', label: 'Expiry Date', sortable: true },
                { key: 'stock', label: 'Stock', align: 'center', sortable: true },
              ]}
              rows={(reportData.expiringSoon || []).map((i: any) => ({
                name: <span className="font-medium">{i.name}</span>,
                category: <span className="capitalize">{i.category}</span>,
                expiry: (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ background: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' }}>
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(i.expiryDate).toLocaleDateString()}
                  </span>
                ),
                stock: i.currentStock,
              }))}
            />
          </section>
        );

      case 'supplier':
        return (
          <section>
            <SectionHeader icon={Building} title="Supplier Summary" accent="orange" count={(reportData.suppliers || []).length} />
            <ReportTable
              caption="Purchases by supplier"
              empty="No supplier activity recorded"
              searchable
              columns={[
                { key: 'name', label: 'Supplier', sortable: true },
                { key: 'spent', label: 'Total Spent', align: 'right', sortable: true },
                { key: 'invoices', label: 'Invoices', align: 'center', sortable: true },
                { key: 'last', label: 'Last Order', sortable: true },
              ]}
              rows={(reportData.suppliers || []).map((s: any) => ({
                name: <span className="font-medium">{s.name}</span>,
                spent: <span style={{ color: 'var(--icon-green-text)', fontWeight: 600 }}>₵{Number(s.totalSpent || 0).toFixed(2)}</span>,
                invoices: s.invoiceCount || 0,
                last: s.lastOrderDate ? new Date(s.lastOrderDate).toLocaleDateString() : 'N/A',
              }))}
            />
          </section>
        );

      case 'usage':
        return (
          <section>
            <SectionHeader icon={BarChart3} title={`Most dispensed items — ${period}`} count={(reportData.topItems || []).length} />
            <ReportTable
              caption="Top dispensed items"
              empty="No dispensing activity in this period"
              searchable
              columns={[
                { key: 'name', label: 'Item', sortable: true },
                { key: 'category', label: 'Category', sortable: true },
                { key: 'quantity', label: 'Quantity', align: 'center', sortable: true },
                { key: 'tx', label: 'Transactions', align: 'center', sortable: true },
              ]}
              rows={(reportData.topItems || []).map((i: any) => ({
                name: <span className="font-medium">{i.name}</span>,
                category: <span className="capitalize">{i.category || 'N/A'}</span>,
                quantity: <span style={{ fontWeight: 700 }}>{i.quantity}</span>,
                tx: i.transactions || 0,
              }))}
            />
          </section>
        );

      case 'requisition': {
        const byDept = reportData.byDepartment || [];
        const byStatus = reportData.summary?.byStatus || {};
        return (
          <>
            <section className="mb-4">
              <SectionHeader icon={FileText} title="Requisitions by department" accent="purple" count={byDept.length} />
              <ReportTable
                caption="Requisition count and fulfillment by department"
                empty="No requisitions in this period"
                searchable
                columns={[
                  { key: 'name', label: 'Department', sortable: true },
                  { key: 'total', label: 'Total', align: 'center', sortable: true },
                  { key: 'fulfilled', label: 'Fulfilled', align: 'center', sortable: true },
                  { key: 'items', label: 'Items', align: 'center', sortable: true },
                  { key: 'rate', label: 'Rate', align: 'center', sortable: true },
                ]}
                rows={byDept.map((d: any) => ({
                  name: <span className="font-medium">{d.name}</span>,
                  total: d.total,
                  fulfilled: <span style={{ color: 'var(--icon-green-text)' }}>{d.fulfilled}</span>,
                  items: d.items,
                  rate: (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                      style={{
                        background: d.total > 0 && d.fulfilled / d.total > 0.7 ? 'var(--icon-green-bg)' : 'var(--icon-yellow-bg)',
                        color: d.total > 0 && d.fulfilled / d.total > 0.7 ? 'var(--icon-green-text)' : 'var(--icon-yellow-text)',
                      }}>
                      {d.total > 0 ? `${Math.round((d.fulfilled / d.total) * 100)}%` : '0%'}
                    </span>
                  ),
                }))}
              />
            </section>
            {Object.keys(byStatus).length > 0 && (
              <section>
                <SectionHeader icon={Clock} title="Status summary" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {Object.entries(byStatus).map(([status, count]: [string, any]) => {
                    const statusAccent: AccentKey =
                      status === 'approved' ? 'green' : status === 'fulfilled' ? 'purple' :
                      status === 'cancelled' ? 'red' : 'cyan';
                    const a = ACCENT[statusAccent];
                    return (
                      <div key={status} className="rounded-lg p-2.5 text-center border transition-all hover:shadow-md"
                        style={{ background: a.bg, borderColor: 'var(--border-color)' }}>
                        <p className="text-lg font-bold" style={{ color: a.text }}>{String(count)}</p>
                        <p className="text-[10px] capitalize font-medium" style={{ color: a.text }}>{status}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        );
      }

      case 'financial':
      default:
        return reportData.byCategory ? (
          <section>
            <SectionHeader icon={DollarSign} title="Inventory value by category" accent="purple" count={Object.keys(reportData.byCategory).length} />
            <ReportTable
              caption="Inventory value by category"
              searchable
              columns={[
                { key: 'cat', label: 'Category', sortable: true },
                { key: 'count', label: 'Count', align: 'center', sortable: true },
                { key: 'value', label: 'Value', align: 'right', sortable: true },
              ]}
              rows={Object.entries(reportData.byCategory).map(([cat, d]: [string, any]) => ({
                cat: <span className="font-medium">{cat}</span>,
                count: d.count,
                value: `₵${Number(d.value || 0).toFixed(2)}`,
              }))}
            />
          </section>
        ) : null;
    }
  };

  const busy = generating || (isLoading && !reportData);

  return (
    <div className="space-y-3 p-3 sm:p-4" style={{ background: 'var(--bg-main)', minHeight: '100vh' }}>

      {/* ═══════════ Header ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="p-1.5 rounded-lg transition-all hover:scale-105"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <BarChart3 className="w-4 h-4" style={{ color: 'var(--icon-cyan-text)' }} />
              Stock Reports
            </h1>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Pick a report, configure filters, then generate
            </p>
          </div>
        </div>

        {reportData && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={generateReport}
              disabled={busy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm disabled:opacity-50"
              style={{ ...cardStyle, color: 'var(--text-primary)' }}
            >
              <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm"
              style={{ ...cardStyle, color: 'var(--text-primary)' }}
            >
              <FileSpreadsheet className="w-3 h-3" style={{ color: 'var(--icon-green-text)' }} />
              CSV
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm"
              style={{ ...cardStyle, color: 'var(--text-primary)' }}
            >
              <Printer className="w-3 h-3" style={{ color: 'var(--icon-purple-text)' }} />
              Print
            </button>
          </div>
        )}
      </div>

      {/* ═══════════ Report picker ═══════════ */}
      <div className="rounded-lg border p-3" style={cardStyle}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {REPORT_CONFIGS.map((report) => {
            const isActive = selectedReport === report.id;
            const a = ACCENT[report.accent];
            const Icon = report.icon;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                aria-pressed={isActive}
                className="relative p-3 rounded-lg border text-left transition-all focus:outline-none focus:ring-2 hover:shadow-sm"
                style={{
                  background: isActive ? a.bg : 'var(--bg-card)',
                  borderColor: isActive ? a.text : 'var(--border-color)',
                  borderWidth: isActive ? '1.5px' : '1px',
                }}
              >
                {isActive && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                    style={{ background: a.text }}
                  >
                    <CheckCircle className="w-3 h-3" style={{ color: '#fff' }} />
                  </div>
                )}
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center mb-1.5"
                  style={{ background: isActive ? a.text : a.bg }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: isActive ? '#fff' : a.text }} />
                </div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-[12px] truncate" style={{ color: isActive ? a.text : 'var(--text-primary)' }}>
                    {report.name}
                  </h3>
                  {report.popular && !isActive && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded uppercase tracking-wide"
                      style={{ background: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' }}>
                      Hot
                    </span>
                  )}
                </div>
                <p className="text-[10px] mt-0.5 leading-tight line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {report.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════ Configure & Generate ═══════════ */}
      {activeConfig && (
        <div ref={configRef} className="rounded-lg border p-3" style={cardStyle}>
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: ACCENT[activeConfig.accent].bg }}
            >
              <activeConfig.icon className="w-3.5 h-3.5" style={{ color: ACCENT[activeConfig.accent].text }} />
            </div>
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {activeConfig.name} Report
            </h2>
          </div>

          {/* Filters */}
          {(activeConfig.supportsDateRange || activeConfig.supportsPeriod) && (
            <div className="rounded-lg border p-2.5 mb-2.5" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {activeConfig.supportsDateRange && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Date
                    </span>
                    <div className="flex items-center gap-0.5 rounded-md p-0.5 border"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))}
                        aria-label="Start date"
                        className="px-1.5 py-0.5 rounded text-[11px] border-0 bg-transparent focus:outline-none"
                        style={{ color: 'var(--text-primary)', width: '108px' }}
                      />
                      <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>→</span>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))}
                        aria-label="End date"
                        className="px-1.5 py-0.5 rounded text-[11px] border-0 bg-transparent focus:outline-none"
                        style={{ color: 'var(--text-primary)', width: '108px' }}
                      />
                    </div>
                    {(dateRange.startDate || dateRange.endDate) && (
                      <button
                        onClick={() => setDateRange({ startDate: '', endDate: '' })}
                        className="text-[10px] font-medium hover:underline flex items-center gap-0.5"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <X className="w-2.5 h-2.5" /> Clear
                      </button>
                    )}
                  </div>
                )}

                {activeConfig.supportsPeriod && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                      Period
                    </span>
                    <div className="flex items-center gap-0.5 rounded-md p-0.5 border"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      {[
                        { value: 'week', label: '7d' },
                        { value: 'month', label: '30d' },
                        { value: 'quarter', label: '3m' },
                        { value: 'year', label: '1y' },
                      ].map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPeriod(p.value)}
                          aria-pressed={period === p.value}
                          className="px-2 py-0.5 rounded text-[11px] font-medium transition-all"
                          style={
                            period === p.value
                              ? { background: 'var(--bg-main)', color: 'var(--icon-cyan-text)' }
                              : { color: 'var(--text-secondary)' }
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generate CTA */}
          <button
            onClick={generateReport}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: busy ? 'var(--bg-main)' : 'var(--icon-cyan-text)',
              color: busy ? 'var(--text-secondary)' : '#fff',
            }}
          >
            {busy ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating {activeConfig.name.toLowerCase()}…
              </>
            ) : (
              <>
                <Play className="w-4 h-4" fill="currentColor" />
                {reportData ? `Regenerate ${activeConfig.name}` : `Generate ${activeConfig.name}`}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {reportError && (
            <div className="mt-2.5 rounded-lg p-2.5 border flex items-start gap-2"
              style={{ background: 'var(--icon-red-bg)', borderColor: 'var(--border-color)' }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--icon-red-text)' }} />
              <p className="text-[11px]" style={{ color: 'var(--icon-red-text)' }}>{reportError}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ Results ═══════════ */}
      <div ref={resultsRef}>
        {reportData && activeConfig && (
          <div className="rounded-lg border overflow-hidden" style={cardStyle}>
            <div className="px-4 py-3 border-b flex items-start justify-between gap-3 flex-wrap"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: ACCENT[activeConfig.accent].bg }}>
                  <activeConfig.icon className="w-4 h-4" style={{ color: ACCENT[activeConfig.accent].text }} />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {activeConfig.name} Report
                  </h2>
                  <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                    <Clock className="w-2.5 h-2.5" />
                    Generated {generatedAt ? generatedAt.toLocaleString() : new Date().toLocaleString()}
                  </p>
                  {appliedFilters.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1.5">
                      <Filter className="w-2.5 h-2.5" style={{ color: 'var(--text-tertiary)' }} />
                      {appliedFilters.map((chip, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              {summaryTiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                  {summaryTiles.map((tile, i) => (
                    <StatTile key={i} label={tile.label} value={tile.value} accent={tile.accent} icon={tile.icon} />
                  ))}
                </div>
              )}
              {renderReportBody()}
            </div>
          </div>
        )}

        {!reportData && !busy && !activeConfig && (
          <div className="rounded-lg p-10 text-center border border-dashed" style={{ ...cardStyle, borderStyle: 'dashed' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--icon-cyan-bg)' }}>
              <Sparkles className="w-6 h-6" style={{ color: 'var(--icon-cyan-text)' }} />
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Start by picking a report above
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Click any card to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}