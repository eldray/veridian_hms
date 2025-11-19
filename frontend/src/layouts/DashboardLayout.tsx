// src/layouts/DashboardLayout.tsx
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
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
  Sun,
  Moon,
  MessageSquare,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const { 
    notifications: storeNotifications, 
    unreadCount: storeUnreadCount,
    markAsRead,
    markAllAsRead 
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        setLoading(true);
        const hospitalData = await getHospital();
        setHospital(hospitalData);
      } catch (error) {
        console.error('Error fetching hospital data:', error);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts', 'records', 'sonographer'] },
    { name: 'Patients', path: '/dashboard/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts', 'records', 'sonographer'] },
    { name: 'Attendance', path: '/dashboard/attendance', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer'] },
    { name: 'Appointments', path: '/dashboard/appointments', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
    { name: 'Medical Entries', path: '/dashboard/medical-entries', icon: Stethoscope, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
    { name: 'Laboratory', path: '/dashboard/laboratory', icon: FlaskConical, roles: ['admin', 'doctor', 'nurse', 'lab_tech', 'sonographer'] },
    { name: 'Admissions', path: '/dashboard/admissions', icon: BedDouble, roles: ['admin', 'doctor', 'nurse', 'midwife'] },
    { name: 'Departments', path: '/dashboard/departments', icon: Building, roles: ['admin'] },
    { name: 'Billing', path: '/dashboard/billing', icon: DollarSign, roles: ['admin', 'doctor', 'accounts'] },
    { name: 'Insurance Claims', path: '/dashboard/insurance-claims', icon: FileSearch, roles: ['admin', 'doctor', 'accounts'] },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package, roles: ['admin', 'pharmacist', 'doctor'] },
    { name: 'Pharmacy', path: '/dashboard/pharmacy', icon: Pill, roles: ['admin', 'pharmacist'] },
    { name: 'Stock Management', path: '/dashboard/stock', icon: Warehouse, roles: ['admin', 'pharmacist'] },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['admin', 'doctor'] },
    { name: 'Reports', path: '/dashboard/reports', icon: BarChart3, roles: ['admin', 'accounts', 'records'] },
  ];

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.some((role) => hasRole([role]))
  );

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-56';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Bar - Smaller and cuter */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-40 w-full h-14">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Left: Menu + Veridian HMS */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Veridian HMS on far left */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">Veridian HMS</h1>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">Hospital System</p>
              </div>
            </div>
          </div>

          {/* Centered Hospital Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 w-32 bg-[var(--text-tertiary)] rounded"></div>
                <div className="h-3 w-24 bg-[var(--text-tertiary)] rounded mt-1 mx-auto"></div>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                  {hospital?.name || 'Veridian Hospital'}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] leading-tight">
                  {hospital?.type || 'Medical Center'}
                </p>
              </>
            )}
          </div>

          {/* Right: Notifications + Dark Mode + User */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-1.5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              >
                <Bell className="w-4 h-4" />
                {storeUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                    {storeUnreadCount > 9 ? '9+' : storeUnreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border border-[var(--border-color)] z-50 max-h-96 overflow-hidden bg-[var(--bg-card)]">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
                      {storeUnreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {storeNotifications.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-secondary)]">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    ) : (
                      storeNotifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-[var(--border-color)] cursor-pointer ${
                            !notification.isRead ? 'bg-[var(--icon-cyan-bg)]/20' : 'hover:bg-[var(--bg-main)]'
                          }`}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.actionUrl) {
                              navigate(notification.actionUrl);
                            }
                            setNotificationDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              notification.isRead 
                                ? 'bg-[var(--text-tertiary)]' 
                                : 'bg-[var(--icon-cyan-text)]'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                                {notification.title}
                              </p>
                              <p className="text-xs mt-1 line-clamp-2 text-[var(--text-secondary)]">
                                {notification.message}
                              </p>
                              <p className="text-xs mt-1 text-[var(--text-tertiary)]">
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-[var(--border-color)]">
                    <Link
                      to="/dashboard/notifications"
                      className="block text-center text-sm py-1 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80"
                      onClick={() => setNotificationDropdownOpen(false)}
                    >
                      View all
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-sm border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              >
                <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold truncate max-w-24">{user?.fullName}</p>
                  <p className="text-[10px] capitalize text-[var(--text-secondary)]">{user?.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown className={`w-3 h-3 transition-transform ${
                  userDropdownOpen ? 'rotate-180' : ''
                } text-[var(--text-secondary)]`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-[var(--border-color)] py-1 z-50 bg-[var(--bg-card)]">
                  <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{user?.fullName}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize">{user?.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded px-2 py-1 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>My Profile</span>
                    </Link>
                    {hasRole(['admin']) && (
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>System Settings</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)]/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Fixed to start below navbar */}
        <aside
          className={`fixed top-14 left-0 bottom-0 z-30 ${sidebarWidth} bg-[var(--bg-main)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 flex flex-col`}
        >
          {/* Sidebar Header with Close/Collapse Button at TOP */}
          <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-[var(--bg-card)] rounded flex items-center justify-center">
                  <Heart className="w-3 h-3 text-[var(--text-secondary)]" />
                </div>

                                <div className="flex flex-col min-w-0">
                  <h1 className="text-xs font-bold text-[var(--text-primary)] truncate">Navigation</h1>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <div className="space-y-0.5">
              {visibleNavItems.map((item) => {
                const isActive =
                  (item.path === '/dashboard' && location.pathname === '/dashboard') ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));

                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 rounded-lg transition-all duration-200 group text-xs ${
                      sidebarCollapsed ? 'px-2 py-2.5 justify-center' : 'px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${
                      isActive 
                        ? 'text-[var(--text-primary)]' 
                        : 'text-[var(--text-secondary)]'
                    }`} />
                    {!sidebarCollapsed && (
                      <span className="font-medium truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'
        } mt-14`}>
          {children}
        </main>
      </div>
    </div>
  );
}