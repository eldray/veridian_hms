// backend/src/modules/insuranceClaim/ClaimSummaryPrint.ts
// Printable claim SUMMARIES for the accounts office. A payer is billed from the totals for the
// month, not from the individual claims, so these pages lead with the figures:
//   - renderBatchSummaryHtml: one batch = one payer (NHIS, an insurer, or one company) for one month
//   - renderMonthlySummaryHtml: every payer for one month, one line per company
// Individual claim lines are left out unless a detail annex is asked for.
// Only figures the claim records actually hold are printed (claimed amounts); nothing is estimated.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const num = (v: any): number => {
  const n = typeof v === 'number' ? v : parseFloat(v?.toString?.() ?? '0');
  return isNaN(n) ? 0 : n;
};
const money = (v: unknown): string =>
  num(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (v: any): string => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const periodName = (year: number, month: number): string => `${MONTHS[month - 1] ?? month} ${year}`;

const TYPE_LABEL: Record<string, string> = { nhis: 'NHIS', private: 'Private insurance', corporate: 'Corporate' };
const STATUS_LABEL: Record<string, string> = { generated: 'GENERATED', finalized: 'FINALIZED', submitted: 'SUBMITTED' };

/**
 * Payer-specific payable categories. NHIS is priced as its G-DRG package plus eligible medicines;
 * private and corporate claims use the covered billable lines. Diagnosis rows are coding metadata,
 * never payable, so they are in no bucket.
 */
export const costBucketsFor = (insuranceType: string): Array<{ label: string; categories: string[] }> =>
  insuranceType === 'nhis'
    ? [
        { label: 'NHIS G-DRG package', categories: ['gdrg'] },
        { label: 'NHIS medicines', categories: ['medicine'] },
      ]
    : [
        { label: 'Consultations and services', categories: ['service'] },
        { label: 'Procedures', categories: ['procedure'] },
        { label: 'Laboratory and imaging', categories: ['investigation'] },
        { label: 'Medicines', categories: ['medicine'] },
      ];

const cat = (i: any): string => String(i?.itemCategory ?? '').toLowerCase();

const bucketTotals = (claims: any[], insuranceType: string) => {
  const items = claims.flatMap((c) => c.items ?? []);
  const buckets = costBucketsFor(insuranceType);
  const rows = buckets.map((b) => {
    const m = items.filter((i) => b.categories.includes(cat(i)));
    return { label: b.label, count: m.length, amount: m.reduce((x, i) => x + num(i.lineTotal), 0) };
  });
  if (insuranceType !== 'nhis') {
    const known = new Set(buckets.flatMap((b) => b.categories));
    const other = items.filter((i) => cat(i) !== 'diagnosis' && cat(i) !== 'gdrg' && !known.has(cat(i)));
    if (other.length) rows.push({ label: 'Other services and items', count: other.length, amount: other.reduce((x, i) => x + num(i.lineTotal), 0) });
  }
  const total = claims.reduce((s, c) => s + num(c.totalClaimAmount), 0);
  return { rows, total, itemTotal: rows.reduce((s, r) => s + r.count, 0) };
};

const isIpd = (c: any): boolean => String(c.typeOfService ?? '').toUpperCase() === 'IPD';

const CSS = `
  :root { --ink:#111827; --muted:#6b7280; --rule:#d1d5db; --accent:#14532d; --wash:#f3f6f3; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,Helvetica,sans-serif; font-size:10pt; color:var(--ink); background:#eef2ee; }
  .page { width:210mm; min-height:297mm; margin:12px auto; background:#fff; padding:14mm 14mm 18mm; position:relative; }
  .page.wide { width:297mm; min-height:210mm; }
  .toolbar { position:sticky; top:0; z-index:5; display:flex; gap:8px; justify-content:center; padding:10px; background:#fff; border-bottom:1px solid var(--rule); }
  .toolbar button { padding:8px 22px; border-radius:6px; border:1px solid var(--rule); background:#fff; font-size:13px; font-weight:600; cursor:pointer; }
  .toolbar button.primary { background:var(--accent); color:#fff; border-color:var(--accent); }
  .lh { border-bottom:2px solid var(--ink); padding-bottom:8px; margin-bottom:10px; }
  .lh .name { font-size:16pt; font-weight:700; color:var(--accent); }
  .lh .meta { font-size:8.5pt; color:var(--muted); margin-top:2px; }
  .title { display:flex; justify-content:space-between; align-items:flex-end; margin:6px 0 10px; gap:12px; }
  .title h1 { font-size:15pt; letter-spacing:.02em; text-transform:uppercase; }
  .title .ref { text-align:right; font-size:9pt; color:var(--muted); line-height:1.5; }
  .title .ref b { color:var(--ink); }
  .badge { display:inline-block; border:1px solid var(--ink); padding:1px 7px; font-size:8pt; font-weight:700; letter-spacing:.05em; border-radius:2px; }
  .kpis { display:grid; grid-template-columns:repeat(4,1fr); border:1px solid var(--rule); margin-bottom:12px; }
  .kpi { padding:8px 10px; border-right:1px solid var(--rule); }
  .kpi:last-child { border-right:0; }
  .kpi .k { font-size:7.5pt; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  .kpi .v { font-size:13pt; font-weight:700; margin-top:2px; }
  .kpi.big { background:var(--wash); }
  h2 { font-size:9pt; text-transform:uppercase; letter-spacing:.07em; color:var(--accent); border-bottom:1.5px solid var(--accent); padding:10px 0 3px; margin-bottom:6px; }
  table { width:100%; border-collapse:collapse; font-size:9.5pt; }
  th { background:var(--wash); text-align:left; font-size:8pt; text-transform:uppercase; letter-spacing:.05em; padding:5px 8px; border:1px solid var(--rule); }
  td { padding:5px 8px; border:1px solid var(--rule); vertical-align:top; }
  .r { text-align:right; font-variant-numeric:tabular-nums; } .c { text-align:center; }
  tfoot td { font-weight:700; background:var(--wash); }
  tr, .keep { break-inside:avoid; }
  .note { border-left:3px solid var(--accent); background:var(--wash); padding:6px 10px; margin:12px 0; font-size:8.5pt; }
  .sign { display:flex; gap:28px; margin-top:34px; }
  .sign > div { flex:1; border-top:1px solid var(--ink); padding-top:4px; font-size:8.5pt; }
  .sign .l { font-weight:700; } .sign .d { color:var(--muted); margin-top:10px; }
  .foot { position:absolute; left:14mm; right:14mm; bottom:8mm; font-size:7.5pt; color:var(--muted); display:flex; justify-content:space-between; border-top:1px solid var(--rule); padding-top:3px; }
  @page { size:A4; margin:0; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .page { margin:0; box-shadow:none; }
    * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }`;

const shell = (title: string, hospital: any, inner: string, opts: { wide?: boolean; footerRef: string }): string => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>${CSS}${opts.wide ? '@page { size:A4 landscape; margin:0; }' : ''}</style></head>
<body>
<div class="toolbar"><button class="primary" onclick="window.print()">Print</button><button onclick="window.close()">Close</button></div>
<div class="page${opts.wide ? ' wide' : ''}">
  <div class="lh">
    <div class="name">${esc(hospital.name)}</div>
    <div class="meta">${[hospital.address, hospital.phone && `Tel ${hospital.phone}`, hospital.email, hospital.nhisFacilityCode && `NHIA facility code ${hospital.nhisFacilityCode}`].filter(Boolean).map(esc).join(' · ')}</div>
  </div>
  ${inner}
  <div class="foot"><span>${esc(hospital.name)} · ${esc(opts.footerRef)} · Confidential</span><span>Printed ${esc(new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span></div>
</div>
</body></html>`;

const sign = (roles: string[]) =>
  `<div class="sign keep">${roles.map((r) => `<div><div class="l">${esc(r)}</div><div class="d">Name: ______________________ Date: __________</div></div>`).join('')}</div>`;

const breakdownTable = (claims: any[], insuranceType: string) => {
  const { rows, total, itemTotal } = bucketTotals(claims, insuranceType);
  const bucketSum = rows.reduce((s, r) => s + r.amount, 0);
  const gap = total - bucketSum;
  return `<table class="keep"><thead><tr><th>Service category</th><th class="r" style="width:14%">Line items</th><th class="r" style="width:20%">Amount (GHS)</th><th class="r" style="width:12%">Share</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td class="r">${r.count}</td><td class="r">${money(r.amount)}</td><td class="r">${total > 0 ? ((r.amount / total) * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}
    ${Math.abs(gap) >= 0.005 ? `<tr><td style="color:var(--muted)">Adjustments and rounding</td><td class="r">—</td><td class="r">${money(gap)}</td><td class="r">${total > 0 ? ((gap / total) * 100).toFixed(1) : '0.0'}%</td></tr>` : ''}</tbody>
    <tfoot><tr><td>Total claimed</td><td class="r">${itemTotal}</td><td class="r">${money(total)}</td><td class="r">100%</td></tr></tfoot></table>`;
};

const serviceTable = (claims: any[]) => {
  const groups = [
    { label: 'Out-patient (OPD)', list: claims.filter((c) => !isIpd(c)) },
    { label: 'In-patient (IPD)', list: claims.filter(isIpd) },
  ];
  const total = claims.reduce((s, c) => s + num(c.totalClaimAmount), 0);
  return `<table class="keep"><thead><tr><th>Type of service</th><th class="r" style="width:14%">Claims</th><th class="r" style="width:20%">Amount (GHS)</th><th class="r" style="width:14%">Average</th></tr></thead>
    <tbody>${groups.map((g) => {
      const amt = g.list.reduce((s, c) => s + num(c.totalClaimAmount), 0);
      return `<tr><td>${g.label}</td><td class="r">${g.list.length}</td><td class="r">${money(amt)}</td><td class="r">${g.list.length ? money(amt / g.list.length) : '—'}</td></tr>`;
    }).join('')}</tbody>
    <tfoot><tr><td>All claims</td><td class="r">${claims.length}</td><td class="r">${money(total)}</td><td class="r">${claims.length ? money(total / claims.length) : '—'}</td></tr></tfoot></table>`;
};

/** NHIS bills each specialty family separately, so show how the month splits by family. */
const familyTable = (claims: any[]) => {
  const byFam = new Map<string, { n: number; amt: number }>();
  for (const c of claims) {
    const fam = String(c.mdcCode || 'Uncoded').toUpperCase();
    const cur = byFam.get(fam) ?? { n: 0, amt: 0 };
    cur.n += 1; cur.amt += num(c.totalClaimAmount);
    byFam.set(fam, cur);
  }
  if (byFam.size < 2) return '';
  const rows = [...byFam.entries()].sort((a, b) => b[1].amt - a[1].amt);
  return `<h2>By specialty (MDC)</h2><table class="keep"><thead><tr><th>MDC</th><th class="r" style="width:14%">Claims</th><th class="r" style="width:20%">Amount (GHS)</th></tr></thead>
    <tbody>${rows.map(([f, v]) => `<tr><td>${esc(f)}</td><td class="r">${v.n}</td><td class="r">${money(v.amt)}</td></tr>`).join('')}</tbody></table>`;
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// One batch (one payer, one month)
// ─────────────────────────────────────────────────────────────────────────────────────────────
export const renderBatchSummaryHtml = (batch: any, hospital: any, opts: { detail?: boolean } = {}): string => {
  const claims: any[] = batch.claims ?? [];
  const type = String(batch.insuranceType);
  const company = batch.corporateAccount?.companyName || '';
  const insurer = batch.insuranceProvider?.name || '';
  const payer = company || insurer || '—';
  const total = claims.reduce((s, c) => s + num(c.totalClaimAmount), 0);
  const patients = new Set(claims.map((c) => c.patientId || c.Patient?.id).filter(Boolean)).size;
  const ipd = claims.filter(isIpd).length;
  const period = periodName(batch.periodYear, batch.periodMonth);
  const family = batch.claimFamily && batch.claimFamily !== 'ALL' ? batch.claimFamily : '';
  const dates = claims.map((c) => c.Attendance?.dateTime).filter(Boolean).map((d: any) => new Date(d).getTime());
  const firstVisit = dates.length ? new Date(Math.min(...dates)) : null;
  const lastVisit = dates.length ? new Date(Math.max(...dates)) : null;

  const detail = opts.detail
    ? `<h2>Claims in this batch</h2><table><thead><tr><th style="width:5%">#</th><th>Claim no.</th><th>Patient</th><th>Folder no.</th><th>Visit date</th><th class="r">Amount (GHS)</th></tr></thead><tbody>${claims
        .map((c, i) => `<tr><td class="c">${i + 1}</td><td>${esc(c.claimNumber)}</td><td>${esc(`${c.Patient?.surname ?? ''} ${c.Patient?.otherNames ?? ''}`.trim())}</td><td>${esc(c.Patient?.folderNumber ?? '')}</td><td>${date(c.Attendance?.dateTime)}</td><td class="r">${money(c.totalClaimAmount)}</td></tr>`)
        .join('')}</tbody></table>`
    : '';

  const inner = `
    <div class="title">
      <h1>${esc(TYPE_LABEL[type] ?? 'Claims')} claims summary</h1>
      <div class="ref">Batch <b>${esc(batch.batchNumber)}</b><br><span class="badge">${esc(STATUS_LABEL[batch.status] ?? String(batch.status ?? '').toUpperCase())}</span></div>
    </div>

    <table class="keep" style="margin-bottom:10px"><tbody>
      <tr><td style="width:18%;background:var(--wash)"><b>Payer</b></td><td style="width:32%">${esc(payer)}${company && insurer ? ` <span style="color:var(--muted)">(${esc(insurer)})</span>` : ''}</td><td style="width:18%;background:var(--wash)"><b>Period</b></td><td>${esc(period)}</td></tr>
      <tr><td style="background:var(--wash)"><b>Visits from</b></td><td>${date(firstVisit)} to ${date(lastVisit)}</td><td style="background:var(--wash)"><b>${family ? 'Claim family' : 'Batch created'}</b></td><td>${family ? esc(family) : date(batch.generatedAt)}</td></tr>
    </tbody></table>

    <div class="kpis keep">
      <div class="kpi big"><div class="k">Total claimed (GHS)</div><div class="v">${money(total)}</div></div>
      <div class="kpi"><div class="k">Claims</div><div class="v">${claims.length}</div></div>
      <div class="kpi"><div class="k">Patients</div><div class="v">${patients}</div></div>
      <div class="kpi"><div class="k">In-patient claims</div><div class="v">${ipd}</div></div>
    </div>

    <h2>Where the money went</h2>
    ${breakdownTable(claims, type)}
    <h2>Out-patient and in-patient</h2>
    ${serviceTable(claims)}
    ${type === 'nhis' ? familyTable(claims) : ''}
    ${detail}

    <div class="note keep">Amounts are the totals claimed from this payer for ${esc(period)}. Payments received and payer decisions are tracked separately under claim tracking.${opts.detail ? '' : ' Individual claims are not listed on this summary.'}</div>
    ${sign(['Prepared by (Accounts)', 'Checked by', 'Approved by (Administrator)'])}`;

  return shell(`${TYPE_LABEL[type] ?? 'Claims'} claims summary ${batch.batchNumber}`, hospital, inner, { footerRef: `Batch ${batch.batchNumber}` });
};

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Whole month, one line per payer / company
// ─────────────────────────────────────────────────────────────────────────────────────────────
export const renderMonthlySummaryHtml = (batches: any[], year: number, month: number, hospital: any, typeFilter?: string): string => {
  const period = periodName(year, month);
  const rows = batches
    .map((b) => {
      const claims: any[] = b.claims ?? [];
      return {
        type: String(b.insuranceType),
        payer: b.corporateAccount?.companyName || b.insuranceProvider?.name || '—',
        family: b.claimFamily && b.claimFamily !== 'ALL' ? b.claimFamily : '',
        batchNumber: b.batchNumber,
        status: String(b.status ?? ''),
        claims,
        count: claims.length,
        patients: new Set(claims.map((c) => c.patientId).filter(Boolean)).size,
        amount: claims.reduce((s, c) => s + num(c.totalClaimAmount), 0),
      };
    })
    .sort((a, b) => a.type.localeCompare(b.type) || a.payer.localeCompare(b.payer) || a.family.localeCompare(b.family));

  const allClaims = rows.flatMap((r) => r.claims);
  const grand = rows.reduce((s, r) => s + r.amount, 0);

  const sections = ['nhis', 'private', 'corporate']
    .filter((t) => !typeFilter || typeFilter === t)
    .map((t) => {
      const list = rows.filter((r) => r.type === t);
      if (!list.length) return '';
      const sub = list.reduce((s, r) => s + r.amount, 0);
      const subCount = list.reduce((s, r) => s + r.count, 0);
      return `<h2>${esc(TYPE_LABEL[t])}</h2>
        <table class="keep"><thead><tr><th>${t === 'corporate' ? 'Company' : t === 'private' ? 'Insurer' : 'Scheme'}</th><th>Batch</th><th class="c" style="width:11%">Status</th><th class="r" style="width:9%">Claims</th><th class="r" style="width:9%">Patients</th><th class="r" style="width:17%">Amount (GHS)</th><th class="r" style="width:9%">Share</th></tr></thead>
        <tbody>${list.map((r) => `<tr><td><b>${esc(r.payer)}</b>${r.family ? ` <span style="color:var(--muted)">· ${esc(r.family)}</span>` : ''}</td><td>${esc(r.batchNumber)}</td><td class="c">${esc((STATUS_LABEL[r.status] ?? r.status).toString())}</td><td class="r">${r.count}</td><td class="r">${r.patients}</td><td class="r">${money(r.amount)}</td><td class="r">${grand > 0 ? ((r.amount / grand) * 100).toFixed(1) : '0.0'}%</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">Sub-total · ${esc(TYPE_LABEL[t])}</td><td class="r">${subCount}</td><td class="r">—</td><td class="r">${money(sub)}</td><td class="r">${grand > 0 ? ((sub / grand) * 100).toFixed(1) : '0.0'}%</td></tr></tfoot></table>
        <div style="height:6px"></div>${breakdownTable(list.flatMap((r) => r.claims), t)}`;
    })
    .join('');

  const inner = `
    <div class="title">
      <h1>Monthly claims summary</h1>
      <div class="ref">Period <b>${esc(period)}</b><br>${typeFilter ? esc(TYPE_LABEL[typeFilter] ?? typeFilter) : 'All payers'}</div>
    </div>
    <div class="kpis keep">
      <div class="kpi big"><div class="k">Total claimed (GHS)</div><div class="v">${money(grand)}</div></div>
      <div class="kpi"><div class="k">Claims</div><div class="v">${allClaims.length}</div></div>
      <div class="kpi"><div class="k">Payers billed</div><div class="v">${new Set(rows.map((r) => `${r.type}:${r.payer}`)).size}</div></div>
      <div class="kpi"><div class="k">Batches</div><div class="v">${rows.length}</div></div>
    </div>
    ${rows.length ? sections : '<div class="note">No claim batches have been generated for this month.</div>'}
    <div class="note keep">Totals are the amounts claimed for ${esc(period)} from the batches generated so far. Claims not yet batched are not included. Payments received are tracked separately under claim tracking.</div>
    ${sign(['Prepared by (Accounts)', 'Approved by (Administrator)'])}`;

  return shell(`Monthly claims summary ${period}`, hospital, inner, { footerRef: `Claims ${period}` });
};
