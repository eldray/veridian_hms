// src/config/dashboardConfig.tsx
import {
  Users, Calendar, BedDouble, FileText, Activity, Shield, Package,
  DollarSign, Stethoscope, Heart, FlaskConical, ScanLine, Pill,
  ClipboardList, UserPlus, BarChart3, TrendingUp, User as UserIcon,
  GraduationCap,
} from 'lucide-react';
import type { Seniority } from '../types';

// ============================================
// SHARED STATS SHAPE
// ============================================

export interface DashboardStats {
  totalPatients: number;
  todayVisits: number;
  activeAdmissions: number;
  pendingBills: number;
  pendingClaims: number;
  lowStockItems: number;
  totalRevenue: number;
  scheduledAppointments: number;
  completedProcedures: number;
}

export const EMPTY_STATS: DashboardStats = {
  totalPatients: 0, todayVisits: 0, activeAdmissions: 0, pendingBills: 0,
  pendingClaims: 0, lowStockItems: 0, totalRevenue: 0,
  scheduledAppointments: 0, completedProcedures: 0,
};

// ============================================
// STAT CARD CATALOG
// ============================================

export type StatKey =
  | 'totalPatients' | 'todayVisits' | 'activeAdmissions' | 'scheduledAppointments'
  | 'pendingBills' | 'pendingClaims' | 'lowStockItems' | 'totalRevenue'
  | 'completedProcedures';

export interface StatMeta {
  to: string;
  label: string;
  sub: string;
  Icon: React.ComponentType<any>;
  bg: string;
  color: string;
  value: (s: DashboardStats) => React.ReactNode;
}

export const STAT_CATALOG: Record<StatKey, StatMeta> = {
  totalPatients: {
    to: '/dashboard/patients', label: 'Total Patients', sub: 'Registered',
    Icon: Users, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.totalPatients.toLocaleString(),
  },
  todayVisits: {
    to: '/dashboard/attendance', label: "Today's Visits", sub: 'Consultations',
    Icon: Calendar, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.todayVisits,
  },
  activeAdmissions: {
    to: '/dashboard/admissions', label: 'Active Admissions', sub: 'In-patients',
    Icon: BedDouble, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => s.activeAdmissions,
  },
  scheduledAppointments: {
    to: '/dashboard/appointments', label: 'Scheduled Today', sub: 'Appointments',
    Icon: Activity, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.scheduledAppointments,
  },
  pendingBills: {
    to: '/dashboard/billing', label: 'Pending Bills', sub: 'Unpaid',
    Icon: FileText, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
    value: (s) => s.pendingBills,
  },
  pendingClaims: {
    to: '/dashboard/insurance-claims', label: 'Pending Claims', sub: 'Awaiting process',
    Icon: Shield, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.pendingClaims,
  },
  lowStockItems: {
    to: '/dashboard/stock', label: 'Low Stock Items', sub: 'Need reorder',
    Icon: Package, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.lowStockItems,
  },
  totalRevenue: {
    to: '/dashboard/billing', label: "Today's Revenue", sub: 'Collected',
    Icon: DollarSign, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => `₵${Number(s.totalRevenue).toFixed(2)}`,
  },
  completedProcedures: {
    to: '/dashboard/theatre', label: 'Procedures', sub: 'Completed',
    Icon: Activity, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.completedProcedures,
  },
};

// ============================================
// PANEL SPECS
// ============================================

export type WorklistKind = 'medical' | 'vitals' | 'lab' | 'pharmacy' | 'scans' | 'maternal';

export type PanelSpec =
  | { type: 'worklist'; kind: WorklistKind }
  | { type: 'recent' }
  | { type: 'diagnoses' }
  | { type: 'finance' }
  | { type: 'stock' }
  | { type: 'diagnoses-attendance' }
  | { type: 'nurse-summary' }      // nurse: admitted patients + vitals due
  | { type: 'midwife-summary' }    // midwife: ANC + delivery stats
  | { type: 'lab-summary' }        // lab_tech: pending vs completed tests
  | { type: 'scan-summary' }       // sonographer: pending vs completed scans
  | { type: 'records-summary' };   // records: registrations + referrals

export const WORKLIST_META: Record<WorklistKind, {
  title: string; subtitle: string; Icon: React.ComponentType<any>;
  color: string; itemLinkBase: string; viewAllTo: string; emptyText: string;
}> = {
  medical: {
    title: 'Consultation Queue', subtitle: 'Patients awaiting review', Icon: Stethoscope,
    color: 'var(--icon-cyan-text)', itemLinkBase: '/dashboard/medical-entries/',
    viewAllTo: '/dashboard/medical-waiting-list', emptyText: 'No patients waiting',
  },
  vitals: {
    title: 'Vitals Queue', subtitle: 'Patients awaiting vitals', Icon: Activity,
    color: 'var(--icon-orange-text)', itemLinkBase: '/dashboard/vitals/',
    viewAllTo: '/dashboard/vitals', emptyText: 'No patients waiting',
  },
  lab: {
    title: 'Lab Worklist', subtitle: 'Pending lab tests', Icon: FlaskConical,
    color: 'var(--icon-purple-text)', itemLinkBase: '/dashboard/laboratory/',
    viewAllTo: '/dashboard/laboratory', emptyText: 'No pending tests',
  },
  scans: {
    title: 'Radiology Worklist', subtitle: 'Pending scans', Icon: ScanLine,
    color: 'var(--icon-cyan-text)', itemLinkBase: '/dashboard/scans/',
    viewAllTo: '/dashboard/scans', emptyText: 'No pending scans',
  },
  pharmacy: {
    title: 'Dispensing Queue', subtitle: 'Prescriptions to dispense', Icon: Pill,
    color: 'var(--icon-yellow-text)', itemLinkBase: '/dashboard/dispense/',
    viewAllTo: '/dashboard/pharmacy', emptyText: 'No prescriptions pending',
  },
  maternal: {
    title: 'Maternal Worklist', subtitle: 'ANC / Labour / PNC', Icon: Heart,
    color: 'var(--icon-red-text)', itemLinkBase: '/dashboard/maternal/',
    viewAllTo: '/dashboard/maternal-waiting-list', emptyText: 'No maternal cases waiting',
  },
};

// ============================================
// QUICK ACTIONS CATALOG
// ============================================

export interface QuickAction {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
  bg: string;
  color: string;
}

export const QUICK_ACTIONS: Record<string, QuickAction> = {
  newPatient: { icon: UserPlus, label: 'New Patient', path: '/dashboard/patients/register', bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
  attendance: { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance', bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
  admissions: { icon: BedDouble, label: 'Admissions', path: '/dashboard/admissions', bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
  billing: { icon: DollarSign, label: 'Billing', path: '/dashboard/billing', bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
  pharmacy: { icon: Pill, label: 'Pharmacy', path: '/dashboard/pharmacy', bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
  lab: { icon: FlaskConical, label: 'Laboratory', path: '/dashboard/laboratory', bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
  scans: { icon: ScanLine, label: 'Scans', path: '/dashboard/scans', bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
  requisitions: { icon: ClipboardList, label: 'Requisitions', path: '/dashboard/requisitions', bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
  claims: { icon: Shield, label: 'Claims', path: '/dashboard/insurance-claims', bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
  reports: { icon: BarChart3, label: 'Reports', path: '/dashboard/reports', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  appointments: { icon: Activity, label: 'Appointments', path: '/dashboard/appointments', bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
  nursing: { icon: Heart, label: 'Nursing', path: '/dashboard/nursing', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  antenatal: { icon: Heart, label: 'Antenatal', path: '/dashboard/antenatal', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
};

// ============================================
// ROLE DASHBOARD REGISTRY
// ============================================

export interface RoleDashboard {
  cards: StatKey[];
  rightPanel: PanelSpec;
  leftPanel?: PanelSpec;
  quickActions: string[];
}

const FALLBACK: RoleDashboard = {
  cards: ['totalPatients', 'todayVisits', 'activeAdmissions'],
  rightPanel: { type: 'recent' },
  quickActions: ['attendance', 'appointments'],
};

export const ROLE_DASHBOARDS: Record<string, RoleDashboard> = {
  admin: {
    cards: ['totalPatients', 'todayVisits', 'activeAdmissions', 'pendingBills',
      'scheduledAppointments', 'pendingClaims', 'lowStockItems', 'totalRevenue'],
    rightPanel: { type: 'recent' },
    leftPanel: { type: 'diagnoses-attendance' },
    quickActions: ['newPatient', 'attendance', 'admissions', 'billing', 'pharmacy', 'reports'],
  },
  doctor: {
    cards: ['todayVisits', 'activeAdmissions', 'scheduledAppointments', 'totalPatients'],
    rightPanel: { type: 'worklist', kind: 'medical' },
    leftPanel: { type: 'diagnoses' },
    quickActions: ['attendance', 'admissions', 'pharmacy', 'lab', 'scans'],
  },
  nurse: {
    cards: ['todayVisits', 'activeAdmissions', 'totalPatients'],
    rightPanel: { type: 'worklist', kind: 'vitals' },
    leftPanel: { type: 'nurse-summary' },
    quickActions: ['attendance', 'admissions', 'newPatient', 'nursing'],
  },
  midwife: {
    cards: ['todayVisits', 'activeAdmissions', 'scheduledAppointments'],
    rightPanel: { type: 'worklist', kind: 'maternal' },
    leftPanel: { type: 'midwife-summary' },
    quickActions: ['attendance', 'admissions', 'newPatient', 'antenatal'],
  },
  lab_tech: {
    cards: ['todayVisits', 'totalPatients'],
    rightPanel: { type: 'worklist', kind: 'lab' },
    leftPanel: { type: 'lab-summary' },
    quickActions: ['lab', 'attendance'],
  },
  sonographer: {
    cards: ['todayVisits', 'totalPatients'],
    rightPanel: { type: 'worklist', kind: 'scans' },
    leftPanel: { type: 'scan-summary' },
    quickActions: ['scans', 'attendance'],
  },
  pharmacist: {
    cards: ['lowStockItems', 'todayVisits', 'totalPatients'],
    rightPanel: { type: 'worklist', kind: 'pharmacy' },
    leftPanel: { type: 'stock' },
    quickActions: ['pharmacy', 'requisitions', 'attendance'],
  },
  accounts: {
    cards: ['pendingBills', 'totalRevenue', 'pendingClaims', 'todayVisits'],
    rightPanel: { type: 'recent' },
    leftPanel: { type: 'finance' },
    quickActions: ['billing', 'claims', 'reports'],
  },
  records: {
    cards: ['totalPatients', 'todayVisits', 'scheduledAppointments', 'activeAdmissions'],
    rightPanel: { type: 'recent' },
    leftPanel: { type: 'records-summary' },
    quickActions: ['newPatient', 'attendance', 'appointments', 'reports'],
  },
};

export const getRoleDashboard = (role?: string | null): RoleDashboard =>
  (role && ROLE_DASHBOARDS[role]) || FALLBACK;

// ============================================
// SENIORITY CONFIG
// ============================================

export const SENIORITY_CONFIG: Record<Seniority, { label: string; color: string; icon: any }> = {
  TRAINEE: { label: 'Trainee', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: GraduationCap },
  JUNIOR: { label: 'Junior Staff', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: UserIcon },
  SENIOR: { label: 'Senior Staff', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: TrendingUp },
  PRINCIPAL: { label: 'Principal', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Shield },
};

// ============================================
// SHARED HELPERS
// ============================================

export const fmtTime = (d?: string) => {
  try { return d ? new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'; }
  catch { return '—'; }
};

export const patientFullName = (src: any): string => {
  const p = src?.patient ?? src?.Patient ?? src;
  if (!p) return 'Unknown Patient';
  return p.name || p.fullName ||
    `${p.surname || ''} ${p.otherNames || ''}`.trim() || 'Unknown Patient';
};

export const getStatusStyle = (status: string): { bg: string; color: string } => {
  const styles: Record<string, { bg: string; color: string }> = {
    completed: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    paid: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    discharged: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    cancelled: { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
    admitted: { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
    scheduled: { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
    pending: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
    pending_doctor: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
    in_progress: { bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
    partial: { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
  };
  return styles[status] || { bg: 'var(--bg-main)', color: 'var(--text-secondary)' };
};