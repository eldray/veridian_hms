// src/pages/Notifications.tsx - REDESIGNED
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../store/toastStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Search, Bell, Trash2, RefreshCw, Eye, CheckCircle,
  AlertCircle, AlertTriangle, Info, Calendar, DollarSign,
  Stethoscope, Send, Users, Shield, MessageSquare, X,
  Filter, Clock, ChevronRight, TrendingUp, Activity,
  Crown, Syringe, UserCircle, Loader, User, BellOff,
  CheckCheck, Zap, MoreHorizontal,
} from 'lucide-react';

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'billing' | 'clinical' | 'system';
type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface User { id: string; fullName: string; role: string; email?: string; isActive?: boolean; }

const ROLE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  admin:      { icon: <Crown className="w-3 h-3" />,       bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
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

const PRIORITY_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  urgent: { bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)',    dot: 'bg-[var(--icon-red-text)]',    label: 'Urgent' },
  high:   { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', dot: 'bg-[var(--icon-orange-text)]', label: 'High'   },
  medium: { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', dot: 'bg-[var(--icon-yellow-text)]', label: 'Medium' },
  low:    { bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)',  dot: 'bg-[var(--icon-green-text)]',  label: 'Low'    },
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

const inputCls =
  'w-full px-3 py-2 border border-[var(--border-color)] rounded-lg text-xs ' +
  'bg-[var(--bg-main)] text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] transition-all';

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

  const allRoles = ['admin','doctor','nurse','midwife','pharmacist','accounts','lab_tech','sonographer','records'];
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
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--border-color)] transition-all">
            <X className="w-4 h-4" />
          </button>
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
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <input type="text" placeholder="Search users…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className={inputCls} style={{ paddingLeft: '2rem' }} />
              </div>
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
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Type</p>
              <select value={type} onChange={e => setType(e.target.value as NotificationType)} className={inputCls}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Priority</p>
              <select value={priority} onChange={e => setPriority(e.target.value as NotificationPriority)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Title *</p>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. System maintenance notice…" className={inputCls} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Message *</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4}
              placeholder="Write your message here…"
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)] flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isDisabled}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            {isSending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-3.5 h-3.5" />Send Message</>}
          </button>
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
                  <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
                  <span className="text-[10px] text-[var(--text-tertiary)] font-semibold">{pc.label} priority</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-main)] transition-all">
              <X className="w-4 h-4" />
            </button>
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
              <button onClick={() => { navigate(notification.actionUrl); onClose(); }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--icon-cyan-text)] text-white hover:opacity-90 flex items-center justify-center gap-1.5 transition-all">
                <Eye className="w-3.5 h-3.5" /> View Details
              </button>
            )}
            {!notification.isRead && (
              <button onClick={onMarkAsRead}
                className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center justify-center gap-1.5 transition-all">
                <CheckCheck className="w-3.5 h-3.5" /> Mark as Read
              </button>
            )}
            <button onClick={onClose}
              className={`py-2 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-all ${
                notification.actionUrl || !notification.isRead ? 'px-3' : 'flex-1'
              }`}>
              Close
            </button>
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
  const { users, getAllUsers, isLoading: isLoadingUsers } = useSettingsStore();
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

  const isAdmin = user?.role === 'admin';

  useEffect(() => { if (isAdmin) getAllUsers(); }, [isAdmin]);
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      await getNotifications({});
      await getNotificationStats();
    } catch { /* silent */ }
  };

  const filtered = (() => {
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
  })();

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
      const allRoles = ['admin','doctor','nurse','midwife','pharmacist','accounts','lab_tech','sonographer','records'];
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--icon-cyan-bg)] flex items-center justify-center">
            <Bell className="w-4.5 h-4.5 text-[var(--icon-cyan-text)]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">Notifications</h1>
            <p className="text-[10px] text-[var(--text-tertiary)] leading-tight">
              {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--icon-purple-bg)] text-[var(--icon-purple-text)] hover:bg-[var(--icon-purple-text)] hover:text-white transition-all">
              <MessageSquare className="w-3.5 h-3.5" /> Broadcast
            </button>
          )}
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                {unreadCount}
              </span>
            </button>
          )}
          {readCount > 0 && (
            <button onClick={() => setShowClearReadConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Clear read
            </button>
          )}
          {(notifications?.length || 0) > 0 && (
            <button onClick={() => setShowClearAllConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
              <AlertTriangle className="w-3.5 h-3.5" /> Clear all
            </button>
          )}
          <button onClick={loadData} disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* ── STATS ROW ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Bell,          value: stats.total || 0,                           label: 'Total',       bg: 'var(--icon-cyan-bg)',   color: 'var(--icon-cyan-text)'   },
            { icon: Zap,           value: stats.unread || 0,                          label: 'Unread',      bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' },
            { icon: CheckCircle,   value: (stats.total || 0) - (stats.unread || 0),   label: 'Read',        bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)'  },
            { icon: TrendingUp,    value: stats.total ? `${Math.round(((stats.unread||0)/stats.total)*100)}%` : '0%', label: 'Unread rate', bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' },
          ].map((s, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-3.5 border border-[var(--border-color)]" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] leading-tight">{s.value}</p>
                  <p className="text-[10px] text-[var(--text-tertiary)]">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SEARCH + FILTER BAR ───────────────────────────────────────────── */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input type="text" placeholder="Search notifications…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} className={inputCls} style={{ paddingLeft: '2rem' }} />
          </div>

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
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
            {(['date', 'priority'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-all ${
                  sortBy === s ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}>
                {s === 'date' ? 'Latest' : 'Priority'}
              </button>
            ))}
          </div>

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
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Type</p>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={inputCls}>
                <option value="all">All types</option>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5">Priority</p>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={inputCls}>
                <option value="all">All priorities</option>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── NOTIFICATION LIST ─────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] flex flex-col items-center justify-center py-16 gap-3">
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
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: pc.bg, color: pc.color }}>
                        <span className={`w-1 h-1 rounded-full ${pc.dot}`} />
                        {pc.label}
                      </span>
                      {/* Type badge */}
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-[var(--border-color)] text-[var(--text-tertiary)]">
                        {tc.label}
                      </span>
                      {isUnread && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--icon-cyan-bg)] text-[var(--icon-cyan-text)]">
                          NEW
                        </span>
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
                      <button onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-green-text)] hover:bg-[var(--icon-green-bg)] transition-all">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => setShowDeleteConfirm({ id: notif.id, title: notif.title })}
                      title="Delete"
                      className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--icon-red-text)] hover:bg-[var(--icon-red-bg)] transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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