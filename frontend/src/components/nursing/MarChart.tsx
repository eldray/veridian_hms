
// src/components/nursing/MarChart.tsx
import React, { useMemo, useState } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, XCircle, Pause, Ban,
  Syringe, ChevronDown, ChevronUp, Calendar,
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
// Status config
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<DoseStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  scheduled:    { label: 'Scheduled',    bg: 'bg-[var(--bg-main)]',          text: 'text-[var(--text-secondary)]',  border: 'border-[var(--border-color)]',          Icon: Clock },
  due:          { label: 'Due now',      bg: 'bg-[var(--icon-yellow-bg)]',   text: 'text-[var(--icon-yellow-text)]', border: 'border-[var(--icon-yellow-text)]',      Icon: AlertTriangle },
  administered: { label: 'Given',        bg: 'bg-[var(--icon-green-bg)]',    text: 'text-[var(--icon-green-text)]',  border: 'border-[var(--icon-green-text)]',       Icon: CheckCircle },
  late:         { label: 'Late',         bg: 'bg-[var(--icon-orange-bg)]',   text: 'text-[var(--icon-orange-text)]', border: 'border-[var(--icon-orange-text)]',      Icon: AlertTriangle },
  missed:       { label: 'Missed',       bg: 'bg-[var(--icon-red-bg)]',      text: 'text-[var(--icon-red-text)]',    border: 'border-[var(--icon-red-text)]',         Icon: XCircle },
  refused:      { label: 'Refused',      bg: 'bg-[var(--icon-red-bg)]',      text: 'text-[var(--icon-red-text)]',    border: 'border-[var(--icon-red-text)]',         Icon: Ban },
  held:         { label: 'Held',         bg: 'bg-[var(--icon-orange-bg)]',   text: 'text-[var(--icon-orange-text)]', border: 'border-[var(--icon-orange-text)]',      Icon: Pause },
  discontinued: { label: 'Discontinued', bg: 'bg-[var(--bg-main)]',          text: 'text-[var(--text-tertiary)]',    border: 'border-[var(--border-color)]',          Icon: XCircle },
};

const fmtTime = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
};

const isToday = (iso: string) => {
  try {
    return new Date(iso).toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
};

// ─────────────────────────────────────────────
// Row — one dose
// ─────────────────────────────────────────────

const DoseRow: React.FC<{
  dose: MarDose;
  onAdminister: (dose: MarDose) => void;
  onVariance: (dose: MarDose, status: 'late' | 'missed' | 'refused' | 'held') => void;
  isSubmitting?: boolean;
  busy?: boolean;
  showDate?: boolean;
}> = ({ dose, onAdminister, onVariance, isSubmitting, busy, showDate }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const config = STATUS_CONFIG[dose.status];
  const { Icon } = config;

  const canAct = dose.status === 'due' || dose.status === 'scheduled' || dose.status === 'late';

  return (
    <tr className={`hover:bg-[var(--bg-main)] transition-colors ${busy ? 'opacity-60' : ''}`}>
      {/* Scheduled time */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <div className="text-sm font-semibold text-[var(--text-primary)] font-mono">
          {fmtTime(dose.scheduledAt)}
        </div>
        {showDate && (
          <div className="text-[10px] text-[var(--text-tertiary)]">
            {fmtDate(dose.scheduledAt)}
          </div>
        )}
      </td>

      {/* Drug name + dose */}
      <td className="px-3 py-2.5 min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)] truncate">
          {dose.medication.name}
        </div>
        <div className="text-[11px] text-[var(--text-secondary)]">
          {dose.dose || dose.medication.dosage || '—'}
          {dose.route ? ` · ${dose.route}` : ''}
        </div>
      </td>

      {/* Dose number */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className="text-xs text-[var(--text-secondary)] font-mono">
          #{dose.doseNumber}
        </span>
      </td>

      {/* Status */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.bg} ${config.text} ${config.border}`}>
          <Icon className="w-3 h-3" />
          {config.label}
        </span>
      </td>

      {/* Given at / by */}
      <td className="px-3 py-2.5 whitespace-nowrap">
        {dose.status === 'administered' && dose.administeredAt ? (
          <div>
            <div className="text-xs text-[var(--text-primary)] font-mono">
              {fmtTime(dose.administeredAt)}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[120px]">
              {dose.administeredBy?.fullName ?? '—'}
            </div>
          </div>
        ) : dose.varianceReason ? (
          <div className="text-[11px] text-[var(--text-secondary)] italic truncate max-w-[140px]" title={dose.varianceReason}>
            {dose.varianceReason}
          </div>
        ) : (
          <span className="text-[var(--text-tertiary)] text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        {canAct ? (
          <div className="relative inline-flex items-center gap-1">
            <button
              type="button"
              disabled={isSubmitting || busy}
              onClick={() => onAdminister(dose)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-green-bg)] text-[var(--icon-green-text)] hover:bg-[var(--icon-green-text)] hover:text-white transition-all disabled:opacity-50"
            >
              {busy ? (
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Syringe className="w-3.5 h-3.5" />
              )}
              Give
            </button>
            <button
              type="button"
              disabled={isSubmitting || busy}
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50"
              title="More actions"
            >
              {menuOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg overflow-hidden"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                {(
                  [
                    ['late',    'Mark late',    AlertTriangle],
                    ['refused', 'Patient refused', Ban],
                    ['held',    'Hold dose',    Pause],
                    ['missed',  'Mark missed',  XCircle],
                  ] as const
                ).map(([status, label, Icon]) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onVariance(dose, status);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {dose.status === 'administered' ? 'Recorded' : '—'}
          </span>
        )}
      </td>
    </tr>
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
      const key = new Date(d.scheduledAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    // Sort by date
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[1][0].scheduledAt).getTime() - new Date(b[1][0].scheduledAt).getTime(),
    );
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

  return (
    <div className="space-y-4">
      {groupedByDate.map(([dateLabel, dateDoses]) => (
        <div key={dateLabel} className="rounded-xl border border-[var(--border-color)] overflow-hidden">
          {/* Day header */}
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {new Date(dateDoses[0].scheduledAt).toLocaleDateString([], {
                weekday: 'long', month: 'short', day: 'numeric',
              })}
            </span>
            {isToday(dateDoses[0].scheduledAt) && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                TODAY
              </span>
            )}
            <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">
              {dateDoses.length} dose{dateDoses.length !== 1 ? 's' : ''}
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-card)] border-b border-[var(--border-color)]">
                {['Time', 'Drug', 'Dose #', 'Status', 'Given', ''].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ${
                      h === '' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {dateDoses.map((dose) => (
                <DoseRow
                  key={dose.id}
                  dose={dose}
                  onAdminister={onAdminister}
                  onVariance={onVariance}
                  isSubmitting={isSubmitting}
                  busy={busyId === dose.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default MarChart;