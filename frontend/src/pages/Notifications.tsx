// src/pages/Notifications.tsx - UPDATED WITH REAL USERS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore'; // ✅ Add this import
import { useToast } from '../store/toastStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import {
  Search, Bell, Trash2, RefreshCw, Eye, CheckCircle,
  AlertCircle, AlertTriangle, Info, Calendar, DollarSign,
  Stethoscope, Send, Users, Shield, MessageSquare, X,
  Filter, Clock, ChevronRight, TrendingUp, Activity,
  Crown, Syringe, UserCircle, Loader, User,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationType =
  | 'info' | 'success' | 'warning' | 'error'
  | 'appointment' | 'billing' | 'clinical' | 'system';

type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

interface User {
  id: string;
  fullName: string;
  role: string;
  email?: string;
  isActive?: boolean;
}

// ── Role config ───────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string }
> = {
  admin:      { icon: <Crown      className="w-3 h-3" />, bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
  doctor:     { icon: <Stethoscope className="w-3 h-3" />, bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
  nurse:      { icon: <Activity   className="w-3 h-3" />, bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]'  },
  midwife:    { icon: <Activity   className="w-3 h-3" />, bg: 'bg-[var(--icon-green-bg)]',  text: 'text-[var(--icon-green-text)]'  },
  pharmacist: { icon: <Syringe    className="w-3 h-3" />, bg: 'bg-[var(--icon-orange-bg)]', text: 'text-[var(--icon-orange-text)]' },
  accounts:   { icon: <DollarSign className="w-3 h-3" />, bg: 'bg-[var(--icon-yellow-bg)]', text: 'text-[var(--icon-yellow-text)]' },
  lab_tech:   { icon: <Activity   className="w-3 h-3" />, bg: 'bg-[var(--icon-purple-bg)]', text: 'text-[var(--icon-purple-text)]' },
  sonographer:{ icon: <Activity   className="w-3 h-3" />, bg: 'bg-[var(--icon-cyan-bg)]',   text: 'text-[var(--icon-cyan-text)]'   },
  records:    { icon: <Users      className="w-3 h-3" />, bg: 'bg-[var(--bg-main)]',         text: 'text-[var(--text-secondary)]'   },
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const getTypeIcon = (type: string, size = 'w-5 h-5') => {
  switch (type) {
    case 'success':     return <CheckCircle  className={size} />;
    case 'warning':     return <AlertTriangle className={size} />;
    case 'error':       return <AlertCircle  className={size} />;
    case 'appointment': return <Calendar     className={size} />;
    case 'billing':     return <DollarSign   className={size} />;
    case 'clinical':    return <Stethoscope  className={size} />;
    default:            return <Info          className={size} />;
  }
};

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'success':     return { bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)'  };
    case 'warning':     return { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)' };
    case 'error':       return { bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)'    };
    case 'appointment': return { bg: 'var(--icon-cyan-bg)',   color: 'var(--icon-cyan-text)'   };
    case 'billing':     return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' };
    case 'clinical':    return { bg: 'var(--icon-purple-bg)', color: 'var(--icon-purple-text)' };
    default:            return { bg: 'var(--bg-main)',         color: 'var(--text-secondary)'   };
  }
};

const getPriorityStyle = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'urgent': return { bg: 'var(--icon-red-bg)',    color: 'var(--icon-red-text)',    label: 'URGENT' };
    case 'high':   return { bg: 'var(--icon-orange-bg)', color: 'var(--icon-orange-text)', label: 'HIGH'   };
    case 'medium': return { bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)', label: 'MEDIUM' };
    default:       return { bg: 'var(--icon-green-bg)',  color: 'var(--icon-green-text)',  label: 'LOW'    };
  }
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'Unknown date';
  const date    = new Date(dateString);
  const diffMs  = Date.now() - date.getTime();
  const mins    = Math.floor(diffMs / 60000);
  const hours   = Math.floor(diffMs / 3600000);
  const days    = Math.floor(diffMs / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  === 1) return 'Yesterday';
  if (days  < 7)  return `${days} days ago`;
  return date.toLocaleDateString();
};

// ── Shared input / select style ───────────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg text-sm ' +
  'bg-[var(--bg-main)] text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-tertiary)] ' +
  'focus:outline-none focus:ring-1 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] transition-all';

// ── AdminMessageModal ─────────────────────────────────────────────────────────

const AdminMessageModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: any) => Promise<void>;
  isSending: boolean;
  users: User[];
  isLoadingUsers?: boolean;
}> = ({ isOpen, onClose, onSend, isSending, users, isLoadingUsers }) => {
  const [title, setTitle]                   = useState('');
  const [message, setMessage]               = useState('');
  const [type, setType]                     = useState<NotificationType>('info');
  const [priority, setPriority]             = useState<NotificationPriority>('medium');
  const [sendTo, setSendTo]                 = useState<'all' | 'roles' | 'users'>('all');
  const [selectedRoles, setSelectedRoles]   = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers]   = useState<string[]>([]);
  const [searchTerm, setSearchTerm]         = useState('');

  const allRoles = ['admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'accounts', 'lab_tech', 'sonographer', 'records'];

  const filteredUsers = (users || []).filter(
    (u) =>
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) return;
    await onSend({ title, message, type, priority, sendTo, selectedRoles, selectedUsers });
    setTitle(''); setMessage(''); setSelectedRoles([]); setSelectedUsers([]); setSearchTerm('');
    onClose();
  };

  const isDisabled =
    !title.trim() || !message.trim() || isSending ||
    (sendTo === 'roles' && selectedRoles.length === 0) ||
    (sendTo === 'users' && selectedUsers.length === 0);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] w-full overflow-hidden"
        style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-[var(--icon-purple-text)]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Send Broadcast Message</h2>
              <p className="text-xs text-[var(--text-secondary)]">Send notifications to users or roles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors"
          >
            <X className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Send to toggle */}
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Send to</p>
            <div
              className="flex gap-1 p-1 rounded-lg border border-[var(--border-color)]"
              style={{ background: 'var(--bg-main)' }}
            >
              {(['all', 'roles', 'users'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSendTo(opt)}
                  className="flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                  style={{
                    background: sendTo === opt ? 'var(--bg-card)' : 'transparent',
                    color: sendTo === opt ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: sendTo === opt ? '0.5px solid var(--border-color)' : 'none',
                  }}
                >
                  {opt === 'all' ? 'All users' : opt === 'roles' ? 'By role' : 'Specific users'}
                </button>
              ))}
            </div>
          </div>

          {/* Role selection */}
          {sendTo === 'roles' && (
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Select roles</p>
              <div
                className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-[var(--border-color)] max-h-32 overflow-y-auto"
                style={{ background: 'var(--bg-main)' }}
              >
                {allRoles.map((role) => {
                  const rc = ROLE_CONFIG[role];
                  const on = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                        )
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all"
                      style={{
                        background: on ? 'var(--icon-cyan-bg)' : 'var(--bg-card)',
                        color: on ? 'var(--icon-cyan-text)' : 'var(--text-secondary)',
                        border: '0.5px solid var(--border-color)',
                      }}
                    >
                      {rc?.icon}
                      {role.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
              {selectedRoles.length > 0 && (
                <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                  Selected: {selectedRoles.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* User selection */}
          {sendTo === 'users' && (
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Select users</p>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                <input
                  type="text"
                  placeholder="Search users…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={inputCls}
                  style={{ paddingLeft: '2rem' }}
                />
              </div>
              <div
                className="max-h-44 overflow-y-auto rounded-lg border border-[var(--border-color)] p-1.5 space-y-0.5"
                style={{ background: 'var(--bg-main)' }}
              >
                {isLoadingUsers ? (
                  <div className="flex justify-center py-4">
                    <Loader className="w-5 h-5 animate-spin text-[var(--icon-cyan-text)]" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No users found</p>
                ) : (
                  filteredUsers.map((u) => {
                    const rc = ROLE_CONFIG[u.role];
                    const isActive = u.isActive !== false;
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          !isActive ? 'opacity-50' : ''
                        }`}
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLLabelElement).style.background = 'var(--bg-card)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLLabelElement).style.background = 'transparent')
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={(e) =>
                            setSelectedUsers((prev) =>
                              e.target.checked
                                ? [...prev, u.id]
                                : prev.filter((id) => id !== u.id)
                            )
                          }
                          disabled={!isActive}
                          className="rounded border-[var(--border-color)] disabled:opacity-50"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                            {u.fullName}
                            {!isActive && (
                              <span className="ml-1 text-[10px] text-red-500">(Inactive)</span>
                            )}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${rc?.bg} ${rc?.text}`}
                          >
                            {rc?.icon}
                            {u.role.replace('_', ' ')}
                          </span>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Title</p>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. System Update Notice"
              className={inputCls}
            />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Type</p>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
                className={inputCls}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority</p>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                className={inputCls}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1.5">Message</p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Type your message here…"
              className={inputCls + ' resize-none'}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isDisabled}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── NotificationDetailModal ───────────────────────────────────────────────────

const NotificationDetailModal: React.FC<{
  notification: any;
  onClose: () => void;
  onMarkAsRead: () => void;
}> = ({ notification, onClose, onMarkAsRead }) => {
  const navigate = useNavigate();
  
  if (!notification) return null;

  const typeStyle     = getTypeStyle(notification.type);
  const priorityStyle = getPriorityStyle(notification.priority || 'low');

  const handleActionClick = () => {
    if (notification.actionUrl) {
      let targetUrl = notification.actionUrl;
      
      // Use React Router navigate
      if (targetUrl.startsWith('/dashboard')) {
        navigate(targetUrl);
      } else if (targetUrl.startsWith('/')) {
        navigate(`/dashboard${targetUrl}`);
      } else if (targetUrl.startsWith('http')) {
        window.open(targetUrl, '_blank');
      } else {
        navigate(`/dashboard/${targetUrl}`);
      }
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}
    >
      <div
        className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] w-full"
        style={{ maxWidth: 440 }}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: typeStyle.bg, color: typeStyle.color }}
            >
              {getTypeIcon(notification.type, 'w-6 h-6')}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-main)] transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-secondary)]" />
            </button>
          </div>

          <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">
            {notification.title}
          </h3>

          <div className="flex items-center gap-2 mb-4">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: priorityStyle.bg, color: priorityStyle.color }}
            >
              {priorityStyle.label}
            </span>
            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(notification.createdAt).toLocaleString()}
            </span>
          </div>

          <div
            className="rounded-xl p-4 mb-5 border border-[var(--border-color)]"
            style={{ background: 'var(--bg-main)' }}
          >
            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
              {notification.message}
            </p>
          </div>
          // In the AdminMessageModal component, add this to show who sent
          <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] mt-1">
            {notification.sender && (
              <span className="flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                From: {notification.sender.fullName} ({notification.sender.role})
              </span>
            )}
          </div>

          {notification.actionUrl && (
            <button
              onClick={handleActionClick}
              className="w-full mb-2.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: 'var(--icon-cyan-text)' }}
            >
              <Eye className="w-4 h-4" />
              View details
            </button>
          )}

          {!notification.isRead && (
            <button
              onClick={onMarkAsRead}
              className="w-full px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications, getNotifications, markAsRead, markAllAsRead,
    deleteNotification, getNotificationStats, stats,
    sendBulkNotification, sendRoleNotification, isLoading,
  } = useNotificationStore();

  const { user }            = useAuthStore();
  const { users, getAllUsers, isLoading: isLoadingUsers } = useSettingsStore(); // ✅ Get real users
  const { success, error: toastError } = useToast();

  const [searchTerm, setSearchTerm]                   = useState('');
  const [typeFilter, setTypeFilter]                   = useState('all');
  const [priorityFilter, setPriorityFilter]           = useState('all');
  const [readFilter, setReadFilter]                   = useState('all');
  const [showFilters, setShowFilters]                 = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen]       = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isSending, setIsSending]                     = useState(false);
  const [viewMode, setViewMode]                       = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy]                           = useState<'date' | 'priority'>('date');
  
  // Confirmation modals state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showClearReadConfirm, setShowClearReadConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Load users for admin broadcast
  useEffect(() => {
    if (isAdmin) {
      getAllUsers();
    }
  }, [isAdmin, getAllUsers]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (typeFilter     !== 'all') filters.type   = typeFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (readFilter     !== 'all') filters.isRead  = readFilter === 'read';
      await getNotifications(filters);
      await getNotificationStats();
    } catch { /* silent */ }
  };

  const filteredNotifications = (() => {
    const list = (notifications || []).filter((n) => {
      if (!n) return false;
      const q = searchTerm.toLowerCase();
      if (
        !(n.title || '').toLowerCase().includes(q) &&
        !(n.message || '').toLowerCase().includes(q)
      ) return false;
      if (typeFilter     !== 'all' && n.type     !== typeFilter)     return false;
      if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
      if (readFilter === 'read'   && !n.isRead)  return false;
      if (readFilter === 'unread' && n.isRead)   return false;
      return true;
    });

    if (sortBy === 'priority') {
      const order: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return list.sort((a, b) => (order[a.priority || 'low'] ?? 3) - (order[b.priority || 'low'] ?? 3));
    }
    return list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  })();

  const unreadCount = (notifications || []).filter((n) => n?.isRead === false).length;

  const handleMarkAsRead = async (id: string) => {
    try { await markAsRead(id); success('Marked as read', ''); await loadData(); }
    catch { toastError('Update failed', 'Failed to mark as read'); }
  };

  const handleMarkAllAsRead = async () => {
    try { await markAllAsRead(); success('All marked as read', ''); await loadData(); }
    catch { toastError('Update failed', 'Failed to mark all as read'); }
  };

  const handleDelete = async (id: string, title: string) => {
    setShowDeleteConfirm({ id, title });
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteNotification(showDeleteConfirm.id);
      success('Deleted', 'Notification deleted successfully');
      await loadData();
      setShowDeleteConfirm(null);
    } catch {
      toastError('Delete failed', 'Could not delete notification');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearReadNotifications = async () => {
    setIsDeleting(true);
    try {
      const readNotifications = notifications.filter(n => n.isRead);
      for (const notification of readNotifications) {
        await deleteNotification(notification.id);
      }
      success('Cleared', 'All read notifications deleted');
      await loadData();
      setShowClearReadConfirm(false);
    } catch {
      toastError('Failed', 'Could not clear read notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllNotifications = async () => {
    setIsDeleting(true);
    try {
      for (const notification of notifications) {
        await deleteNotification(notification.id);
      }
      success('Cleared', 'All notifications deleted');
      await loadData();
      setShowClearAllConfirm(false);
    } catch {
      toastError('Failed', 'Could not clear all notifications');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendMessage = async (data: any) => {
    setIsSending(true);
    try {
      const allRoles = ['admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'accounts', 'lab_tech', 'sonographer', 'records'];
      if (data.sendTo === 'all') {
        await sendRoleNotification({ roles: allRoles, title: data.title, message: data.message, type: data.type, priority: data.priority });
        success('Sent', 'Message sent to all users');
      } else if (data.sendTo === 'roles') {
        await sendRoleNotification({ roles: data.selectedRoles, title: data.title, message: data.message, type: data.type, priority: data.priority });
        success('Sent', `Message sent to ${data.selectedRoles.join(', ')}`);
      } else {
        await sendBulkNotification({ userIds: data.selectedUsers, title: data.title, message: data.message, type: data.type, priority: data.priority });
        success('Sent', `Message sent to ${data.selectedUsers.length} user(s)`);
      }
      await loadData();
    } catch { toastError('Send failed', 'Could not send message'); }
    finally { setIsSending(false); }
  };

  const handleNotificationClick = (notif: any) => {
    if (notif.actionUrl) {
      if (!notif.isRead) {
        handleMarkAsRead(notif.id);
      }
      
      let targetUrl = notif.actionUrl;
      
      // Add /dashboard prefix if it's missing and it's not an external link
      if (!targetUrl.startsWith('/dashboard') && !targetUrl.startsWith('http')) {
        if (targetUrl.startsWith('/')) {
          targetUrl = `/dashboard${targetUrl}`;
        } else {
          targetUrl = `/dashboard/${targetUrl}`;
        }
      }
      
      navigate(targetUrl);
    } else {
      setSelectedNotification(notif);
      if (!notif.isRead) handleMarkAsRead(notif.id);
    }
  };

  // ── Stat card data ──────────────────────────────────────────────────────────
  const statCards = [
    { icon: Bell,         value: stats?.total || 0,       label: 'Total',       bg: 'var(--icon-cyan-bg)',    color: 'var(--icon-cyan-text)'    },
    { icon: Clock,        value: stats?.unread || 0,      label: 'Unread',      bg: 'var(--icon-yellow-bg)', color: 'var(--icon-yellow-text)'  },
    { icon: CheckCircle,  value: (stats?.total || 0) - (stats?.unread || 0), label: 'Read', bg: 'var(--icon-green-bg)', color: 'var(--icon-green-text)' },
    {
      icon: AlertCircle,
      value: `${stats?.total ? Math.round(((stats?.unread || 0) / stats.total) * 100) : 0}%`,
      label: 'Unread rate',
      bg:    'var(--icon-red-bg)',
      color: 'var(--icon-red-text)',
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Notifications</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Stay updated with system alerts and reminders
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--icon-purple-text)' }}
            >
              <MessageSquare className="w-4 h-4" />
              Broadcast
            </button>
          )}
          
          {/* Clear read button */}
          {notifications?.filter(n => n.isRead).length > 0 && (
            <button
              onClick={() => setShowClearReadConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear read
            </button>
          )}
          
          {/* Clear all button */}
          {notifications && notifications.length > 0 && (
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-red-600 hover:bg-red-50 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Clear all
            </button>
          )}
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark all read
              <span
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium"
                style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
              >
                {unreadCount}
              </span>
            </button>
          )}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: s.bg }}
                >
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{s.value}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] shadow-sm">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search notifications…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={inputCls}
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>

            {/* View toggle */}
            <div
              className="flex gap-1 p-1 rounded-lg border border-[var(--border-color)]"
              style={{ background: 'var(--bg-main)' }}
            >
              {(['list', 'grid'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                  style={{
                    background: viewMode === m ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border"
              style={{
                background:   showFilters ? 'var(--icon-cyan-bg)' : 'var(--bg-main)',
                color:        showFilters ? 'var(--icon-cyan-text)' : 'var(--text-secondary)',
                borderColor:  'var(--border-color)',
              }}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border-color)]"
            >
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={inputCls}>
                <option value="all">All types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="appointment">Appointment</option>
                <option value="billing">Billing</option>
                <option value="clinical">Clinical</option>
              </select>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={inputCls}>
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={readFilter} onChange={(e) => setReadFilter(e.target.value)} className={inputCls}>
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Sort row */}
      <div className="flex justify-end items-center gap-2 text-xs">
        <span className="text-[var(--text-tertiary)]">Sort by:</span>
        {(['date', 'priority'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className="px-2.5 py-1.5 rounded-lg capitalize transition-all"
            style={{
              background: sortBy === s ? 'var(--icon-cyan-bg)' : 'transparent',
              color:      sortBy === s ? 'var(--icon-cyan-text)' : 'var(--text-secondary)',
            }}
          >
            {s === 'date' ? 'Latest' : 'Priority'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--bg-main)] rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[var(--bg-main)] rounded w-1/3" />
                  <div className="h-3 bg-[var(--bg-main)] rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl p-12 text-center border border-[var(--border-color)]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--bg-main)' }}
          >
            <Bell className="w-8 h-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
            {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
              ? 'No matching notifications'
              : 'All caught up!'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'You have no new notifications at this time'}
          </p>
        </div>
      ) : viewMode === 'list' ? (

        /* ── LIST VIEW ── */
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const ts        = getTypeStyle(notif.type || 'info');
            const ps        = getPriorityStyle(notif.priority || 'low');
            const isUnread  = !notif.isRead;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="bg-[var(--bg-card)] rounded-xl border transition-all cursor-pointer hover:shadow-sm"
                style={{
                  borderColor:    isUnread ? ps.color : 'var(--border-color)',
                  borderLeftWidth: isUnread ? 3 : 1,
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Type icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: ts.bg, color: ts.color }}
                    >
                      {getTypeIcon(notif.type || 'info')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: isUnread ? 'var(--icon-cyan-text)' : 'var(--text-primary)' }}
                        >
                          {notif.title}
                        </h3>
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: ps.bg, color: ps.color }}
                        >
                          {ps.label}
                        </span>
                        {isUnread && (
                          <span
                            className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ background: 'var(--icon-cyan-bg)', color: 'var(--icon-cyan-text)' }}
                          >
                            NEW
                          </span>
                        )}
                        <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-1">
                        {notif.message}
                      </p>

                      {notif.actionUrl && (
                        <div className="flex items-center gap-1 text-xs text-[var(--icon-cyan-text)]">
                          <span>Click to view details</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isUnread && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--icon-green-text)')
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)')
                          }
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id, notif.title)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--icon-red-text)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)')
                        }
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotifications.map((notif) => {
            const ts       = getTypeStyle(notif.type || 'info');
            const ps       = getPriorityStyle(notif.priority || 'low');
            const isUnread = !notif.isRead;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className="bg-[var(--bg-card)] rounded-xl border overflow-hidden transition-all cursor-pointer hover:shadow-sm"
                style={{
                  borderColor:     isUnread ? 'var(--icon-cyan-text)' : 'var(--border-color)',
                  borderLeftWidth: isUnread ? 3 : 1,
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: ts.bg, color: ts.color }}
                    >
                      {getTypeIcon(notif.type || 'info', 'w-4 h-4')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-xs font-semibold truncate mb-0.5"
                        style={{ color: isUnread ? 'var(--icon-cyan-text)' : 'var(--text-primary)' }}
                      >
                        {notif.title}
                      </h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ background: ps.bg, color: ps.color }}
                        >
                          {ps.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-3">
                    {notif.message}
                  </p>

                  <div
                    className="flex items-center justify-end gap-1 pt-2 border-t border-[var(--border-color)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isUnread && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Mark as read"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id, notif.title)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      {filteredNotifications.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border-color)] shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex gap-4">
              <span className="text-[var(--text-secondary)]">
                Total: <strong className="text-[var(--text-primary)]">{filteredNotifications.length}</strong>
              </span>
              <span className="text-[var(--text-secondary)]">
                Unread:{' '}
                <strong style={{ color: 'var(--icon-cyan-text)' }}>
                  {filteredNotifications.filter((n) => !n.isRead).length}
                </strong>
              </span>
              <span className="text-[var(--text-secondary)]">
                Urgent:{' '}
                <strong style={{ color: 'var(--icon-red-text)' }}>
                  {filteredNotifications.filter((n) => n.priority === 'urgent').length}
                </strong>
              </span>
            </div>
            <span className="text-[var(--text-tertiary)]">
              Showing {filteredNotifications.length} of {(notifications || []).length}
            </span>
          </div>
        </div>
      )}

      {/* Modals */}
      <AdminMessageModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onSend={handleSendMessage}
        isSending={isSending}
        users={users}
        isLoadingUsers={isLoadingUsers}
      />

      {selectedNotification && (
        <NotificationDetailModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
          onMarkAsRead={() => {
            handleMarkAsRead(selectedNotification.id);
            setSelectedNotification(null);
          }}
        />
      )}

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete Notification"
        message={`Are you sure you want to delete "${showDeleteConfirm?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeleting}
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
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAllNotifications}
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