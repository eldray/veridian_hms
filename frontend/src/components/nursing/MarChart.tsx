// src/components/nursing/MarChart.tsx
import React, { useMemo, useState, useRef } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, XCircle, Pause, Ban,
  Syringe, Calendar, Pill, ChevronDown, ChevronRight,
  AlertOctagon,
} from 'lucide-react';
import type { MarDose, DoseStatus } from '../../api/nursing';

interface MarChartProps {
  doses: MarDose[];
  onAdminister: (dose: MarDose) => void;
  onVariance: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busyId?: string | null;
}

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

const fmtDayLabel = (v: any) => {
  const d = safeDate(v);
  if (!d) return '—';
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
};

const isToday = (v: any) => {
  const d = safeDate(v);
  if (!d) return false;
  return d.toDateString() === new Date().toDateString();
};

const isTomorrow = (v: any) => {
  const d = safeDate(v);
  if (!d) return false;
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.toDateString() === t.toDateString();
};

const dateKeyOf = (v: any) => {
  const d = safeDate(v);
  return d ? d.toDateString() : 'unknown';
};

const initialsOf = (name?: string | null) => {
  if (!name) return '—';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
};

// ─────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<DoseStatus, {
  label: string;
  cellBg: string;
  cellBorder: string;
  text: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  scheduled:    { label: 'Scheduled',    cellBg: 'bg-[var(--bg-main)]',         cellBorder: 'border-[var(--border-color)]',      text: 'text-[var(--text-tertiary)]',    dot: 'bg-[var(--text-tertiary)]',    Icon: Clock },
  due:          { label: 'Due now',      cellBg: 'bg-[var(--icon-yellow-bg)]',  cellBorder: 'border-[var(--icon-yellow-text)]',  text: 'text-[var(--icon-yellow-text)]', dot: 'bg-[var(--icon-yellow-text)]', Icon: AlertTriangle },
  administered: { label: 'Given',        cellBg: 'bg-[var(--icon-green-bg)]',   cellBorder: 'border-[var(--icon-green-text)]',   text: 'text-[var(--icon-green-text)]',  dot: 'bg-[var(--icon-green-text)]',  Icon: CheckCircle },
  late:         { label: 'Late',         cellBg: 'bg-[var(--icon-orange-bg)]',  cellBorder: 'border-[var(--icon-orange-text)]',  text: 'text-[var(--icon-orange-text)]', dot: 'bg-[var(--icon-orange-text)]', Icon: AlertTriangle },
  missed:       { label: 'Missed',       cellBg: 'bg-[var(--icon-red-bg)]',     cellBorder: 'border-[var(--icon-red-text)]',     text: 'text-[var(--icon-red-text)]',    dot: 'bg-[var(--icon-red-text)]',    Icon: XCircle },
  refused:      { label: 'Refused',      cellBg: 'bg-[var(--icon-red-bg)]',     cellBorder: 'border-[var(--icon-red-text)]',     text: 'text-[var(--icon-red-text)]',    dot: 'bg-[var(--icon-red-text)]',    Icon: Ban },
  held:         { label: 'Held',         cellBg: 'bg-[var(--icon-orange-bg)]',  cellBorder: 'border-[var(--icon-orange-text)]',  text: 'text-[var(--icon-orange-text)]', dot: 'bg-[var(--icon-orange-text)]', Icon: Pause },
  discontinued: { label: 'Discontinued', cellBg: 'bg-[var(--bg-main)]',         cellBorder: 'border-[var(--border-color)]',      text: 'text-[var(--text-tertiary)]',    dot: 'bg-[var(--text-tertiary)]',    Icon: XCircle },
};

// ─────────────────────────────────────────────
// Dose cell
// ─────────────────────────────────────────────

const DoseCell: React.FC<{
  dose: MarDose | null;
  onAdminister: (dose: MarDose) => void;
  onVariance: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busy?: boolean;
}> = ({ dose, onAdminister, onVariance, isSubmitting, busy }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Empty slot (no dose scheduled at this time for this drug today)
  if (!dose) {
    return (
      <td className="p-1 align-top">
        <div className="h-full min-h-[64px] rounded-md border border-dashed border-[var(--border-color)] bg-transparent" />
      </td>
    );
  }

  const cfg = STATUS_CONFIG[dose.status];
  const { Icon } = cfg;
  const canAct =
    dose.status === 'due' || dose.status === 'scheduled' || dose.status === 'late';

  const isOverdue = dose.status === 'due' || dose.status === 'late';
  const hasVariance =
    dose.status === 'late' || dose.status === 'missed' ||
    dose.status === 'refused' || dose.status === 'held';

  return (
    <td className="p-1 align-top">
      <div
        className={`relative rounded-md border ${cfg.cellBorder} ${cfg.cellBg} ${
          busy ? 'opacity-60' : ''
        } ${isOverdue ? 'ring-1 ring-[var(--icon-yellow-text)]/40' : ''} min-h-[64px] flex flex-col`}
      >
        {/* Status icon + label */}
        <div className="flex items-center justify-between gap-1 px-1.5 pt-1">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.text}`} />
          <span className={`text-[9px] font-bold uppercase tracking-wide ${cfg.text} truncate`}>
            {cfg.label}
          </span>
        </div>

        {/* Body */}
        <div className="px-1.5 pt-0.5 pb-1 flex-1 flex flex-col">
          {dose.status === 'administered' && (
            <>
              <span className={`text-[10px] font-bold font-mono ${cfg.text} leading-tight`}>
                {fmtTime(dose.administeredAt)}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] truncate leading-tight">
                {initialsOf(dose.administeredBy?.fullName)}
              </span>
            </>
          )}
          {hasVariance && (
            <>
              <span className={`text-[10px] font-semibold ${cfg.text} leading-tight truncate`}>
                {dose.varianceReason || cfg.label}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] truncate leading-tight">
                {initialsOf(dose.administeredBy?.fullName)}
              </span>
            </>
          )}
          {dose.status === 'scheduled' && (
            <span className="text-[9px] text-[var(--text-tertiary)] leading-tight">Pending</span>
          )}
        </div>

        {/* Action button */}
        {canAct && (
          <div className="px-1 pb-1 mt-auto">
            <button
              type="button"
              disabled={isSubmitting || busy}
              onClick={() => onAdminister(dose)}
              className="w-full inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--icon-green-text)] text-white hover:opacity-90 transition-all disabled:opacity-50"
            >
              {busy ? (
                <span className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Syringe className="w-2.5 h-2.5" />
              )}
              Give
            </button>

            {/* Variance trigger */}
            <button
              type="button"
              disabled={isSubmitting || busy}
              onClick={() => setMenuOpen(v => !v)}
              className={`w-full mt-0.5 text-[8px] font-semibold rounded px-1 py-0.5 transition-colors ${cfg.text} hover:bg-[var(--bg-card)] disabled:opacity-50`}
              title="Record variance"
            >
              more ▾
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-1 top-full mt-1 z-20 w-36 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden"
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  {([
                    ['late',    'Mark late',      AlertTriangle],
                    ['refused', 'Patient refused', Ban],
                    ['held',    'Hold dose',      Pause],
                    ['missed',  'Mark missed',    XCircle],
                  ] as const).map(([status, label, MenuIcon]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => { setMenuOpen(false); onVariance(dose, status); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors text-left"
                    >
                      <MenuIcon className="w-3 h-3 text-[var(--text-tertiary)]" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </td>
  );
};

// ─────────────────────────────────────────────
// Drug row
// ─────────────────────────────────────────────

interface TimeSlot {
  key: string;      // e.g. "08:00"
  label: string;    // e.g. "08:00"
}

interface DrugRowData {
  key: string;
  name: string;
  dose: string;
  route?: string;
  frequency?: string;
  dosesBySlot: Record<string, MarDose>;
  allDoses: MarDose[];
}

const DrugRow: React.FC<{
  row: DrugRowData;
  timeSlots: TimeSlot[];
  onAdminister: (dose: MarDose) => void;
  onVariance: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busyId?: string | null;
}> = ({ row, timeSlots, onAdminister, onVariance, isSubmitting, busyId }) => {
  const given = row.allDoses.filter(d => d.status === 'administered').length;
  const due = row.allDoses.filter(d => d.status === 'due' || d.status === 'late').length;

  return (
    <tr className="border-b border-[var(--border-color)] hover:bg-[var(--bg-main)]/40 transition-colors">
      {/* Drug column (sticky left) */}
      <td className="sticky left-0 z-10 bg-[var(--bg-card)] group-hover:bg-[var(--bg-main)] p-3 align-top border-r border-[var(--border-color)] min-w-[200px] max-w-[260px]">
        <div className="flex items-start gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--icon-purple-bg)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Pill className="w-3.5 h-3.5 text-[var(--icon-purple-text)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight truncate">
              {row.name}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5">
              {row.dose}
              {row.route ? ` · ${row.route}` : ''}
            </p>
            {row.frequency && (
              <p className="text-[9px] text-[var(--text-tertiary)] leading-tight mt-0.5">
                {row.frequency}
              </p>
            )}

            {/* Mini progress bar */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex-1 h-1 rounded-full bg-[var(--bg-main)] overflow-hidden">
                <div
                  className="h-full bg-[var(--icon-green-text)] rounded-full transition-all"
                  style={{ width: `${row.allDoses.length ? (given / row.allDoses.length) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-[var(--text-secondary)] tabular-nums">
                {given}/{row.allDoses.length}
              </span>
              {due > 0 && (
                <span className="text-[9px] font-bold text-[var(--icon-yellow-text)] tabular-nums">
                  · {due} due
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Time slot cells */}
      {timeSlots.map(slot => (
        <DoseCell
          key={slot.key}
          dose={row.dosesBySlot[slot.key] ?? null}
          onAdminister={onAdminister}
          onVariance={onVariance}
          isSubmitting={isSubmitting}
          busy={busyId === row.dosesBySlot[slot.key]?.id}
        />
      ))}
    </tr>
  );
};

// ─────────────────────────────────────────────
// Day card
// ─────────────────────────────────────────────

const DayCard: React.FC<{
  dayLabel: string;
  dateIso: string;
  doses: MarDose[];
  onAdminister: (dose: MarDose) => void;
  onVariance: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busyId?: string | null;
  defaultOpen?: boolean;
}> = ({ dayLabel, dateIso, doses, onAdminister, onVariance, isSubmitting, busyId, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build drug rows grouped by drug + dose + route
  const drugRows: DrugRowData[] = useMemo(() => {
    const map = new Map<string, DrugRowData>();
    for (const d of doses) {
      const key = `${d.medication.name}|${d.dose || d.medication.dosage || ''}|${d.route || ''}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: d.medication.name,
          dose: d.dose || d.medication.dosage || '—',
          route: d.route,
          frequency: (d as any).frequency || d.medication?.frequency,
          dosesBySlot: {},
          allDoses: [],
        });
      }
      const row = map.get(key)!;
      const slot = fmtTime(d.scheduledAt);
      row.dosesBySlot[slot] = d;
      row.allDoses.push(d);
    }
    // Sort each row's doses
    for (const row of map.values()) {
      row.allDoses.sort(
        (a, b) =>
          (safeDate(a.scheduledAt)?.getTime() ?? 0) -
          (safeDate(b.scheduledAt)?.getTime() ?? 0),
      );
    }
    return Array.from(map.values());
  }, [doses]);

  // Union of all time slots across all drugs on this day, sorted chronologically
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slotSet = new Set<string>();
    for (const d of doses) slotSet.add(fmtTime(d.scheduledAt));
    return Array.from(slotSet)
      .sort()
      .map(s => ({ key: s, label: s }));
  }, [doses]);

  const today = isToday(dateIso);
  const tomorrow = isTomorrow(dateIso);

  const totalDoses = doses.length;
  const givenCount = doses.filter(d => d.status === 'administered').length;
  const dueCount = doses.filter(d => d.status === 'due' || d.status === 'late').length;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        today
          ? 'border-[var(--icon-cyan-text)] ring-1 ring-[var(--icon-cyan-text)]/20'
          : 'border-[var(--border-color)]'
      }`}
    >
      {/* Day header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
          today
            ? 'bg-[var(--icon-cyan-bg)] hover:bg-[var(--icon-cyan-bg)]/80'
            : 'bg-[var(--bg-main)] hover:bg-[var(--bg-card)]'
        }`}
      >
        <Calendar
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            today ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)]'
          }`}
        />

        <span
          className={`text-xs font-bold ${
            today ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {dayLabel}
        </span>

        {today && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--icon-cyan-text)] text-white">
            TODAY
          </span>
        )}
        {tomorrow && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            TOMORROW
          </span>
        )}

        {dueCount > 0 && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
            <AlertTriangle className="w-2.5 h-2.5" />
            {dueCount} due
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums font-semibold">
            {givenCount}/{totalDoses} given
          </span>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
        </div>
      </button>

      {/* Grid body */}
      {open && (
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[var(--bg-main)] border-b border-[var(--border-color)]">
                {/* Sticky corner */}
                <th className="sticky left-0 z-20 bg-[var(--bg-main)] text-left px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider border-r border-[var(--border-color)] min-w-[200px]">
                  Drug / Dose
                </th>
                {timeSlots.map(slot => (
                  <th
                    key={slot.key}
                    className="px-2 py-2 text-center text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider whitespace-nowrap min-w-[80px]"
                  >
                    <div className="font-mono text-xs text-[var(--text-primary)]">{slot.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drugRows.map(row => (
                <DrugRow
                  key={row.key}
                  row={row}
                  timeSlots={timeSlots}
                  onAdminister={onAdminister}
                  onVariance={onVariance}
                  isSubmitting={isSubmitting}
                  busyId={busyId}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export const MarChart: React.FC<MarChartProps> = ({
  doses,
  onAdminister,
  onVariance,
  isSubmitting,
  busyId,
}) => {
  const groupedByDate = useMemo(() => {
    const map = new Map<string, MarDose[]>();
    for (const d of doses) {
      const key = dateKeyOf(d.scheduledAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const at = safeDate(a[1][0].scheduledAt)?.getTime() ?? 0;
      const bt = safeDate(b[1][0].scheduledAt)?.getTime() ?? 0;
      return at - bt;
    });
  }, [doses]);

  if (doses.length === 0) {
    return (
      <div className="text-center py-12 bg-[var(--bg-main)] rounded-xl border border-dashed border-[var(--border-color)]">
        <Syringe className="w-10 h-10 text-[var(--text-tertiary)] opacity-40 mx-auto mb-2" />
        <p className="text-sm text-[var(--text-secondary)] font-medium">No scheduled doses</p>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Doses appear here once medications are dispensed.
        </p>
      </div>
    );
  }

  const totalDoses = doses.length;
  const totalGiven = doses.filter(d => d.status === 'administered').length;
  const totalDue = doses.filter(d => d.status === 'due' || d.status === 'late').length;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          MAR Summary
        </span>
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          <span className="text-[11px] text-[var(--text-tertiary)]">
            <span className="font-bold text-[var(--icon-green-text)] tabular-nums">{totalGiven}</span>
            <span className="mx-0.5">/</span>
            <span className="tabular-nums">{totalDoses}</span> given
          </span>
          {totalDue > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-yellow-bg)] text-[var(--icon-yellow-text)]">
              <AlertTriangle className="w-2.5 h-2.5" />
              {totalDue} need{totalDue === 1 ? 's' : ''} attention
            </span>
          )}
        </div>
      </div>

      {groupedByDate.map(([dateKey, dateDoses]) => {
        const firstIso = dateDoses[0]?.scheduledAt;
        return (
          <DayCard
            key={dateKey}
            dayLabel={fmtDayLabel(firstIso)}
            dateIso={String(firstIso)}
            doses={dateDoses}
            onAdminister={onAdminister}
            onVariance={onVariance}
            isSubmitting={isSubmitting}
            busyId={busyId}
            defaultOpen={isToday(firstIso) || groupedByDate.length <= 3}
          />
        );
      })}
    </div>
  );
};

export default MarChart;