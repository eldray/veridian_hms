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
// ignores is how this screen shipped a dropdown that did nothing. The same rule kept the
// clinical-service reports (lab, scans, procedures, medications, vitals) filter-free: their
// controller reads startDate and endDate and discards everything else.

import {
  ATTENDANCE_TYPE_OPTIONS, BILL_STATUS_OPTIONS, EXPIRY_WINDOW_OPTIONS,
  NHIS_EXPIRY_STATUS_OPTIONS, SERVICE_TYPE_OPTIONS, type ReportShape, type ReportTable,
} from '../components/reports/reportShell';

// Mirrors of the requireRole lists on the routes. A pill whose endpoint answers 403 for the
// role reading the screen is worse than no pill, so the page hides these (super_admin inherits
// every gate, which authStore.hasRole already handles).
const ACCOUNTS_ONLY = ['admin', 'accounts'];
const CLINICAL_STATS_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer'];
const ATTENDANCE_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'records'];
const DEMOGRAPHIC_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'records', 'accounts'];
const SERVICE_ORDER_ROLES = ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'sonographer'];

/**
 * A table over an object of counts the service already returns (`{"cash": 12, "nhis": 40}`).
 * The count column is declared as a number because the field name alone (`value`) would read
 * as money. The footer adds the column up, which is only meaningful when the groups partition
 * the records — a table whose rows can overlap passes `sumColumns: []` instead.
 */
function countTable(
  title: string,
  source: string,
  groupHeader: string,
  countHeader: string,
  note?: string,
): ReportTable {
  return {
    title,
    source,
    rowKey: 'key',
    columns: [
      { header: groupHeader, field: 'label', value: 'text', width: 200 },
      { header: countHeader, field: 'value', value: 'number' },
    ],
    sumColumns: ['value'],
    ...(note ? { note } : {}),
  };
}

export const REPORT_REGISTRY: ReportShape[] = [
  // ── MONEY ───────────────────────────────────────────────────────────────────
  {
    key: 'financial',
    label: 'Financial Summary',
    group: 'financial',
    description:
      'Billed against collected against still owed, by payer, by bill status and day by day. This is the ledger view: what was issued and what has not arrived yet.',
    // GET /reports/financial -> ReportService.getFinancialReport (pending/partial/paid bills only)
    source: { api: 'getFinancialReport' },
    roles: ACCOUNTS_ONLY,
    periodField: 'period',
    filters: ['paymentMode'],
    cards: [
      { label: 'Billed', field: 'summary.totalRevenue', value: 'money', hint: 'The endpoint names the billed figure "totalRevenue"' },
      { label: 'Collected', field: 'summary.totalPaid', value: 'money' },
      { label: 'Outstanding', field: 'summary.outstandingBalance', value: 'money' },
      { label: 'Collection rate', field: 'summary.collectionRate', value: 'percent' },
    ],
    tables: [
      {
        title: 'Billed by payer',
        source: 'revenueByPaymentMode',
        rowKey: 'paymentMode',
        defaultSort: 'totalBilled',
        sumColumns: ['totalBilled', 'totalRevenue', 'outstanding'],
        columns: [
          { header: 'Payer', field: 'paymentMode', value: 'text', width: 180 },
          { header: 'Bills', field: 'billCount', value: 'number' },
          { header: 'Billed', field: 'totalBilled', value: 'money' },
          { header: 'Collected', field: 'totalRevenue', value: 'money' },
          { header: 'Outstanding', field: 'outstanding', value: 'money' },
          { header: 'Avg bill', field: 'averageBill', value: 'money' },
        ],
      },
      {
        title: 'Billed by bill status',
        source: 'byStatus',
        rowKey: 'status',
        defaultSort: 'totalBilled',
        sumColumns: ['totalBilled', 'totalPaid', 'outstanding'],
        totalsSource: 'summary',
        totals: [
          { label: 'Bills', field: 'totalBills', value: 'number' },
          { label: 'Funder covers', field: 'insuranceCovered', value: 'money' },
          { label: 'Waived', field: 'waivers', value: 'money' },
        ],
        note: 'Draft and cancelled bills are never counted, so these lines add up to the billed card above.',
        columns: [
          { header: 'Bill status', field: 'status', raw: true, width: 160 },
          { header: 'Bills', field: 'billCount', value: 'number' },
          { header: 'Billed', field: 'totalBilled', value: 'money' },
          { header: 'Paid', field: 'totalPaid', value: 'money' },
          { header: 'Outstanding', field: 'outstanding', value: 'money' },
        ],
      },
      {
        title: 'Day by day',
        source: 'dailyTrend',
        rowKey: 'date',
        defaultSort: 'date',
        sumColumns: ['billed', 'paid'],
        columns: [
          { header: 'Bill date', field: 'date', value: 'date', width: 140 },
          { header: 'Bills', field: 'bills', value: 'number' },
          { header: 'Billed', field: 'billed', value: 'money' },
          { header: 'Paid', field: 'paid', value: 'money' },
        ],
      },
    ],
    emptyNote: 'No issued bills in this period.',
  },

  {
    key: 'revenue',
    label: 'Revenue Analysis',
    group: 'financial',
    description:
      'Money actually taken: paid and part-paid bills counted by what was paid, not by what was billed. The collections report below lists the individual payments behind it.',
    // GET /reports/revenue -> ReportService.getRevenueReport
    source: { api: 'getRevenueReport' },
    roles: ACCOUNTS_ONLY,
    periodField: 'period',
    filters: ['paymentMode'],
    cards: [
      { label: 'Collected', field: 'summary.totalRevenue', value: 'money', hint: 'Paid and part-paid bills' },
      { label: 'Bills', field: 'summary.totalBills', value: 'number' },
      { label: 'Avg per bill', field: 'summary.averageBillAmount', value: 'money' },
      { label: 'Corporate share', field: 'summary.corporateShare', value: 'percent' },
    ],
    tables: [
      {
        title: 'Collected by payer',
        source: 'revenueByPaymentMode',
        rowKey: 'paymentMode',
        defaultSort: 'totalRevenue',
        sumColumns: ['totalRevenue'],
        totalsSource: 'summary',
        totals: [
          { label: 'Corporate collected', field: 'corporateRevenue', value: 'money' },
          { label: 'Collected', field: 'totalRevenue', value: 'money' },
        ],
        columns: [
          { header: 'Payer', field: 'paymentMode', value: 'text', width: 180 },
          { header: 'Bills', field: 'billCount', value: 'number' },
          { header: 'Collected', field: 'totalRevenue', value: 'money' },
          { header: 'Avg bill', field: 'averageBill', value: 'money' },
          { header: 'Share', field: 'sharePercent', value: 'percent' },
        ],
      },
    ],
    emptyNote: 'Nothing was paid between these dates.',
  },

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
      'Insurance claims in the period: what was claimed with each funder, which state each claim is in, and the individual claims behind those totals. This replaces the old Insurance Claims card that showed three totals and no rows.',
    // GET /reports/insurance-claims -> ReportService.getInsuranceClaimsReport
    source: { api: 'getInsuranceClaimsReport' },
    roles: ACCOUNTS_ONLY,
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

  // ── CARE ────────────────────────────────────────────────────────────────────
  {
    key: 'clinical',
    label: 'Clinical Statistics',
    group: 'clinical',
    description:
      'Every diagnosis recorded on a visit in the period, grouped by condition with its ICD-10 code and morbidity group. The statutory Form A return counts the same diagnoses into GHS bands; this is the plain list behind it.',
    // GET /reports/clinical -> ReportService.getClinicalReport (dates only)
    source: { api: 'getClinicalReport' },
    roles: CLINICAL_STATS_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Diagnosis entries', field: 'summary.totalDiagnoses', value: 'number', hint: 'One entry per visit carrying the diagnosis' },
      { label: 'Distinct conditions', field: 'summary.distinctDiagnoses', value: 'number' },
    ],
    tables: [
      {
        title: 'By diagnosis',
        source: 'clinicalReport',
        rowKey: 'diagnosis',
        defaultSort: 'totalCases',
        sumColumns: ['totalCases'],
        columns: [
          { header: 'Diagnosis', field: 'diagnosis', value: 'text', width: 240 },
          { header: 'ICD-10', field: 'icdCode', raw: true },
          { header: 'Morbidity group', field: 'morbidityGroup', value: 'text' },
          { header: 'Cases', field: 'totalCases', value: 'number' },
          { header: 'Avg age', field: 'averageAge', value: 'number' },
          { header: 'Male', field: 'genderDistribution.male', value: 'number' },
          { header: 'Female', field: 'genderDistribution.female', value: 'number' },
          { header: 'Other', field: 'genderDistribution.other', value: 'number' },
        ],
      },
    ],
    emptyNote: 'No diagnosis was recorded on a visit in this period.',
  },

  {
    key: 'attendance',
    label: 'Attendance',
    group: 'clinical',
    description:
      'Visits in the period split by why the patient came and who paid. Counter walk-ins appear here as their own visit type, so the bench volume is visible without joining anything.',
    // GET /reports/attendance -> ReportService.getAttendanceReport
    source: { api: 'getAttendanceReport' },
    roles: ATTENDANCE_ROLES,
    periodField: 'period',
    filters: [
      { kind: 'select', key: 'attendanceType', label: 'Visit type', options: ATTENDANCE_TYPE_OPTIONS, defaultValue: '' },
      'paymentMode',
    ],
    cards: [
      { label: 'Visits', field: 'summary.totalAttendances', value: 'number' },
      { label: 'Patients', field: 'summary.uniquePatients', value: 'number', hint: 'Distinct patients, not distinct people seen' },
      { label: 'Visits per patient', field: 'summary.averageVisitsPerPatient', value: 'number' },
      { label: 'Corporate share', field: 'summary.corporateShare', value: 'percent' },
    ],
    tables: [
      countTable('By visit type', 'attendancePatterns.byType', 'Visit type', 'Visits'),
      countTable('By payer', 'attendancePatterns.byPaymentMode', 'Payer', 'Visits'),
    ],
    emptyNote: 'No visits were recorded in this period.',
  },

  {
    key: 'demographic',
    label: 'Demographic',
    group: 'clinical',
    description:
      'Who attended in the period: one line per patient rather than per visit, aged at the end of the range, with the payer recorded on their register entry.',
    // GET /reports/demographic -> ReportService.getDemographicReport (dates only)
    source: { api: 'getDemographicReport' },
    roles: DEMOGRAPHIC_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Patients attended', field: 'patientDemographics.totalPatients', value: 'number', hint: 'Distinct patients, not visits' },
      { label: 'Male', field: 'patientDemographics.genderDistribution.male', value: 'number' },
      { label: 'Female', field: 'patientDemographics.genderDistribution.female', value: 'number' },
      { label: 'New registrations', field: 'attendancePatterns.newPatients', value: 'number', hint: 'Folders opened in the period' },
    ],
    tables: [
      // The service walks every patient in the period, so the age bands arrive complete — unlike
      // the old view, which drew four cards and one table and never showed the payer split at all.
      countTable('By age band', 'patientDemographics.ageDistribution', 'Age band', 'Patients'),
      countTable('Payer on the register', 'patientDemographics.paymentModeDistribution', 'Payer', 'Patients'),
      {
        ...countTable('Visits by payer', 'attendancePatterns.byPaymentMode', 'Payer', 'Visits'),
        totalsSource: 'attendancePatterns',
        totals: [
          { label: 'Attendances', field: 'totalAttendances', value: 'number' },
          { label: 'Visits per patient', field: 'visitsPerPatient', value: 'number' },
        ],
      },
    ],
    emptyNote: 'No registered patient attended in this period.',
  },

  {
    key: 'lab',
    label: 'Laboratory',
    group: 'clinical',
    description:
      'Lab orders in the period: how many are at each stage, how urgent they were and how long results took, with the ten most requested tests on top.',
    // GET /clinical-reports/lab -> ClinicalReportsService.generateLabReport (dates only)
    source: { api: 'getLabReport' },
    roles: SERVICE_ORDER_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Tests ordered', field: 'summary.totalTests', value: 'number' },
      { label: 'Completed', field: 'summary.byStatus.completed', value: 'number' },
      { label: 'Awaiting result', field: 'summary.byStatus.requested', value: 'number' },
      { label: 'Avg turnaround (min)', field: 'summary.averageTurnaroundTime', value: 'number', hint: 'Completed tests only' },
    ],
    tables: [
      countTable('By state', 'summary.byStatus', 'State', 'Tests'),
      countTable('By priority', 'summary.byPriority', 'Priority', 'Tests'),
      {
        title: 'Most requested tests',
        source: 'topTests',
        rowKey: 'testName',
        defaultSort: 'count',
        cappedAt: 10,
        columns: [
          { header: 'Test', field: 'testName', value: 'text', width: 260 },
          { header: 'Requests', field: 'count', value: 'number' },
          { header: 'Positivity', field: 'positiveRate', value: 'percent' },
        ],
        note: 'The ten largest counts only. The state and priority tables above cover every test in the period.',
      },
    ],
    emptyNote: 'No lab test was ordered in this period.',
  },

  {
    key: 'scans',
    label: 'Radiology',
    group: 'clinical',
    description:
      'Scan requests in the period by state, machine type and body part. The service counts every scan it returns, so these tables are the whole period rather than the top of it.',
    // GET /clinical-reports/scan -> ClinicalReportsService.generateScanReport (dates only)
    source: { api: 'getScanReport' },
    roles: SERVICE_ORDER_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Scans requested', field: 'summary.totalScans', value: 'number' },
      { label: 'Completed', field: 'summary.byStatus.completed', value: 'number' },
      { label: 'Awaiting report', field: 'summary.byStatus.requested', value: 'number' },
      { label: 'Avg turnaround (min)', field: 'summary.averageTurnaroundTime', value: 'number', hint: 'Completed scans only' },
    ],
    tables: [
      countTable('By state', 'summary.byStatus', 'State', 'Scans'),
      countTable('By modality', 'summary.byType', 'Modality', 'Scans'),
      countTable('By body part', 'summary.byBodyPart', 'Body part', 'Scans'),
    ],
    emptyNote: 'No scan was requested in this period.',
  },

  {
    key: 'procedures',
    label: 'Procedures',
    group: 'clinical',
    description:
      'Procedure orders in the period: what is booked, what is done and what was called off, with every procedure type counted.',
    // GET /clinical-reports/procedure -> ClinicalReportsService.generateProcedureReport (dates only)
    source: { api: 'getProcedureReport' },
    roles: SERVICE_ORDER_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Procedures ordered', field: 'summary.totalProcedures', value: 'number' },
      { label: 'Scheduled', field: 'summary.byStatus.scheduled', value: 'number' },
      { label: 'Completed', field: 'summary.byStatus.completed', value: 'number' },
      { label: 'Cancelled', field: 'summary.byStatus.cancelled', value: 'number' },
    ],
    tables: [
      countTable('By state', 'summary.byStatus', 'State', 'Procedures'),
      countTable('By procedure', 'summary.byType', 'Procedure', 'Count'),
    ],
    emptyNote: 'No procedure was ordered in this period.',
  },

  {
    key: 'medications',
    label: 'Medications',
    group: 'clinical',
    description:
      'Prescriptions in the period by stage — prescribed, dispensed, administered or cancelled — and by medicine, with the quantity actually handed over.',
    // GET /clinical-reports/medication -> ClinicalReportsService.generateMedicationReport (dates only)
    source: { api: 'getMedicationReport' },
    roles: SERVICE_ORDER_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Prescriptions', field: 'summary.totalMedications', value: 'number' },
      { label: 'Dispensed', field: 'summary.byStatus.dispensed', value: 'number' },
      { label: 'Administered', field: 'summary.byStatus.administered', value: 'number' },
      { label: 'Quantity', field: 'summary.totalQuantity', value: 'number', hint: 'Units across every prescription line' },
    ],
    tables: [
      countTable('By stage', 'summary.byStatus', 'Stage', 'Prescriptions'),
      countTable('By medicine', 'summary.byDrug', 'Medicine', 'Prescriptions'),
    ],
    emptyNote: 'Nothing was prescribed in this period.',
  },

  {
    key: 'vitals',
    label: 'Vitals',
    group: 'clinical',
    description:
      'Observations recorded in the period, the average readings, the counts outside the safe bands and the month-by-month trend.',
    // GET /clinical-reports/vitals -> ClinicalReportsService.generateVitalsReport (dates only)
    source: { api: 'getVitalsReport' },
    roles: SERVICE_ORDER_ROLES,
    periodField: 'period',
    cards: [
      { label: 'Readings', field: 'summary.totalVitals', value: 'number' },
      { label: 'Patients', field: 'summary.uniquePatients', value: 'number' },
      { label: 'Avg temperature', field: 'summary.averages.temperature', value: 'number', hint: '°C across readings that recorded one' },
      { label: 'Hypertension', field: 'summary.abnormalFindings.hypertension', value: 'number', hint: 'Above 140 systolic or 90 diastolic' },
    ],
    tables: [
      // One reading can be febrile AND tachycardic, so these counts are not a partition of the
      // records and adding them up would print a total that never existed.
      { ...countTable('Abnormal findings', 'summary.abnormalFindings', 'Finding', 'Readings'), sumColumns: [] },
      {
        title: 'Monthly averages',
        source: 'monthlyTrends',
        rowKey: 'month',
        columns: [
          { header: 'Month', field: 'month', raw: true, width: 140 },
          { header: 'Avg temp (°C)', field: 'avgTemp', value: 'number' },
          { header: 'Avg pulse', field: 'avgPulse', value: 'number' },
        ],
      },
    ],
    emptyNote: 'No observation was recorded in this period.',
  },

  // ── NHIS ────────────────────────────────────────────────────────────────────
  {
    key: 'nhis-expiry',
    label: 'NHIS Expiry',
    group: 'nhis',
    description:
      'NHIS memberships reaching their expiry date, oldest first, with the window to look ahead for. A membership that lapsed between two visits turns a claim into a cash bill, so this is the list to work from before the patient reaches the desk.',
    // GET /reports/nhis-expiry -> ReportService.getNhisExpiryReport
    source: { api: 'getNhisExpiryReport' },
    roles: ACCOUNTS_ONLY,
    periodField: 'period',
    filters: [
      { kind: 'select', key: 'daysThreshold', label: 'Window', options: EXPIRY_WINDOW_OPTIONS, defaultValue: '30' },
    ],
    cards: [
      { label: 'Memberships in scope', field: 'summary.totalNHISPatients', value: 'number' },
      { label: 'Already expired', field: 'summary.expired', value: 'number' },
      { label: 'Critical (7 days)', field: 'summary.critical', value: 'number' },
      { label: 'Warning (30 days)', field: 'summary.warning', value: 'number' },
    ],
    tables: [
      // The first row of this tally is the total, so the rest of it is a partition of that one
      // line — adding the column up would double it.
      {
        ...countTable('Membership status', 'summary', 'Status', 'Members'),
        sumColumns: [],
        note: 'Healthy and no-expiry-date memberships sit in this tally even though the list below is ordered by expiry.',
      },
      {
        title: 'Expiring by month',
        source: 'expiryByMonth',
        rowKey: 'key',
        defaultSort: 'key',
        columns: [
          { header: 'Expiry month', field: 'key', raw: true, width: 140 },
          { header: 'Members', field: 'value', value: 'number' },
        ],
        sumColumns: ['value'],
      },
      {
        title: 'Memberships',
        source: 'patients',
        rowKey: 'id',
        defaultSort: 'nhisExpiryDate',
        columns: [
          { header: 'Folder', field: 'folderNumber', raw: true, width: 140 },
          { header: 'Patient', field: 'fullName', value: 'text', width: 200 },
          { header: 'NHIS number', field: 'nhisNumber', raw: true },
          { header: 'Phone', field: 'phoneNumber', raw: true },
          { header: 'Expiry', field: 'nhisExpiryDate', value: 'date' },
          { header: 'Days left', field: 'daysUntilExpiry', value: 'number' },
          { header: 'Status', field: 'expiryStatus', raw: true },
        ],
        // Carried over from the old hand-written view, which read a field the service never
        // returned: there is no last visit on this response, so it printed "—" for everyone.
        note: 'Names and phone numbers identify patients. The export route is limited to admin, accounts and records.',
      },
    ],
    emptyNote: 'No active NHIS membership expires inside this window.',
  },

  {
    key: 'nhis-claims',
    label: 'NHIS Claims',
    group: 'nhis',
    description:
      'NHIS claims raised in the period, each one shown against the state of the membership that paid for it — the claims that go in on an expired card are the ones that come back unpaid. Every claim in the range is listed, not the first fifty.',
    // GET /reports/nhis-claims-summary -> ReportService.getNhisClaimsWithExpiry
    source: { api: 'getNhisClaimsSummary' },
    roles: ACCOUNTS_ONLY,
    periodField: 'period',
    filters: [
      { kind: 'select', key: 'expiryStatus', label: 'Membership state', options: NHIS_EXPIRY_STATUS_OPTIONS, defaultValue: '' },
    ],
    cards: [
      { label: 'Claims', field: 'summary.totalClaims', value: 'number' },
      { label: 'Claimed', field: 'summary.totalClaimAmount', value: 'money' },
      { label: 'On active cards', field: 'summary.byExpiryStatus.ACTIVE', value: 'number' },
      { label: 'On expired cards', field: 'summary.byExpiryStatus.EXPIRED', value: 'number', hint: 'These will not be paid' },
    ],
    tables: [
      countTable('By membership state', 'summary.byExpiryStatus', 'Membership state', 'Claims'),
      {
        title: 'Claims',
        source: 'claims',
        rowKey: 'id',
        defaultSort: 'createdAt',
        sumColumns: ['totalClaimAmount'],
        columns: [
          { header: 'Raised', field: 'createdAt', value: 'datetime' },
          { header: 'Claim number', field: 'claimNumber', raw: true, width: 150 },
          { header: 'Patient', field: 'patientName', value: 'text', width: 180 },
          { header: 'Folder', field: 'patient.folderNumber', raw: true },
          { header: 'NHIS number', field: 'nhisNumber', raw: true },
          { header: 'Card expires', field: 'nhisExpiryDate', value: 'date' },
          { header: 'Days left', field: 'daysUntilExpiry', value: 'number' },
          { header: 'Membership state', field: 'nhisExpiryStatus', raw: true },
          { header: 'Funder', field: 'insuranceProvider.name', value: 'text' },
          { header: 'Claim state', field: 'status', raw: true },
          { header: 'Claimed', field: 'totalClaimAmount', value: 'money' },
        ],
      },
    ],
    emptyNote: 'No NHIS claim was raised in this period.',
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
