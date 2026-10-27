// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL ROLE -> PAGE ACCESS MATRIX
//
// One table drives three things that used to disagree: the sidebar contents,
// the route guard in App.tsx, and (by convention) the `requireRole` arrays in
// the backend. Nothing else may hardcode which role opens which page.
//
// `admin` and `super_admin` may open every page and are never listed; they are
// implied. Every other role has to appear in `roles` explicitly.
//
// `roles`  = may open the page at all (the route guard).
// `navRoles` = also gets the sidebar link. Defaults to all of `roles`, so an
//              entry is "reachable from another screen but not in the menu"
//              only when navRoles is narrower — that difference is always
//              deliberate and reviewable here, never an accident of drift.
// ─────────────────────────────────────────────────────────────────────────────
import type { LucideIcon } from 'lucide-react';
import {
  Activity, ArrowLeftRight, Baby, BarChart3, BedDouble, Bell, Briefcase,
  Building, Calendar, Clipboard, ClipboardList, DollarSign, FileText,
  Heart, HeartPulse, LayoutDashboard, Microscope, Package, Pill, Scan,
  ScrollText, Scissors, Send, Settings as SettingsIcon, Shield, Store, Stethoscope,
  Syringe, TrendingUp, Users, Warehouse,
} from 'lucide-react';

export type Role =
  | 'super_admin' | 'admin' | 'hr_officer' | 'doctor' | 'nurse' | 'midwife'
  | 'lab_tech' | 'pharmacist' | 'accounts' | 'records' | 'sonographer';

/** Matches `UserRole` in backend/prisma/schema.prisma. Keep the two in step. */
export const ALL_ROLES: Role[] = [
  'super_admin', 'admin', 'hr_officer', 'doctor', 'nurse', 'midwife',
  'lab_tech', 'pharmacist', 'accounts', 'records', 'sonographer',
];

export type PageKey =
  | 'dashboard' | 'notifications' | 'profile' | 'patients' | 'attendance'
  | 'appointments' | 'reports'
  | 'medical_waiting_list' | 'medical_entries' | 'vitals' | 'admissions'
  | 'wards' | 'theatre' | 'nursing' | 'maternal_waiting_list' | 'antenatal'
  | 'family_planning' | 'service_catalog' | 'referrals'
  | 'laboratory' | 'scans'
  | 'pharmacy' | 'dispense_medication' | 'inventory' | 'stock_management'
  | 'stock_transactions' | 'stock_reports' | 'stock_transfers'
  | 'requisitions' | 'invoices'
  | 'billing' | 'insurance_claims' | 'insurance_providers' | 'corporate'
  | 'estimates' | 'counter'
  | 'user_management' | 'shifts' | 'leaves'
  | 'departments' | 'audit_logs' | 'settings';

interface PageDef {
  key: PageKey;
  /** Exact dashboard paths owned by this page. */
  paths: string[];
  /** `:param` paths, matched with matchPath so they cannot drift. */
  patterns?: string[];
  roles: Role[];
  navRoles?: Role[];
  /** Sidebar label. Omit for guard-only pages, which have no menu entry. */
  label?: string;
  icon?: LucideIcon;
  group?: string;
}

const CLINICAL: Role[] = ['doctor', 'nurse', 'midwife'];
const EVERYONE: Role[] = ['hr_officer', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts', 'records', 'sonographer'];

export const PAGES: PageDef[] = [
  // ── Core ───────────────────────────────────────────────────────────────────
  { key: 'dashboard', paths: ['/dashboard'], roles: EVERYONE, label: 'Dashboard', icon: LayoutDashboard, group: 'Core' },
  { key: 'notifications', paths: ['/dashboard/notifications'], roles: EVERYONE, label: 'Notifications', icon: Bell, group: 'Core' },
  { key: 'profile', paths: ['/dashboard/profile'], roles: EVERYONE },
  // Patients: read/write is limited to the roles whose API guard allows it
  // (requirePatientManagement). Pharmacy, lab, scans and billing find patients
  // through their own worklists instead.
  { key: 'patients', paths: ['/dashboard/patients', '/dashboard/patients/register'], patterns: ['/dashboard/patients/:id'], roles: ['doctor', 'nurse', 'midwife', 'records'], label: 'Patients', icon: Users, group: 'Core' },
  { key: 'attendance', paths: ['/dashboard/attendance'], patterns: ['/dashboard/attendance/:id'], roles: ['doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'sonographer', 'accounts'], label: 'Attendance', icon: Calendar, group: 'Core' },
  { key: 'appointments', paths: ['/dashboard/appointments'], roles: ['doctor', 'nurse', 'midwife', 'records', 'lab_tech', 'sonographer'], label: 'Appointments', icon: Calendar, group: 'Core' },

  // ── Clinical ───────────────────────────────────────────────────────────────
  { key: 'medical_waiting_list', paths: ['/dashboard/medical-waiting-list'], roles: CLINICAL, label: 'Consultations', icon: Clipboard, group: 'Clinical' },
  { key: 'medical_entries', paths: ['/dashboard/medical-entries'], patterns: ['/dashboard/medical-entries/:attendanceId'], roles: CLINICAL },
  { key: 'vitals', paths: ['/dashboard/vitals'], patterns: ['/dashboard/vitals/:id'], roles: CLINICAL, label: 'Vitals', icon: HeartPulse, group: 'Clinical' },
  { key: 'theatre', paths: ['/dashboard/theatre'], patterns: ['/dashboard/theatre/:id'], roles: CLINICAL, label: 'Theatre', icon: Scissors, group: 'Clinical' },
  { key: 'nursing', paths: ['/dashboard/nursing'], patterns: ['/dashboard/nursing/patient/:attendanceId'], roles: ['nurse', 'midwife', 'doctor'], navRoles: ['nurse', 'midwife'], label: 'Nursing', icon: Syringe, group: 'Clinical' },
  { key: 'maternal_waiting_list', paths: ['/dashboard/maternal-waiting-list'], roles: ['doctor', 'midwife'], label: 'Maternal Health', icon: Baby, group: 'Clinical' },
  { key: 'antenatal', paths: ['/dashboard/antenatal'], patterns: ['/dashboard/maternal/:attendanceId'], roles: ['doctor', 'midwife'], label: 'Antenatal', icon: Activity, group: 'Clinical' },
  { key: 'family_planning', paths: ['/dashboard/family-planning'], roles: ['doctor', 'midwife'], label: 'Family Planning', icon: Heart, group: 'Clinical' },
  { key: 'service_catalog', paths: ['/dashboard/medicalservices', '/dashboard/service-catalog'], roles: CLINICAL, label: 'Medical Services', icon: Stethoscope, group: 'Clinical' },
  { key: 'admissions', paths: ['/dashboard/admissions'], patterns: ['/dashboard/admissions/:id'], roles: ['doctor', 'nurse', 'midwife', 'records'], label: 'Admissions', icon: BedDouble, group: 'Ward' },
  { key: 'wards', paths: ['/dashboard/wards'], roles: CLINICAL, label: 'Wards', icon: BedDouble, group: 'Ward' },
  { key: 'referrals', paths: ['/dashboard/referrals'], roles: ['doctor', 'nurse', 'midwife', 'records'], label: 'Referrals', icon: Send, group: 'Ward' },

  // ── Diagnostics ────────────────────────────────────────────────────────────
  { key: 'laboratory', paths: ['/dashboard/laboratory'], patterns: ['/dashboard/laboratory/:id'], roles: ['lab_tech', ...CLINICAL], navRoles: ['lab_tech'], label: 'Laboratory', icon: Microscope, group: 'Diagnostics' },
  { key: 'scans', paths: ['/dashboard/scans'], patterns: ['/dashboard/scans/:id'], roles: ['sonographer', 'doctor', 'midwife'], navRoles: ['sonographer'], label: 'Scans', icon: Scan, group: 'Diagnostics' },

  // ── Pharmacy & stock ───────────────────────────────────────────────────────
  // Dispensing is pharmacist-only in the API (PUT /encounters/:id/medications/
  // :medicationId/dispense and requirePharmacyStaff), so the queue is too — a
  // clinician who opened it could only ever hit a 403 on the save button.
  { key: 'pharmacy', paths: ['/dashboard/pharmacy'], roles: ['pharmacist'], label: 'Dispense Queue', icon: Pill, group: 'Pharmacy' },
  { key: 'dispense_medication', paths: ['/dashboard/dispense'], patterns: ['/dashboard/dispense/:id'], roles: ['pharmacist'] },
  { key: 'inventory', paths: ['/dashboard/inventory'], roles: ['pharmacist'], label: 'Inventory', icon: Package, group: 'Pharmacy' },
  { key: 'stock_management', paths: ['/dashboard/stock'], roles: ['pharmacist'], label: 'Stock', icon: Warehouse, group: 'Pharmacy' },
  { key: 'stock_transactions', paths: ['/dashboard/transactions'], roles: ['pharmacist', 'accounts'], label: 'Stock Transactions', icon: FileText, group: 'Pharmacy' },
  { key: 'stock_reports', paths: ['/dashboard/stock/reports'], roles: ['pharmacist', 'accounts'], label: 'Stock Reports', icon: BarChart3, group: 'Pharmacy' },
  { key: 'stock_transfers', paths: ['/dashboard/stock/transfers'], roles: ['pharmacist', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer', 'records'], label: 'Stock Transfers', icon: ArrowLeftRight, group: 'Pharmacy' },
  { key: 'requisitions', paths: ['/dashboard/requisitions', '/dashboard/requisitions/create'], patterns: ['/dashboard/requisitions/:id'], roles: ['pharmacist', 'nurse', 'midwife', 'doctor', 'lab_tech', 'sonographer', 'records'], navRoles: ['pharmacist', 'nurse', 'midwife'], label: 'Requisitions', icon: ClipboardList, group: 'Pharmacy' },

  // ── Revenue ────────────────────────────────────────────────────────────────
  { key: 'invoices', paths: ['/dashboard/invoices', '/dashboard/invoices/create'], patterns: ['/dashboard/invoices/:id'], roles: ['pharmacist', 'accounts'], label: 'Invoices', icon: FileText, group: 'Revenue' },
  { key: 'billing', paths: ['/dashboard/billing'], patterns: ['/dashboard/patients/:patientId/billing', '/dashboard/billing/:billId/payment'], roles: ['accounts', 'doctor'], navRoles: ['accounts'], label: 'Billing', icon: DollarSign, group: 'Revenue' },
  { key: 'insurance_claims', paths: ['/dashboard/insurance-claims', '/dashboard/insurance-claims/tracking', '/dashboard/insurance-claims/batches'], patterns: ['/dashboard/insurance-claims/:id/edit', '/dashboard/insurance-claims/nhis/:id/edit', '/dashboard/insurance-claims/private/:id/edit', '/dashboard/insurance-claims/corporate/:id/edit'], roles: ['accounts', 'doctor'], navRoles: ['accounts'], label: 'Insurance', icon: Shield, group: 'Revenue' },
  { key: 'insurance_providers', paths: ['/dashboard/insurance-providers'], roles: ['accounts'], label: 'Insurance Providers', icon: Shield, group: 'Revenue' },
  { key: 'corporate', paths: ['/dashboard/corporate-accounts'], patterns: ['/dashboard/corporate-accounts/:id'], roles: ['accounts'], label: 'Corporate', icon: Briefcase, group: 'Revenue' },
  { key: 'estimates', paths: ['/dashboard/estimates', '/dashboard/estimates/new'], patterns: ['/dashboard/estimates/:id', '/dashboard/estimates/:id/edit'], roles: ['accounts'], label: 'Estimates', icon: FileText, group: 'Revenue' },
  // Counter mirrors COUNTER_STAFF in backend/src/modules/counter/CounterRoutes.ts.
  // Doctors and nurses are deliberately absent: a consultation is opened from the visit
  // screen, and the API refuses any ticket that is not a walk-in.
  { key: 'counter', paths: ['/dashboard/counter'], roles: ['pharmacist', 'lab_tech', 'sonographer', 'accounts', 'records'], label: 'Counter', icon: Store, group: 'Revenue' },

  // ── HR & staff ─────────────────────────────────────────────────────────────
  { key: 'user_management', paths: ['/dashboard/users'], patterns: ['/dashboard/users/:id'], roles: ['hr_officer'], label: 'User Management', icon: Users, group: 'HR & Staff' },
  { key: 'shifts', paths: ['/dashboard/shifts'], roles: ['hr_officer'], label: 'Shifts', icon: Calendar, group: 'HR & Staff' },
  { key: 'leaves', paths: ['/dashboard/leaves'], roles: ['hr_officer', ...CLINICAL], navRoles: ['hr_officer'], label: 'Leave Requests', icon: FileText, group: 'HR & Staff' },

  // ── Management: administrators only (empty list = wildcard roles only) ─────
  { key: 'reports', paths: ['/dashboard/reports'], roles: EVERYONE, label: 'Reports', icon: TrendingUp, group: 'Management' },
  { key: 'departments', paths: ['/dashboard/departments'], roles: [], label: 'Departments', icon: Building, group: 'Management' },
  { key: 'audit_logs', paths: ['/dashboard/audit-logs'], roles: [], label: 'Audit Logs', icon: ScrollText, group: 'Management' },
  { key: 'settings', paths: ['/dashboard/settings'], roles: [], label: 'Settings', icon: SettingsIcon, group: 'Management' },
];

export const NAV_GROUP_ORDER = ['Core', 'Clinical', 'Diagnostics', 'Pharmacy', 'Ward', 'Revenue', 'HR & Staff', 'Management'];

const ADMIN_ROLES: Role[] = ['admin', 'super_admin'];
const byKey = new Map<PageKey, PageDef>(PAGES.map(p => [p.key, p]));

export function canAccessPage(role: string | undefined, key: PageKey): boolean {
  if (!role) return false;
  if (ADMIN_ROLES.includes(role as Role)) return true;
  return byKey.get(key)?.roles.includes(role as Role) ?? false;
}

/** Resolve a pathname to the page that owns it, or undefined when nothing does. */
export function resolvePage(pathname: string): PageDef | undefined {
  const exact = PAGES.find(page => page.paths.includes(pathname));
  if (exact) return exact;
  for (const page of PAGES) {
    for (const pattern of page.patterns ?? []) {
      if (matchPattern(pattern, pathname)) return page;
    }
  }
  return undefined;
}

/**
 * `:param` matcher. A `:segment` matches exactly one path segment, so the
 * patterns cannot silently swallow the deeper routes beside them.
 */
function matchPattern(pattern: string, pathname: string): boolean {
  const parts = pattern.split('/');
  const segments = pathname.split('/');
  if (parts.length !== segments.length) return false;
  return parts.every((part, i) => part.startsWith(':') || part === segments[i]);
}

export function hasPermission(role: string | undefined, pathname: string): boolean {
  const page = resolvePage(pathname);
  if (!page) return false;
  return canAccessPage(role, page.key);
}

export interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  group: string;
}

/** Sidebar entries for a role, in matrix order, grouped by NAV_GROUP_ORDER. */
export function navGroupsFor(role: string | undefined): { label: string; items: NavItem[] }[] {
  const visible: NavItem[] = PAGES
    .filter(page => page.label && page.icon && page.group)
    .filter(page => {
      if (ADMIN_ROLES.includes(role as Role)) return true;
      return (page.navRoles ?? page.roles).includes(role as Role);
    })
    .map(page => ({ name: page.label as string, path: page.paths[0], icon: page.icon as LucideIcon, group: page.group as string }));

  return NAV_GROUP_ORDER
    .map(label => ({ label, items: visible.filter(item => item.group === label) }))
    .filter(group => group.items.length > 0);
}
