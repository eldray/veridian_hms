// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACCESS REGISTRY
//
// The floating launcher lists two kinds of destination:
//   • pages, read straight from config/access.ts so the list can never drift from
//     what the role may actually open, and
//   • areas — a specific screen inside a page that is worth jumping to without
//     landing on the page's default tab first.
//
// Areas are always real routes, never invented query strings: a destination that
// needs extra plumbing in the page is a destination that will silently stop working.
// ─────────────────────────────────────────────────────────────────────────────
import type { PageKey } from './access';

export interface QuickArea {
  label: string;
  path: string;
  /** The page that owns this route — its access rules and sidebar group apply. */
  pageKey: PageKey;
  hint?: string;
}

export const QUICK_AREAS: QuickArea[] = [
  { label: 'Register a patient', path: '/dashboard/patients/register', pageKey: 'patients', hint: 'New patient record' },
  { label: 'Start an attendance', path: '/dashboard/attendance', pageKey: 'attendance', hint: 'Front-desk visit' },
  { label: 'Consultation queue', path: '/dashboard/medical-waiting-list', pageKey: 'medical_waiting_list' },
  { label: 'Maternal queue', path: '/dashboard/maternal-waiting-list', pageKey: 'maternal_waiting_list' },
  { label: 'Dispense queue', path: '/dashboard/pharmacy', pageKey: 'pharmacy' },
  { label: 'Laboratory queue', path: '/dashboard/laboratory', pageKey: 'laboratory' },
  { label: 'Scan queue', path: '/dashboard/scans', pageKey: 'scans' },
  { label: 'Theatre list', path: '/dashboard/theatre', pageKey: 'theatre' },
  { label: 'Admitted patients', path: '/dashboard/admissions', pageKey: 'admissions' },
  { label: 'Walk-in counter', path: '/dashboard/counter', pageKey: 'counter' },
  { label: 'Bills & payments', path: '/dashboard/billing', pageKey: 'billing' },
  { label: 'NHIS claims', path: '/dashboard/insurance/nhis/claims', pageKey: 'insurance_claims' },
  { label: 'Private insurance claims', path: '/dashboard/insurance/private/claims', pageKey: 'insurance_claims' },
  { label: 'Corporate claims', path: '/dashboard/insurance/corporate/claims', pageKey: 'insurance_claims' },
  { label: 'Claim batches', path: '/dashboard/insurance/nhis/batches', pageKey: 'insurance_claims' },
  { label: 'Payments tracking', path: '/dashboard/insurance/nhis/tracking', pageKey: 'insurance_claims' },
  { label: 'NHIS provider record', path: '/dashboard/insurance/nhis/providers', pageKey: 'insurance_providers' },
  { label: 'Private insurers', path: '/dashboard/insurance/private/providers', pageKey: 'insurance_providers' },
  { label: 'Corporate accounts', path: '/dashboard/insurance/corporate/accounts', pageKey: 'corporate' },
  { label: 'New estimate', path: '/dashboard/estimates/new', pageKey: 'estimates', hint: 'Proforma invoice' },
  { label: 'Stock levels', path: '/dashboard/stock', pageKey: 'stock_management' },
  { label: 'Raise a requisition', path: '/dashboard/requisitions/create', pageKey: 'requisitions' },
  { label: 'Build a report', path: '/dashboard/reports', pageKey: 'reports' },
];
