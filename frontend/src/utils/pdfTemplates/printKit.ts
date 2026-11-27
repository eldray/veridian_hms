// src/utils/pdfTemplates/printKit.ts
import { getPatientName } from '../patient';
// Shared building blocks for every printed document (A4, black-and-white friendly).
// One letterhead, one patient banner, one signature block, one footer with page numbers —
// so a prescription, a lab report and a discharge summary read as the same hospital's paperwork.

// ── Text helpers ────────────────────────────────────────────────────────────────

/** HTML-escape without touching the DOM (templates run before any document exists). */
export const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Escaped text, or an em dash when the value is empty (a blank is a data gap, not a fact). */
export const orDash = (v: unknown): string => {
  const s = String(v ?? '').trim();
  return s ? esc(s) : '<span class="muted">—</span>';
};

/** Escaped text with line breaks kept. */
export const multiline = (v: unknown): string => esc(String(v ?? '').trim()).replace(/\r?\n/g, '<br>');

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? null : d;
};

/** 16 Nov 2026 — day first, month spelled out, so 03/04 can never be misread. */
export const fmtDate = (v: unknown): string => {
  const d = toDate(v);
  return d ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

export const fmtTime = (v: unknown): string => {
  const d = toDate(v);
  return d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
};

/** 16 Nov 2026, 19:43 */
export const fmtDateTime = (v: unknown): string => {
  const d = toDate(v);
  return d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';
};

/** GHS 1,250.00 — the code, not the ₵ glyph, which many system fonts and thermal printers lack. */
export const money = (v: unknown): string => {
  const n = Number(v);
  return `GHS ${(isFinite(n) ? n : 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const below1000 = (n: number): string => {
  const parts: string[] = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} hundred`); n %= 100; if (n) parts.push('and'); }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')); }
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
};

/** "One thousand two hundred and fifty Ghana cedis, forty pesewas only" — printed under receipt totals. */
export const amountInWords = (v: unknown): string => {
  const total = Math.round(Math.abs(Number(v) || 0) * 100);
  const cedis = Math.floor(total / 100);
  const pesewas = total % 100;
  const chunks: string[] = [];
  const scales: Array<[number, string]> = [[1_000_000_000, 'billion'], [1_000_000, 'million'], [1_000, 'thousand']];
  let rest = cedis;
  for (const [size, label] of scales) {
    if (rest >= size) { chunks.push(`${below1000(Math.floor(rest / size))} ${label}`); rest %= size; }
  }
  if (rest > 0) chunks.push(chunks.length && rest < 100 ? `and ${below1000(rest)}` : below1000(rest));
  const cedisText = cedis === 0 ? 'zero' : chunks.join(' ');
  const out = `${cedisText} Ghana cedis${pesewas ? `, ${below1000(pesewas)} pesewas` : ''} only`;
  return out.charAt(0).toUpperCase() + out.slice(1);
};

// ── Patient helpers ─────────────────────────────────────────────────────────────

/** mobile_money -> Mobile money */
export const human = (v: unknown): string => {
  const t = String(v ?? '').replace(/_/g, ' ').trim();
  return t ? esc(t.charAt(0).toUpperCase() + t.slice(1)) : '—';
};

/** Payer as printed: NHIS, Cash, Private insurance… */
export const payerText = (v: unknown): string => {
  const k = String(v ?? '').trim().toLowerCase();
  const map: Record<string, string> = { nhis: 'NHIS', cash: 'Cash', private_insurance: 'Private insurance', corporate: 'Corporate', insurance: 'Insurance' };
  return map[k] || (k ? esc(k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())) : '—');
};

export const patientName = (p: any): string => getPatientName(p);

/** "34 years", "7 months", "12 days" — what a clinician actually reads for dosing and ranges. */
export const ageText = (p: any, asOf: unknown = new Date()): string => {
  const dob = toDate(p?.dateOfBirth);
  const ref = toDate(asOf) || new Date();
  if (!dob) return p?.age != null && p.age !== '' ? `${p.age} years` : '—';
  const days = Math.floor((ref.getTime() - dob.getTime()) / 86_400_000);
  if (days < 0) return '—';
  if (days < 28) return `${days} day${days === 1 ? '' : 's'}`;
  let months = (ref.getFullYear() - dob.getFullYear()) * 12 + (ref.getMonth() - dob.getMonth());
  if (ref.getDate() < dob.getDate()) months--;
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
};

export const sexText = (p: any): string => {
  const g = String(p?.gender ?? p?.sex ?? '').toLowerCase();
  if (g.startsWith('m')) return 'Male';
  if (g.startsWith('f')) return 'Female';
  return g ? esc(g.charAt(0).toUpperCase() + g.slice(1)) : '—';
};

// ── Clinical helpers ────────────────────────────────────────────────────────────

/** Recorded allergies as one line, or null when none are on file. "None recorded" is not "no allergies". */
export const allergyLine = (p: any): string | null => {
  const list = Array.isArray(p?.allergies) ? p.allergies : [];
  const parts = list
    .map((a: any) => {
      if (typeof a === 'string') return a;
      const name = a?.allergen || a?.name;
      if (!name) return '';
      const extra = [a?.reaction, a?.severity].filter(Boolean).join(', ');
      return extra ? `${name} (${extra})` : name;
    })
    .filter(Boolean);
  return parts.length ? parts.join('; ') : null;
};

export interface DiagnosisRow { name: string; code: string; type: string }

/** Diagnoses on a visit, whichever shape the API sent them in. */
export const diagnosesOf = (att: any): DiagnosisRow[] => {
  const raw = att?.AttendanceDiagnosis || att?.diagnoses || att?.attendanceDiagnoses || [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d: any) => ({
      name: String(d?.Diagnosis?.name || d?.diagnosis?.name || d?.name || d?.diagnosisName || '').trim(),
      code: String(d?.icdCode || d?.Diagnosis?.icdCode || d?.diagnosis?.icdCode || d?.code || '').trim(),
      type: String(d?.diagnosisType || d?.type || '').replace(/_/g, ' ').trim(),
    }))
    .filter((d: DiagnosisRow) => d.name || d.code);
};

/** Clinician name and professional registration number from any of the shapes the API uses. */
export const clinicianOf = (src: any, ...keys: string[]): { name: string; regNo: string } => {
  for (const k of keys) {
    const u = src?.[k];
    if (u && typeof u === 'object') return { name: String(u.fullName || u.name || '').trim(), regNo: String(u.licenseNumber || '').trim() };
    if (typeof u === 'string' && u.trim()) return { name: u.trim(), regNo: '' };
  }
  return { name: '', regNo: '' };
};

// ── Hospital ────────────────────────────────────────────────────────────────────

export interface ResolvedHospital {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logo: string;
  nhisFacilityCode: string;
  ghsFacilityCode: string;
  district: string;
}

/** Real details only: a missing phone number is left off the page, never replaced by a made-up one. */
export const resolveHospital = (h: any): ResolvedHospital => {
  let logo = String(h?.logoUrl || h?.imageUrl || '').trim();
  if (logo && !/^(data:|https?:)/i.test(logo) && typeof window !== 'undefined') {
    try { logo = new URL(logo, window.location.origin).href; } catch { /* keep as given */ }
  }
  return {
    name: String(h?.name || 'Health Facility').trim(),
    address: String(h?.address || '').trim(),
    phone: String(h?.phone || '').trim(),
    email: String(h?.email || '').trim(),
    website: String(h?.website || '').trim(),
    logo,
    nhisFacilityCode: String(h?.nhisFacilityCode || '').trim(),
    ghsFacilityCode: String(h?.ghaHFCode || '').trim(),
    district: String(h?.ghsDistrictCode || '').trim(),
  };
};

// ── Page furniture ──────────────────────────────────────────────────────────────

export const letterhead = (h: ResolvedHospital): string => {
  const contact = [h.phone && `Tel: ${esc(h.phone)}`, h.email && esc(h.email), h.website && esc(h.website)]
    .filter(Boolean)
    .join(' &nbsp;·&nbsp; ');
  const codes = [
    h.nhisFacilityCode && `NHIA facility code: <b>${esc(h.nhisFacilityCode)}</b>`,
    h.ghsFacilityCode && `GHS facility code: <b>${esc(h.ghsFacilityCode)}</b>`,
  ].filter(Boolean);
  return `
  <header class="letterhead">
    ${h.logo ? `<img class="lh-logo" src="${esc(h.logo)}" alt="" />` : ''}
    <div class="lh-main">
      <div class="lh-name">${esc(h.name)}</div>
      ${h.address ? `<div class="lh-line">${esc(h.address)}</div>` : ''}
      ${contact ? `<div class="lh-line">${contact}</div>` : ''}
    </div>
    ${codes.length ? `<div class="lh-codes">${codes.join('<br>')}</div>` : ''}
  </header>`;
};

export interface DocTitleOptions {
  /** Reference printed top-right (visit number, bill number, …). */
  ref?: string;
  refLabel?: string;
  date?: unknown;
  dateLabel?: string;
  /** Small status chip, e.g. FINAL / DRAFT / PAID. */
  status?: string;
}

export const docTitle = (title: string, o: DocTitleOptions = {}): string => `
  <div class="doc-title">
    <h1>${esc(title)}</h1>
    <div class="doc-meta">
      ${o.ref ? `<div><span class="k">${esc(o.refLabel || 'Ref')}</span> <b>${esc(o.ref)}</b></div>` : ''}
      ${o.date ? `<div><span class="k">${esc(o.dateLabel || 'Date')}</span> <b>${fmtDate(o.date)}</b></div>` : ''}
      ${o.status ? `<div class="chip">${esc(o.status)}</div>` : ''}
    </div>
  </div>`;

/** Label/value pairs in a ruled grid. Values are trusted HTML (use orDash/esc on the way in). */
export const kvGrid = (rows: Array<[string, string]>, cols = 4): string => {
  // Pad to a full last row so the ruled grid closes cleanly.
  const padded = rows.length % cols === 0 ? rows : [...rows, ...Array.from({ length: cols - (rows.length % cols) }, () => ['', ''] as [string, string])];
  const cells = padded
    .map(([k, v]) => `<div class="kv"><div class="kv-k">${esc(k) || '&nbsp;'}</div><div class="kv-v">${v || '&nbsp;'}</div></div>`)
    .join('');
  return `<div class="kv-grid cols-${cols}">${cells}</div>`;
};

/**
 * Identification block every clinical document carries: name, folder number, age/sex, DOB,
 * NHIS number — enough to match the page to the right patient if it is separated from its file.
 */
export const patientBanner = (p: any, extra: Array<[string, string]> = [], asOf: unknown = new Date()): string => {
  const nhis = p?.nhisNumber || p?.nhisNo || p?.nhis?.number || '';
  const rows: Array<[string, string]> = [
    ['Patient name', `<b>${esc(patientName(p))}</b>`],
    ['Folder no.', orDash(p?.folderNumber || p?.id)],
    ['Age / Sex', `${esc(ageText(p, asOf))} / ${sexText(p)}`],
    ['Date of birth', esc(fmtDate(p?.dateOfBirth))],
    ['NHIS no.', orDash(nhis)],
    ['Contact', orDash(p?.contact || p?.phone || p?.mobile)],
    ...extra,
  ];
  return `<section class="patient-banner">${kvGrid(rows, 4)}</section>`;
};

export const section = (title: string, inner: string, o: { keepTogether?: boolean } = {}): string => `
  <section class="sec${o.keepTogether ? ' keep' : ''}">
    <h2>${esc(title)}</h2>
    ${inner}
  </section>`;

export interface TableOptions {
  head: string[];
  /** Cell HTML, already escaped. */
  rows: string[][];
  /** CSS widths per column, e.g. ['30%', '10%', …]. */
  widths?: string[];
  /** 'r' right-aligns a column (numbers), 'c' centres it. */
  align?: Array<'l' | 'r' | 'c' | undefined>;
  /** Extra footer rows (totals) — full row HTML. */
  foot?: string[][];
  empty?: string;
}

export const table = (o: TableOptions): string => {
  const cls = (i: number) => (o.align?.[i] === 'r' ? ' class="num"' : o.align?.[i] === 'c' ? ' class="ctr"' : '');
  const cols = o.widths ? `<colgroup>${o.widths.map((w) => `<col style="width:${w}">`).join('')}</colgroup>` : '';
  const head = `<thead><tr>${o.head.map((h, i) => `<th${cls(i)}>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = o.rows.length
    ? o.rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${o.head.length}" class="empty">${esc(o.empty || 'None recorded')}</td></tr>`;
  const foot = o.foot?.length
    ? `<tfoot>${o.foot.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')}</tfoot>`
    : '';
  return `<table class="data">${cols}${head}<tbody>${body}</tbody>${foot}</table>`;
};

export interface Signature {
  role: string;
  name?: string;
  /** Professional registration number (MDC / NMC / PC / HFRA…). */
  regNo?: string;
  date?: unknown;
  /** Administrative signer: no registration number line. */
  plain?: boolean;
}

/** Ruled signature lines. Printed names come from the record; the signature itself stays blank. */
export const signatures = (sigs: Signature[]): string => `
  <section class="sigs keep">
    ${sigs
      .map(
        (s) => `
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-role">${esc(s.role)}</div>
        ${s.name ? `<div class="sig-name">${esc(s.name)}</div>` : '<div class="sig-name muted">Name: ………………………………</div>'}
        <div class="sig-meta">${s.plain ? '' : `${s.regNo ? `Reg. no. ${esc(s.regNo)}` : 'Reg. no. ………………'} &nbsp;·&nbsp; `}Date: ${s.date ? esc(fmtDate(s.date)) : '……………'}</div>
      </div>`,
      )
      .join('')}
  </section>`;

export const note = (html: string, tone: 'info' | 'warn' = 'info'): string =>
  `<div class="note ${tone}">${html}</div>`;

// ── Stylesheet ──────────────────────────────────────────────────────────────────

const css = (o: { pageSize: string; footerLeft: string }): string => `
  @page {
    size: ${o.pageSize};
    margin: 14mm 14mm 17mm 14mm;
    @bottom-left  { content: "${o.footerLeft}"; font: 8pt Arial, sans-serif; color: #555; }
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Arial, sans-serif; color: #555; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root { --ink: #111827; --muted: #6b7280; --rule: #c9ced6; --soft: #f3f4f6; --accent: #14532d; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 10pt/1.45 "Segoe UI", Arial, Helvetica, sans-serif; color: var(--ink); background: #e5e7eb; }
  .muted { color: var(--muted); }
  b, strong { font-weight: 600; }

  .page { width: 210mm; margin: 12px auto; background: #fff; padding: 14mm; box-shadow: 0 1px 6px rgba(0,0,0,.18); }

  /* Letterhead */
  .letterhead { display: flex; align-items: center; gap: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--accent); }
  .lh-logo { height: 18mm; width: auto; max-width: 28mm; object-fit: contain; }
  .lh-main { flex: 1; min-width: 0; }
  .lh-name { font-size: 15pt; font-weight: 700; letter-spacing: .2px; color: var(--accent); line-height: 1.2; }
  .lh-line { font-size: 8.5pt; color: #374151; }
  .lh-codes { font-size: 8pt; text-align: right; color: #374151; line-height: 1.5; }

  /* Title */
  .doc-title { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin: 10px 0 8px; }
  .doc-title h1 { font-size: 15pt; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
  .doc-meta { text-align: right; font-size: 9pt; line-height: 1.5; }
  .doc-meta .k { color: var(--muted); margin-right: 4px; }
  .chip { display: inline-block; margin-top: 2px; padding: 1px 8px; border: 1px solid var(--ink); border-radius: 3px; font-size: 8pt; font-weight: 700; letter-spacing: .6px; }

  /* Key/value grids */
  .kv-grid { display: grid; border-top: 1px solid var(--rule); border-left: 1px solid var(--rule); }
  .kv-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
  .kv-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
  .kv-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .kv { padding: 3px 7px 4px; border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule); break-inside: avoid; }
  .kv-k { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4px; color: var(--muted); }
  .kv-v { font-size: 9.5pt; word-break: break-word; }
  .patient-banner { margin-bottom: 10px; background: var(--soft); }

  /* Sections */
  .sec { margin-top: 11px; }
  .sec h2 { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .7px; color: var(--accent); border-bottom: 1px solid var(--accent); padding-bottom: 2px; margin-bottom: 5px; break-after: avoid; }
  .keep { break-inside: avoid; }
  .text-block { white-space: normal; }

  /* Tables */
  table.data { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.data th { background: var(--soft); text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: .3px; padding: 4px 6px; border: 1px solid var(--rule); }
  table.data td { padding: 4px 6px; border: 1px solid var(--rule); vertical-align: top; }
  table.data thead { display: table-header-group; }
  table.data tr { break-inside: avoid; }
  table.data .num { text-align: right; font-variant-numeric: tabular-nums; }
  table.data .ctr { text-align: center; }
  table.data td.empty { text-align: center; color: var(--muted); padding: 8px; }
  table.data tfoot td { font-weight: 700; background: var(--soft); }
  .flag-h, .flag-l, .flag-c { font-weight: 700; }
  .flag-h, .flag-l { color: #b45309; }
  .flag-c { color: #b91c1c; }

  /* Notes */
  .note { border: 1px solid var(--rule); border-left: 3px solid var(--accent); padding: 5px 8px; font-size: 9pt; margin-top: 8px; break-inside: avoid; }
  .note.warn { border-left-color: #b91c1c; background: #fef2f2; }

  /* Signatures */
  .sigs { display: flex; gap: 18px; margin-top: 22px; }
  .sig { flex: 1; font-size: 8.5pt; }
  .sig-line { border-bottom: 1px solid var(--ink); height: 26px; }
  .sig-role { font-weight: 700; margin-top: 3px; }
  .sig-name { margin-top: 1px; }
  .sig-meta { color: var(--muted); font-size: 8pt; margin-top: 1px; }

  /* Screen-only footer + toolbar */
  .screen-foot { margin-top: 16px; padding-top: 6px; border-top: 1px solid var(--rule); font-size: 8pt; color: var(--muted); display: flex; justify-content: space-between; gap: 12px; }
  .toolbar { position: fixed; top: 12px; right: 16px; display: flex; gap: 8px; }
  .toolbar button { font: 600 10pt "Segoe UI", Arial, sans-serif; padding: 7px 14px; border-radius: 6px; border: 1px solid #14532d; cursor: pointer; background: #14532d; color: #fff; }
  .toolbar button.alt { background: #fff; color: #14532d; }

  @media print {
    body { background: #fff; }
    .page { width: auto; margin: 0; padding: 0; box-shadow: none; }
    .toolbar, .screen-foot { display: none !important; }
  }
`;

export interface ShellOptions {
  /** Browser/window title and the name suggested when saving as PDF. */
  title: string;
  hospital: ResolvedHospital;
  body: string;
  /** Short reference repeated in the page footer (e.g. "Visit V-000123"). */
  footerRef?: string;
  /** CSS page size, e.g. 'A4', 'A4 landscape'. */
  pageSize?: string;
  printLabel?: string;
  /** Replaces 'Confidential patient information' in the page footer (e.g. for staff documents). */
  footerNote?: string;
}

/** Wraps a body in the full HTML document: stylesheet, page footer, Print / Close buttons. */
export const pageShell = (o: ShellOptions): string => {
  const printed = fmtDateTime(new Date());
  const footerLeft = `${o.hospital.name}${o.footerRef ? ` · ${o.footerRef}` : ''} · ${o.footerNote ?? 'Confidential patient information'} · Printed ${printed}`
    .replace(/["\\]/g, '')
    .slice(0, 140);
  return `<!DOCTYPE html>
<html lang="en-GH">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(o.title)}</title>
  <style>${css({ pageSize: o.pageSize || 'A4', footerLeft })}${/landscape/i.test(o.pageSize || '') ? ' .page { width: 297mm; }' : ''}</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">${esc(o.printLabel || 'Print')}</button>
    <button class="alt" onclick="window.close()">Close</button>
  </div>
  <main class="page">
    ${letterhead(o.hospital)}
    ${o.body}
    <div class="screen-foot">
      <span>${esc(o.hospital.name)}${o.footerRef ? ` · ${esc(o.footerRef)}` : ''}</span>
      <span>Confidential — contains personal health information (Data Protection Act, 2012, Act 843). Printed ${esc(printed)}</span>
    </div>
  </main>
</body>
</html>`;
};
