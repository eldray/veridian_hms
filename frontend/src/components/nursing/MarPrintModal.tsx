// src/components/nursing/MarPrintModal.tsx
import React, { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { useHospitalStore } from '../../store/hospitalStore';
import { openPrintWindow } from '../../utils/pdfGenerator';
import type { MarDose, DoseStatus } from '../../api/nursing';

interface MarPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  doses: MarDose[];
  patientName: string;
  patientFolder: string;
  dateFrom: string;
  dateTo: string;
}

const STATUS_GLYPH: Record<DoseStatus, { ch: string; bg: string; fg: string; label: string }> = {
  scheduled:    { ch: '·', bg: '#f1f5f9', fg: '#64748b', label: 'Scheduled' },
  due:          { ch: '●', bg: '#fef3c7', fg: '#b45309', label: 'Due' },
  administered: { ch: '✓', bg: '#d1fae5', fg: '#065f46', label: 'Given' },
  late:         { ch: '!', bg: '#ffedd5', fg: '#c2410c', label: 'Late' },
  missed:       { ch: '✗', bg: '#fee2e2', fg: '#991b1b', label: 'Missed' },
  refused:      { ch: '⊘', bg: '#fee2e2', fg: '#991b1b', label: 'Refused' },
  held:         { ch: '‖', bg: '#ffedd5', fg: '#c2410c', label: 'Held' },
  discontinued: { ch: '—', bg: '#f1f5f9', fg: '#94a3b8', label: 'Disc.' },
};

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}

function fmtHour(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildHtml(
  doses: MarDose[],
  patientName: string,
  patientFolder: string,
  dateFrom: string,
  dateTo: string,
  hospital: any,
): string {
  const hospitalName = hospital?.name || 'Veridian Hospital';
  const hospitalAddress = hospital?.address || '';
  const hospitalPhone = hospital?.phone || '';
  const hospitalEmail = hospital?.email || '';

  // Build rows + cols
  const rowKey = (d: MarDose) => `${d.medication.id}::${d.doseNumber}`;
  const rowsMap = new Map<string, { label: string; meta: string; key: string }>();
  const colsSet = new Set<string>();
  const cells = new Map<string, MarDose>();

  for (const d of doses) {
    const key = rowKey(d);
    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        key,
        label: d.medication.name,
        meta: `${d.dose ?? d.medication.dosage ?? ''}${d.route ? ` · ${d.route}` : ''} · #${d.doseNumber}`,
      });
    }
    const colKey = d.scheduledAt.slice(0, 13);
    colsSet.add(colKey);
    cells.set(`${key}|${colKey}`, d);
  }
  const cols = Array.from(colsSet).sort();
  const rows = Array.from(rowsMap.values()).sort((a, b) => a.label.localeCompare(b.label));

  const colHeaders = cols.map((c) => `
    <th>
      <div style="font-family:monospace;">${fmtHour(c + ':00:00Z')}</div>
      <div style="font-size:8.5px;font-weight:400;color:#64748b;">${fmtDay(c + ':00:00Z')}</div>
    </th>`).join('');

  const bodyRows = rows.map((row) => `
    <tr>
      <td class="med-cell">
        <div class="med-name">${escapeHtml(row.label)}</div>
        <div class="med-meta">${escapeHtml(row.meta)}</div>
      </td>
      ${cols.map((c) => {
        const cell = cells.get(`${row.key}|${c}`);
        if (!cell) return `<td class="cell-empty">·</td>`;
        const conf = STATUS_GLYPH[cell.status];
        return `<td><span class="glyph" style="background:${conf.bg};color:${conf.fg};" title="${escapeHtml(conf.label)}">${conf.ch}</span></td>`;
      }).join('')}
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>MAR — ${escapeHtml(patientName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; padding: 20px; color: #1e293b; }
  .page-container { max-width: 1400px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden; }
  .header {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    color: #fff; padding: 20px 26px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .hospital-info h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
  .hospital-info p { font-size: 10.5px; opacity: 0.9; line-height: 1.35; }
  .badge { background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px; font-weight: 600; font-size: 11px; letter-spacing: 0.4px; }
  .patient-range { font-size: 12.5px; font-weight: 600; margin-top: 6px; opacity: 0.95; text-align: right; }

  .content { padding: 20px 26px 26px; }
  .meta-strip {
    display: flex; gap: 26px; flex-wrap: wrap;
    background: #f8fafc; border-left: 4px solid #3b82f6;
    border-radius: 8px; padding: 10px 16px; margin-bottom: 16px;
    font-size: 11px;
  }
  .meta-item .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-item .value { font-size: 12.5px; font-weight: 600; color: #0f172a; margin-top: 1px; }

  table.mar { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; font-size: 10.5px; }
  table.mar th { background: #f1f5f9; color: #334155; font-weight: 700; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; padding: 6px 2px; border-bottom: 2px solid #cbd5e1; text-align: center; }
  table.mar th.med-col { text-align: left; padding-left: 12px; min-width: 200px; }
  table.mar td { padding: 6px 2px; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #f1f5f9; text-align: center; vertical-align: middle; }
  table.mar td.med-cell { text-align: left; padding: 6px 12px; background: #fafbfc; border-left: none; }
  table.mar td.med-cell .med-name { font-weight: 600; color: #0f172a; font-size: 11px; }
  table.mar td.med-cell .med-meta { font-size: 9.5px; color: #64748b; margin-top: 1px; }
  table.mar td.cell-empty { color: #cbd5e1; }

  .glyph {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%;
    font-size: 11px; font-weight: 700;
  }

  .legend { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 14px; font-size: 10px; color: #475569; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-swatch { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; font-size: 9px; font-weight: 700; }

  .signatures { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; flex-wrap: wrap; gap: 20px; }
  .sig-box { min-width: 180px; text-align: center; }
  .sig-line { width: 180px; height: 1px; background: #94a3b8; margin: 28px auto 6px; }
  .sig-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; }

  .footer { margin-top: 20px; padding-top: 14px; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10.5px; color: #94a3b8; flex-wrap: wrap; gap: 10px; }

  .no-print { padding: 18px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; display: flex; justify-content: center; gap: 12px; }
  .print-btn { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #fff; border: none; padding: 11px 28px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; }
  .close-btn { background: #e2e8f0; color: #475569; border: none; padding: 11px 28px; border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; }

  @media print {
    body { background: #fff; padding: 0; }
    .page-container { box-shadow: none; border-radius: 0; max-width: 100%; }
    .no-print { display: none !important; }
    .header, .glyph, .badge { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    table.mar { font-size: 9.5px; }
    .glyph { width: 18px; height: 18px; font-size: 9.5px; }
  }
</style>
</head>
<body>
<div class="page-container">
  <div class="header">
    <div class="hospital-info">
      <h1>${escapeHtml(hospitalName)}</h1>
      <p>${escapeHtml(hospitalAddress)}</p>
      <p>${escapeHtml(hospitalPhone)}${hospitalEmail ? ` · ${escapeHtml(hospitalEmail)}` : ''}</p>
    </div>
    <div style="text-align:right;">
      <div class="badge">MEDICATION ADMINISTRATION RECORD</div>
      <div class="patient-range">
        ${escapeHtml(patientName)} · ${escapeHtml(patientFolder)}
      </div>
      <div class="patient-range" style="font-size:11px;opacity:0.85;">
        ${escapeHtml(dateFrom)} → ${escapeHtml(dateTo)}
      </div>
    </div>
  </div>

  <div class="content">
    <div class="meta-strip">
      <div class="meta-item">
        <div class="label">Patient</div>
        <div class="value">${escapeHtml(patientName)}</div>
      </div>
      <div class="meta-item">
        <div class="label">Folder</div>
        <div class="value">${escapeHtml(patientFolder)}</div>
      </div>
      <div class="meta-item">
        <div class="label">Period</div>
        <div class="value">${escapeHtml(dateFrom)} → ${escapeHtml(dateTo)}</div>
      </div>
      <div class="meta-item">
        <div class="label">Total Doses</div>
        <div class="value">${doses.length}</div>
      </div>
      <div class="meta-item">
        <div class="label">Generated</div>
        <div class="value">${new Date().toLocaleString()}</div>
      </div>
    </div>

    <table class="mar">
      <thead>
        <tr>
          <th class="med-col">Medication</th>
          ${colHeaders}
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>

    <div class="legend">
      ${Object.entries(STATUS_GLYPH).map(([, conf]) => `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${conf.bg};color:${conf.fg};">${conf.ch}</span>
          ${conf.label}
        </div>`).join('')}
    </div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Prepared By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Checked By</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>

    <div class="footer">
      <div>Generated by ${escapeHtml(hospitalName)} — Nursing MAR</div>
      <div>Ref: MAR-${new Date().getTime().toString().slice(-8)}</div>
    </div>
  </div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print MAR</button>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>
</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const MarPrintModal: React.FC<MarPrintModalProps> = ({
  isOpen,
  onClose,
  doses,
  patientName,
  patientFolder,
  dateFrom,
  dateTo,
}) => {
  const { hospital } = useHospitalStore();
  const [printing, setPrinting] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    setPrinting(true);
    try {
      const html = buildHtml(doses, patientName, patientFolder, dateFrom, dateTo, hospital);
      openPrintWindow(html, `MAR-${patientFolder}`);
      onClose();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--bg-card)] rounded-xl w-full max-w-lg border border-[var(--border-color)] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--icon-cyan-bg)] rounded-lg flex items-center justify-center">
              <Printer className="w-4 h-4 text-[var(--icon-cyan-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Print MAR Chart</h2>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                A4 landscape · {doses.length} dose{doses.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors">
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[var(--bg-main)] rounded-lg p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Patient</p>
              <p className="font-semibold text-[var(--text-primary)] mt-0.5 truncate">{patientName}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{patientFolder}</p>
            </div>
            <div className="bg-[var(--bg-main)] rounded-lg p-3">
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Period</p>
              <p className="font-semibold text-[var(--text-primary)] mt-0.5">{dateFrom}</p>
              <p className="text-[10px] text-[var(--text-secondary)]">→ {dateTo}</p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            A new window will open with the printable chart. Use the browser's print dialog to save or send to a printer.
          </p>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={printing || doses.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] hover:bg-[var(--icon-cyan-text)] hover:text-white transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Opening…' : 'Open Print Preview'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarPrintModal;