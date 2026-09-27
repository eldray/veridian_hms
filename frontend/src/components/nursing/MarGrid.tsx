// src/components/nursing/MarGrid.tsx
import React, { useMemo } from 'react';
import type { MarDose, DoseStatus } from '../../api/nursing';

interface MarGridProps {
  doses: MarDose[];
  /** Optional date range for the header. Defaults to today. */
  fromDate?: string;
  toDate?: string;
}

// ─────────────────────────────────────────────
// Glyph per status — compact, one character
// ─────────────────────────────────────────────

const STATUS_GLYPH: Record<DoseStatus, { ch: string; bg: string; fg: string; label: string }> = {
  scheduled:    { ch: '·', bg: '#f1f5f9', fg: '#64748b', label: 'Scheduled' },
  due:          { ch: '●', bg: '#fef3c7', fg: '#b45309', label: 'Due now' },
  administered: { ch: '✓', bg: '#d1fae5', fg: '#065f46', label: 'Given' },
  late:         { ch: '!', bg: '#ffedd5', fg: '#c2410c', label: 'Late' },
  missed:       { ch: '✗', bg: '#fee2e2', fg: '#991b1b', label: 'Missed' },
  refused:      { ch: '⊘', bg: '#fee2e2', fg: '#991b1b', label: 'Refused' },
  held:         { ch: '‖', bg: '#ffedd5', fg: '#c2410c', label: 'Held' },
  discontinued: { ch: '—', bg: '#f1f5f9', fg: '#94a3b8', label: 'Discontinued' },
};

const fmtHour = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const fmtDay = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

export const MarGrid: React.FC<MarGridProps> = ({ doses }) => {
  /**
   * Build:
   *   rows: each unique (medicationId, doseNumber) → key
   *   cols: each unique scheduled hour (HH:mm)
   *   cell: status of that dose at that hour
   */
  const { rows, cols, cellMap } = useMemo(() => {
    const rowKey = (d: MarDose) => `${d.medication.id}::${d.doseNumber}`;

    const rowsMap = new Map<string, { label: string; meta: string; key: string }>();
    const colsSet = new Set<string>();
    const cellMap = new Map<string, MarDose>();

    for (const d of doses) {
      const key = rowKey(d);
      if (!rowsMap.has(key)) {
        rowsMap.set(key, {
          key,
          label: d.medication.name,
          meta: `${d.dose ?? d.medication.dosage ?? ''}${d.route ? ` · ${d.route}` : ''} · dose ${d.doseNumber}`,
        });
      }
      const colKey = d.scheduledAt.slice(0, 13); // hour granularity (YYYY-MM-DDTHH)
      colsSet.add(colKey);
      cellMap.set(`${key}|${colKey}`, d);
    }

    const cols = Array.from(colsSet).sort();
    const rows = Array.from(rowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

    return { rows, cols, cellMap };
  }, [doses]);

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--text-tertiary)]">
        No doses to display in grid view
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]">
      <table className="border-collapse text-[11px]" style={{ minWidth: `${240 + cols.length * 70}px` }}>
        <thead>
          <tr className="bg-[var(--bg-main)]">
            <th
              className="sticky left-0 z-10 bg-[var(--bg-main)] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] border-b border-[var(--border-color)]"
              style={{ minWidth: 220 }}
            >
              Medication
            </th>
            {cols.map((c) => (
              <th
                key={c}
                className="px-2 py-2 text-center text-[10px] font-semibold text-[var(--text-secondary)] border-b border-l border-[var(--border-color)]"
                style={{ minWidth: 66 }}
              >
                <div className="font-mono">{fmtHour(`${c}:00:00Z`)}</div>
                <div className="text-[9px] font-normal text-[var(--text-tertiary)]">
                  {fmtDay(`${c}:00:00Z`)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-[var(--border-color)] last:border-b-0">
              <td
                className="sticky left-0 z-10 bg-[var(--bg-card)] px-3 py-2 align-top"
                style={{ minWidth: 220 }}
              >
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[220px]">
                  {row.label}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[220px]">
                  {row.meta}
                </p>
              </td>
              {cols.map((c) => {
                const cell = cellMap.get(`${row.key}|${c}`);
                if (!cell) {
                  return (
                    <td
                      key={c}
                      className="border-l border-[var(--border-color)] text-center align-middle text-[var(--text-tertiary)]"
                    >
                      <span className="opacity-30">·</span>
                    </td>
                  );
                }
                const conf = STATUS_GLYPH[cell.status];
                return (
                  <td
                    key={c}
                    className="border-l border-[var(--border-color)] text-center align-middle"
                    title={`${cell.medication.name} · dose ${cell.doseNumber} · ${conf.label}`}
                  >
                    <span
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
                      style={{ background: conf.bg, color: conf.fg }}
                    >
                      {conf.ch}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2 border-t border-[var(--border-color)] text-[10px] text-[var(--text-secondary)]">
        {Object.entries(STATUS_GLYPH).map(([status, conf]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
              style={{ background: conf.bg, color: conf.fg }}
            >
              {conf.ch}
            </span>
            {conf.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarGrid;