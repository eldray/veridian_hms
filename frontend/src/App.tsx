// src/App.tsx (updated with Vitals route, permission mapping, and added 'vitals' to doctor role)
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { useToastStore } from './store/toastStore';
import { ToastContainer } from './components/ToastContainer';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import PatientRegistration from './pages/PatientRegistration';
import Patients from './pages/Patients';
import Attendance from './pages/Attendance';
import Admissions from './pages/Admissions';
import Billing from './pages/Billing';
import Pharmacy from './pages/Pharmacy';
import Reports from './pages/Reports';
import LabResults from './pages/LabResults';
import DispenseMedication from './pages/DispenseMedication';
import MedicalEntries from './pages/MedicalEntries';
import ProcessPayment from './pages/ProcessPayment';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Vitals from './pages/Vitals';
// NEW COMPONENTS
import UserRegistration from './pages/UserRegistration';
import PatientDetails from './pages/PatientDetails';
import AttendanceDetails from './pages/AttendanceDetails';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import StockManagement from './pages/StockManagement';
import InsuranceProviders from './pages/InsuranceProviders';
import InsuranceClaims from './pages/InsuranceClaims';
import ServiceCatalog from './pages/ServiceCatalog';
import WardManagement from './pages/WardManagement';
// Role-based access control with updated roles
const rolePermissions = {
  admin: ['*'],
  doctor: [
    'dashboard', 'patients', 'attendance', 'admissions', 'billing',
    'pharmacy', 'lab_results', 'medical_entries', 'reports', 'profile',
    'insurance_claims', 'service_catalog', 'vitals'  // ADDED: 'vitals' for doctors
  ],
  nurse: [
    'dashboard', 'patients', 'attendance', 'admissions', 'medical_entries',
    'vitals', 'profile', 'ward_management'
  ],
  midwife: [
    'dashboard', 'patients', 'attendance', 'admissions', 'medical_entries',
    'vitals', 'profile', 'ward_management'
  ],
  records: [
    'dashboard', 'patients', 'attendance', 'reports', 'profile'
  ],
  lab_tech: [
    'dashboard', 'patients', 'attendance', 'lab_results', 'profile'
  ],
  pharmacist: [
    'dashboard', 'pharmacy', 'dispense_medication', 'stock_management', 'profile'
  ],
  accounts: [
    'dashboard', 'billing', 'reports', 'process_payment', 'insurance_providers',
    'insurance_claims', 'profile'
  ],
};
const hasPermission = (userRole: string, routePath: string) => {
  const userPermissions = rolePermissions[userRole as keyof typeof rolePermissions];
  if (userPermissions.includes('*')) return true;
  const routeToPermission: Record<string, string> = {
    // Dashboard
    '/dashboard': 'dashboard',
    // Patient Management
    '/dashboard/patients': 'patients',
    '/dashboard/patients/register': 'patients',
    '/dashboard/patients/:id': 'patients',
    // Attendance Management
    '/dashboard/attendance': 'attendance',
    '/dashboard/attendance/new': 'attendance',
    '/dashboard/attendance/:id': 'attendance',
    // Admissions & Wards
    '/dashboard/admissions': 'admissions',
    '/dashboard/wards': 'ward_management',
    // Billing & Insurance
    '/dashboard/billing': 'billing',
    '/dashboard/billing/:billId/payment': 'billing',
    '/dashboard/insurance-providers': 'insurance_providers',
    '/dashboard/insurance-claims': 'insurance_claims',
    // Pharmacy & Stock
    '/dashboard/pharmacy': 'pharmacy',
    '/dashboard/pharmacy/dispense': 'pharmacy',
    '/dashboard/stock': 'stock_management',
    // Clinical & Medical
    '/dashboard/lab-results': 'lab_results',
    '/dashboard/medical-entries': 'medical_entries',
    '/dashboard/vitals': 'vitals',  // ADDED: Permission mapping for vitals
    '/dashboard/service-catalog': 'service_catalog',
    // Reports
    '/dashboard/reports': 'reports',
    // User Management
    '/dashboard/users': 'user_management',
    '/dashboard/users/register': 'user_management',
    // Profile & Settings
    '/dashboard/profile': 'profile',
    '/dashboard/settings': 'settings',
  };
  if (routeToPermission[routePath]) {
    return userPermissions.includes(routeToPermission[routePath]);
  }
  // Dynamic route matching
  if (routePath.match(/^\/dashboard\/billing\/[^/]+\/payment$/)) {
    return userPermissions.includes('billing');
  }
  if (routePath.match(/^\/dashboard\/patients\/[^/]+$/)) {
    return userPermissions.includes('patients');
  }
  if (routePath.match(/^\/dashboard\/attendance\/[^/]+$/)) {
    return userPermissions.includes('attendance');
  }
  return false;
};
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  const currentPath = window.location.pathname;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!hasPermission(user.role, currentPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-red-50 p-8 rounded-lg border border-red-200 max-w-md">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            You don't have permission to access this page.
          </p>
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
  const currentPath = window.location.pathname;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user.role, currentPath)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-800 mb-2">Access Restricted</h2>
          <p className="text-red-600">Your role doesn't have access to this page.</p>
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
  const { checkAuth, user, isLoading } = useAuthStore();
  const { toasts, removeToast } = useToastStore();
  const [appLoading, setAppLoading] = useState(true);
  useEffect(() => {
    const initializeApp = async () => {
      console.log('🚀 Initializing app...');
      try {
        await checkAuth();
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setAppLoading(false);
        console.log('✅ App initialized');
      }
    };
    initializeApp();
  }, [checkAuth]);
  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Initializing app...</p>
        </div>
      </div>
    );
  }
  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route
          path="/login"
          element={useAuthStore.getState().user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        {/* Redirect old routes */}
        <Route path="/medical-entries" element={<Navigate to="/dashboard/medical-entries" replace />} />
        <Route path="/lab-results" element={<Navigate to="/dashboard/lab-results" replace />} />
        <Route path="/pharmacy/dispense" element={<Navigate to="/dashboard/pharmacy/dispense" replace />} />
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<DashboardLayoutWrapper />}>
          <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          {/* Patient Management */}
          <Route path="patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
          <Route path="patients/register" element={<ProtectedRoute><PatientRegistration /></ProtectedRoute>} />
          <Route path="patients/:id" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
          {/* Attendance Management */}
          <Route path="attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="attendance/:id" element={<ProtectedRoute><AttendanceDetails /></ProtectedRoute>} />
          {/* Admissions & Ward Management */}
          <Route path="admissions" element={<ProtectedRoute><Admissions /></ProtectedRoute>} />
          <Route path="wards" element={<ProtectedRoute><WardManagement /></ProtectedRoute>} />
          {/* Clinical & Medical */}
          <Route path="lab-results" element={<ProtectedRoute><LabResults /></ProtectedRoute>} />
          <Route path="medical-entries" element={<ProtectedRoute><MedicalEntries /></ProtectedRoute>} />
          <Route path="vitals" element={<ProtectedRoute><Vitals /></ProtectedRoute>} />  {/* ADDED: Vitals route */}
          <Route path="service-catalog" element={<ProtectedRoute><ServiceCatalog /></ProtectedRoute>} />
          {/* Pharmacy & Stock Management */}
          <Route path="pharmacy" element={<ProtectedRoute><Pharmacy /></ProtectedRoute>} />
          <Route path="pharmacy/dispense" element={<ProtectedRoute><DispenseMedication /></ProtectedRoute>} />
          <Route path="stock" element={<ProtectedRoute><StockManagement /></ProtectedRoute>} />
          {/* Billing & Insurance */}
          <Route path="billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
          <Route path="billing/:billId/payment" element={<ProtectedRoute><ProcessPayment /></ProtectedRoute>} />
          <Route path="insurance-providers" element={<ProtectedRoute><InsuranceProviders /></ProtectedRoute>} />
          <Route path="insurance-claims" element={<ProtectedRoute><InsuranceClaims /></ProtectedRoute>} />
          {/* Reports */}
          <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          {/* User Management (Admin only) */}
          <Route path="users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
          <Route path="users/register" element={<ProtectedRoute><UserRegistration /></ProtectedRoute>} />
          {/* Profile & Settings */}
          <Route path="profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;