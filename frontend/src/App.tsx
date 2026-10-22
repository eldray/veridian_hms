// src/App.tsx — FULLY CORRECTED
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ToastContainer';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
  matchPath,
} from 'react-router-dom';

// Pages
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import Patients from './pages/Patients';
import UserDetail from './pages/UserDetail';
import Attendance from './pages/Attendance';
import Admissions from './pages/Admissions';
import CorporateAccounts from './pages/CorporateAccounts';
import Billing from './pages/Billing';
import ScansEntry from './pages/ScansEntry';
import FamilyPlanning from './pages/FamilyPlanning';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Laboratory from './pages/Laboratory';
import AdmissionDetails from './pages/AdmissionDetails';
import DispensePatient from './pages/DispensePatient';
import Pharmacy from './pages/Pharmacy';
import MedicalEntries from './pages/MedicalEntries';
import ProcessPayment from './pages/ProcessPayment';
import Login from './pages/Login';
import Vitals from './pages/Vitals';
import PatientDetails from './pages/PatientDetails';
import MedicalWaitingList from './pages/MedicalWaitingList';
import MaternalWaitingList from './pages/MaternalWaitingList';
import Antenatal from './pages/Antenatal';
import AttendanceDetails from './pages/AttendanceDetails';
import Theatre from './pages/Theatre';
import Nursing from './pages/Nursing';
import MedicalServicesManagement from './pages/MedicalServicesManagement';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import StockManagement from './pages/StockManagement';
import InsuranceProviders from './pages/InsuranceProviders';
import InsuranceClaims from './pages/InsuranceClaims';
import EditInsuranceClaim from './pages/EditInsuranceClaim';
import VitalsEntry from './pages/VitalsEntry';
import EditNHISClaim from './pages/insurance-claims/EditNHISClaim';
import EditPrivateClaim from './pages/insurance-claims/EditPrivateClaim';
import EditCorporateClaim from './pages/insurance-claims/EditCorporateClaim';
import ClaimBatches from './pages/ClaimBatches';
import WardManagement from './pages/WardManagement';
import Notifications from './pages/Notifications';
import Appointments from './pages/Appointments';
import LabResultEntry from './pages/LabResultEntry';
import Departments from './pages/Departments';
import TheatreProcedure from './pages/TheatreProcedure';
import AuditLogs from './pages/AuditLogs';
import Scans from './pages/Scans';
import InvoiceManagement from './pages/InvoiceManagement';
import RequisitionManagement from './pages/RequisitionManagement';
import StockTransactions from './pages/StockTransactions';
import StockTransfers from './pages/StockTransfers';
import StockReports from './pages/StockReports';
import PatientBillingItems from './pages/PatientBillingItems';
import NursingPatientWorkspace from './pages/NursingPatientWorkspace';
import Referrals from './pages/Referrals';
import Estimates from './pages/Estimates';
import EstimateDetails from './pages/EstimateDetails';
import EstimateForm from './pages/EstimateForm';
import UserManagement from './pages/UserManagement';
import ShiftManagement from './pages/ShiftManagement';
import LeaveManagement from './pages/LeaveManagement';

import './App.css';

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS
// Each key is a "permission tag" used by the route guard. '*' = everything.
// ─────────────────────────────────────────────────────────────────────────────
const rolePermissions: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['*'],

  hr_officer: [
    'dashboard', 'user_management', 'shifts', 'leaves',
    'reports', 'profile', 'notifications', 'audit_logs',
  ],

  doctor: [
    'dashboard', 'patients', 'attendance', 'appointments',
    'medical_entries', 'medical_waiting_list',
    'vitals', 'admissions', 'wards',
    'laboratory', 'scans', 'theatre', 'pharmacy',
    'billing', 'insurance_claims', 'referrals',
    'maternal_waiting_list', 'antenatal', 'family_planning',
    'requisitions', 'stock_transfers',
    'reports', 'profile', 'notifications', 'settings',
    'audit_logs',
  ],

  nurse: [
    'dashboard', 'patients', 'attendance', 'appointments',
    'admissions', 'wards', 'vitals', 'nursing',
    'medical_waiting_list',
    'medical_entries',           // ✅ NEW
    'theatre',
    'requisitions', 'referrals', 'stock_transfers',
    'reports', 'profile', 'notifications',
  ],

  midwife: [
    'dashboard', 'patients', 'attendance', 'appointments',
    'admissions', 'wards', 'vitals', 'nursing',
    'medical_waiting_list',      // consultations — triage
    'medical_entries',           // ✅ NEW
    'theatre',                   // C-sections / deliveries
    'maternal_waiting_list', 'antenatal', 'family_planning',
    'scans', 'laboratory', 'referrals',
    'service_catalog',           // ✅ NEW — view services offered
    'pharmacy',     
    'requisitions', 'stock_transfers', // Stock transfer requests and receipts
    'dispense_medication',       // ✅ NEW — if midwives dispense from ward stock
    'reports', 'profile', 'notifications',
  ],

  sonographer: [
    'dashboard', 'patients', 'scans', 'laboratory',
    'appointments', 'reports', 'profile', 'notifications', 'requisitions', 'stock_transfers',  
  ],

  lab_tech: [
    'dashboard', 'patients', 'laboratory', 'requisitions', 'stock_transfers',  
    'appointments', 'reports', 'profile', 'notifications',
  ],

  pharmacist: [
    'dashboard', 'pharmacy', 'dispense_medication',
    'inventory', 'stock_management', 'stock_transactions', 'stock_transfers',
    'stock_reports', 'invoices', 'requisitions',
    'reports', 'profile', 'notifications',
  ],

  accounts: [
    'dashboard', 'patients', 'billing', 'process_payment',
    'insurance_providers', 'insurance_claims', 'corporate',
    'estimates', 'invoices', 'stock_transactions',
    'stock_reports', 'reports', 'profile', 'notifications',
    'audit_logs',
  ],

  records: [
    'dashboard', 'patients', 'attendance',
    'appointments', 'admissions', 'referrals', 'requisitions', 'stock_transfers',  
    'reports', 'profile', 'notifications',
    'audit_logs',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// STATIC ROUTE MAP
// Exact-match paths → permission tag. Dynamic segments live in DYNAMIC_ROUTES.
// ─────────────────────────────────────────────────────────────────────────────
const routeMap: Record<string, string> = {
  '/dashboard':                                      'dashboard',
  '/dashboard/patients':                             'patients',
  '/dashboard/patients/register':                    'patients',
  '/dashboard/attendance':                           'attendance',
  '/dashboard/admissions':                           'admissions',
  '/dashboard/wards':                                'wards',
  '/dashboard/billing':                              'billing',
  '/dashboard/insurance-providers':                  'insurance_providers',
  '/dashboard/insurance-claims':                     'insurance_claims',
  '/dashboard/insurance-claims/batches':             'insurance_claims',
  '/dashboard/inventory':                            'inventory',
  '/dashboard/pharmacy':                             'pharmacy',
  '/dashboard/dispense':                             'dispense_medication',
  '/dashboard/stock':                                'stock_management',
  '/dashboard/stock/reports':                        'stock_reports',
  '/dashboard/stock/transfers':                      'stock_transfers',
  '/dashboard/theatre':                              'theatre',
  '/dashboard/antenatal':                            'antenatal',
  '/dashboard/scans':                                'scans',
  '/dashboard/invoices':                             'invoices',
  '/dashboard/invoices/create':                      'invoices',
  '/dashboard/requisitions':                         'requisitions',
  '/dashboard/requisitions/create':                  'requisitions',
  '/dashboard/transactions':                         'stock_transactions',
  '/dashboard/laboratory':                           'laboratory',
  '/dashboard/medical-entries':                      'medical_entries',
  '/dashboard/medical-waiting-list':                 'medical_waiting_list',
  '/dashboard/maternal-waiting-list':                'maternal_waiting_list',
  '/dashboard/medicalservices':                      'service_catalog',
  '/dashboard/service-catalog':                      'service_catalog',
  '/dashboard/vitals':                               'vitals',
  '/dashboard/reports':                              'reports',
  '/dashboard/profile':                              'profile',
  '/dashboard/settings':                             'settings',
  '/dashboard/notifications':                        'dashboard',
  '/dashboard/appointments':                         'appointments',
  '/dashboard/departments':                          'departments',
  '/dashboard/family-planning':                      'family_planning',
  '/dashboard/referrals':                            'referrals',
  '/dashboard/corporate-accounts':                   'corporate',
  '/dashboard/estimates':                            'estimates',
  '/dashboard/estimates/new':                        'estimates',
  '/dashboard/users':                                'user_management',
  '/dashboard/audit-logs':                           'audit_logs',
  '/dashboard/shifts':                               'shifts',
  '/dashboard/leaves':                               'leaves',
  '/dashboard/nursing':                              'nursing',
};

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC ROUTE MAP
// Mirrors every `:param` route declared in the JSX below. Uses matchPath so it
// can't drift from the actual router definitions.
// ─────────────────────────────────────────────────────────────────────────────
const dynamicRoutes: Array<{ pattern: string; permission: string }> = [
  { pattern: '/dashboard/patients/:id',                        permission: 'patients' },
  { pattern: '/dashboard/patients/:patientId/billing',         permission: 'billing' },
  { pattern: '/dashboard/attendance/:id',                      permission: 'attendance' },
  { pattern: '/dashboard/admissions/:id',                      permission: 'admissions' },
  { pattern: '/dashboard/billing/:billId/payment',             permission: 'billing' },
  { pattern: '/dashboard/insurance-claims/:id/edit',           permission: 'insurance_claims' },
  { pattern: '/dashboard/insurance-claims/nhis/:id/edit',      permission: 'insurance_claims' },
  { pattern: '/dashboard/insurance-claims/private/:id/edit',   permission: 'insurance_claims' },
  { pattern: '/dashboard/insurance-claims/corporate/:id/edit', permission: 'insurance_claims' },
  { pattern: '/dashboard/laboratory/:id',                      permission: 'laboratory' },
  { pattern: '/dashboard/scans/:id',                           permission: 'scans' },
  { pattern: '/dashboard/vitals/:id',                          permission: 'vitals' },
  { pattern: '/dashboard/theatre/:id',                         permission: 'theatre' },
  { pattern: '/dashboard/medical-entries/:attendanceId',       permission: 'medical_entries' },
  { pattern: '/dashboard/maternal/:attendanceId',              permission: 'antenatal' },
  { pattern: '/dashboard/nursing/patient/:attendanceId',       permission: 'nursing' },
  { pattern: '/dashboard/dispense/:id',                        permission: 'pharmacy' },
  { pattern: '/dashboard/invoices/:id',                        permission: 'invoices' },
  { pattern: '/dashboard/requisitions/:id',                    permission: 'requisitions' },
  { pattern: '/dashboard/corporate-accounts/:id',              permission: 'corporate' },
  { pattern: '/dashboard/estimates/:id',                       permission: 'estimates' },
  { pattern: '/dashboard/estimates/:id/edit',                  permission: 'estimates' },
  { pattern: '/dashboard/users/:id',                           permission: 'user_management' },
  { pattern: '/dashboard/hr/:id/edit',                         permission: 'hr' },
  { pattern: '/dashboard/hr/:id/payslip',                      permission: 'hr' },
  { pattern: '/dashboard/hr/:id',                              permission: 'hr' },
];

const hasPermission = (userRole: string, routePath: string) => {
  const perms = rolePermissions[userRole];
  if (!perms) return false;
  if (perms.includes('*')) return true;

  // 1. Exact match
  const exact = routeMap[routePath];
  if (exact) return perms.includes(exact);

  // 2. Dynamic match — first pattern that matches wins
  const dyn = dynamicRoutes.find(r => matchPath(r.pattern, routePath));
  if (dyn) return perms.includes(dyn.permission);

  // 3. Unknown route — deny by default
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE GUARDS
// ─────────────────────────────────────────────────────────────────────────────
const AccessDenied = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
    <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)] max-w-md">
      <h2 className="text-xl font-bold text-[var(--icon-red-text)] mb-2">Access Denied</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-4">
        You don't have permission to access this page.
      </p>
      <button
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all text-sm font-semibold"
      >
        Go Back
      </button>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, pathname)) return <AccessDenied />;
  return <>{children}</>;
};

const DashboardLayoutWrapper = () => {
  const { user } = useAuthStore();
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--icon-red-text)] mb-2">Access Restricted</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Your role doesn't have access to this page.
          </p>
        </div>
      </div>
    );
  }
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const { checkAuth, user, isInitialized } = useAuthStore();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        if (!isInitialized) {
          console.log('🔄 Running initial auth check...');
          await checkAuth();
        } else {
          console.log('✅ Auth already initialized, skipping check');
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAppLoading(false);
      }
    };
    init();
  }, [checkAuth, isInitialized]);

  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--icon-cyan-text)] mx-auto mb-4"></div>
          <p className="text-lg text-[var(--text-primary)]">Initializing app...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Legacy Redirects */}
        <Route path="/medical-entries" element={<Navigate to="/dashboard/medical-entries" replace />} />
        <Route path="/laboratory"     element={<Navigate to="/dashboard/laboratory" replace />} />
        <Route path="/pharmacy"       element={<Navigate to="/dashboard/pharmacy" replace />} />
        <Route path="/stock/reports"  element={<Navigate to="/dashboard/stock/reports" replace />} />

        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayoutWrapper />}>
          <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          {/* Patient routes */}
          <Route path="patients/register" element={<ProtectedRoute><PatientRegistration /></ProtectedRoute>} />
          <Route path="patients/:id"      element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
          <Route path="patients"          element={<ProtectedRoute><Patients /></ProtectedRoute>} />

          {/* Attendance routes */}
          <Route path="attendance/:id" element={<ProtectedRoute><AttendanceDetails /></ProtectedRoute>} />
          <Route path="attendance"     element={<ProtectedRoute><Attendance /></ProtectedRoute>} />

          {/* Clinical routes */}
          <Route path="admissions/:id" element={<ProtectedRoute><AdmissionDetails /></ProtectedRoute>} />
          <Route path="admissions"     element={<ProtectedRoute><Admissions /></ProtectedRoute>} />
          <Route path="wards"          element={<ProtectedRoute><WardManagement /></ProtectedRoute>} />
          <Route path="laboratory"     element={<ProtectedRoute><Laboratory /></ProtectedRoute>} />
          <Route path="laboratory/:id" element={<ProtectedRoute><LabResultEntry /></ProtectedRoute>} />
          <Route path="scans"          element={<ProtectedRoute><Scans /></ProtectedRoute>} />
          <Route path="scans/:id"      element={<ProtectedRoute><ScansEntry /></ProtectedRoute>} />
          <Route path="medical-entries"                element={<ProtectedRoute><MedicalEntries /></ProtectedRoute>} />
          <Route path="medical-entries/:attendanceId"  element={<ProtectedRoute><MedicalEntries /></ProtectedRoute>} />
          <Route path="vitals"          element={<ProtectedRoute><Vitals /></ProtectedRoute>} />
          <Route path="vitals/:id"      element={<ProtectedRoute><VitalsEntry /></ProtectedRoute>} />
          <Route path="family-planning" element={<ProtectedRoute><FamilyPlanning /></ProtectedRoute>} />

          {/* Waiting List Pages */}
          <Route path="medical-waiting-list"  element={<ProtectedRoute><MedicalWaitingList /></ProtectedRoute>} />
          <Route path="maternal-waiting-list" element={<ProtectedRoute><MaternalWaitingList /></ProtectedRoute>} />

          {/* Audit Logs */}
          <Route path="audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />

          {/* Maternal Health */}
          <Route path="antenatal"                     element={<ProtectedRoute><Antenatal /></ProtectedRoute>} />
          <Route path="maternal/:attendanceId"        element={<ProtectedRoute><Antenatal /></ProtectedRoute>} />

          {/* Medical Services */}
          <Route path="medicalservices" element={<ProtectedRoute><MedicalServicesManagement /></ProtectedRoute>} />

          {/* Theatre & Nursing */}
          <Route path="theatre"     element={<ProtectedRoute><Theatre /></ProtectedRoute>} />
          <Route path="theatre/:id" element={<ProtectedRoute><TheatreProcedure /></ProtectedRoute>} />
          <Route path="nursing"     element={<ProtectedRoute><Nursing /></ProtectedRoute>} />
          <Route path="nursing/patient/:attendanceId" element={<ProtectedRoute><NursingPatientWorkspace /></ProtectedRoute>} />

          {/* Inventory & Pharmacy */}
          <Route path="inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="pharmacy"  element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
          <Route path="stock"     element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
          <Route path="dispense/:id" element={<ProtectedRoute><DispensePatient /></ProtectedRoute>} />
          <Route path="dispense"     element={<ProtectedRoute><DispensePatient /></ProtectedRoute>} />

          {/* Stock Reports */}
          <Route path="stock/reports" element={<ProtectedRoute><StockReports /></ProtectedRoute>} />
          <Route path="stock/transfers" element={<ProtectedRoute><StockTransfers /></ProtectedRoute>} />

          {/* Stock Management */}
          <Route path="invoices"            element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="invoices/create"     element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="invoices/:id"        element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="requisitions"        element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="requisitions/create" element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="requisitions/:id"    element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="transactions"        element={<ProtectedRoute><StockTransactions /></ProtectedRoute>} />

          {/* Billing & Insurance */}
          <Route path="patients/:patientId/billing" element={<ProtectedRoute><PatientBillingItems /></ProtectedRoute>} />
          <Route path="billing/:billId/payment"     element={<ProtectedRoute><ProcessPayment /></ProtectedRoute>} />
          <Route path="billing"                     element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="insurance-providers"         element={<ProtectedRoute><InsuranceProviders /></ProtectedRoute>} />
          <Route path="insurance-claims"            element={<ProtectedRoute><InsuranceClaims /></ProtectedRoute>} />
          <Route path="insurance-claims/:id/edit"   element={<ProtectedRoute><EditInsuranceClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/nhis/:id/edit"      element={<ProtectedRoute><EditNHISClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/private/:id/edit"   element={<ProtectedRoute><EditPrivateClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/corporate/:id/edit" element={<ProtectedRoute><EditCorporateClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/batches"    element={<ProtectedRoute><ClaimBatches /></ProtectedRoute>} />
          <Route path="reports"                     element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="referrals"                   element={<ProtectedRoute><Referrals /></ProtectedRoute>} />

          <Route path="corporate-accounts"     element={<ProtectedRoute><CorporateAccounts /></ProtectedRoute>} />
          <Route path="corporate-accounts/:id" element={<ProtectedRoute><CorporateAccounts /></ProtectedRoute>} />

          {/* Estimates */}
          <Route path="estimates"           element={<ProtectedRoute><Estimates /></ProtectedRoute>} />
          <Route path="estimates/new"       element={<ProtectedRoute><EstimateForm /></ProtectedRoute>} />
          <Route path="estimates/:id/edit"  element={<ProtectedRoute><EstimateForm /></ProtectedRoute>} />
          <Route path="estimates/:id"       element={<ProtectedRoute><EstimateDetails /></ProtectedRoute>} />

          {/* User & System */}
          <Route path="profile"       element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="settings"      element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="appointments"  element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="departments"   element={<ProtectedRoute><Departments /></ProtectedRoute>} />
          <Route path="users"         element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="users/:id"     element={<ProtectedRoute><UserDetail /></ProtectedRoute>} />
          <Route path="shifts"        element={<ProtectedRoute><ShiftManagement /></ProtectedRoute>} />
          <Route path="leaves"        element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;