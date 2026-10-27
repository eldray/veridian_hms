// src/App.tsx — FULLY CORRECTED
import { lazy, useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ToastContainer';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  Link,
  useLocation,
} from 'react-router-dom';
import { hasPermission } from './config/access';

import './App.css';

// Shell and login stay eager: they are needed before any route chunk resolves.
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';

// Pages are split per route so the first paint does not wait on all 60 modules.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PatientRegistration = lazy(() => import('./pages/PatientRegistration'));
const Patients = lazy(() => import('./pages/Patients'));
const UserDetail = lazy(() => import('./pages/UserDetail'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Admissions = lazy(() => import('./pages/Admissions'));
const CorporateAccounts = lazy(() => import('./pages/CorporateAccounts'));
const Billing = lazy(() => import('./pages/Billing'));
const ScansEntry = lazy(() => import('./pages/ScansEntry'));
const FamilyPlanning = lazy(() => import('./pages/FamilyPlanning'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const AdmissionDetails = lazy(() => import('./pages/AdmissionDetails'));
const DispensePatient = lazy(() => import('./pages/DispensePatient'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const MedicalEntries = lazy(() => import('./pages/MedicalEntries'));
const ProcessPayment = lazy(() => import('./pages/ProcessPayment'));
const Vitals = lazy(() => import('./pages/Vitals'));
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const MedicalWaitingList = lazy(() => import('./pages/MedicalWaitingList'));
const MaternalWaitingList = lazy(() => import('./pages/MaternalWaitingList'));
const Antenatal = lazy(() => import('./pages/Antenatal'));
const AttendanceDetails = lazy(() => import('./pages/AttendanceDetails'));
const Theatre = lazy(() => import('./pages/Theatre'));
const Nursing = lazy(() => import('./pages/Nursing'));
const MedicalServicesManagement = lazy(() => import('./pages/MedicalServicesManagement'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const StockManagement = lazy(() => import('./pages/StockManagement'));
const InsuranceProviders = lazy(() => import('./pages/InsuranceProviders'));
const InsuranceClaims = lazy(() => import('./pages/InsuranceClaims'));
const InsuranceClaimsTracking = lazy(() => import('./pages/InsuranceClaimsTracking'));
const EditInsuranceClaim = lazy(() => import('./pages/EditInsuranceClaim'));
const VitalsEntry = lazy(() => import('./pages/VitalsEntry'));
const EditNHISClaim = lazy(() => import('./pages/insurance-claims/EditNHISClaim'));
const EditPrivateClaim = lazy(() => import('./pages/insurance-claims/EditPrivateClaim'));
const EditCorporateClaim = lazy(() => import('./pages/insurance-claims/EditCorporateClaim'));
const ClaimBatches = lazy(() => import('./pages/ClaimBatches'));
const WardManagement = lazy(() => import('./pages/WardManagement'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Appointments = lazy(() => import('./pages/Appointments'));
const LabResultEntry = lazy(() => import('./pages/LabResultEntry'));
const Departments = lazy(() => import('./pages/Departments'));
const TheatreProcedure = lazy(() => import('./pages/TheatreProcedure'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Scans = lazy(() => import('./pages/Scans'));
const InvoiceManagement = lazy(() => import('./pages/InvoiceManagement'));
const RequisitionManagement = lazy(() => import('./pages/RequisitionManagement'));
const StockTransactions = lazy(() => import('./pages/StockTransactions'));
const StockTransfers = lazy(() => import('./pages/StockTransfers'));
const StockReports = lazy(() => import('./pages/StockReports'));
const PatientBillingItems = lazy(() => import('./pages/PatientBillingItems'));
const NursingPatientWorkspace = lazy(() => import('./pages/NursingPatientWorkspace'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Estimates = lazy(() => import('./pages/Estimates'));
const EstimateDetails = lazy(() => import('./pages/EstimateDetails'));
const EstimateForm = lazy(() => import('./pages/EstimateForm'));
const Counter = lazy(() => import('./pages/Counter'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ShiftManagement = lazy(() => import('./pages/ShiftManagement'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));


// ─────────────────────────────────────────────────────────────────────────────
// ROUTE GUARDS
// Which role opens which page lives in one place: src/config/access.ts. The
// sidebar renders from the same table, so a menu item can no longer point at a
// page the guard then refuses.
// ─────────────────────────────────────────────────────────────────────────────
const AccessDenied = () => {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
      <div className="text-center bg-[var(--bg-card)] p-8 rounded-xl border border-[var(--border-color)] max-w-md">
        <h2 className="text-xl font-bold text-[var(--icon-red-text)] mb-2">Access Denied</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The <span className="font-semibold capitalize">{user?.role?.replace(/_/g, ' ') || 'current'}</span> role
          doesn't have permission to open this page.
        </p>
        <Link
          to="/dashboard"
          className="inline-block px-4 py-2 bg-[var(--icon-cyan-text)] text-white rounded-lg hover:opacity-90 transition-all text-sm font-semibold"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
};

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
  if (!hasPermission(user.role, pathname)) return <AccessDenied />;
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
          <Route path="insurance-claims/tracking" element={<ProtectedRoute><InsuranceClaimsTracking /></ProtectedRoute>} />
          <Route path="insurance-claims/:id/edit"   element={<ProtectedRoute><EditInsuranceClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/nhis/:id/edit"      element={<ProtectedRoute><EditNHISClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/private/:id/edit"   element={<ProtectedRoute><EditPrivateClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/corporate/:id/edit" element={<ProtectedRoute><EditCorporateClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/batches"    element={<ProtectedRoute><ClaimBatches /></ProtectedRoute>} />
          <Route path="reports"                     element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="referrals"                   element={<ProtectedRoute><Referrals /></ProtectedRoute>} />

          <Route path="corporate-accounts"     element={<ProtectedRoute><CorporateAccounts /></ProtectedRoute>} />
          <Route path="corporate-accounts/:id" element={<ProtectedRoute><CorporateAccounts /></ProtectedRoute>} />

          {/* Counter: walk-in tickets held against a CounterClient, not the patient register */}
          <Route path="counter" element={<ProtectedRoute><Counter /></ProtectedRoute>} />

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