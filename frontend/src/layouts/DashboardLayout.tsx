// src/layouts/DashboardLayout.tsx
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Hospital,
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Package,
  BedDouble,
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
  Stethoscope,
  FlaskConical,
  Pill,
  ChevronDown,
  Settings,
  Bell,
  Heart,
  Shield,
  ClipboardList,
  Building,
  CreditCard,
  FileSearch,
  Warehouse,
  Calendar,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getHospital } from '../api';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface HospitalData {
  id: string;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default to collapsed (icons only)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch hospital data
  useEffect(() => {
    const fetchHospital = async () => {
      try {
        setLoading(true);
        const hospitalData = await getHospital();
        setHospital(hospitalData);
      } catch (error) {
        console.error('Error fetching hospital data:', error);
        // Fallback to default hospital name
        setHospital({
          id: '1',
          name: 'Veridian Hospital',
          type: 'General Hospital'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHospital();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigationItems = [
    // Dashboard
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts', 'records'],
    },
    
    // Patient Management
    {
      name: 'Patients',
      path: '/dashboard/patients',
      icon: Users,
      roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts', 'records'],
    },
    
    // Clinical Workflow
    {
      name: 'Attendance',
      path: '/dashboard/attendance',
      icon: Calendar,
      roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech'],
    },
    {
      name: 'Medical Entries',
      path: '/dashboard/medical-entries',
      icon: Stethoscope,
      roles: ['admin', 'doctor', 'nurse', 'midwife'],
    },
    {
      name: 'Lab Results',
      path: '/dashboard/lab-results',
      icon: FlaskConical,
      roles: ['admin', 'doctor', 'nurse', 'lab_tech'],
    },
    
    // Admissions & Wards
    {
      name: 'Admissions',
      path: '/dashboard/admissions',
      icon: BedDouble,
      roles: ['admin', 'doctor', 'nurse', 'midwife'],
    },
    {
      name: 'Ward Management',
      path: '/dashboard/wards',
      icon: Building,
      roles: ['admin', 'nurse', 'midwife'],
    },
    
    // Billing & Insurance
    {
      name: 'Billing',
      path: '/dashboard/billing',
      icon: DollarSign,
      roles: ['admin', 'doctor', 'accounts'],
    },
    {
      name: 'Insurance Providers',
      path: '/dashboard/insurance-providers',
      icon: Shield,
      roles: ['admin', 'accounts'],
    },
    {
      name: 'Insurance Claims',
      path: '/dashboard/insurance-claims',
      icon: FileSearch,
      roles: ['admin', 'doctor', 'accounts'],
    },
    
    // Pharmacy & Inventory
    {
      name: 'Pharmacy',
      path: '/dashboard/pharmacy',
      icon: Package,
      roles: ['admin', 'pharmacist', 'doctor'],
    },
    {
      name: 'Dispense Medication',
      path: '/dashboard/pharmacy/dispense',
      icon: Pill,
      roles: ['admin', 'pharmacist'],
    },
    {
      name: 'Stock Management',
      path: '/dashboard/stock',
      icon: Warehouse,
      roles: ['admin', 'pharmacist'],
    },
    
    // Services & Catalog
    {
      name: 'Service Catalog',
      path: '/dashboard/service-catalog',
      icon: ClipboardList,
      roles: ['admin', 'doctor'],
    },
    
    // Reports
    {
      name: 'Reports',
      path: '/dashboard/reports',
      icon: BarChart3,
      roles: ['admin', 'accounts', 'records'],
    },
    
    // User Management (Admin only)
    {
      name: 'User Management',
      path: '/dashboard/users',
      icon: Users,
      roles: ['admin'],
    },
  ];

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.some((role) => hasRole([role]))
  );

  const sidebarWidth = sidebarCollapsed ? 'w-20' : 'w-80';
  const mainContentMargin = sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-80';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full ${sidebarWidth} bg-gradient-to-b from-slate-800 to-blue-900 border-r border-blue-700/50 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 shadow-2xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area - Enhanced with Veridian HMS */}
          <div className={`p-4 border-b border-blue-700/50 bg-gradient-to-r from-blue-800/50 to-slate-800/50 backdrop-blur-sm ${
            sidebarCollapsed ? 'px-3' : 'px-6'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20 flex-shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                {!sidebarCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-lg font-bold text-white truncate">Veridian HMS</h1>
                    <p className="text-blue-200 text-xs mt-0.5">Hospital Management</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden text-blue-200 hover:text-white transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Collapse/Expand button - hidden on mobile */}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden lg:flex text-blue-200 hover:text-white transition-colors flex-shrink-0 ml-2"
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {visibleNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path) && item.path !== '/dashboard';
                const isDashboardActive = item.path === '/dashboard' && location.pathname === '/dashboard';
                const active = isDashboardActive || isActive;

                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl transition-all duration-200 group ${
                      sidebarCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'
                    } ${
                      active
                        ? 'bg-white/20 text-white border-l-4 border-blue-400 shadow-lg backdrop-blur-sm'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white border-l-4 border-transparent hover:border-blue-400/50'
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${
                      active ? 'text-blue-300' : 'text-blue-200 group-hover:text-blue-300'
                    }`} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium text-sm whitespace-nowrap">{item.name}</span>
                        {active && (
                          <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0"></div>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User info at bottom of sidebar - only show when expanded */}
            {!sidebarCollapsed && (
              <div className="mt-6 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {user?.fullName || 'User'}
                    </p>
                    <p className="text-blue-200 text-xs capitalize truncate">
                      {user?.role.replace('_', ' ') || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className={`${mainContentMargin} transition-all duration-300`}>
        {/* Top bar with Hospital Name and User Dropdown */}
        <header className="bg-white border-b border-gray-200/50 sticky top-0 z-30 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3"> {/* Reduced padding */}
            {/* Left: Menu button and Hospital Name */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-800 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {/* Hospital Name from API */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
                  <Hospital className="w-4 h-4 text-white" />
                </div>
                <div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="h-5 w-40 bg-gray-200 rounded mb-1"></div>
                      <div className="h-3 w-32 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl font-bold text-gray-800"> {/* Reduced text size */}
                        {hospital?.name || 'Veridian Hospital'}
                      </h1>
                      <p className="text-gray-600 text-xs"> {/* Reduced text size */}
                        {hospital?.type || 'Medical Center'} • {hospital?.address || 'Healthcare Excellence'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: User dropdown */}
            <div className="flex items-center gap-3" ref={dropdownRef}> {/* Reduced gap */}
              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 group">
                <div className="relative">
                  <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" /> {/* Smaller icon */}
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                    3
                  </span>
                </div>
              </button>

              {/* User dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 group border border-gray-200 hover:border-gray-300"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                    <p className="text-xs text-gray-600 capitalize">
                      {user?.role.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Dropdown menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200/80 backdrop-blur-sm py-2 z-50"> /* Reduced size */
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-gray-50 rounded-t-xl">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-900 truncate">{user?.fullName}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {user?.role.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 bg-white/80 rounded px-2 py-1 border border-gray-200 truncate">
                        {user?.email}
                      </p>
                    </div>

                    {/* Dropdown items */}
                    <div className="py-1">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 transition-all duration-200 group text-sm"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <User className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        <span className="font-medium">My Profile</span>
                      </Link>

                      {hasRole(['admin']) && (
                        <Link
                          to="/dashboard/settings"
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 transition-all duration-200 group text-sm"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          <Settings className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          <span className="font-medium">System Settings</span>
                        </Link>
                      )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-all duration-200 group rounded-b-xl text-sm"
                      >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4"> {/* Reduced padding */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 min-h-[calc(100vh-100px)]"> /* Reduced border radius */
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
