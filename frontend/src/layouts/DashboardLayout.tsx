// src/layouts/DashboardLayout.tsx
import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useThemeStore } from '../store/themeStore';
import { useLiveRefresh } from '../api/realtime';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  LayoutDashboard, Users, FileText, DollarSign, Send, Package,
  BedDouble, BarChart3, LogOut, Menu, X, User, Stethoscope,
  FlaskConical, Pill, ChevronDown, Settings, Bell, Heart, Shield,
  ClipboardList, Building, CreditCard, Warehouse, Calendar, Activity,
  ChevronLeft, ChevronRight, Sun, Moon, Baby, Scissors, Syringe,
  Clipboard, TrendingUp, Eye, Trash2, Microscope, HeartPulse, Scan,
  Briefcase, ScrollText,
} from 'lucide-react';

const TOPBAR_H = 52;

interface DashboardLayoutProps {
  children: ReactNode;
}

const ADMIN_LIKE = ['admin', 'super_admin'];

const navigationItems = [
  { name: 'Dashboard',           path: '/dashboard',                     icon: LayoutDashboard, roles: ['admin','super_admin','doctor','nurse','midwife','lab_tech','pharmacist','accounts','records','sonographer','hr_officer'] },
  { name: 'Notifications',       path: '/dashboard/notifications',       icon: Bell,            roles: ['admin','super_admin','doctor','nurse','midwife','lab_tech','pharmacist','accounts','records','sonographer','hr_officer'] },
  { name: 'Patients',            path: '/dashboard/patients',            icon: Users,           roles: ['admin','super_admin','doctor','nurse','midwife','lab_tech','accounts','records','sonographer'] },
  { name: 'Attendance',          path: '/dashboard/attendance',          icon: Calendar,        roles: ['admin','super_admin','doctor','nurse','midwife','records'] },
  { name: 'Appointments',        path: '/dashboard/appointments',        icon: Calendar,        roles: ['admin','super_admin','doctor','nurse','midwife','lab_tech','records','sonographer'] },
  { name: 'Consultations',       path: '/dashboard/medical-waiting-list',icon: Clipboard,       roles: ['admin','super_admin','doctor','nurse','midwife'] },
  { name: 'Vitals',              path: '/dashboard/vitals',              icon: HeartPulse,      roles: ['admin','super_admin','doctor','nurse','midwife'] },
  { name: 'Theatre',             path: '/dashboard/theatre',             icon: Scissors,        roles: ['admin','super_admin','doctor','nurse','midwife'] },
  { name: 'Nursing',             path: '/dashboard/nursing',             icon: Syringe,         roles: ['admin','super_admin','nurse','midwife'] },
  { name: 'Maternal Health',     path: '/dashboard/maternal-waiting-list',icon: Baby,           roles: ['admin','super_admin','doctor','midwife'] },
  { name: 'Family Planning',     path: '/dashboard/family-planning',     icon: Heart,           roles: ['admin','super_admin','doctor','midwife'] },
  { name: 'Laboratory',          path: '/dashboard/laboratory',          icon: Microscope,      roles: ['admin','super_admin','doctor','midwife','lab_tech','sonographer'] },
  { name: 'Scans',               path: '/dashboard/scans',               icon: Scan,            roles: ['admin','super_admin','doctor','midwife','sonographer'] },
  { name: 'Dispense Queue',      path: '/dashboard/pharmacy',            icon: Pill,            roles: ['admin','super_admin','pharmacist'] },
  { name: 'Inventory',           path: '/dashboard/inventory',           icon: Package,         roles: ['admin','super_admin','pharmacist'] },
  { name: 'Stock',               path: '/dashboard/stock',               icon: Warehouse,       roles: ['admin','super_admin','pharmacist'] },
  { name: 'Invoices',            path: '/dashboard/invoices',            icon: FileText,        roles: ['admin','super_admin','pharmacist','accounts'] },
  { name: 'Requisitions',        path: '/dashboard/requisitions',        icon: ClipboardList,   roles: ['admin','super_admin','pharmacist','nurse','midwife'] },
  { name: 'Stock Reports',       path: '/dashboard/stock/reports',       icon: BarChart3,       roles: ['admin','super_admin','pharmacist','accounts'] },
  { name: 'Admissions',          path: '/dashboard/admissions',          icon: BedDouble,       roles: ['admin','super_admin','doctor','nurse','midwife','records'] },
  { name: 'Wards',               path: '/dashboard/wards',               icon: BedDouble,       roles: ['admin','super_admin','doctor','nurse','midwife'] },
  { name: 'Referrals',           path: '/dashboard/referrals',           icon: Send,            roles: ['admin','super_admin','doctor','nurse','midwife','records'] },
  { name: 'Shifts',              path: '/dashboard/shifts',              icon: Calendar,        roles: ['admin','super_admin','hr_officer'] },
  { name: 'Leave Requests',      path: '/dashboard/leaves',              icon: FileText,        roles: ['admin','super_admin','hr_officer'] },
  { name: 'User Management',     path: '/dashboard/users',               icon: Users,           roles: ['admin','super_admin','hr_officer'] },
  { name: 'Billing',             path: '/dashboard/billing',             icon: DollarSign,      roles: ['admin','super_admin','doctor','accounts'] },
  { name: 'Insurance',           path: '/dashboard/insurance-claims',    icon: Shield,          roles: ['admin','super_admin','doctor','accounts'] },
  { name: 'Insurance Providers', path: '/dashboard/insurance-providers', icon: Shield,          roles: ['admin','super_admin','accounts'] },
  { name: 'Corporate',           path: '/dashboard/corporate-accounts',  icon: Briefcase,       roles: ['admin','super_admin','accounts'] },
  { name: 'Estimates',           path: '/dashboard/estimates',           icon: FileText,        roles: ['admin','super_admin','accounts'] },
  { name: 'Departments',         path: '/dashboard/departments',         icon: Building,        roles: ['admin','super_admin'] },
  { name: 'Audit Logs',          path: '/dashboard/audit-logs',          icon: ScrollText,      roles: ['admin','super_admin'] },
  { name: 'Reports',             path: '/dashboard/reports',             icon: TrendingUp,      roles: ['admin','super_admin','doctor','nurse','midwife','lab_tech','pharmacist','accounts','records','sonographer','hr_officer'] },
  { name: 'Settings',            path: '/dashboard/settings',            icon: Settings,        roles: ['admin','super_admin','doctor'] },
];

// Groups — all keys must exist in `navigationItems`
const NAV_GROUPS = [
  {
    label: 'Core',
    keys: ['Dashboard', 'Notifications', 'Patients', 'Attendance', 'Appointments'],
  },
  {
    label: 'Clinical',
    keys: ['Consultations', 'Vitals', 'Medical Records', 'Theatre', 'Nursing', 'Maternal Health', 'Antenatal', 'Family Planning'],
  },
  {
    label: 'Diagnostics',
    keys: ['Laboratory', 'Scans'],
  },
  {
    label: 'Pharmacy',
    keys: ['Pharmacy', 'Dispense Queue', 'Inventory', 'Stock', 'Requisitions', 'Stock Reports'],
  },
  {
    label: 'Ward',
    keys: ['Admissions', 'Wards', 'Referrals'],
  },
  {
    label: 'Revenue',
    keys: ['Billing', 'Invoices', 'Insurance', 'Insurance Providers', 'Corporate', 'Estimates'],
  },
  {
    label: 'HR & Staff',
    keys: ['Shifts', 'Leave Requests', 'User Management'],
  },
  {
    label: 'Management',
    keys: ['Departments', 'Audit Logs', 'Reports', 'Settings'],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearReadConfirm, setShowClearReadConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { mode, toggleMode } = useThemeStore();
  const { hospital, fetchHospital, isLoading: hospitalLoading } = useHospitalStore();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const {
    notifications, unreadCount,
    getNotifications,
    deleteNotification, markAsRead, markAllAsRead,
    isLoading: notificationsLoading,
  } = useNotificationStore();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Gate live refresh: only refetch notifications when the dropdown is open
  useLiveRefresh(
    ['notifications'],
    () => getNotifications(1, 10),
    notificationDropdownOpen
  );

  useEffect(() => { fetchHospital().catch(console.error); }, [fetchHospital]);

  // Initial load once
  useEffect(() => {
    getNotifications(1, 10).catch(console.error);
  }, [getNotifications]);

  // Foreground poll while dropdown is open (faster than 45s SSE fallback)
  useEffect(() => {
    if (!notificationDropdownOpen) return;
    const i = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        getNotifications(1, 10).catch(() => undefined);
      }
    }, 15000);
    return () => window.clearInterval(i);
  }, [notificationDropdownOpen, getNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setUserDropdownOpen(false);
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(e.target as Node))
        setNotificationDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try { await logout(); navigate('/'); }
    finally { setIsLoggingOut(false); setShowLogoutConfirm(false); }
  };

  const handleClearReadNotifications = async () => {
    setIsDeleting(true);
    try {
      const read = notifications.filter(n => n.isRead);
      for (const n of read) await deleteNotification(n.id);
      await getNotifications(1, 10);
      setShowClearReadConfirm(false);
    } finally { setIsDeleting(false); }
  };

  const handleDeleteAllNotifications = async () => {
    setIsDeleting(true);
    try {
      for (const n of notifications) await deleteNotification(n.id);
      await getNotifications(1, 10);
      setShowDeleteAllConfirm(false);
    } finally { setIsDeleting(false); }
  };

  const confirmDeleteSingle = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteNotification(pendingDeleteId);
      await getNotifications(1, 10);
      setPendingDeleteId(null);
    } finally { setIsDeleting(false); }
  };

  const visibleNavItems = navigationItems.filter(item =>
    item.roles.some(role => hasRole([role]))
  );

  const formatNotificationDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const currentUnread = unreadCount || notifications?.filter(n => !n.isRead)?.length || 0;
  const sidebarWidth = sidebarCollapsed ? 'w-[60px]' : 'w-[220px]';

  // Footer year & version
  const year = new Date().getFullYear();
  const appVersion = (import.meta as any)?.env?.VITE_APP_VERSION || '2.0';

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-main)' }}>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══════════ TOP BAR ═══════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b"
        style={{
          height: `${TOPBAR_H}px`,
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="flex items-center h-full px-4 gap-3">

          {/* Left: hamburger + brand */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--icon-cyan-text)' }}
              >
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <span
                className="hidden sm:block text-xs font-semibold tracking-wide leading-none"
                style={{ color: 'var(--text-primary)' }}
              >
                Veridian HMS
              </span>
            </div>
          </div>

          {/* Center: hospital info (flex-based, not absolute) */}
          <div className="hidden sm:flex flex-1 justify-center min-w-0 px-3">
            {hospitalLoading ? (
              <div className="space-y-1 animate-pulse">
                <div className="h-3.5 w-36 rounded" style={{ background: 'var(--border-color)' }} />
                <div className="h-2.5 w-24 rounded mx-auto" style={{ background: 'var(--border-color)' }} />
              </div>
            ) : (
              <div className="text-center min-w-0">
                <p
                  className="text-[13px] font-bold leading-tight tracking-tight truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {hospital?.name || 'Veridian Hospital'}
                </p>
                <p
                  className="text-[10px] leading-tight mt-0.5 font-medium tracking-wide uppercase truncate"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {hospital?.nhisFacilityType || 'Medical Center'}&nbsp;·&nbsp;{hospital?.nhisFacilityCode || 'GHS-ACC-001'}
                </p>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 flex-shrink-0 ml-auto">

            <button
              onClick={toggleMode}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setNotificationDropdownOpen(v => !v)}
                aria-label={`Notifications${currentUnread > 0 ? `, ${currentUnread} unread` : ''}`}
                aria-expanded={notificationDropdownOpen}
                className="relative p-2 rounded-lg transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Bell className="w-4 h-4" />
                {currentUnread > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none"
                  >
                    {currentUnread > 99 ? '99+' : currentUnread}
                  </span>
                )}
              </button>

              {notificationDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-80 rounded-xl border overflow-hidden z-50"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</span>
                      {currentUnread > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
                        >
                          {currentUnread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {currentUnread > 0 && (
                        <button
                          onClick={async () => { await markAllAsRead(); await getNotifications(1, 10); }}
                          className="text-[10px] font-medium transition-opacity"
                          style={{ color: 'var(--icon-cyan-text)' }}
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications?.length > 0 && (
                        <button
                          onClick={() => setShowDeleteAllConfirm(true)}
                          className="text-[10px] font-medium transition-opacity"
                          style={{ color: 'var(--icon-red-text)' }}
                        >
                          Delete all
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto">
                    {notificationsLoading && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8" style={{ color: 'var(--text-tertiary)' }}>
                        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--icon-cyan-text)', borderTopColor: 'transparent' }} />
                        <p className="text-xs">Loading…</p>
                      </div>
                    ) : notifications?.length > 0 ? (
                      notifications.slice(0, 10).map(notification => (
                        <div
                          key={notification.id}
                          role="menuitem"
                          className="flex items-start gap-3 px-4 py-3 border-b last:border-0 group transition-colors"
                          style={{
                            borderColor: 'var(--border-color)',
                            background: !notification.isRead ? 'var(--bg-main)' : 'transparent',
                          }}
                        >
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: notification.isRead ? 'var(--border-color)' : 'var(--icon-cyan-text)' }}
                          />
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={async () => {
                              if (!notification.isRead) await markAsRead(notification.id);
                              setNotificationDropdownOpen(false);
                              const url = notification.actionUrl;
                              if (!url) { navigate('/dashboard/notifications'); return; }
                              if (url.startsWith('/')) navigate(url);
                              else if (url.startsWith('http')) window.open(url, '_blank');
                              else navigate(`/dashboard/${url}`);
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs font-semibold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
                                {notification.title}
                              </p>
                              {notification.sender && (
                                <span
                                  className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                                  style={{ background: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' }}
                                >
                                  {notification.sender.fullName.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                              {notification.message}
                            </p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            {!notification.isRead && (
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  await markAsRead(notification.id);
                                  await getNotifications(1, 10);
                                }}
                                title="Mark as read"
                                aria-label="Mark as read"
                                className="p-1 rounded transition-colors"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setPendingDeleteId(notification.id); }}
                              title="Delete"
                              aria-label="Delete notification"
                              className="p-1 rounded transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-10" style={{ color: 'var(--text-tertiary)' }}>
                        <Bell className="w-8 h-8 opacity-25" />
                        <p className="text-xs">No notifications</p>
                      </div>
                    )}
                  </div>

                  {notifications?.length > 0 && (
                    <div
                      className="flex items-center border-t"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
                    >
                      <Link
                        to="/dashboard/notifications"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="flex-1 text-center text-[11px] font-medium py-2.5 transition-opacity"
                        style={{ color: 'var(--icon-cyan-text)' }}
                      >
                        View all
                      </Link>
                      {notifications.filter(n => n.isRead).length > 0 && (
                        <>
                          <div className="w-px h-4" style={{ background: 'var(--border-color)' }} />
                          <button
                            onClick={() => setShowClearReadConfirm(true)}
                            className="flex-1 text-center text-[11px] font-medium py-2.5 transition-opacity"
                            style={{ color: 'var(--icon-red-text)' }}
                          >
                            Clear read
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User dropdown */}
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(v => !v)}
                aria-label="User menu"
                aria-expanded={userDropdownOpen}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--icon-cyan-text)' }}
                >
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-semibold leading-tight max-w-[110px] truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-[9px] capitalize font-medium leading-tight" style={{ color: 'var(--text-tertiary)' }}>
                    {user?.role?.replace('_', ' ') || 'Role'}
                  </p>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-3 h-3 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                  style={{ color: 'var(--text-tertiary)' }}
                />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-60 rounded-xl border overflow-hidden z-50"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div
                    className="px-4 py-3 border-b"
                    style={{ borderColor: 'var(--border-color)', background: 'var(--bg-main)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--icon-cyan-text)' }}
                      >
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{user?.fullName}</p>
                        <p className="text-[10px] capitalize mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {user?.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <p
                      className="mt-2.5 text-[10px] border rounded-lg px-2.5 py-1.5 truncate"
                      style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
                    >
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <User className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
                      My Profile
                    </Link>
                    {hasRole(ADMIN_LIKE) && (
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Settings className="w-3.5 h-3.5" style={{ color: 'var(--icon-cyan-text)' }} />
                        System Settings
                      </Link>
                    )}
                  </div>

                  <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                      onClick={() => { setUserDropdownOpen(false); setShowLogoutConfirm(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors"
                      style={{ color: 'var(--icon-red-text)' }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ BODY ═══════════ */}
      <div className="flex" style={{ paddingTop: `${TOPBAR_H}px` }}>

        <aside
          className={`fixed left-0 bottom-0 z-30 ${sidebarWidth} flex flex-col border-r transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
          style={{
            top: `${TOPBAR_H}px`,
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{ borderColor: 'var(--border-color)' }}
          >
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--text-tertiary)' }}>
                Navigation
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation"
                className="lg:hidden p-1 rounded transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(v => !v)}
                title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="hidden lg:flex p-1 rounded transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <nav
            className="flex-1 overflow-y-auto py-2 px-2 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}
          >
            {NAV_GROUPS.map(group => {
              const groupItems = visibleNavItems.filter(item => group.keys.includes(item.name));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.label}>
                  {!sidebarCollapsed && (
                    <p
                      className="px-2 pt-3 pb-1 text-[10px] font-bold tracking-widest uppercase select-none"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {group.label}
                    </p>
                  )}
                  {sidebarCollapsed && (
                    <div className="border-t my-2" style={{ borderColor: 'var(--border-color)' }} />
                  )}
                  <div className="space-y-0.5">
                    {groupItems.map(item => {
                      const isActive =
                        (item.path === '/dashboard' && location.pathname === '/dashboard') ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          title={sidebarCollapsed ? item.name : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          className={`relative flex items-center gap-2.5 rounded-lg transition-all duration-150 ${
                            sidebarCollapsed ? 'justify-center px-1.5 py-2' : 'px-3 py-2'
                          }`}
                          style={{
                            background: isActive ? 'var(--bg-main)' : 'transparent',
                            border: `1px solid ${isActive ? 'var(--border-color)' : 'transparent'}`,
                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full"
                              style={{ background: 'var(--icon-cyan-text)' }}
                            />
                          )}
                          <Icon
                            className="w-3.5 h-3.5 flex-shrink-0 transition-colors"
                            style={{ color: isActive ? 'var(--icon-cyan-text)' : 'var(--text-tertiary)' }}
                          />
                          {!sidebarCollapsed && (
                            <span
                              className="text-[11px] font-medium truncate"
                              style={{ color: isActive ? 'var(--text-primary)' : undefined }}
                            >
                              {item.name}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Heart className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ) : (
              <div>
                <p className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  Veridian HMS · v{appVersion}
                </p>
                <p className="text-[9px] mt-0.5 opacity-80" style={{ color: 'var(--text-tertiary)' }}>
                  © {year} Veridian Health Systems
                </p>
              </div>
            )}
          </div>
        </aside>

        <main
          className={`flex-1 min-h-[calc(100vh-${TOPBAR_H}px)] transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-[60px]' : 'lg:ml-[220px]'
          }`}
        >
          <div className="p-4">{children}</div>
        </main>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
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
        message={`This will permanently delete ${notifications?.filter(n => n.isRead).length || 0} read notification(s). This cannot be undone.`}
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
        message={`This will permanently delete all ${notifications?.length || 0} notification(s). This cannot be undone.`}
        confirmText="Delete All"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
      <ConfirmationModal
        isOpen={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDeleteSingle}
        title="Delete Notification"
        message="This notification will be permanently removed. This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}