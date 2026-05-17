// src/layouts/DashboardLayout.tsx - UPDATED WITH NOTIFICATION LOADING
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useThemeStore } from '../store/themeStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Hospital,
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Send,
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
  Scan,
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

// Navigation items with consistent icons
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
  { name: 'Scans', path: '/dashboard/scans', icon: Scan, roles: ['admin', 'doctor', 'nurse', 'midwife', 'sonographer'] },
  { name: 'Pharmacy', path: '/dashboard/pharmacy', icon: Pill, roles: ['admin', 'pharmacist', 'doctor'] },
  { name: 'Inventory', path: '/dashboard/inventory', icon: Package, roles: ['admin', 'pharmacist', 'doctor'] },
  { name: 'Stock', path: '/dashboard/stock', icon: Warehouse, roles: ['admin', 'pharmacist'] },
  { name: 'Admissions', path: '/dashboard/admissions', icon: BedDouble, roles: ['admin', 'doctor', 'nurse', 'midwife'] },
  { name: 'Referrals', path: '/dashboard/referrals', icon: Send, roles: ['admin', 'doctor', 'nurse', 'midwife', 'records'] },
  { name: 'Billing', path: '/dashboard/billing', icon: DollarSign, roles: ['admin', 'doctor', 'accounts'] },
  { name: 'Insurance', path: '/dashboard/insurance-claims', icon: Shield, roles: ['admin', 'doctor', 'accounts'] },
  { name: 'Departments', path: '/dashboard/departments', icon: Building, roles: ['admin'] },
  { name: 'Reports', path: '/dashboard/reports', icon: TrendingUp, roles: ['admin', 'accounts', 'records'] },
  { name: 'Settings', path: '/dashboard/settings', icon: Settings, roles: ['admin', 'doctor'] },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearReadConfirm, setShowClearReadConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { mode, toggleMode } = useThemeStore();

  const { hospital, fetchHospital, isLoading: hospitalLoading } = useHospitalStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const { 
    notifications, 
    unreadCount, 
    getNotifications, 
    getUnreadCount,
    deleteNotification,
    markAsRead, 
    markAllAsRead,
    isLoading: notificationsLoading 
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Load hospital data
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

  // Load notifications on mount and set up real-time updates
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        await getNotifications({ limit: 10 });
        // Also fetch the latest unread count
        await getUnreadCount();
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    loadNotifications();
    
    // Set up interval to refresh notifications and unread count every 30 seconds
    const interval = setInterval(() => {
      getNotifications({ limit: 10 }).catch(console.error);
      getUnreadCount().catch(console.error);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [getNotifications, getUnreadCount]);


  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const handleClearReadNotifications = async () => {
    setIsDeleting(true);
    try {
      const readNotifications = notifications.filter(n => n.isRead);
      for (const notification of readNotifications) {
        await deleteNotification(notification.id);
      }
      await getNotifications({ limit: 10 });
      setShowClearReadConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAllNotifications = async () => {
    setIsDeleting(true);
    try {
      for (const notification of notifications) {
        await deleteNotification(notification.id);
      }
      await getNotifications({ limit: 10 });
      setShowDeleteAllConfirm(false);
    } finally {
      setIsDeleting(false);
    }
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

  // Format date for notification display
  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Bar */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-40 w-full h-14 shadow-sm">
        <div className="flex items-center justify-between px-5 h-full">
          {/* Left: Menu Icon & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] p-2 rounded-lg transition-all duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden lg:flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-xl flex items-center justify-center shadow-md">
                <Heart className="w-4 h-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-sm font-bold text-[var(--text-primary)] leading-tight tracking-wide">
                    Veridian HMS
                  </h1>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-tight">
                    Healthcare Management System
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Centered Hospital Name */}
          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            {hospitalLoading ? (
              <div className="animate-pulse">
                <div className="h-4 w-32 bg-[var(--text-tertiary)] rounded-md"></div>
                <div className="h-2.5 w-24 bg-[var(--text-tertiary)] rounded-md mt-1 mx-auto"></div>
              </div>
            ) : (
              <>
                <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight tracking-wide">
                  {hospital?.name || 'Veridian Hospital'}
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight font-medium">
                  {hospital?.nhisFacilityType || 'Medical Center'} • {hospital?.nhisFacilityCode || 'GHS-ACC-001'}
                </p>
              </>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleMode}
              className="p-2 rounded-xl transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              title={mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationDropdownRef}>
              <button 
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-2 rounded-xl transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)]"
              >
                <Bell className="w-4 h-4" />
                {(unreadCount > 0 || (notifications?.filter(n => !n.isRead)?.length > 0)) && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold px-1">
                    {unreadCount || notifications?.filter(n => !n.isRead)?.length || 0}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border border-[var(--border-color)] z-50 max-h-96 overflow-hidden bg-[var(--bg-card)]">
                  <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {(unreadCount > 0 || (notifications?.filter(n => !n.isRead)?.length > 0)) && (
                          <button 
                            onClick={async () => {
                              await markAllAsRead();
                              await getNotifications({ limit: 10 });
                              await getUnreadCount();
                            }}
                            className="text-xs text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 font-medium"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications && notifications.length > 0 && (
                          <button 
                            onClick={() => setShowDeleteAllConfirm(true)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Delete all
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {notificationsLoading ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--icon-cyan-text)] border-t-transparent mx-auto mb-2"></div>
                        <p className="text-xs text-[var(--text-secondary)]">Loading...</p>
                      </div>
                    ) : notifications && notifications.length > 0 ? (
                      notifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b border-[var(--border-color)] transition-all ${
                            !notification.isRead ? 'bg-[var(--icon-cyan-bg)]/10' : 'hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {/* Clickable content area */}
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={async () => {
                                // Mark as read first if unread
                                if (!notification.isRead) {
                                  await markAsRead(notification.id);
                                  // Refresh unread count
                                  await getUnreadCount();
                                }
                                
                                // Close dropdown
                                setNotificationDropdownOpen(false);
                                
                                // Navigate if actionUrl exists
                                if (notification.actionUrl) {
                                  let targetUrl = notification.actionUrl;
                                  if (targetUrl.startsWith('/')) {
                                    navigate(targetUrl);
                                  } else if (targetUrl.startsWith('http')) {
                                    window.open(targetUrl, '_blank');
                                  } else {
                                    navigate(`/dashboard/${targetUrl}`);
                                  }
                                } else {
                                  navigate('/dashboard/notifications');
                                }
                              }}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                  notification.isRead 
                                    ? 'bg-[var(--text-tertiary)]' 
                                    : 'bg-[var(--icon-cyan-text)]'
                                }`} />
                                {/* In the notification item */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                                      {notification.title}
                                    </p>
                                    {notification.sender && (
                                      <span className="text-[9px] text-purple-500 bg-purple-100 px-1.5 py-0.5 rounded-full">
                                        from: {notification.sender.fullName.split(' ')[0]}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] mt-0.5 line-clamp-2 text-[var(--text-secondary)]">
                                    {notification.message}
                                  </p>
                                  <p className="text-[10px] mt-1 text-[var(--text-tertiary)]">
                                    {formatNotificationDate(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.isRead && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await markAsRead(notification.id);
                                    await getNotifications({ limit: 10 });
                                  }}
                                  className="p-1 text-[var(--text-tertiary)] hover:text-green-600 transition-colors rounded"
                                  title="Mark as read"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Delete this notification?')) {
                                    await deleteNotification(notification.id);
                                    await getNotifications({ limit: 10 });
                                  }
                                }}
                                className="p-1 text-[var(--text-tertiary)] hover:text-red-600 transition-colors rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-[var(--text-secondary)]">
                        <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                  {notifications && notifications.length > 0 && (
                    <div className="p-2 border-t border-[var(--border-color)] flex gap-2">
                      <Link
                        to="/dashboard/notifications"
                        className="flex-1 text-center text-xs py-1.5 text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80 font-medium"
                        onClick={() => setNotificationDropdownOpen(false)}
                      >
                        View all
                      </Link>
                      {notifications.filter(n => n.isRead).length > 0 && (
                        <button
                          onClick={() => setShowClearReadConfirm(true)}
                          className="flex-1 text-center text-xs py-1.5 text-red-500 hover:text-red-600 font-medium"
                        >
                          Clear read
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all text-sm border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] hover:border-[var(--border-color)] min-w-[120px]"
              >
                <div className="w-7 h-7 bg-gradient-to-r from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate max-w-[150px]">{user?.fullName || 'User'}</p>
                  <p className="text-[10px] capitalize text-[var(--text-secondary)] font-medium">
                    {user?.role?.replace('_', ' ') || 'Role'}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${
                  userDropdownOpen ? 'rotate-180' : ''
                } text-[var(--text-secondary)]`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl border border-[var(--border-color)] py-1 z-50 bg-[var(--bg-card)]">
                  <div className="px-3 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-r from-[var(--icon-cyan-bg)] to-[var(--icon-cyan-text)] rounded-full flex items-center justify-center shadow-sm">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-[var(--text-primary)]">{user?.fullName}</p>
                        <p className="text-xs text-[var(--text-secondary)] capitalize">{user?.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 truncate">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard/profile"
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <UserIcon className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                      <span>My Profile</span>
                    </Link>
                    {hasRole(['admin']) && (
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4 text-[var(--icon-cyan-text)]" />
                        <span>System Settings</span>
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-[var(--border-color)] pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
          className={`fixed top-14 left-0 bottom-0 z-30 ${sidebarWidth} bg-[var(--bg-main)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out ${
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

          {/* Footer */}
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
        } mt-0`}>
          <div className="p-2">
            {children}
          </div>
        </main>
      </div>

            {/* Confirmation Modals */}
            <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your account."
        confirmText="Sign Out"
        cancelText="Cancel"
        type="warning"
        isLoading={isLoggingOut}
      />

      <ConfirmationModal
        isOpen={showClearReadConfirm}
        onClose={() => setShowClearReadConfirm(false)}
        onConfirm={handleClearReadNotifications}
        title="Clear Read Notifications"
        message={`This will permanently delete ${notifications?.filter(n => n.isRead).length || 0} read notification(s). This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDeleteAllConfirm}
        onClose={() => setShowDeleteAllConfirm(false)}
        onConfirm={handleDeleteAllNotifications}
        title="Delete All Notifications"
        message={`This will permanently delete all ${notifications?.length || 0} notification(s). This action cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}