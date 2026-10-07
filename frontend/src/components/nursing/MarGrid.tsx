// src/components/nursing/MarGrid.tsx
import React, { useMemo, useState } from 'react';
import {
  Clock, AlertTriangle, CheckCircle, XCircle, Pause, Ban,
  ChevronDown, ChevronUp, User, Calendar,
} from 'lucide-react';
import type { MarDose, DoseStatus } from '../../api/nursing';

interface MarGridProps {
  doses: MarDose[];
  /** Optional: called when a dose cell is clicked (e.g., open detail drawer) */
  onDoseClick?: (dose: MarDose) => void;
  /** Optional: called when 'Give' is clicked from a cell popover */
  onAdminister?: (dose: MarDose) => void;
  /** Optional: called when a variance is chosen from a cell popover */
  onVariance?: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busyId?: string | null;
}

// ─────────────────────────────────────────────
// Status config (mirrors MarChart for consistency)
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<DoseStatus, {
  glyph: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  scheduled:    { glyph: '·', label: 'Scheduled',    bg: 'bg-[var(--bg-main)]',          text: 'text-[var(--text-tertiary)]',   border: 'border-[var(--border-color)]',         Icon: Clock },
  due:          { glyph: '●', label: 'Due now',      bg: 'bg-[var(--icon-yellow-bg)]',   text: 'text-[var(--icon-yellow-text)]', border: 'border-[var(--icon-yellow-text)]',    Icon: AlertTriangle },
  administered: { glyph: '✓', label: 'Given',        bg: 'bg-[var(--icon-green-bg)]',    text: 'text-[var(--icon-green-text)]',  border: 'border-[var(--icon-green-text)]',     Icon: CheckCircle },
  late:         { glyph: '!', label: 'Late',         bg: 'bg-[var(--icon-orange-bg)]',   text: 'text-[var(--icon-orange-text)]', border: 'border-[var(--icon-orange-text)]',    Icon: AlertTriangle },
  missed:       { glyph: '✗', label: 'Missed',       bg: 'bg-[var(--icon-red-bg)]',      text: 'text-[var(--icon-red-text)]',    border: 'border-[var(--icon-red-text)]',       Icon: XCircle },
  refused:      { glyph: '⊘', label: 'Refused',      bg: 'bg-[var(--icon-red-bg)]',      text: 'text-[var(--icon-red-text)]',    border: 'border-[var(--icon-red-text)]',       Icon: Ban },
  held:         { glyph: '‖', label: 'Held',         bg: 'bg-[var(--icon-orange-bg)]',   text: 'text-[var(--icon-orange-text)]', border: 'border-[var(--icon-orange-text)]',    Icon: Pause },
  discontinued: { glyph: '—', label: 'Discontinued', bg: 'bg-[var(--bg-main)]',          text: 'text-[var(--text-tertiary)]',    border: 'border-[var(--border-color)]',         Icon: XCircle },
};

// ─────────────────────────────────────────────
// Safe formatters
// ─────────────────────────────────────────────

const safeDate = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const fmtTime = (v: any) => {
  const d = safeDate(v);
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const fmtDayShort = (v: any) => {
  const d = safeDate(v);
  if (!d) return '—';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const dayKey = (v: any) => {
  const d = safeDate(v);
  if (!d) return 'unknown';
  return d.toDateString();
};

const isToday = (v: any) => {
  const d = safeDate(v);
  if (!d) return false;
  return d.toDateString() === new Date().toDateString();
};

// ─────────────────────────────────────────────
// Cell — one dose
// ─────────────────────────────────────────────

const DoseCell: React.FC<{
  dose: MarDose;
  onClick?: (dose: MarDose) => void;
}> = ({ dose, onClick }) => {
  const cfg = STATUS_CONFIG[dose.status];
  const { Icon } = cfg;
  const interactive = !!onClick;

  return (
    <button
      type="button"
      onClick={interactive ? () => onClick!(dose) : undefined}
      disabled={!interactive}
      title={`${dose.medication.name} @ ${fmtTime(dose.scheduledAt)} — ${cfg.label}${
        dose.administeredBy?.fullName ? ` · ${dose.administeredBy.fullName}` : ''
      }`}
      className={`group w-full flex flex-col items-stretch gap-0.5 p-1 rounded-md border ${cfg.border} ${cfg.bg} text-left transition-all ${
        interactive ? 'hover:shadow-sm hover:scale-[1.02] cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Time row */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[10px] font-bold font-mono leading-none ${cfg.text}`}>
          {fmtTime(dose.scheduledAt)}
        </span>
        <Icon className={`w-2.5 h-2.5 flex-shrink-0 ${cfg.text}`} />
      </div>

      {/* Given-by / variance snippet */}
      {dose.status === 'administered' && dose.administeredBy?.fullName && (
        <span className="text-[9px] text-[var(--text-tertiary)] truncate leading-none">
          {dose.administeredBy.fullName.split(' ').slice(-2).join(' ')}
        </span>
      )}
      {(dose.status === 'late' || dose.status === 'missed' || dose.status === 'refused' || dose.status === 'held') && (
        <span className="text-[9px] text-[var(--text-tertiary)] truncate leading-none">
          {cfg.label}
        </span>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────
// Day cell — all doses scheduled on that day for a drug
// ─────────────────────────────────────────────

const DayCell: React.FC<{
  doses: MarDose[];
  isTodayCol?: boolean;
  onDoseClick?: (dose: MarDose) => void;
}> = ({ doses, isTodayCol, onDoseClick }) => {
  const given = doses.filter(d => d.status === 'administered').length;
  const due = doses.filter(d => d.status === 'due' || d.status === 'late').length;
  const allDone = doses.length > 0 && given === doses.length;

  return (
    <div
      className={`px-2 py-2 align-top h-full ${
        isTodayCol ? 'bg-[var(--icon-cyan-bg)]/30' : ''
      }`}
    >
      {/* Doses as vertical chips */}
      <div className="flex flex-col gap-1">
        {doses.map(d => (
          <DoseCell key={d.id} dose={d} onClick={onDoseClick} />
        ))}
      </div>

      {/* Day progress */}
      <div className="mt-1.5 flex items-center justify-between gap-1">
        <span className="text-[9px] font-semibold text-[var(--text-tertiary)] tabular-nums">
          {given}/{doses.length}
        </span>
        {due > 0 && !allDone && (
          <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--icon-yellow-text)]">
            <AlertTriangle className="w-2.5 h-2.5" />
            {due}
          </span>
        )}
        {allDone && (
          <CheckCircle className="w-3 h-3 text-[var(--icon-green-text)]" />
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Drug row
// ─────────────────────────────────────────────

interface DrugRow {
  key: string;
  name: string;
  dosage: string;
  route?: string;
  frequency?: string;
  totalDoses: number;
  givenDoses: number;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export const MarGrid: React.FC<MarGridProps> = ({
  doses,
  onDoseClick,
  onAdminister,
  onVariance,
  isSubmitting,
  busyId,
}) => {
  const [expandedDrug, setExpandedDrug] = useState<string | null>(null);

  /**
   * Structure:
   *   rows: each unique drug (med id + dosage + route)
   *   cols: each unique calendar day present in the data
   *   cells: doses of that drug on that day
   */
  const { rows, cols, cellMap } = useMemo(() => {
    const drugKey = (d: MarDose) =>
      `${d.medication.id}::${d.dose || d.medication.dosage || ''}::${d.route || ''}`;

    const rowsMap = new Map<string, DrugRow>();
    const colsSet = new Set<string>();
    const colsDateMap = new Map<string, string>(); // dayKey -> first ISO for header
    const cellMap = new Map<string, MarDose[]>(); // `${drugKey}|${dayKey}` -> doses

    for (const d of doses) {
      const dk = drugKey(d);
      const ck = dayKey(d.scheduledAt);

      if (!rowsMap.has(dk)) {
        rowsMap.set(dk, {
          key: dk,
          name: d.medication.name,
          dosage: d.dose || d.medication.dosage || '—',
          route: d.route,
          frequency: (d.medication as any).frequency,
          totalDoses: 0,
          givenDoses: 0,
        });
      }
      const row = rowsMap.get(dk)!;
      row.totalDoses += 1;
      if (d.status === 'administered') row.givenDoses += 1;

      colsSet.add(ck);
      if (!colsDateMap.has(ck) && d.scheduledAt) colsDateMap.set(ck, String(d.scheduledAt));

      const cellKey = `${dk}|${ck}`;
      if (!cellMap.has(cellKey)) cellMap.set(cellKey, []);
      cellMap.get(cellKey)!.push(d);
    }

    // Sort rows alphabetically by drug name
    const rows = Array.from(rowsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Sort columns chronologically
    const cols = Array.from(colsSet).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    // Sort doses inside each cell by scheduledAt
    for (const list of cellMap.values()) {
      list.sort(
        (x, y) =>
          (safeDate(x.scheduledAt)?.getTime() ?? 0) -
          (safeDate(y.scheduledAt)?.getTime() ?? 0)
      );
    }

    return { rows, cols, cellMap, colsDateMap };
  }, [doses]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
        <Calendar className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">
          No doses to display in grid view
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Doses appear here once medications are dispensed.
        </p>
      </div>
    );
  }

  const totalGiven = doses.filter(d => d.status === 'administered').length;

  return (
    <div className="space-y-3">
      {/* ── Summary + legend bar ─────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          Grid View
        </span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          <span className="font-bold text-[var(--icon-green-text)] tabular-nums">{totalGiven}</span>
          <span className="mx-0.5">/</span>
          <span className="tabular-nums">{doses.length}</span> doses given
        </span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          · {rows.length} drug{rows.length !== 1 ? 's' : ''}
        </span>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          · {cols.length} day{cols.length !== 1 ? 's' : ''}
        </span>

        {/* Legend inline */}
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          {(['administered', 'due', 'late', 'missed', 'refused', 'scheduled'] as DoseStatus[]).map(st => {
            const cfg = STATUS_CONFIG[st];
            return (
              <span key={st} className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)]">
                <span
                  className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold border ${cfg.border} ${cfg.bg} ${cfg.text}`}
                >
                  {cfg.glyph}
                </span>
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
        <table
          className="border-collapse"
          style={{ minWidth: `${260 + cols.length * 130}px` }}
        >
          <thead>
            <tr className="bg-[var(--bg-main)]">
              {/* Sticky drug header */}
              <th
                className="sticky left-0 z-20 bg-[var(--bg-main)] px-4 py-3 text-left border-b border-r border-[var(--border-color)]"
                style={{ minWidth: 260 }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Medication
                </span>
              </th>

              {/* Day headers */}
              {cols.map(ck => {
                const iso = ck; // dayKey is Date.toString() but we can still parse
                const d = new Date(ck);
                const today = isToday(ck);
                return (
                  <th
                    key={ck}
                    className={`px-3 py-2 text-center border-b border-l border-[var(--border-color)] ${
                      today ? 'bg-[var(--icon-cyan-bg)]' : 'bg-[var(--bg-main)]'
                    }`}
                    style={{ minWidth: 130 }}
                  >
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        today ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {d.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-[11px] font-semibold ${
                        today ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {d.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                    {today && (
                      <span className="inline-block mt-0.5 px-1.5 py-0 rounded-full text-[8px] font-bold bg-[var(--icon-cyan-text)] text-white">
                        TODAY
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {rows.map(row => {
              const isExpanded = expandedDrug === row.key;
              const pct = row.totalDoses > 0 ? Math.round((row.givenDoses / row.totalDoses) * 100) : 0;

              return (
                <React.Fragment key={row.key}>
                  {/* Drug row */}
                  <tr className="border-b border-[var(--border-color)] last:border-b-0 group">
                    {/* Sticky drug cell */}
                    <td
                      className="sticky left-0 z-10 bg-[var(--bg-card)] px-4 py-3 align-top border-r border-[var(--border-color)] group-hover:bg-[var(--bg-main)] transition-colors"
                      style={{ minWidth: 260 }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {row.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                            {row.dosage}
                            {row.route ? ` · ${row.route}` : ''}
                            {row.frequency ? ` · ${row.frequency}` : ''}
                          </p>

                          {/* Mini progress bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] overflow-hidden">
                              <div
                                className="h-full bg-[var(--icon-green-text)] transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-[var(--text-tertiary)] tabular-nums">
                              {row.givenDoses}/{row.totalDoses}
                            </span>
                          </div>
                        </div>

                        {/* Expand toggle (for future drilldown) */}
                        <button
                          type="button"
                          onClick={() => setExpandedDrug(isExpanded ? null : row.key)}
                          className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
                          title={isExpanded ? 'Collapse' : 'Expand details'}
                        >
                          {isExpanded
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Day cells */}
                    {cols.map(ck => {
                      const cellDoses = cellMap.get(`${row.key}|${ck}`) || [];
                      const today = isToday(ck);
                      return (
                        <td
                          key={ck}
                          className={`align-top border-l border-[var(--border-color)] p-0 ${
                            today ? 'bg-[var(--icon-cyan-bg)]/20' : ''
                          }`}
                        >
                          {cellDoses.length > 0 ? (
                            <DayCell
                              doses={cellDoses}
                              isTodayCol={today}
                              onDoseClick={onDoseClick}
                            />
                          ) : (
                            <div className="py-3 text-center text-[var(--text-tertiary)] opacity-30 text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className="border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                      <td
                        colSpan={cols.length + 1}
                        className="px-4 py-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                              {row.name} — {row.givenDoses} of {row.totalDoses} doses given
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {doses
                              .filter(d => `${d.medication.id}::${d.dose || d.medication.dosage || ''}::${d.route || ''}` === row.key)
                              .map(d => {
                                const cfg = STATUS_CONFIG[d.status];
                                const { Icon } = cfg;
                                return (
                                  <div
                                    key={d.id}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${cfg.border} ${cfg.bg}`}
                                  >
                                    <Icon className={`w-3 h-3 flex-shrink-0 ${cfg.text}`} />
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-[10px] font-bold ${cfg.text}`}>
                                        {fmtDayShort(d.scheduledAt)} · {fmtTime(d.scheduledAt)}
                                      </p>
                                      {d.status === 'administered' && d.administeredBy?.fullName && (
                                        <p className="text-[9px] text-[var(--text-tertiary)] truncate">
                                          Given {fmtTime(d.administeredAt)} by {d.administeredBy.fullName}
                                        </p>
                                      )}
                                      {d.varianceReason && (
                                        <p className="text-[9px] text-[var(--text-tertiary)] italic truncate">
                                          {d.varianceReason}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer note ──────────────────────────────────────────── */}
      <p className="text-[10px] text-[var(--text-tertiary)] text-center">
        Click any dose cell to open detail · Hover a drug to highlight its row
      </p>
    </div>
  );
};

export default MarGrid;