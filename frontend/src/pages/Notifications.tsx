// src/pages/Notifications.tsx - REDESIGNED
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { isAdminLike, ALL_ROLES } from '../config/access';
import { useSettingsStore } from '../store/settingsStore';
import { useUserStore } from '../store/userStore'; 
import { useToast } from '../store/toastStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Badge, Button, Card, cn, Field, FilterSelect, INPUT, PageHeader, SearchInput,
  Segmented, StatCard,
  type BadgeTone,
} from '../components/ui';
import {
  Bell, Trash2, RefreshCw, Eye, CheckCircle,
  AlertCircle, AlertTriangle, Info, Calendar, DollarSign,
  Stethoscope, Send, Users, Shield, MessageSquare, X,
  Filter, Clock, ChevronRight, TrendingUp, Activity,
  Crown, Syringe, Loader, User, BellOff,
  CheckCheck, Zap,
} from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'billing' | 'clinical' | 'system';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface User { id: string; fullName: string; role: string; email?: string; isActive?: boolean; }

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  super_admin: { icon: <Shield className="w-3 h-3" />,    bg: 'bg-[var(--icon-red-bg)]',    text: 'text-[var(--icon-red-text)]'    },
  admin:      { icon: <Crown className="w-3 h-3" />,       bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
  hr_officer: { icon: <Users className="w-3 h-3" />,       bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
  doctor:     { icon: <Stethoscope className="w-3 h-3" />, bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
  nurse:      { icon: <Activity className="w-3 h-3" />,    bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]'  },
  midwife:    { icon: <Activity className="w-3 h-3" />,    bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]'  },
  pharmacist: { icon: <Syringe className="w-3 h-3" />,     bg: 'bg-[var(--icon-orange-bg)]', text: 'text-[var(--icon-orange-text)]' },
  accounts:   { icon: <DollarSign className="w-3 h-3" />,  bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]' },
  lab_tech:   { icon: <Activity className="w-3 h-3" />,    bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
  sonographer:{ icon: <Activity className="w-3 h-3" />,    bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
  records:    { icon: <Users className="w-3 h-3" />,        bg: 'bg-[var(--bg-main)]',        text: 'text-[var(--text-secondary)]'   },
};

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  success:     { icon: <CheckCircle className="w-4 h-4" />,   bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)',  label: 'Success'     },
  warning:     { icon: <AlertTriangle className="w-4 h-4" />, bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', label: 'Warning'     },
  error:       { icon: <AlertCircle className="w-4 h-4" />,   bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)',    label: 'Error'       },
  appointment: { icon: <Calendar className="w-4 h-4" />,      bg: 'var(--icon-cyan-bg)',   color: 'var(--icon-cyan-text)',   label: 'Appointment' },
  billing:     { icon: <DollarSign className="w-4 h-4" />,    bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', label: 'Billing'     },
  clinical:    { icon: <Stethoscope className="w-4 h-4" />,   bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)', label: 'Clinical'    },
  system:      { icon: <Shield className="w-4 h-4" />,        bg: 'var(--bg-main)',        color: 'var(--text-secondary)',   label: 'System'      },
  info:        { icon: <Info className="w-4 h-4" />,          bg: 'var(--bg-main)',        color: 'var(--text-secondary)',   label: 'Info'        },
};

// Badge has no priority vocabulary, so the tone map stays with the priority it describes.
const PRIORITY_CONFIG: Record<string, { tone: BadgeTone; label: string }> = {
  urgent: { tone: 'red',    label: 'Urgent' },
  high:   { tone: 'orange', label: 'High'   },
  medium: { tone: 'yellow', label: 'Medium' },
  low:    { tone: 'green',  label: 'Low'    },
};

const formatDate = (dateString: string) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString();
};

// ── Admin Message Modal ───────────────────────────────────────────────────────
const AdminMessageModal: React.FC<{
  isOpen: boolean; onClose: () => void;
  onSend: (data: any) => Promise<void>; isSending: boolean;
  users: User[]; isLoadingUsers?: boolean;
}> = ({ isOpen, onClose, onSend, isSending, users, isLoadingUsers }) => {
  const [title, setTitle]               = useState('');
  const [message, setMessage]           = useState('');
  const [type, setType]                 = useState<NotificationType>('info');
  const [priority, setPriority]         = useState<NotificationPriority>('medium');
  const [sendTo, setSendTo]             = useState<'all' | 'roles' | 'users'>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm]     = useState('');

  const allRoles = ALL_ROLES;
  const filteredUsers = (users || []).filter(u =>
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    await onSend({ title, message, type, priority, sendTo, selectedRoles, selectedUsers });
    setTitle(''); setMessage(''); setSelectedRoles([]); setSelectedUsers([]); setSearchTerm('');
    onClose();
  };

  const isDisabled = !title.trim() || !message.trim() || isSending ||
    (sendTo === 'roles' && selectedRoles.length === 0) ||
    (sendTo === 'users' && selectedUsers.length === 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-xl w-full max-w-lg border border-[var(--border-color)] overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh', boxShadow: 'var(--shadow-md)' }}>
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--icon-purple-bg)] flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-primary)]">Broadcast Message</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">Send to users or roles</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close broadcast message" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {/* Send To Tabs */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Recipient</p>
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
              {(['all', 'roles', 'users'] as const).map(opt => (
                <button key={opt} onClick={() => setSendTo(opt)}
                  className={`flex-1 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${
                    sendTo === opt ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}>
                  {opt === 'all' ? 'Everyone' : opt === 'roles' ? 'By Role' : 'Specific Users'}
                </button>
              ))}
            </div>
          </div>

          {sendTo === 'roles' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Select Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {allRoles.map(role => {
                  const rc = ROLE_CONFIG[role];
                  const on = selectedRoles.includes(role);
                  return (
                    <button key={role} onClick={() => setSelectedRoles(p => p.includes(role) ? p.filter(r => r !== role) : [...p, role])}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all border ${
                        on ? `${rc?.bg} ${rc?.text} border-current` : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-tertiary)]'
                      }`}>
                      {rc?.icon}{role.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sendTo === 'users' && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Select Users</p>
              <SearchInput
                className="mb-2"
                placeholder="Search users…"
                value={searchTerm}
                onChange={setSearchTerm}
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-color)] divide-y divide-[var(--border-color)]" style={{ scrollbarWidth: 'thin' }}>
                {isLoadingUsers ? (
                  <div className="flex justify-center py-6"><Loader className="w-5 h-5 animate-spin text-[var(--icon-cyan-text)]" /></div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-6">No users found</p>
                ) : filteredUsers.map(u => {
                  const rc = ROLE_CONFIG[u.role];
                  return (
                    <label key={u.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg-main)] transition-colors">
                      <input type="checkbox" checked={selectedUsers.includes(u.id)}
                        onChange={e => setSelectedUsers(p => e.target.checked ? [...p, u.id] : p.filter(id => id !== u.id))}
                        className="rounded border-[var(--border-color)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{u.fullName}</p>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${rc?.bg} ${rc?.text}`}>
                          {rc?.icon}{u.role.replace('_', ' ')}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <FilterSelect
                aria-label="Message type"
                className="text-xs"
                value={type}
                onChange={(value) => setType(value as NotificationType)}
                options={[
                  { value: 'info', label: 'Info' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </Field>
            <Field label="Priority">
              <FilterSelect
                aria-label="Message priority"
                className="text-xs"
                value={priority}
                onChange={(value) => setPriority(value as NotificationPriority)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />
            </Field>
          </div>

          <Field label="Title" required>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. System maintenance notice…" className={cn(INPUT, 'w-full text-xs')} />
          </Field>

          <Field label="Message" required>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Write your message here…"
              className={cn(INPUT, 'w-full text-xs resize-none')} />
          </Field>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" className="flex-1" icon={Send} loading={isSending} disabled={isDisabled} onClick={handleSubmit}>
            Send Message
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Notification Detail Modal ─────────────────────────────────────────────────
const NotificationDetailModal: React.FC<{
  notification: any; onClose: () => void; onMarkAsRead: () => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const navigate = useNavigate();
  if (!notification) return null;

  const tc = TYPE_CONFIG[notification.type] || TYPE_CONFIG.info;
  const pc = PRIORITY_CONFIG[notification.priority || 'low'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-xl w-full max-w-md border border-[var(--border-color)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}>
        
        {/* Colored top strip */}
        <div className="h-1 w-full" style={{ background: tc.color }} />
        
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: tc.bg, color: tc.color }}>
                {tc.icon}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tc.color }}>{tc.label}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge tone={pc.tone} dot size="xs">{pc.label} priority</Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Close notification" onClick={onClose} />
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">{notification.title}</h3>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-4 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {new Date(notification.createdAt).toLocaleString()}
          </p>

          <div className="rounded-xl p-4 mb-4 border border-[var(--border-color)] bg-[var(--bg-main)]">
            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">{notification.message}</p>
          </div>

          {notification.sender && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
              <div className="w-6 h-6 rounded-full bg-[var(--icon-cyan-bg)] flex items-center justify-center">
                <User className="w-3 h-3 text-[var(--icon-cyan-text)]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-primary)]">{notification.sender.fullName}</p>
                <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{notification.sender.role?.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {notification.actionUrl && (
              <Button variant="primary" size="sm" icon={Eye} className="flex-1" onClick={() => { navigate(notification.actionUrl); onClose(); }}>
                View Details
              </Button>
            )}
            {!notification.isRead && (
              <Button variant="secondary" size="sm" icon={CheckCheck} className="flex-1" onClick={onMarkAsRead}>
                Mark as Read
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              className={notification.actionUrl || !notification.isRead ? 'px-3' : 'flex-1'}
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Skeleton loader ───────────────────────────────────────────────────────────
const SkeletonRow = () => (
  <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 bg-[var(--bg-main)] rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-3.5 bg-[var(--bg-main)] rounded w-1/3" />
          <div className="h-3.5 bg-[var(--bg-main)] rounded w-14" />
        </div>
        <div className="h-3 bg-[var(--bg-main)] rounded w-2/3" />
        <div className="h-3 bg-[var(--bg-main)] rounded w-1/2" />
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications, getNotifications, markAsRead, markAllAsRead,
    deleteNotification, getNotificationStats, stats,
    sendBulkNotification, sendRoleNotification, isLoading,
  } = useNotificationStore();

  const { user }                                          = useAuthStore();
  const { users, getAllUsers, isLoading: isLoadingUsers } = useUserStore();
  const { success, error: toastError }                   = useToast();

  const [searchTerm, setSearchTerm]               = useState('');
  const [typeFilter, setTypeFilter]               = useState('all');
  const [priorityFilter, setPriorityFilter]       = useState('all');
  const [readFilter, setReadFilter]               = useState('all');
  const [showFilters, setShowFilters]             = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen]   = useState(false);
  const [selectedNotif, setSelectedNotif]         = useState<any>(null);
  const [isSending, setIsSending]                 = useState(false);
  const [sortBy, setSortBy]                       = useState<'date' | 'priority'>('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showClearReadConfirm, setShowClearReadConfirm]   = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm]     = useState(false);
  const [isDeleting, setIsDeleting]               = useState(false);

  const isAdmin = isAdminLike(user?.role);

  useEffect(() => { if (isAdmin) getAllUsers(); }, [isAdmin]);
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      await getNotifications({});
      await getNotificationStats();
    } catch (err: any) {
      toastError('Load Failed', err?.message || 'Could not load notifications');
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const list = (notifications || []).filter(n => {
      if (!n) return false;
      if (q && !(n.title || '').toLowerCase().includes(q) && !(n.message || '').toLowerCase().includes(q)) return false;
      if (typeFilter !== 'all' && n.type !== typeFilter) return false;
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      return true;
    });
    if (sortBy === 'priority') {
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return [...list].sort((a, b) => (order[a.priority || 'low'] ?? 3) - (order[b.priority || 'low'] ?? 3));
    }
    return [...list].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [notifications, searchTerm, typeFilter, priorityFilter, readFilter, sortBy]);

  const unreadCount = (notifications || []).filter(n => !n?.isRead).length;
  const readCount   = (notifications || []).filter(n =>  n?.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try { await markAsRead(id); await loadData(); } catch { toastError('Failed', 'Could not mark as read'); }
  };

  const handleMarkAllAsRead = async () => {
    try { await markAllAsRead(); success('Done', 'All marked as read'); await loadData(); }
    catch { toastError('Failed', 'Could not mark all as read'); }
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteNotification(showDeleteConfirm.id);
      success('Deleted', 'Notification removed');
      await loadData();
      setShowDeleteConfirm(null);
    } catch { toastError('Failed', 'Could not delete'); }
    finally { setIsDeleting(false); }
  };

  const handleClearRead = async () => {
    setIsDeleting(true);
    try {
      for (const n of notifications.filter(n => n.isRead)) await deleteNotification(n.id);
      success('Cleared', 'Read notifications removed');
      await loadData();
      setShowClearReadConfirm(false);
    } catch { toastError('Failed', 'Could not clear'); }
    finally { setIsDeleting(false); }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      for (const n of notifications) await deleteNotification(n.id);
      success('Cleared', 'All notifications removed');
      await loadData();
      setShowClearAllConfirm(false);
    } catch { toastError('Failed', 'Could not clear all'); }
    finally { setIsDeleting(false); }
  };

  const handleSendMessage = async (data: any) => {
    setIsSending(true);
    try {
      const allRoles = ALL_ROLES;
      if (data.sendTo === 'all') {
        await sendRoleNotification({ roles: allRoles, ...data });
        success('Sent', 'Message broadcast to all users');
      } else if (data.sendTo === 'roles') {
        await sendRoleNotification({ roles: data.selectedRoles, ...data });
        success('Sent', `Sent to ${data.selectedRoles.length} role(s)`);
      } else {
        await sendBulkNotification({ userIds: data.selectedUsers, ...data });
        success('Sent', `Sent to ${data.selectedUsers.length} user(s)`);
      }
      await loadData();
    } catch { toastError('Failed', 'Could not send message'); }
    finally { setIsSending(false); }
  };

  const handleClick = (notif: any) => {
    if (!notif.isRead) handleMarkAsRead(notif.id);
    if (notif.actionUrl) {
      let url = notif.actionUrl;
      if (!url.startsWith('/dashboard') && !url.startsWith('http'))
        url = url.startsWith('/') ? `/dashboard${url}` : `/dashboard/${url}`;
      navigate(url);
    } else {
      setSelectedNotif(notif);
    }
  };

  // ─── Tab counts ───────────────────────────────────────────────────────────
  const tabFilters = [
    { key: 'all',    label: 'All',    count: notifications?.length || 0 },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read',   label: 'Read',   count: readCount },
  ];

  return (
    <div className="space-y-4">

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
        icon={Bell}
        accent="cyan"
        actions={(
          <>
            {isAdmin && (
              <Button size="sm" variant="soft" accent="purple" icon={MessageSquare} onClick={() => setIsAdminModalOpen(true)}>
                Broadcast
              </Button>
            )}
            {unreadCount > 0 && (
              <Button size="sm" variant="secondary" icon={CheckCheck} onClick={handleMarkAllAsRead}>
                Mark all read
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                  {unreadCount}
                </span>
              </Button>
            )}
            {readCount > 0 && (
              <Button size="sm" variant="dangerSoft" icon={Trash2} onClick={() => setShowClearReadConfirm(true)}>
                Clear read
              </Button>
            )}
            {(notifications?.length || 0) > 0 && (
              <Button size="sm" variant="dangerSoft" icon={AlertTriangle} onClick={() => setShowClearAllConfirm(true)}>
                Clear all
              </Button>
            )}
            <Button size="sm" icon={RefreshCw} loading={isLoading} onClick={loadData}>Refresh</Button>
          </>
        )}
      />

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total || 0} icon={Bell} accent="cyan" />
          <StatCard label="Unread" value={stats.unread || 0} icon={Zap} accent="yellow" />
          <StatCard label="Read" value={(stats.total || 0) - (stats.unread || 0)} icon={CheckCircle} accent="green" />
          <StatCard
            label="Unread rate"
            value={stats.total ? `${Math.round(((stats.unread || 0) / stats.total) * 100)}%` : '0%'}
            icon={TrendingUp}
            accent="purple"
          />
        </div>
      )}

      {/* ── SEARCH + FILTER BAR ───────────────────────────────────────────── */}
      <Card className="p-3">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Search */}
          <SearchInput
            placeholder="Search notifications…"
            value={searchTerm}
            onChange={setSearchTerm}
          />

          {/* Read filter tabs */}
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
            {tabFilters.map(t => (
              <button key={t.key} onClick={() => setReadFilter(t.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  readFilter === t.key ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none ${
                    readFilter === t.key ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]' : 'bg-[var(--bg-main)] text-[var(--text-tertiary)]'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <Segmented
            aria-label="Sort notifications"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'date', label: 'Latest' },
              { value: 'priority', label: 'Priority' },
            ]}
          />

          {/* Filters toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              showFilters ? 'bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)] border-[var(--icon-cyan-text)]' : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)]'
            }`}>
            <Filter className="w-3.5 h-3.5" /> Filters
            {(typeFilter !== 'all' || priorityFilter !== 'all') && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--icon-cyan-text)]" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border-color)]">
            <Field label="Type">
              <FilterSelect
                aria-label="Filter by type"
                className="text-xs"
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  { value: 'all', label: 'All types' },
                  ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
              />
            </Field>
            <Field label="Priority">
              <FilterSelect
                aria-label="Filter by priority"
                className="text-xs"
                value={priorityFilter}
                onChange={setPriorityFilter}
                options={[
                  { value: 'all', label: 'All priorities' },
                  ...Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label })),
                ]}
              />
            </Field>
          </div>
        )}
      </Card>

      {/* ── NOTIFICATION LIST ─────────────────────────────────────────────── */}
      {/* A refresh keeps the current list on screen; skeletons only cover the first paint. */}
      {isLoading && filtered.length === 0 ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card padded={false} className="py-16 px-4">
          <div className="flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-main)] flex items-center justify-center">
              <BellOff className="w-7 h-7 text-[var(--text-tertiary)] opacity-40" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
                ? 'No matching notifications' : 'All caught up'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
                ? 'Try adjusting your filters' : 'No new notifications at this time'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const tc = TYPE_CONFIG[notif.type || 'info'] || TYPE_CONFIG.info;
            const pc = PRIORITY_CONFIG[notif.priority || 'low'] || PRIORITY_CONFIG.low;
            const isUnread = !notif.isRead;

            return (
              <div key={notif.id} onClick={() => handleClick(notif)}
                className={`group rounded-xl border transition-all cursor-pointer ${
                  isUnread
                    ? 'bg-[var(--bg-card)] border-[var(--border-color)] border-l-[3px]'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] opacity-80 hover:opacity-100'
                }`}
                style={isUnread ? { borderLeftColor: `var(--icon-cyan-text)` } : {}}>
                
                <div className="flex items-start gap-3 p-4">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: tc.bg, color: tc.color }}>
                    {tc.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`text-xs font-semibold leading-tight ${isUnread ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {notif.title}
                      </h3>
                      {/* Priority dot + label */}
                      <Badge tone={pc.tone} dot size="xs">{pc.label}</Badge>
                      {/* Type badge */}
                      <Badge size="xs">{tc.label}</Badge>
                      {isUnread && (
                        <Badge tone="cyan" size="xs">NEW</Badge>
                      )}
                    </div>

                    <p className={`text-[11px] leading-relaxed line-clamp-2 mb-1.5 ${isUnread ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(notif.createdAt)}
                      </span>
                      {notif.sender && (
                        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                          <User className="w-3 h-3" />{notif.sender.fullName}
                        </span>
                      )}
                      {notif.actionUrl && (
                        <span className="text-[10px] text-[var(--icon-cyan-text)] flex items-center gap-0.5 ml-auto">
                          View <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    {isUnread && (
                      <Button size="sm" variant="ghost" iconOnly icon={Eye} aria-label="Mark as read"
                        className="hover:text-[var(--icon-green-text)]"
                        onClick={() => handleMarkAsRead(notif.id)} />
                    )}
                    <Button size="sm" variant="ghost" iconOnly icon={Trash2} aria-label="Delete"
                      className="hover:text-[var(--icon-red-text)]"
                      onClick={() => setShowDeleteConfirm({ id: notif.id, title: notif.title })} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between px-1 py-1 text-[10px] text-[var(--text-tertiary)]">
          <span>Showing {filtered.length} of {notifications?.length || 0}</span>
          <div className="flex items-center gap-3">
            <span>Unread: <strong className="text-[var(--icon-cyan-text)]">{filtered.filter(n => !n.isRead).length}</strong></span>
            <span>Urgent: <strong className="text-[var(--icon-red-text)]">{filtered.filter(n => n.priority === 'urgent').length}</strong></span>
          </div>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <AdminMessageModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)}
        onSend={handleSendMessage} isSending={isSending} users={users} isLoadingUsers={isLoadingUsers} />

      {selectedNotif && (
        <NotificationDetailModal notification={selectedNotif} onClose={() => setSelectedNotif(null)}
          onMarkAsRead={() => { handleMarkAsRead(selectedNotif.id); setSelectedNotif(null); }} />
      )}

      <ConfirmationModal isOpen={showDeleteConfirm !== null} onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDelete} title="Delete Notification"
        message={`Delete "${showDeleteConfirm?.title}"? This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel" type="danger" isLoading={isDeleting} />

      <ConfirmationModal isOpen={showClearReadConfirm} onClose={() => setShowClearReadConfirm(false)}
        onConfirm={handleClearRead} title="Clear Read Notifications"
        message={`Permanently delete ${notifications?.filter(n => n.isRead).length || 0} read notification(s)?`}
        confirmText="Delete" cancelText="Cancel" type="danger" isLoading={isDeleting} />

      <ConfirmationModal isOpen={showClearAllConfirm} onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAll} title="Delete All Notifications"
        message={`Permanently delete all ${notifications?.length || 0} notification(s)? This cannot be undone.`}
        confirmText="Delete All" cancelText="Cancel" type="danger" isLoading={isDeleting} />
    </div>
  );
}