// src/App.tsx - UPDATED WITH STOCK REPORTS AND ALL PAGES
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { ToastContainer } from './components/ToastContainer';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

// Pages
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import Patients from './pages/Patients';
import Attendance from './pages/Attendance';
import Admissions from './pages/Admissions';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Laboratory from './pages/Laboratory';
import AdmissionDetails from './pages/AdmissionDetails';
import Pharmacy from './pages/Pharmacy';
import MedicalEntries from './pages/MedicalEntries';
import ProcessPayment from './pages/ProcessPayment';
import Login from './pages/Login';
import Vitals from './pages/Vitals';
import PatientDetails from './pages/PatientDetails';
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
import ClaimBatches from './pages/ClaimBatches';
import WardManagement from './pages/WardManagement';
import Notifications from './pages/Notifications';
import Appointments from './pages/Appointments';
import Departments from './pages/Departments';
import Antenatal from './pages/Antenatal';
import Scans from './pages/Scans';
import InvoiceManagement from './pages/InvoiceManagement';
import RequisitionManagement from './pages/RequisitionManagement';
import StockTransactions from './pages/StockTransactions';
import StockReports from './pages/StockReports'; // ✅ NEW IMPORT
import PatientBillingItems from './pages/PatientBillingItems';
import Referrals from './pages/Referrals';

import './App.css';

// Role Permissions - COMPREHENSIVE
const rolePermissions = {
  admin: ['*'],
  doctor: [
    'dashboard', 'patients', 'attendance', 'admissions', 'billing',
    'pharmacy', 'laboratory', 'medical_entries', 'reports', 'profile',
    'insurance_claims', 'service_catalog', 'vitals', 'appointments', 'theatre',
    'nursing', 'antenatal', 'scans', 'wards', 'departments'
  ],
  nurse: [
    'dashboard', 'patients', 'attendance', 'admissions', 'medical_entries',
    'vitals', 'profile', 'wards', 'appointments', 'requisitions', 'nursing',
    'antenatal', 'theatre'
  ],
  midwife: [
    'dashboard', 'patients', 'attendance', 'admissions', 'medical_entries',
    'vitals', 'profile', 'wards', 'appointments', 'requisitions', 'nursing',
    'antenatal', 'delivery', 'theatre'
  ],
  records: [
    'dashboard', 'patients', 'attendance', 'admissions', 'reports', 'profile',
    'appointments'
  ],
  lab_tech: [
    'dashboard', 'patients', 'attendance', 'laboratory', 'profile', 'reports',
    'appointments', 'scans'
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'inventory', 'stock_management', 'profile',
    'invoices', 'requisitions', 'stock_transactions', 'reports', 'stock_reports'
  ],
  accounts: [
    'dashboard', 'billing', 'reports', 'process_payment', 'insurance_providers',
    'insurance_claims', 'profile', 'invoices', 'stock_transactions'
  ],
  sonographer: [
    'dashboard', 'patients', 'attendance', 'medical_entries', 'profile',
    'laboratory', 'scans', 'appointments', 'reports'
  ],
};

const hasPermission = (userRole: string, routePath: string) => {
  const perms = rolePermissions[userRole as keyof typeof rolePermissions];
  if (perms?.includes('*')) return true;

  const routeMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/dashboard/patients': 'patients',
    '/dashboard/patients/register': 'patients',
    '/dashboard/patients/:id': 'patients',
    '/dashboard/attendance': 'attendance',
    '/dashboard/attendance/:id': 'attendance',
    '/dashboard/admissions': 'admissions',
    '/dashboard/admissions/:id': 'admissions',
    '/dashboard/wards': 'wards',
    '/dashboard/billing': 'billing',
    '/dashboard/billing/:billId/payment': 'billing',
    '/dashboard/insurance-providers': 'insurance_providers',
    '/dashboard/insurance-claims': 'insurance_claims',
    '/dashboard/insurance-claims/:id/edit': 'insurance_claims',
    '/dashboard/inventory': 'inventory',
    '/dashboard/pharmacy': 'pharmacy',
    '/dashboard/stock': 'stock_management',
    '/dashboard/stock/reports': 'stock_reports', // ✅ NEW
    '/dashboard/theatre': 'theatre',
    '/dashboard/nursing': 'nursing',
    '/dashboard/antenatal': 'antenatal',
    '/dashboard/scans': 'scans',
    '/dashboard/invoices': 'invoices',
    '/dashboard/invoices/create': 'invoices',
    '/dashboard/invoices/:id': 'invoices',
    '/dashboard/requisitions': 'requisitions',
    '/dashboard/requisitions/create': 'requisitions',
    '/dashboard/requisitions/:id': 'requisitions',
    '/dashboard/transactions': 'stock_transactions',
    '/dashboard/laboratory': 'laboratory',
    '/dashboard/medical-entries': 'medical_entries',
    '/dashboard/medicalservices': 'service_catalog',
    '/dashboard/vitals': 'vitals',
    '/dashboard/service-catalog': 'service_catalog',
    '/dashboard/reports': 'reports',
    '/dashboard/profile': 'profile',
    '/dashboard/settings': 'settings',
    '/dashboard/notifications': 'dashboard',
    '/dashboard/appointments': 'appointments',
    '/dashboard/departments': 'departments',
    '/dashboard/referrals': 'referrals',
  };

  const permission = routeMap[routePath];
  if (permission) return perms?.includes(permission);

  // Dynamic routes
  if (routePath.match(/^\/dashboard\/patients\/[^/]+$/)) return perms?.includes('patients');
  if (routePath.match(/^\/dashboard\/attendance\/[^/]+$/)) return perms?.includes('attendance');
  if (routePath.match(/^\/dashboard\/admissions\/[^/]+$/)) return perms?.includes('admissions');
  if (routePath.match(/^\/dashboard\/billing\/[^/]+\/payment$/)) return perms?.includes('billing');
  if (routePath.match(/^\/dashboard\/invoices\/[^/]+$/)) return perms?.includes('invoices');
  if (routePath.match(/^\/dashboard\/requisitions\/[^/]+$/)) return perms?.includes('requisitions');

  return false;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const path = window.location.pathname;

  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, path)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center bg-red-50 dark:bg-red-900/20 p-8 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
          <h2 className="text-2xl font-bold text-red-800 dark:text-red-400 mb-2">Access Denied</h2>
          <p className="text-red-600 dark:text-red-300 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const DashboardLayoutWrapper = () => {
  const { user } = useAuthStore();
  const path = window.location.pathname;

  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, path)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-800 dark:text-red-400 mb-2">Access Restricted</h2>
          <p className="text-red-600 dark:text-red-300">Your role doesn't have access to this page.</p>
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

function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await checkAuth();
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setAppLoading(false);
      }
    };
    init();
  }, [checkAuth]);

  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg dark:text-white">Initializing app...</p>
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
          element={useAuthStore.getState().user ? <Navigate to="/dashboard" replace /> : <Login />}
        />

        {/* Legacy Redirects */}
        <Route path="/medical-entries" element={<Navigate to="/dashboard/medical-entries" replace />} />
        <Route path="/laboratory" element={<Navigate to="/dashboard/laboratory" replace />} />
        <Route path="/pharmacy" element={<Navigate to="/dashboard/pharmacy" replace />} />
        <Route path="/stock/reports" element={<Navigate to="/dashboard/stock/reports" replace />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayoutWrapper />}>
          <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Patient routes */}
          <Route path="patients/register" element={<ProtectedRoute><PatientRegistration /></ProtectedRoute>} />
          <Route path="patients/:id" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
          <Route path="patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          
          {/* Attendance routes */}
          <Route path="attendance/:id" element={<ProtectedRoute><AttendanceDetails /></ProtectedRoute>} />
          <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          
          {/* Clinical routes */}
          <Route path="admissions/:id" element={<ProtectedRoute><AdmissionDetails /></ProtectedRoute>} />
          <Route path="admissions" element={<ProtectedRoute><Admissions /></ProtectedRoute>} />
          <Route path="wards" element={<ProtectedRoute><WardManagement /></ProtectedRoute>} />
          <Route path="laboratory" element={<ProtectedRoute><Laboratory /></ProtectedRoute>} />
          <Route path="scans" element={<ProtectedRoute><Scans /></ProtectedRoute>} />
          <Route path="medical-entries" element={<ProtectedRoute><MedicalEntries /></ProtectedRoute>} />
          <Route path="medical-entries/:attendanceId" element={<ProtectedRoute><MedicalEntries /></ProtectedRoute>} />
          <Route path="vitals" element={<ProtectedRoute><Vitals /></ProtectedRoute>} />
          <Route path="medicalservices" element={<ProtectedRoute><MedicalServicesManagement /></ProtectedRoute>} />
          
          {/* Theatre & Nursing routes */}
          <Route path="theatre" element={<ProtectedRoute><Theatre /></ProtectedRoute>} />
          <Route path="nursing" element={<ProtectedRoute><Nursing /></ProtectedRoute>} />
          <Route path="antenatal" element={<ProtectedRoute><Antenatal /></ProtectedRoute>} />
          
          {/* Inventory & Pharmacy routes */}
          <Route path="inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="pharmacy" element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
          <Route path="stock" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
          
          {/* Stock Reports - ✅ NEW ROUTE */}
          <Route path="stock/reports" element={<ProtectedRoute><StockReports /></ProtectedRoute>} />
          
          {/* Stock Management routes */}
          <Route path="invoices" element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="invoices/create" element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="invoices/:id" element={<ProtectedRoute><InvoiceManagement /></ProtectedRoute>} />
          <Route path="requisitions" element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="requisitions/create" element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="requisitions/:id" element={<ProtectedRoute><RequisitionManagement /></ProtectedRoute>} />
          <Route path="transactions" element={<ProtectedRoute><StockTransactions /></ProtectedRoute>} />
          
          {/* Billing & Insurance routes */}
          <Route path="patients/:patientId/billing" element={<ProtectedRoute><PatientBillingItems /></ProtectedRoute>} />
          <Route path="billing/:billId/payment" element={<ProtectedRoute><ProcessPayment /></ProtectedRoute>} />
          <Route path="billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="insurance-providers" element={<ProtectedRoute><InsuranceProviders /></ProtectedRoute>} />
          <Route path="insurance-claims" element={<ProtectedRoute><InsuranceClaims /></ProtectedRoute>} />
          <Route path="insurance-claims/:id/edit" element={<ProtectedRoute><EditInsuranceClaim /></ProtectedRoute>} />
          <Route path="insurance-claims/batches" element={<ProtectedRoute><ClaimBatches /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          
          {/* User & System routes */}
          <Route path="profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          <Route path="departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;