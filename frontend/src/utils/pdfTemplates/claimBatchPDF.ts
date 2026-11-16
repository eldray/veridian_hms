// Consolidated monthly payer statement. Patient-level claims remain in the HMS
// for audit, but are not exposed as rows in the payer-facing batch document.

const esc = (v: any): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const fmtDate = (v: any): string => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', {
    year: 'numeric', month: 'short', day: '2-digit',
  });
};

const fmtMoney = (v: any): string => {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-GH', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
};

export const generateClaimBatchHTML = (batch: any, hospital: any): string => {
  const insuranceType: string = batch?.insuranceType ?? 'nhis';
  const providerName = batch?.insuranceProvider?.name ?? '—';
  const corporateName = batch?.corporateAccount?.companyName ?? null;
  const claims: any[] = batch?.claims ?? [];
  const items = claims.flatMap((claim) => Array.isArray(claim?.items) ? claim.items : []);
  const buckets: Array<{ label: string; categories: string[] }> = insuranceType === 'nhis'
    ? [
        { label: 'NHIS G-DRG package', categories: ['gdrg'] },
        { label: 'NHIS medications', categories: ['medicine'] },
      ]
    : [
        { label: 'Labs & imaging', categories: ['investigation'] },
        { label: 'Services & procedures', categories: ['service', 'procedure'] },
        { label: 'Medications', categories: ['medicine'] },
      ];

  const bucketTotals = buckets.map((bucket) => {
    const rows = items.filter((item) => bucket.categories.includes(String(item?.itemCategory ?? '').toLowerCase()));
    return {
      label: bucket.label,
      itemCount: rows.length,
      amount: rows.reduce((sum, item) => sum + Number(item?.lineTotal ?? 0), 0),
    };
  });
  const categorized = new Set(buckets.flatMap((bucket) => bucket.categories));
  const otherItems = items.filter((item) => {
    const category = String(item?.itemCategory ?? '').toLowerCase();
    return category !== 'diagnosis' && !categorized.has(category);
  });
  if (otherItems.length) {
    bucketTotals.push({
      label: 'Other billable services & items',
      itemCount: otherItems.length,
      amount: otherItems.reduce((sum, item) => sum + Number(item?.lineTotal ?? 0), 0),
    });
  }

  const totalAmount = claims.reduce((sum, claim) => sum + Number(claim?.totalClaimAmount ?? 0), 0);
  const labelMap: Record<string, string> = {
    nhis: 'NHIS MONTHLY CLAIM BATCH',
    private: 'PRIVATE INSURANCE MONTHLY CLAIM BATCH',
    corporate: 'CORPORATE MONTHLY CLAIM BATCH',
  };
  const docLabel = labelMap[insuranceType] ?? 'MONTHLY CLAIM BATCH';
  const period = `${batch?.periodYear ?? ''}-${String(batch?.periodMonth ?? '').padStart(2, '0')}`;
  const hospitalName = hospital?.name ?? 'Hospital';
  const hospitalAddress = hospital?.address ?? '';
  const hospitalPhone = hospital?.phone ?? '';
  const hospitalEmail = hospital?.email ?? '';
  const providerLabel = corporateName ? `${providerName} · ${corporateName}` : providerName;
  const bucketRows = bucketTotals.map((bucket) => `
    <tr><td>${esc(bucket.label)}</td><td class="num">${bucket.itemCount}</td><td class="num">${fmtMoney(bucket.amount)}</td></tr>
  `).join('');
  const bucketTotalsRows = bucketTotals.map((bucket) =>
    `<tr><td>${esc(bucket.label)}</td><td>${fmtMoney(bucket.amount)}</td></tr>`
  ).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(docLabel)} — ${esc(batch?.batchNumber ?? '')}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f1f5f9; padding: 30px; color: #1e293b; }
  .page { max-width: 1100px; margin: 0 auto; background: white; border-radius: 14px; box-shadow: 0 10px 40px rgba(0,0,0,.12); overflow: hidden; }
  .header { background: linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%); color: white; padding: 26px 36px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
  .hospital-name { font-size: 20px; font-weight: 700; }
  .hospital-meta { font-size: 12px; opacity: .9; line-height: 1.5; margin-top: 4px; }
  .header-right { text-align: right; }
  .doc-badge { background: rgba(255,255,255,.2); padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .doc-number { font-size: 14px; font-weight: 700; margin-top: 7px; }
  .content { padding: 26px 36px 32px; }
  .info-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 12px; margin-bottom: 22px; }
  .info-card { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #2563eb; }
  .label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .5px; }
  .value { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 3px; }
  .section-title { font-size: 15px; font-weight: 700; margin: 20px 0 10px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
  .note { font-size: 12px; line-height: 1.6; color: #64748b; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
  th { background: #f1f5f9; padding: 10px 12px; text-align: left; color: #475569; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 16px; display: flex; justify-content: flex-end; }
  .totals-table { width: 360px; }
  .totals-table td:first-child { color: #64748b; }
  .totals-table td:last-child { text-align: right; font-weight: 600; }
  .grand-total td { border-top: 2px solid #0f172a; font-size: 15px; font-weight: 700 !important; color: #0f172a !important; }
  .footer { margin-top: 28px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
  .no-print { padding: 18px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: center; gap: 12px; }
  button { padding: 10px 26px; border: 0; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .primary { background: #2563eb; color: white; } .secondary { background: #e2e8f0; color: #475569; }
  @media print { @page { size: A4 portrait; margin: 14mm; } body { background: white; padding: 0; } .page { box-shadow: none; border-radius: 0; max-width: none; } .no-print { display: none !important; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="hospital-name">${esc(hospitalName)}</div>
      <div class="hospital-meta">${esc(hospitalAddress)}<br>Tel: ${esc(hospitalPhone)} &nbsp;|&nbsp; ${esc(hospitalEmail)}</div>
    </div>
    <div class="header-right"><div class="doc-badge">${esc(docLabel)}</div><div class="doc-number">${esc(batch?.batchNumber ?? '')}</div></div>
  </div>
  <div class="content">
    <div class="info-grid">
      <div class="info-card"><div class="label">Billing period</div><div class="value">${esc(period)}</div></div>
      <div class="info-card"><div class="label">Payer / Provider</div><div class="value">${esc(providerLabel)}</div></div>
      <div class="info-card"><div class="label">Claims included</div><div class="value">${claims.length}</div></div>
      <div class="info-card"><div class="label">Batch status</div><div class="value">${esc(String(batch?.status ?? '').toUpperCase())}</div></div>
      <div class="info-card"><div class="label">Generated</div><div class="value">${fmtDate(batch?.generatedAt ?? batch?.createdAt)}</div></div>
      ${batch?.finalizedAt ? `<div class="info-card"><div class="label">Finalized</div><div class="value">${fmtDate(batch.finalizedAt)}</div></div>` : ''}
      ${insuranceType === 'nhis' && batch?.claimFamily && batch.claimFamily !== 'ALL' ? `<div class="info-card"><div class="label">G-DRG family</div><div class="value">${esc(batch.claimFamily)}</div></div>` : ''}
    </div>
    <div class="section-title">Consolidated monthly claim summary</div>
    <p class="note">This statement combines the payable amounts for the selected payer and billing period. It does not list individual patients or claim records. The original claims remain linked to this batch inside the hospital system for audit, verification and follow-up.</p>
    <table>
      <thead><tr><th>Billing category</th><th class="num">Line items</th><th class="num">Consolidated amount (GHS)</th></tr></thead>
      <tbody>${bucketRows || '<tr><td colspan="3">No billable line items found.</td></tr>'}</tbody>
    </table>
    <div class="totals"><table class="totals-table">
      <tr><td>Claims included</td><td>${claims.length}</td></tr>
      <tr><td>Billable line items</td><td>${bucketTotals.reduce((sum, bucket) => sum + bucket.itemCount, 0)}</td></tr>
      ${bucketTotalsRows}
      <tr class="grand-total"><td>Monthly amount claimed (GHS)</td><td>${fmtMoney(totalAmount)}</td></tr>
    </table></div>
    <div class="footer"><div>${esc(hospitalName)} · ${esc(hospital?.nhisFacilityCode ?? '')}</div><div>Generated ${new Date().toLocaleString()}</div></div>
  </div>
  <div class="no-print"><button class="primary" onclick="window.print()">Print monthly summary</button><button class="secondary" onclick="window.close()">Close</button></div>
</div>
</body>
</html>`;
};
