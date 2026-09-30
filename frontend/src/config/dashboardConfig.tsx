// src/config/dashboardConfig.tsx - COMPLETE
import {
  Users, Calendar, BedDouble, FileText, Activity, Shield, Package,
  DollarSign, Stethoscope, Heart, FlaskConical, ScanLine, Pill,
  ClipboardList, UserPlus, BarChart3, TrendingUp, User as UserIcon,
  GraduationCap, AlertCircle, Clock, CheckCircle, AlertTriangle,
  FileCheck, Briefcase, Baby, Syringe, ScrollText, Bed,
  Receipt, UserCog, CalendarClock, Clipboard, Building, CreditCard,
  Hospital,
} from 'lucide-react';
import type { Seniority } from '../types';

// ============================================
// SHARED STATS SHAPE
// ============================================

export interface DashboardStats {
  // Core
  totalPatients: number;
  todayVisits: number;
  activeAdmissions: number;
  pendingBills: number;
  pendingClaims: number;
  lowStockItems: number;
  totalRevenue: number;
  scheduledAppointments: number;
  completedProcedures: number;

  // Nursing / MAR
  medsDue: number;
  medsLate: number;
  medsMissed: number;
  vitalsOverdue: number;
  pendingNursingTasks: number;
  flaggedNotes: number;

  // Lab
  criticalLabs: number;
  pendingLabTests: number;
  labSlaBreaches: number;

  // Scans
  criticalScans: number;
  pendingRadiologistReview: number;

  // Pharmacy / Stock
  expiringStock: number;
  pendingPrescriptions: number;
  dispensedToday: number;

  // Maternal
  highRiskANC: number;
  deliveriesThisWeek: number;
  overdueANC: number;
  pncDueToday: number;

  // Accounts
  todayCollections: number;
  outstandingClaims: number;
  pendingWaivers: number;
  expiringEstimates: number;
  corporateOutstanding: number;

  // Doctor
  waitingOver60: number;
  resultsReadyForMe: number;

  // Records
  todayRegistrations: number;
  appointmentNoShows: number;
  pendingIncomingReferrals: number;

  // HR
  totalStaff: number;
  onShiftToday: number;
  pendingLeaves: number;
  unfilledShifts: number;
}

export const EMPTY_STATS: DashboardStats = {
  totalPatients: 0, todayVisits: 0, activeAdmissions: 0, pendingBills: 0,
  pendingClaims: 0, lowStockItems: 0, totalRevenue: 0,
  scheduledAppointments: 0, completedProcedures: 0,
  medsDue: 0, medsLate: 0, medsMissed: 0, vitalsOverdue: 0,
  pendingNursingTasks: 0, flaggedNotes: 0,
  criticalLabs: 0, pendingLabTests: 0, labSlaBreaches: 0,
  criticalScans: 0, pendingRadiologistReview: 0,
  expiringStock: 0, pendingPrescriptions: 0, dispensedToday: 0,
  highRiskANC: 0, deliveriesThisWeek: 0, overdueANC: 0, pncDueToday: 0,
  todayCollections: 0, outstandingClaims: 0, pendingWaivers: 0,
  expiringEstimates: 0, corporateOutstanding: 0,
  waitingOver60: 0, resultsReadyForMe: 0,
  todayRegistrations: 0, appointmentNoShows: 0, pendingIncomingReferrals: 0,
  totalStaff: 0, onShiftToday: 0, pendingLeaves: 0, unfilledShifts: 0,
};

// ============================================
// STAT CARD CATALOG
// ============================================

export type StatKey =
  | 'totalPatients' | 'todayVisits' | 'activeAdmissions' | 'scheduledAppointments'
  | 'pendingBills' | 'pendingClaims' | 'lowStockItems' | 'totalRevenue' | 'completedProcedures'
  | 'medsDue' | 'medsLate' | 'medsMissed' | 'vitalsOverdue'
  | 'pendingNursingTasks' | 'flaggedNotes'
  | 'criticalLabs' | 'pendingLabTests' | 'labSlaBreaches'
  | 'criticalScans' | 'pendingRadiologistReview'
  | 'expiringStock' | 'pendingPrescriptions' | 'dispensedToday'
  | 'highRiskANC' | 'deliveriesThisWeek' | 'overdueANC' | 'pncDueToday'
  | 'todayCollections' | 'outstandingClaims' | 'pendingWaivers'
  | 'expiringEstimates' | 'corporateOutstanding'
  | 'waitingOver60' | 'resultsReadyForMe'
  | 'todayRegistrations' | 'appointmentNoShows' | 'pendingIncomingReferrals'
  | 'totalStaff' | 'onShiftToday' | 'pendingLeaves' | 'unfilledShifts';

export interface StatMeta {
  to: string;
  label: string;
  sub: string;
  Icon: React.ComponentType<any>;
  bg: string;
  color: string;
  value: (s: DashboardStats) => React.ReactNode;
}

const fmtCcy = (n: number) => `₵${Number(n || 0).toFixed(2)}`;

export const STAT_CATALOG: Record<StatKey, StatMeta> = {
  // Core
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
    value: (s) => fmtCcy(s.totalRevenue),
  },
  completedProcedures: {
    to: '/dashboard/theatre', label: 'Procedures', sub: 'Completed',
    Icon: Activity, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.completedProcedures,
  },

  // Nurse / MAR
  medsDue: {
    to: '/dashboard/nursing', label: 'Meds Due', sub: 'Right now',
    Icon: Pill, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.medsDue,
  },
  medsLate: {
    to: '/dashboard/nursing?filter=late', label: 'Meds Late', sub: 'Overdue doses',
    Icon: AlertCircle, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.medsLate,
  },
  medsMissed: {
    to: '/dashboard/nursing?filter=missed', label: 'Meds Missed', sub: 'Not administered',
    Icon: AlertTriangle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.medsMissed,
  },
  vitalsOverdue: {
    to: '/dashboard/nursing?filter=vitals_overdue', label: 'Vitals Overdue', sub: 'Needs check',
    Icon: Activity, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.vitalsOverdue,
  },
  pendingNursingTasks: {
    to: '/dashboard/nursing', label: 'Pending Tasks', sub: 'Nursing tasks',
    Icon: ClipboardList, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.pendingNursingTasks,
  },
  flaggedNotes: {
    to: '/dashboard/nursing?filter=flagged', label: 'Flagged Notes', sub: 'Need review',
    Icon: AlertCircle, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.flaggedNotes,
  },

  // Lab
  criticalLabs: {
    to: '/dashboard/laboratory?filter=critical', label: 'Critical Labs', sub: 'Immediate review',
    Icon: AlertTriangle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.criticalLabs,
  },
  pendingLabTests: {
    to: '/dashboard/laboratory?filter=pending', label: 'Pending Tests', sub: 'In queue',
    Icon: FlaskConical, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
    value: (s) => s.pendingLabTests,
  },
  labSlaBreaches: {
    to: '/dashboard/laboratory?filter=sla_breach', label: 'SLA Breaches', sub: 'Overdue tests',
    Icon: Clock, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.labSlaBreaches,
  },

  // Scans
  criticalScans: {
    to: '/dashboard/scans?filter=critical', label: 'Critical Scans', sub: 'Flagged findings',
    Icon: AlertTriangle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.criticalScans,
  },
  pendingRadiologistReview: {
    to: '/dashboard/scans?filter=pending_review', label: 'Pending Review', sub: 'Awaiting radiologist',
    Icon: ScanLine, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.pendingRadiologistReview,
  },

  // Pharmacy / Stock
  expiringStock: {
    to: '/dashboard/stock?filter=expiring', label: 'Expiring Stock', sub: 'Next 30 days',
    Icon: Package, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.expiringStock,
  },
  pendingPrescriptions: {
    to: '/dashboard/dispense', label: 'Pending Scripts', sub: 'To dispense',
    Icon: Clipboard, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.pendingPrescriptions,
  },
  dispensedToday: {
    to: '/dashboard/pharmacy', label: 'Dispensed Today', sub: 'Prescriptions',
    Icon: Pill, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => s.dispensedToday,
  },

  // Maternal
  highRiskANC: {
    to: '/dashboard/antenatal?filter=high_risk', label: 'High-Risk ANC', sub: 'Needs attention',
    Icon: AlertTriangle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.highRiskANC,
  },
  deliveriesThisWeek: {
    to: '/dashboard/maternal-waiting-list', label: 'EDD This Week', sub: 'Expected deliveries',
    Icon: Baby, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
    value: (s) => s.deliveriesThisWeek,
  },
  overdueANC: {
    to: '/dashboard/antenatal?filter=overdue', label: 'Missed ANC', sub: 'Overdue visits',
    Icon: CalendarClock, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.overdueANC,
  },
  pncDueToday: {
    to: '/dashboard/antenatal?tab=pnc', label: 'PNC Due Today', sub: 'Postnatal visits',
    Icon: Heart, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.pncDueToday,
  },

  // Accounts
  todayCollections: {
    to: '/dashboard/billing', label: 'Collections', sub: 'Today',
    Icon: DollarSign, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => fmtCcy(s.todayCollections),
  },
  outstandingClaims: {
    to: '/dashboard/insurance-claims?status=submitted', label: 'Outstanding', sub: 'Claims unpaid',
    Icon: Shield, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.outstandingClaims,
  },
  pendingWaivers: {
    to: '/dashboard/billing?filter=waivers', label: 'Waivers', sub: 'Pending approval',
    Icon: FileCheck, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.pendingWaivers,
  },
  expiringEstimates: {
    to: '/dashboard/estimates?filter=expiring', label: 'Expiring Est.', sub: 'Next 7 days',
    Icon: Clock, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.expiringEstimates,
  },
  corporateOutstanding: {
    to: '/dashboard/corporate-accounts', label: 'Corporate Due', sub: 'Outstanding',
    Icon: Briefcase, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
    value: (s) => fmtCcy(s.corporateOutstanding),
  },

  // Doctor
  waitingOver60: {
    to: '/dashboard/medical-waiting-list?filter=long_wait', label: 'Waiting > 60m', sub: 'SLA alert',
    Icon: AlertCircle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.waitingOver60,
  },
  resultsReadyForMe: {
    to: '/dashboard/laboratory?filter=ready', label: 'Results Ready', sub: 'Awaiting review',
    Icon: CheckCircle, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => s.resultsReadyForMe,
  },

  // Records
  todayRegistrations: {
    to: '/dashboard/patients', label: 'New Today', sub: 'Registrations',
    Icon: UserPlus, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.todayRegistrations,
  },
  appointmentNoShows: {
    to: '/dashboard/appointments?filter=no_show', label: 'No-Shows', sub: 'Today',
    Icon: AlertCircle, bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)',
    value: (s) => s.appointmentNoShows,
  },
  pendingIncomingReferrals: {
    to: '/dashboard/referrals?filter=incoming', label: 'Incoming', sub: 'Referrals',
    Icon: Stethoscope, bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)',
    value: (s) => s.pendingIncomingReferrals,
  },

  // HR
  totalStaff: {
    to: '/dashboard/users', label: 'Total Staff', sub: 'Active',
    Icon: Users, bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)',
    value: (s) => s.totalStaff,
  },
  onShiftToday: {
    to: '/dashboard/shifts', label: 'On Shift', sub: 'Today',
    Icon: Calendar, bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)',
    value: (s) => s.onShiftToday,
  },
  pendingLeaves: {
    to: '/dashboard/leaves?status=pending', label: 'Pending Leaves', sub: 'To approve',
    Icon: FileText, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)',
    value: (s) => s.pendingLeaves,
  },
  unfilledShifts: {
    to: '/dashboard/shifts?filter=unfilled', label: 'Unfilled Shifts', sub: 'Need coverage',
    Icon: AlertCircle, bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)',
    value: (s) => s.unfilledShifts,
  },
};

// ============================================
// PANEL SPECS
// ============================================

export type WorklistKind =
  | 'medical' | 'vitals' | 'lab' | 'pharmacy' | 'scans' | 'maternal';

export type PanelSpec =
  | { type: 'worklist'; kind: WorklistKind }
  | { type: 'recent' }
  | { type: 'diagnoses' }
  | { type: 'finance' }
  | { type: 'stock' }
  | { type: 'diagnoses-attendance' }
  | { type: 'nurse-summary' }
  | { type: 'payment-mode' }
  | { type: 'ward-occupancy' }
  | { type: 'recent-admissions' }
  | { type: 'vitals-snapshot' }
  | { type: 'recent-payments' }
  | { type: 'midwife-summary' }
  | { type: 'lab-summary' }
  | { type: 'scan-summary' }
  | { type: 'records-summary' }
  | { type: 'hr-summary' }
  | { type: 'hr-worklist' }
  | { type: 'meds-due' }
  | { type: 'expiring-stock' }
  | { type: 'critical-results' }
  | { type: 'high-risk-anc' }
  | { type: 'billing-aging' }
  | { type: 'payment-mode' }
  | { type: 'ward-occupancy' }
  | { type: 'recent-admissions' }
  | { type: 'vitals-snapshot' }
  | { type: 'recent-payments' };

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
  nursing: { icon: Syringe, label: 'Nursing', path: '/dashboard/nursing', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  antenatal: { icon: Baby, label: 'Antenatal', path: '/dashboard/antenatal', bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
  shifts: { icon: Calendar, label: 'Shifts', path: '/dashboard/shifts', bg: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' },
  leaves: { icon: FileText, label: 'Leaves', path: '/dashboard/leaves', bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
  userManagement: { icon: Users, label: 'Users', path: '/dashboard/users', bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
};

// ============================================
// ROLE DASHBOARD REGISTRY
// ============================================

export interface StatGroup {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  cards: StatKey[];
  /** If true, this group is the default active tab */
  defaultActive?: boolean;
  /** If true, cards here are filtered to only show non-zero values */
  alertsOnly?: boolean;
}

export interface RoleDashboard {
  cards?: StatKey[];              // for roles without grouping (backward compat)
  cardGroups?: StatGroup[];       // for roles with grouping (admin)
  primaryPanels: PanelSpec[];
  sidebarPanel: PanelSpec;
  quickActions: string[];
}

const FALLBACK: RoleDashboard = {
  cards: ['totalPatients', 'todayVisits', 'activeAdmissions'],
  primaryPanels: [],
  sidebarPanel: { type: 'recent' },
  quickActions: ['attendance', 'appointments'],
};

// Admin sees EVERYTHING at a glance — grouped into tabs with alerts surfaced first
const ADMIN_DASHBOARD: RoleDashboard = {
  cardGroups: [
    {
      key: 'alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      alertsOnly: true,
      defaultActive: true,
      cards: [
        'criticalLabs', 'criticalScans', 'medsMissed', 'medsLate',
        'vitalsOverdue', 'unfilledShifts', 'pendingLeaves',
        'lowStockItems', 'expiringStock', 'labSlaBreaches',
        'flaggedNotes', 'overdueANC',
      ],
    },
    {
      key: 'clinical',
      label: 'Clinical',
      icon: Stethoscope,
      cards: [
        'totalPatients', 'todayVisits', 'activeAdmissions',
        'scheduledAppointments', 'medsDue', 'vitalsOverdue',
        'criticalLabs', 'highRiskANC',
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      icon: Briefcase,
      cards: [
        'pendingBills', 'totalRevenue', 'pendingClaims',
        'lowStockItems', 'expiringStock', 'totalStaff',
        'pendingLeaves', 'unfilledShifts',
      ],
    },
  ],
  primaryPanels: [
    { type: 'worklist', kind: 'medical' },
    { type: 'diagnoses-attendance' },
    { type: 'finance' },
    { type: 'stock' },
    { type: 'ward-occupancy' },
    { type: 'recent-admissions' },
  ],
  sidebarPanel: { type: 'recent' },
  quickActions: [
    'newPatient', 'attendance', 'admissions', 'billing',
    'pharmacy', 'lab', 'scans', 'requisitions',
    'claims', 'reports', 'nursing', 'shifts',
  ],
};

export const ROLE_DASHBOARDS: Record<string, RoleDashboard> = {
  admin: ADMIN_DASHBOARD,
  super_admin: ADMIN_DASHBOARD,

  doctor: {
    cards: ['todayVisits', 'activeAdmissions', 'waitingOver60', 'resultsReadyForMe', 'scheduledAppointments'],
    primaryPanels: [
      { type: 'worklist', kind: 'medical' },
      { type: 'diagnoses' },
      { type: 'critical-results' },
      { type: 'payment-mode' },
      { type: 'ward-occupancy' },
      { type: 'diagnoses-attendance' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['attendance', 'admissions', 'pharmacy', 'lab', 'scans'],
  },

  nurse: {
    cards: ['medsDue', 'medsLate', 'vitalsOverdue', 'activeAdmissions', 'pendingNursingTasks'],
    primaryPanels: [
      { type: 'meds-due' },
      { type: 'vitals-snapshot' },
      { type: 'nurse-summary' },
      { type: 'worklist', kind: 'vitals' },
      { type: 'ward-occupancy' },
      { type: 'payment-mode' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['attendance', 'admissions', 'newPatient', 'nursing'],
  },

  midwife: {
    cards: ['highRiskANC', 'deliveriesThisWeek', 'overdueANC', 'pncDueToday', 'activeAdmissions'],
    primaryPanels: [
      { type: 'high-risk-anc' },
      { type: 'worklist', kind: 'maternal' },
      { type: 'midwife-summary' },
      { type: 'payment-mode' },
      { type: 'ward-occupancy' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['attendance', 'admissions', 'newPatient', 'antenatal'],
  },

  lab_tech: {
    cards: ['criticalLabs', 'pendingLabTests', 'labSlaBreaches', 'todayVisits', 'totalPatients'],
    primaryPanels: [
      { type: 'critical-results' },
      { type: 'worklist', kind: 'lab' },
      { type: 'lab-summary' },
      { type: 'payment-mode' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['lab', 'attendance'],
  },

  sonographer: {
    cards: ['criticalScans', 'pendingRadiologistReview', 'todayVisits', 'totalPatients'],
    primaryPanels: [
      { type: 'scan-summary' },
      { type: 'worklist', kind: 'scans' },
      { type: 'payment-mode' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['scans', 'attendance'],
  },

  pharmacist: {
    cards: ['lowStockItems', 'expiringStock', 'pendingPrescriptions', 'dispensedToday'],
    primaryPanels: [
      { type: 'worklist', kind: 'pharmacy' },
      { type: 'expiring-stock' },
      { type: 'stock' },
      { type: 'payment-mode' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['pharmacy', 'requisitions'],
  },

  accounts: {
    cards: ['pendingBills', 'todayCollections', 'outstandingClaims', 'pendingWaivers', 'corporateOutstanding'],
    primaryPanels: [
      { type: 'finance' },
      { type: 'billing-aging' },
      { type: 'recent-payments' },
      { type: 'payment-mode' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['billing', 'claims', 'reports'],
  },

  records: {
    cards: ['todayRegistrations', 'todayVisits', 'appointmentNoShows', 'pendingIncomingReferrals', 'activeAdmissions'],
    primaryPanels: [
      { type: 'records-summary' },
      { type: 'payment-mode' },
      { type: 'ward-occupancy' },
      { type: 'recent-admissions' },
      { type: 'diagnoses-attendance' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['newPatient', 'attendance', 'appointments', 'reports'],
  },

  hr_officer: {
    cards: ['totalStaff', 'onShiftToday', 'pendingLeaves', 'unfilledShifts'],
    primaryPanels: [
      { type: 'hr-worklist' },
      { type: 'hr-summary' },
    ],
    sidebarPanel: { type: 'recent' },
    quickActions: ['shifts', 'leaves', 'userManagement'],
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
// HELPERS
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
    due: { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)' },
    late: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
    missed: { bg: 'var(--icon-red-bg)', color: 'var(--icon-red-text)' },
    administered: { bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    refused: { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
    held: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
  };
  return styles[status] || { bg: 'var(--bg-main)', color: 'var(--text-secondary)' };
};