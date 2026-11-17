// src/utils/pdfTemplates/thermalKit.ts
// Building blocks for slips printed on POS receipt printers (80 mm or 58 mm roll paper).
// Black only, bold enough for thermal heads, dashed separators, no backgrounds, no images.
import { esc, fmtDateTime, resolveHospital, type ResolvedHospital } from './printKit';

export type ThermalWidth = 80 | 58;

/** 80 mm unless the workstation was set to a 58 mm printer (localStorage 'print.thermalWidth'). */
export const getThermalWidth = (override?: unknown): ThermalWidth => {
  const pick = (v: unknown): ThermalWidth | null => (Number(v) === 58 ? 58 : Number(v) === 80 ? 80 : null);
  const fromArg = pick(override);
  if (fromArg) return fromArg;
  try {
    const stored = pick(typeof localStorage !== 'undefined' ? localStorage.getItem('print.thermalWidth') : null);
    if (stored) return stored;
  } catch { /* storage blocked: use the default */ }
  return 80;
};

/** Saves the workstation's roll width for every later slip. */
export const setThermalWidth = (w: ThermalWidth): void => {
  try { localStorage.setItem('print.thermalWidth', String(w)); } catch { /* ignore */ }
};

// ── Slip parts (all return HTML) ────────────────────────────────────────────────

export const slipHeader = (h: ResolvedHospital): string => `
  <div class="c b big">${esc(h.name)}</div>
  ${h.address ? `<div class="c sm">${esc(h.address)}</div>` : ''}
  ${h.phone ? `<div class="c sm">Tel: ${esc(h.phone)}</div>` : ''}
  ${h.nhisFacilityCode ? `<div class="c sm">NHIA code: ${esc(h.nhisFacilityCode)}</div>` : ''}`;

export const slipTitle = (t: string): string => `<div class="rule dbl"></div><div class="c b title">${esc(t)}</div><div class="rule dbl"></div>`;
export const rule = (): string => '<div class="rule"></div>';
export const gap = (): string => '<div class="gap"></div>';
export const centre = (html: string, cls = ''): string => `<div class="c ${cls}">${html}</div>`;

/** Label left, value right — wraps the value onto its own lines when it is long. */
export const row = (label: string, value: string, o: { bold?: boolean } = {}): string =>
  `<div class="row${o.bold ? ' b' : ''}"><span class="l">${esc(label)}</span><span class="r">${value}</span></div>`;

/** Label with the value on the next line(s): names, long text. */
export const field = (label: string, value: string): string =>
  `<div class="field"><span class="sm">${esc(label)}</span><div class="b">${value}</div></div>`;

/** A boxed warning line such as an allergy alert. */
export const alertBox = (html: string): string => `<div class="alert">${html}</div>`;

/** Dotted write-in line for a signature or stamp. */
export const signLine = (label: string, name?: string): string => `
  <div class="sign"><div class="sign-line"></div><div class="sm">${esc(label)}${name ? ` — ${esc(name)}` : ''}</div></div>`;

export const slipFooter = (lines: string[], printedAt: Date = new Date()): string => `
  ${rule()}
  ${lines.map((l) => `<div class="c sm">${l}</div>`).join('')}
  <div class="c xs">Printed ${esc(fmtDateTime(printedAt))}</div>
  <div class="tear">&nbsp;</div>`;

// ── Document shell ──────────────────────────────────────────────────────────────

const css = (w: ThermalWidth): string => {
  const paper = w === 58 ? 58 : 80;
  const printable = w === 58 ? 48 : 72;
  const base = w === 58 ? 8.5 : 10;
  return `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; color: #000; }
  body { font: ${base}pt/1.35 "Courier New", Consolas, monospace; -webkit-font-smoothing: none; }
  .slip { width: ${printable}mm; margin: 0 auto; padding: 3mm 0 0; }
  .c { text-align: center; }
  .b { font-weight: 700; }
  .big { font-size: ${base + 3}pt; line-height: 1.2; }
  .title { font-size: ${base + 1.5}pt; letter-spacing: .5px; padding: 1mm 0; text-transform: uppercase; }
  .sm { font-size: ${base - 1.5}pt; }
  .xs { font-size: ${base - 2.5}pt; }
  .rule { border-top: 1px dashed #000; margin: 1.6mm 0; }
  .rule.dbl { border-top: 3px double #000; margin: 1.2mm 0; }
  .gap { height: 2mm; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; }
  .row .l { flex: 0 1 auto; }
  .row .r { flex: 1 1 auto; text-align: right; word-break: break-word; }
  .field { margin: .6mm 0; word-break: break-word; }
  .item { margin: 1mm 0; break-inside: avoid; }
  .item .name { font-weight: 700; word-break: break-word; }
  .item .detail { padding-left: 3mm; }
  .alert { border: 2px solid #000; padding: 1mm 1.5mm; margin: 1.5mm 0; font-weight: 700; word-break: break-word; }
  .sign { margin-top: 7mm; }
  .sign-line { border-bottom: 1px solid #000; height: 5mm; }
  .tear { height: 10mm; }
  .toolbar { position: fixed; top: 8px; right: 12px; display: flex; gap: 6px; font-family: Arial, sans-serif; }
  .toolbar button { font: 600 10pt Arial, sans-serif; padding: 6px 12px; border-radius: 6px; border: 1px solid #111; background: #111; color: #fff; cursor: pointer; }
  .toolbar button.alt { background: #fff; color: #111; }
  @page { size: ${paper}mm 297mm; margin: 0; }
  @media screen {
    body { background: #e5e7eb; }
    /* Decoration only (outline/shadow) so the preview wraps text exactly as the printed slip will. */
    .slip { background: #fff; margin: 14px auto; box-shadow: 0 1px 6px rgba(0,0,0,.2); outline: 3mm solid #fff; }
  }
  @media print { .toolbar { display: none !important; } }`;
};

/**
 * Wraps slip HTML in a document. On load it measures the content and sets the page height to
 * match, so a roll printer feeds only the paper the slip needs instead of a full A4 length.
 */
export const slipShell = (o: { title: string; body: string; width?: ThermalWidth; printLabel?: string }): string => {
  const w = getThermalWidth(o.width);
  const paper = w === 58 ? 58 : 80;
  return `<!DOCTYPE html>
<html lang="en-GH">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(o.title)}</title>
  <style id="slip-css">${css(w)}</style>
  <style id="slip-page"></style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">${esc(o.printLabel || 'Print')}</button>
    <button class="alt" onclick="window.close()">Close</button>
  </div>
  <main class="slip" id="slip">${o.body}</main>
  <script>
    (function () {
      function fit() {
        var el = document.getElementById('slip');
        if (!el) return;
        var mm = Math.ceil(el.getBoundingClientRect().height * 25.4 / 96) + 4;
        document.getElementById('slip-page').textContent = '@page { size: ${paper}mm ' + Math.max(mm, 40) + 'mm; margin: 0; }';
      }
      window.addEventListener('load', fit);
      window.addEventListener('beforeprint', fit);
      fit();
    })();
  </script>
</body>
</html>`;
};

export { resolveHospital };
