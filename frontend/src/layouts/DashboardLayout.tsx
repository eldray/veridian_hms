// src/layouts/DashboardLayout.tsx
import { ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useHospitalStore } from '../store/hospitalStore';
import { useThemeStore } from '../store/themeStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  LayoutDashboard, Users, FileText, DollarSign, Send, Package,
  BedDouble, BarChart3, LogOut, Menu, X, User, Stethoscope,
  FlaskConical, Pill, ChevronDown, Settings, Bell, Heart, Shield,
  ClipboardList, Building, CreditCard, Warehouse, Calendar, Activity,
  ChevronLeft, ChevronRight, Sun, Moon, Baby, Scissors, Syringe,
  Clipboard, TrendingUp, Eye, Trash2, Microscope, HeartPulse, Scan,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigationItems = [
  { name: 'Dashboard',       path: '/dashboard',                    icon: LayoutDashboard, roles: ['admin','doctor','nurse','midwife','lab_tech','pharmacist','accounts','records','sonographer'] },
  { name: 'Patients',        path: '/dashboard/patients',           icon: Users,           roles: ['admin','doctor','nurse','midwife','lab_tech','accounts','records','sonographer'] },
  { name: 'Attendance',      path: '/dashboard/attendance',         icon: Calendar,        roles: ['admin','doctor','nurse','midwife','lab_tech','sonographer'] },
  { name: 'Appointments',    path: '/dashboard/appointments',       icon: Calendar,        roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Notifications',   path: '/dashboard/notifications',      icon: Bell,            roles: ['admin','doctor','nurse','midwife','lab_tech','pharmacist','accounts','records','sonographer'] },
  { name: 'Medical Entries', path: '/dashboard/medical-entries',    icon: Clipboard,       roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Vitals',          path: '/dashboard/vitals',             icon: HeartPulse,      roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Theatre',         path: '/dashboard/theatre',            icon: Scissors,        roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Nursing',         path: '/dashboard/nursing',            icon: Syringe,         roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Antenatal',       path: '/dashboard/antenatal',          icon: Baby,            roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Laboratory',      path: '/dashboard/laboratory',         icon: Microscope,      roles: ['admin','doctor','nurse','lab_tech','sonographer'] },
  { name: 'Scans',           path: '/dashboard/scans',              icon: Scan,            roles: ['admin','doctor','nurse','midwife','sonographer'] },
  { name: 'Pharmacy',        path: '/dashboard/pharmacy',           icon: Pill,            roles: ['admin','pharmacist','doctor'] },
  { name: 'Inventory',       path: '/dashboard/inventory',          icon: Package,         roles: ['admin','pharmacist','doctor'] },
  { name: 'Stock',           path: '/dashboard/stock',              icon: Warehouse,       roles: ['admin','pharmacist'] },
  { name: 'Admissions',      path: '/dashboard/admissions',         icon: BedDouble,       roles: ['admin','doctor','nurse','midwife'] },
  { name: 'Referrals',       path: '/dashboard/referrals',          icon: Send,            roles: ['admin','doctor','nurse','midwife','records'] },
  { name: 'Billing',         path: '/dashboard/billing',            icon: DollarSign,      roles: ['admin','doctor','accounts'] },
  { name: 'Insurance',       path: '/dashboard/insurance-claims',   icon: Shield,          roles: ['admin','doctor','accounts'] },
  { name: 'Departments',     path: '/dashboard/departments',        icon: Building,        roles: ['admin'] },
  { name: 'Reports',         path: '/dashboard/reports',            icon: TrendingUp,      roles: ['admin','accounts','records'] },
  { name: 'Settings',        path: '/dashboard/settings',           icon: Settings,        roles: ['admin','doctor'] },
];

// Group nav items for visual separation
const NAV_GROUPS = [
  {
    label: 'Core',
    keys: ['Dashboard', 'Patients', 'Attendance', 'Appointments', 'Notifications'],
  },
  {
    label: 'Clinical',
    keys: ['Medical Entries', 'Vitals', 'Theatre', 'Nursing', 'Antenatal', 'Laboratory', 'Scans'],
  },
  {
    label: 'Pharmacy',
    keys: ['Pharmacy', 'Inventory', 'Stock'],
  },
  {
    label: 'Ward & Admin',
    keys: ['Admissions', 'Referrals', 'Billing', 'Insurance', 'Departments'],
  },
  {
    label: 'Management',
    keys: ['Reports', 'Settings'],
  },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen]                     = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed]           = useState(false);
  const [userDropdownOpen, setUserDropdownOpen]           = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm]         = useState(false);
  const [showClearReadConfirm, setShowClearReadConfirm]   = useState(false);
  const [isDeleting, setIsDeleting]                       = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm]   = useState(false);
  const [isLoggingOut, setIsLoggingOut]                   = useState(false);

  const { mode, toggleMode } = useThemeStore();
  const { hospital, fetchHospital, isLoading: hospitalLoading } = useHospitalStore();
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout, hasRole } = useAuthStore();
  const {
    notifications, unreadCount,
    getNotifications, getUnreadCount,
    deleteNotification, markAsRead, markAllAsRead,
    isLoading: notificationsLoading,
  } = useNotificationStore();

  const dropdownRef             = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHospital().catch(console.error);
  }, [fetchHospital]);

  useEffect(() => {
    getNotifications(1, 10).catch(console.error);
    getUnreadCount().catch(console.error);
    const interval = setInterval(() => {
      getNotifications(1, 10).catch(console.error);
      getUnreadCount().catch(console.error);
    }, 30000);
    return () => clearInterval(interval);
  }, [getNotifications, getUnreadCount]);

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
      for (const n of notifications.filter(n => n.isRead)) await deleteNotification(n.id);
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

  const visibleNavItems = navigationItems.filter(item =>
    item.roles.some(role => hasRole([role]))
  );

  const formatNotificationDate = (dateString: string) => {
    const date    = new Date(dateString);
    const diffMs  = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH   = Math.floor(diffMs / 3600000);
    const diffD   = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const currentUnread = unreadCount || notifications?.filter(n => !n.isRead)?.length || 0;
  const sidebarWidth  = sidebarCollapsed ? 'w-[60px]' : 'w-[220px]';

  return (
    <div className="min-h-screen bg-[var(--bg-main)] transition-colors duration-300">

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ════════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 h-13 bg-[var(--bg-card)] border-b border-[var(--border-color)]"
        style={{ height: '52px', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between h-full px-4 gap-3">

          {/* ── Left: hamburger (mobile) + brand ── */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Brand mark — always visible */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--icon-cyan-text)' }}>
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="hidden sm:block text-xs font-semibold tracking-wide text-[var(--text-primary)] leading-none">
                Veridian HMS
              </span>
            </div>
          </div>

          {/* ── Centre: hospital info ── */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center max-w-xs hidden sm:block">
            {hospitalLoading ? (
              <div className="space-y-1 animate-pulse">
                <div className="h-3.5 w-36 rounded bg-[var(--border-color)] mx-auto" />
                <div className="h-2.5 w-24 rounded bg-[var(--border-color)] mx-auto" />
              </div>
            ) : (
              <>
                <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
                  {hospital?.name || 'Veridian Hospital'}
                </p>
                <p className="text-[10px] text-[var(--text-tertiary)] leading-tight mt-0.5 font-medium tracking-wide uppercase">
                  {hospital?.nhisFacilityType || 'Medical Center'}&nbsp;·&nbsp;{hospital?.nhisFacilityCode || 'GHS-ACC-001'}
                </p>
              </>
            )}
          </div>

          {/* ── Right: actions ── */}
          <div className="flex items-center gap-1">

            {/* Dark / Light toggle */}
            <button
              onClick={toggleMode}
              title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
            >
              {mode === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
            </button>

            {/* ── Notifications ── */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setNotificationDropdownOpen(v => !v)}
                className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
              >
                <Bell className="w-4 h-4" />
                {currentUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                    {currentUnread > 99 ? '99+' : currentUnread}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden z-50"
                  style={{ boxShadow: 'var(--shadow-md)' }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      <span className="text-xs font-semibold text-[var(--text-primary)]">Notifications</span>
                      {currentUnread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          {currentUnread}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {currentUnread > 0 && (
                        <button
                          onClick={async () => { await markAllAsRead(); await getNotifications(1,10); await getUnreadCount(); }}
                          className="text-[10px] font-medium text-[var(--icon-cyan-text)] hover:opacity-75 transition-opacity"
                        >
                          Mark all read
                        </button>
                      )}
                      {notifications?.length > 0 && (
                        <button
                          onClick={() => setShowDeleteAllConfirm(true)}
                          className="text-[10px] font-medium text-[var(--icon-red-text)] hover:opacity-75 transition-opacity"
                        >
                          Delete all
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-72 overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-[var(--text-tertiary)]">
                        <div className="w-5 h-5 rounded-full border-2 border-[var(--icon-cyan-text)] border-t-transparent animate-spin" />
                        <p className="text-xs">Loading…</p>
                      </div>
                    ) : notifications?.length > 0 ? (
                      notifications.slice(0, 10).map(notification => (
                        <div
                          key={notification.id}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-[var(--border-color)] last:border-0 group transition-colors ${
                            !notification.isRead
                              ? 'bg-[var(--bg-main)]'
                              : 'hover:bg-[var(--bg-main)]'
                          }`}
                        >
                          {/* Unread dot */}
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            notification.isRead ? 'bg-[var(--border-color)]' : 'bg-[var(--icon-cyan-text)]'
                          }`} />

                          {/* Body — clickable */}
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={async () => {
                              if (!notification.isRead) {
                                await markAsRead(notification.id);
                                await getUnreadCount();
                              }
                              setNotificationDropdownOpen(false);
                              const url = notification.actionUrl;
                              if (!url) { navigate('/dashboard/notifications'); return; }
                              if (url.startsWith('/')) navigate(url);
                              else if (url.startsWith('http')) window.open(url, '_blank');
                              else navigate(`/dashboard/${url}`);
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate">
                                {notification.title}
                              </p>
                              {notification.sender && (
                                <span className="flex-shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)]">
                                  {notification.sender.fullName.split(' ')[0]}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                            {!notification.isRead && (
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  await markAsRead(notification.id);
                                  await getNotifications(1, 10);
                                }}
                                title="Mark as read"
                                className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={async e => {
                                e.stopPropagation();
                                if (window.confirm('Delete this notification?')) {
                                  await deleteNotification(notification.id);
                                  await getNotifications(1, 10);
                                }
                              }}
                              title="Delete"
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-[var(--text-tertiary)]">
                        <Bell className="w-8 h-8 opacity-25" />
                        <p className="text-xs">No notifications</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications?.length > 0 && (
                    <div className="flex items-center border-t border-[var(--border-color)] bg-[var(--bg-main)]">
                      <Link
                        to="/dashboard/notifications"
                        onClick={() => setNotificationDropdownOpen(false)}
                        className="flex-1 text-center text-[11px] font-medium py-2.5 text-[var(--icon-cyan-text)] hover:opacity-75 transition-opacity"
                      >
                        View all
                      </Link>
                      {notifications.filter(n => n.isRead).length > 0 && (
                        <>
                          <div className="w-px h-4 bg-[var(--border-color)]" />
                          <button
                            onClick={() => setShowClearReadConfirm(true)}
                            className="flex-1 text-center text-[11px] font-medium py-2.5 text-[var(--icon-red-text)] hover:opacity-75 transition-opacity"
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

            {/* ── User dropdown ── */}
            <div className="relative ml-1" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(v => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all"
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--icon-cyan-text)' }}>
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[11px] font-semibold leading-tight text-[var(--text-primary)] max-w-[110px] truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-[9px] text-[var(--text-tertiary)] capitalize font-medium leading-tight">
                    {user?.role?.replace('_', ' ') || 'Role'}
                  </p>
                </div>
                <ChevronDown className={`hidden sm:block w-3 h-3 text-[var(--text-tertiary)] transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden z-50"
                  style={{ boxShadow: 'var(--shadow-md)' }}>

                  {/* Profile header */}
                  <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--icon-cyan-text)' }}>
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">{user?.fullName}</p>
                        <p className="text-[10px] text-[var(--text-secondary)] capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <p className="mt-2.5 text-[10px] text-[var(--text-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 truncate bg-[var(--bg-card)]">
                      {user?.email}
                    </p>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                      My Profile
                    </Link>
                    {hasRole(['admin']) && (
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-[var(--icon-cyan-text)]" />
                        System Settings
                      </Link>
                    )}
                  </div>

                  {/* Sign out */}
                  <div className="border-t border-[var(--border-color)]">
                    <button
                      onClick={() => { setUserDropdownOpen(false); setShowLogoutConfirm(true); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-colors"
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

      {/* ════════════════════════════════════════════
          BODY (sidebar + main)
      ════════════════════════════════════════════ */}
      <div className="flex pt-[52px]">

        {/* ── Sidebar ── */}
        <aside
          className={`fixed top-[52px] left-0 bottom-0 z-30 ${sidebarWidth} flex flex-col
            bg-[var(--bg-card)] border-r border-[var(--border-color)]
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        >
          {/* Sidebar top controls */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-color)]">
            {!sidebarCollapsed && (
              <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-tertiary)]">
                Navigation
              </span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSidebarCollapsed(v => !v)}
                title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                className="hidden lg:flex p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Nav groups */}
          <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-color) transparent' }}>
            {NAV_GROUPS.map(group => {
              const groupItems = visibleNavItems.filter(item => group.keys.includes(item.name));
              if (groupItems.length === 0) return null;
              return (
                <div key={group.label}>
                  {/* Group label */}
                  {!sidebarCollapsed && (
                    <p className="px-2 pt-3 pb-1 text-[9px] font-bold tracking-widest uppercase text-[var(--text-tertiary)] select-none">
                      {group.label}
                    </p>
                  )}
                  {sidebarCollapsed && (
                    <div className="border-t border-[var(--border-color)] my-2" />
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
                          className={`flex items-center gap-2.5 rounded-lg transition-all duration-150
                            ${sidebarCollapsed ? 'justify-center px-1.5 py-2' : 'px-3 py-2'}
                            ${isActive
                              ? 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)] border border-transparent'
                            }`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                            isActive ? 'text-[var(--icon-cyan-text)]' : 'text-[var(--text-tertiary)]'
                          }`} />
                          {!sidebarCollapsed && (
                            <span className={`text-[11px] font-medium truncate ${
                              isActive ? 'text-[var(--text-primary)]' : ''
                            }`}>
                              {item.name}
                            </span>
                          )}
                          {/* Active indicator bar */}
                          {isActive && !sidebarCollapsed && (
                            <span className="ml-auto w-1 h-1 rounded-full bg-[var(--icon-cyan-text)] flex-shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="px-3 py-3 border-t border-[var(--border-color)]">
            {sidebarCollapsed ? (
              <div className="flex justify-center">
                <Heart className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </div>
            ) : (
              <div>
                <p className="text-[9px] font-semibold text-[var(--text-tertiary)] tracking-wider uppercase">
                  Veridian HMS · v2.0
                </p>
                <p className="text-[8px] text-[var(--text-tertiary)] mt-0.5 opacity-70">
                  © 2024 Veridian Health Systems
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className={`flex-1 min-h-[calc(100vh-52px)] transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-[60px]' : 'lg:ml-[220px]'
        }`}>
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>

      {/* ── Confirmation modals ── */}
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
    </div>
  );
}