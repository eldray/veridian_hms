// Consolidated monthly payer statement. Individual claims remain linked inside the HMS for audit.
import {
  esc, money, resolveHospital, docTitle, section, table, signatures, note, kvGrid, pageShell,
} from './printKit';

const n = (value: unknown): number => Number(value) || 0;
const amountText = (value: unknown): string => money(value).replace('GHS ', '');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const generateClaimBatchHTML = (batch: any, hospital: any): string => {
  const h = resolveHospital(hospital);
  const claims: any[] = Array.isArray(batch?.claims) ? batch.claims : [];
  const insuranceType = String(batch?.insuranceType ?? 'nhis').toLowerCase();
  const provider = batch?.insuranceProvider?.name || '';
  const corporate = batch?.corporateAccount?.companyName || '';
  const batchNo = batch?.batchNumber || '';
  const month = Number(batch?.periodMonth);
  const period = month >= 1 && month <= 12
    ? `${MONTHS[month - 1]} ${batch?.periodYear ?? ''}`
    : String(batch?.periodYear ?? '');

  const items = claims.flatMap((claim) => Array.isArray(claim?.items) ? claim.items : []);
  const buckets: Array<{ label: string; categories: string[] }> = insuranceType === 'nhis'
    ? [
        { label: 'NHIS G-DRG package', categories: ['gdrg'] },
        { label: 'NHIS medications', categories: ['medicine'] },
      ]
    : [
        { label: 'Consultations & services', categories: ['service'] },
        { label: 'Procedures', categories: ['procedure'] },
        { label: 'Labs & imaging', categories: ['investigation'] },
        { label: 'Medications', categories: ['medicine'] },
      ];

  const bucketTotals = buckets.map((bucket) => {
    const rows = items.filter((item) => bucket.categories.includes(String(item?.itemCategory ?? '').toLowerCase()));
    return {
      label: bucket.label,
      itemCount: rows.length,
      amount: rows.reduce((sum, item) => sum + n(item?.lineTotal), 0),
    };
  });
  const categorized = new Set(buckets.flatMap((bucket) => bucket.categories));
  // NHIS submissions are valued only at G-DRG + eligible medicines. Private and
  // corporate payers receive all other billable lines, excluding diagnosis codes/G-DRG.
  const otherItems = insuranceType === 'nhis' ? [] : items.filter((item) => {
    const category = String(item?.itemCategory ?? '').toLowerCase();
    return category !== 'diagnosis' && category !== 'gdrg' && !categorized.has(category);
  });
  if (otherItems.length) {
    bucketTotals.push({
      label: 'Other billable services & items',
      itemCount: otherItems.length,
      amount: otherItems.reduce((sum, item) => sum + n(item?.lineTotal), 0),
    });
  }

  const totalAmount = claims.reduce((sum, claim) => sum + n(claim?.totalClaimAmount), 0);
  const lineItemCount = bucketTotals.reduce((sum, bucket) => sum + bucket.itemCount, 0);
  const payerLabel = corporate ? `${provider || 'Corporate payer'} · ${corporate}` : (provider || '—');
  const docLabel = insuranceType === 'nhis'
    ? 'NHIS monthly claim statement'
    : insuranceType === 'corporate'
      ? 'Corporate monthly claim statement'
      : insuranceType === 'private'
        ? 'Private insurance monthly claim statement'
        : 'Monthly claim statement';

  const summaryRows = bucketTotals.map((bucket) => [
    esc(bucket.label),
    String(bucket.itemCount),
    esc(amountText(bucket.amount)),
  ]);

  const body = `
    ${docTitle(docLabel, {
      ref: batchNo, refLabel: 'Batch no.', date: batch?.generatedAt || batch?.createdAt || new Date(),
      dateLabel: 'Prepared', status: batch?.status ? String(batch.status).toUpperCase() : undefined,
    })}
    ${kvGrid([
      ['Billing period', `<b>${esc(period)}</b>`],
      ['Payer / provider', esc(payerLabel)],
      ['NHIA facility code', esc(h.nhisFacilityCode || '—')],
      ['Claims included', `<b>${claims.length}</b>`],
      ['Billable line items', `<b>${lineItemCount}</b>`],
      ['Monthly amount claimed', `<b>${esc(money(totalAmount))}</b>`],
      ...(insuranceType === 'nhis' && batch?.claimFamily && batch.claimFamily !== 'ALL'
        ? [['G-DRG family', esc(batch.claimFamily)] as [string, string]]
        : []),
    ], 3)}
    ${section('Consolidated monthly claim summary', table({
      head: ['Service category', 'Line items', 'Consolidated amount (GHS)'],
      widths: ['48%', '17%', '35%'],
      align: [undefined, 'r', 'r'],
      rows: summaryRows,
      foot: [['Monthly amount claimed', String(lineItemCount), esc(amountText(totalAmount))]],
      empty: 'No billable line items found for this batch',
    }))}
    ${note('This statement consolidates the payable amounts for the selected payer and billing period. It does not list individual patients or claim records. The original claims remain linked to this batch inside the hospital system for audit, verification and follow-up.')}
    ${signatures([
      { role: 'Prepared by (claims officer)', plain: true },
      { role: 'Verified by (head of accounts / medical records)', plain: true },
      { role: 'Approved by (medical director / administrator)', plain: true },
    ])}
  `;

  return pageShell({
    title: `${docLabel} ${batchNo}`,
    hospital: h,
    body,
    footerRef: batchNo ? `Batch ${batchNo}` : undefined,
    pageSize: 'A4 portrait',
    printLabel: 'Print monthly statement',
  });
};
