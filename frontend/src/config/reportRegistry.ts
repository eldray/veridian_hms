// frontend/src/config/reportRegistry.ts
//
// The reports the main Reports screen can generate that have no hand-written page of their
// own. Each entry says where the numbers and the rows live in the response the API already
// returns; the shell in components/reports/reportShell.tsx renders any of them alike.
//
// WHY A REGISTRY AND NOT MORE JSX
// Every report that carried its own renderer eventually disagreed with the API about a field
// name, quietly showed "Showing 100 of 142", or rendered stat cards over an empty table — the
// insurance claims report showed three totals and no claims at all. One renderer with a
// declared shape cannot drift that way, and a new report is one entry here instead of a new
// file.
//
// WHAT IS DELIBERATELY NOT HERE
// The statutory GHS returns (Form A, malaria, morbidity, IDSR, the consulting room register)
// keep their own views. They must reproduce a printed form, so the exact position of every
// cell is the point and a generic table would be wrong. Stock keeps its own screen for the
// same reason: its lines are a physical count, not a report.
//
// FIELD NAMES ARE NOT GUESSES
// Every path below was read out of the service or repository that answers the endpoint. The
// shell also tries a segment with its first letter flipped, because Prisma's relation names
// come back with only the initial letter lowercased (`Bill` -> `bill`, `CounterClient` ->
// `counterClient`) and that mismatch has blanked tables on this screen before.
//
// A FILTER IS ONLY DECLARED IF ITS ENDPOINT READS IT
// Collections answers on dateFrom/dateTo and nothing else, so it declares no filters: the
// screen's own "Filter rows" box narrows what is already loaded. Declaring a control the API
// ignores is how this screen shipped a dropdown that did nothing.

import {
  BILL_STATUS_OPTIONS, SERVICE_TYPE_OPTIONS, type ReportShape,
} from '../components/reports/reportShell';

export const REPORT_REGISTRY: ReportShape[] = [
  // ── MONEY ───────────────────────────────────────────────────────────────────
  {
    key: 'collections',
    label: 'Collections',
    group: 'financial',
    description:
      'Every payment actually taken in the period — who handed it over, against which bill, by which method and by which member of staff. The financial summary counts bills; this counts money.',
    // GET /billing/collections -> BillingService.getCollections. One row per payment, and the
    // customer is whoever paid: a counter ticket has no patient row behind it.
    source: { api: 'getBillingCollections' },
    cards: [
      { label: 'Collected', field: 'totalAmount', value: 'money', hint: 'Whole period, not the page on screen' },
      { label: 'Payments', field: 'paymentCount', value: 'number' },
    ],
    tables: [
      {
        title: 'Payments received',
        source: 'payments',
        rowKey: 'id',
        defaultSort: 'transactionDate',
        sumColumns: ['amount'],
        note: 'Voided payments and zero-value entries are excluded by the endpoint.',
        columns: [
          { header: 'Date', field: 'transactionDate', value: 'datetime' },
          { header: 'Paid by', field: 'bill.customer.name', value: 'text', width: 200 },
          { header: 'Folder', field: 'bill.customer.reference', raw: true },
          { header: 'Customer', field: 'bill.customer.kind' },
          { header: 'Bill No', field: 'bill.billNumber', raw: true },
          { header: 'Method', field: 'paymentMethod' },
          { header: 'Reference', field: 'reference', raw: true },
          { header: 'Taken by', field: 'collector.fullName', value: 'text' },
          { header: 'Amount', field: 'amount', value: 'money' },
        ],
      },
    ],
    emptyNote: 'No payments were recorded between these dates.',
  },

  {
    key: 'revenue-lines',
    label: 'Revenue Lines',
    group: 'financial',
    description:
      'One row per charged line in the period, priced as it was billed and split between what the funder covers and what the customer owes. This is the line-level detail behind the financial summary — the report an accounts officer needs when a bill is queried.',
    // GET /billing/line-items -> BillingService.getRevenueLines. The service returns every
    // line inside the range up to a stated guard rail and says whether it hit it.
    source: { api: 'getBillingRevenueLines' },
    filters: [
      'paymentMode',
      // The endpoint names this parameter billStatus; the shared bill-status control writes
      // `status`, so this report writes its own key rather than silently being ignored.
      { kind: 'select', key: 'billStatus', label: 'Bill status', options: BILL_STATUS_OPTIONS, defaultValue: '' },
      { kind: 'select', key: 'serviceType', label: 'Service', options: SERVICE_TYPE_OPTIONS, defaultValue: '' },
      { kind: 'text', key: 'search', label: 'Item, bill or name', placeholder: 'Paracetamol / BILL-0041 / Mensah' },
    ],
    cards: [
      { label: 'Lines charged', field: 'totalLines', value: 'number', hint: 'Matched by the filters, not the page on screen' },
      { label: 'Charged', field: 'totalAmount', value: 'money' },
      { label: 'Customer owes', field: 'patientPayableAmount', value: 'money' },
      { label: 'Funder covers', field: 'insuranceCoveredAmount', value: 'money' },
    ],
    tables: [
      {
        title: 'Bill lines',
        source: 'lines',
        rowKey: 'id',
        defaultSort: 'chargedAt',
        sumColumns: ['lineTotal', 'patientPayable'],
        columns: [
          { header: 'Charged', field: 'chargedAt', value: 'datetime' },
          { header: 'Bill No', field: 'bill.billNumber', raw: true },
          { header: 'Status', field: 'bill.status', raw: true },
          { header: 'Billed to', field: 'bill.customer.name', value: 'text', width: 180 },
          { header: 'Customer', field: 'bill.customer.kind' },
          { header: 'Payer', field: 'bill.paymentMode' },
          { header: 'Service', field: 'serviceType' },
          { header: 'Item', field: 'description', value: 'text', width: 240 },
          { header: 'Qty', field: 'quantity', value: 'number' },
          { header: 'Unit price', field: 'unitPrice', value: 'money' },
          { header: 'Line total', field: 'lineTotal', value: 'money' },
          { header: 'Payable', field: 'patientPayable', value: 'money' },
        ],
      },
    ],
    emptyNote: 'No bill lines in this period, or the filters exclude them all.',
  },

  {
    key: 'claims',
    label: 'Claims Detail',
    group: 'financial',
    description:
      'Insurance claims in the period: what was claimed with each funder, which state each claim is in, and the individual claims behind those totals. The Insurance Claims summary always existed; the rows under it did not.',
    // GET /reports/insurance-claims -> ReportService.getInsuranceClaimsReport
    source: { api: 'getInsuranceClaimsReport' },
    periodField: 'period',
    filters: ['claimStatus'],
    cards: [
      { label: 'Claims', field: 'summary.totalClaims', value: 'number' },
      { label: 'Claimed', field: 'summary.totalClaimAmount', value: 'money' },
      { label: 'Finalized', field: 'summary.totalApprovedAmount', value: 'money', hint: 'Only claims in the finalized state count as approved' },
      { label: 'Outstanding', field: 'summary.outstandingAmount', value: 'money' },
    ],
    tables: [
      {
        title: 'By funder',
        source: 'byProvider',
        rowKey: 'provider',
        defaultSort: 'claimAmount',
        totalsSource: 'summary',
        totals: [
          { label: 'Claims', field: 'totalClaims', value: 'number' },
          { label: 'Claimed', field: 'totalClaimAmount', value: 'money' },
        ],
        columns: [
          { header: 'Funder', field: 'provider', value: 'text', width: 200 },
          { header: 'Type', field: 'type' },
          { header: 'Claims', field: 'claimCount', value: 'number' },
          { header: 'Claimed', field: 'claimAmount', value: 'money' },
        ],
      },
      {
        title: 'By claim state',
        source: 'byStatus',
        rowKey: 'status',
        defaultSort: 'claimAmount',
        columns: [
          { header: 'State', field: 'status' },
          { header: 'Claims', field: 'claimCount', value: 'number' },
          { header: 'Claimed', field: 'claimAmount', value: 'money' },
        ],
      },
      {
        title: 'Claims',
        source: 'claimsReport',
        rowKey: 'id',
        defaultSort: 'createdAt',
        // The service caps this list itself, so the footer has to say so instead of implying
        // the table is the whole period.
        cappedAt: 500,
        columns: [
          { header: 'Raised', field: 'createdAt', value: 'datetime' },
          { header: 'Surname', field: 'patient.surname', value: 'text' },
          { header: 'Other names', field: 'patient.otherNames', value: 'text' },
          { header: 'Folder', field: 'patient.folderNumber', raw: true },
          { header: 'Visit', field: 'attendance.attendanceNumber', raw: true },
          { header: 'Funder', field: 'insuranceProvider.name', value: 'text' },
          { header: 'Corporate account', field: 'corporateAccount.companyName', value: 'text' },
          { header: 'State', field: 'status', raw: true },
          { header: 'Finalized', field: 'finalizedAt', value: 'date' },
          { header: 'Claimed', field: 'totalClaimAmount', value: 'money' },
        ],
      },
    ],
    emptyNote: 'No claims were raised in this period.',
  },
];

/** Everything the shell can render, keyed by report key. */
export const SHELL_REPORT_BY_KEY: Record<string, ReportShape> = Object.fromEntries(
  REPORT_REGISTRY.map(shape => [shape.key, shape]),
);

/** The registry entries belonging to one Reports tab, in declaration order. */
export function shellReportsForGroup(group: ReportShape['group']): ReportShape[] {
  return REPORT_REGISTRY.filter(shape => shape.group === group);
}
