// src/layouts/DashboardLayout.tsx - UPDATED WITH CONSISTENT ICONS
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useHospitalStore } from '../store/hospitalStore';
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
  Baby,
  Scissors,
  Syringe,
  Clipboard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Printer,
  Search,
  Filter,
  MoreVertical,
  Home,
  Briefcase,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  Stethoscope as StethoscopeIcon,
  Activity as ActivityIcon,
  Scissors as ScissorsIcon,
  Syringe as SyringeIcon,
  Baby as BabyIcon,
  Microscope,
  HeartPulse,
  Ambulance,
  Prescription,
  TestTube,
  XRay,
  Brain,
  Bone,
  Eye as EyeIcon,
  Ear,
  Tooth,
  FlaskRound as FlaskRoundIcon,
  Microscope as MicroscopeIcon,
  Pill as PillIcon,
  Package as PackageIcon,
  Warehouse as WarehouseIcon,
  Truck,
  ShoppingCart,
  Receipt,
  CreditCard as CreditCardIcon,
  Banknote,
  Wallet,
  PiggyBank,
  Landmark,
  FileText as FileTextIcon,
  ClipboardList as ClipboardListIcon,
  FileSearch as FileSearchIcon,
  BarChart,
  PieChart,
  LineChart,
  TrendingUp as TrendingUpIcon,
  Users as TeamIcon,
  Building as BuildingIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  Bell as BellIcon,
  MessageSquare as MessageSquareIcon,
  User as UserIcon,
  LogOut as LogOutIcon,
  Menu as MenuIcon,
  X as XIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

// Navigation items with consistent icons - matching the Medical Entries page style
const navigationItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'pharmacist', 'accounts', 'records', 'sonographer'] },
  { name: 'Patients', path: '/dashboard/patients', icon: Users, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'accounts', 'records', 'sonographer'] },
  { name: 'Attendance', path: '/dashboard/attendance', icon: Calendar, roles: ['admin', 'doctor', 'nurse', 'midwife', 'lab_tech', 'sonographer'] },
  { name: 'Appointments', path: '/dashboard/appointments', icon: CalendarIcon, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Medical Entries', path: '/dashboard/medical-entries', icon: Clipboard, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Vitals', path: '/dashboard/vitals', icon: HeartPulse, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Theatre', path: '/dashboard/theatre', icon: Scissors, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Nursing', path: '/dashboard/nursing', icon: Syringe, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Antenatal', path: '/dashboard/antenatal', icon: Baby, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Laboratory', path: '/dashboard/laboratory', icon: Microscope, roles: ['admin', 'doctor', 'nurse', 'lab_tech', 'sonographer'] },
  { name: 'Pharmacy', path: '/dashboard/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'] },
  { name: 'Inventory', path: '/dashboard/inventory', icon: Package, roles: ['admin', 'pharmacist', 'doctor'] },
  { name: 'Stock', path: '/dashboard/stock', icon: Warehouse, roles: ['admin', 'pharmacist'] },
  { name: 'Admissions', path: '/dashboard/admissions', icon: BedDouble, roles: ['admin', 'doctor', 'nurse', 'midwife'] },
  { name: 'Billing', path: '/dashboard/billing', icon: DollarSign, roles: ['admin', 'doctor', 'accounts'] },
  { name: 'Insurance', path: '/dashboard/insurance-claims', icon: Shield, roles: ['admin', 'doctor', 'accounts'] },
  { name: 'Departments', path: '/dashboard/departments', icon: Building, roles: ['admin'] },
  { name: 'Reports', path: '/dashboard/reports', icon: TrendingUp, roles: ['admin', 'accounts', 'records'] },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['admin', 'doctor'] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Changed to false for better UX
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const { hospital, fetchHospital, isLoading: hospitalLoading } = useHospitalStore();
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
    const loadHospital = async () => {
      try {
        await fetchHospital();
      } catch (error) {
        console.error('Error fetching hospital data:', error);
      }
    };
    loadHospital();
  }, [fetchHospital]);

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

  const visibleNavItems = navigationItems.filter((item) =>
    item.roles.some((role) => hasRole([role]))
  );

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Bar - Slender and cute */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-40 w-full h-12">
        <div className="flex items-center justify-between px-4 h-full">
          {/* Left: Menu Icon */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Logo - Hidden on mobile when sidebar is collapsed */}
            <div className="hidden lg:flex items-center gap-1.5">
              <div className="w-6 h-6 bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-lg flex items-center justify-center">
                <Heart className="w-3 h-3 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xs font-bold text-[var(--text-primary)] leading-tight">Veridian HMS</h1>
                  <p className="text-[9px] text-[var(--text-secondary)] leading-tight">Healthcare System</p>
                </div>
              )}
            </div>
          </div>

          {/* Centered Hospital Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            {hospitalLoading ? (
              <div className="animate-pulse">
                <div className="h-3 w-28 bg-[var(--text-tertiary)] rounded"></div>
                <div className="h-2 w-20 bg-[var(--text-tertiary)] rounded mt-0.5 mx-auto"></div>
              </div>
            ) : (
              <>
                <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                  {hospital?.name || 'Veridian Hospital'}
                </h1>
                <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                  {hospital?.nhisFacilityType || 'Medical Center'}
                </p>
              </>
            )}
          </div>

          {/* Right: Dark Mode + Notifications + User */}
          <div className="flex items-center gap-1.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-1.5 rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              >
                <Bell className="w-3.5 h-3.5" />
                {storeUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-medium">
                    {storeUnreadCount > 9 ? '9+' : storeUnreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border border-[var(--border-color)] z-50 max-h-96 overflow-hidden bg-[var(--bg-card)]">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-xs text-[var(--text-primary)]">Notifications</h3>
                      {storeUnreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-[10px] text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {storeNotifications.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-secondary)]">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">No notifications</p>
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
                            <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                              notification.isRead 
                                ? 'bg-[var(--text-tertiary)]' 
                                : 'bg-[var(--icon-cyan-text)]'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate text-[var(--text-primary)]">
                                {notification.title}
                              </p>
                              <p className="text-[10px] mt-0.5 line-clamp-2 text-[var(--text-secondary)]">
                                {notification.message}
                              </p>
                              <p className="text-[9px] mt-0.5 text-[var(--text-tertiary)]">
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
                      className="block text-center text-[10px] py-1 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80"
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
                className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-all text-xs border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              >
                <div className="w-5 h-5 bg-gradient-to-r from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-full flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-white" />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-[10px] font-semibold truncate max-w-20">{user?.fullName?.split(' ')[0] || 'User'}</p>
                  <p className="text-[9px] capitalize text-[var(--text-secondary)]">{user?.role?.replace('_', ' ') || 'Role'}</p>
                </div>
                <ChevronDown className={`w-2.5 h-2.5 transition-transform ${
                  userDropdownOpen ? 'rotate-180' : ''
                } text-[var(--text-secondary)]`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-[var(--border-color)] py-1 z-50 bg-[var(--bg-card)]">
                  <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-gradient-to-r from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-[var(--text-primary)]">{user?.fullName}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize">{user?.role?.replace('_', ' ')}</p>
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
                      <UserIcon className="w-4 h-4" />
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
        {/* Sidebar */}
        <aside
          className={`fixed top-12 left-0 bottom-0 z-30 ${sidebarWidth} bg-[var(--bg-main)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 flex flex-col`}
        >
          {/* Sidebar Header */}
          <div className="p-2 border-b border-[var(--border-color)] flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1.5 px-1">
                <div className="w-5 h-5 bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-lg flex items-center justify-center">
                  <Heart className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Menu</span>
              </div>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
            <div className="space-y-0.5 px-2">
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
                    className={`flex items-center gap-2 rounded-lg transition-all duration-200 group ${
                      sidebarCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]'
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${
                      isActive 
                        ? 'text-[var(--icon-cyan-text)]' 
                        : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    }`} />
                    {!sidebarCollapsed && (
                      <span className="text-xs font-medium truncate">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Footer - System info */}
          <div className="p-2 border-t border-[var(--border-color)]">
            {!sidebarCollapsed ? (
              <div className="text-center">
                <p className="text-[9px] text-[var(--text-tertiary)]">Veridian HMS v2.0</p>
                <p className="text-[8px] text-[var(--text-tertiary)]">© 2024 Veridian Health</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-main)] flex items-center justify-center">
                  <Heart className="w-3 h-3 text-[var(--text-tertiary)]" />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-h-screen transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        } mt-12`}>
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}