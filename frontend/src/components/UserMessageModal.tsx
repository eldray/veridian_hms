// src/components/UserMessageModal.tsx
import React, { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useToast } from '../store/toastStore';
import { Search, User, Mail, Send, X, Users } from 'lucide-react';
import { describeApiError } from '../utils/apiError';

interface UserMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string;
  recipientName?: string;
}

export const UserMessageModal: React.FC<UserMessageModalProps> = ({
  isOpen,
  onClose,
  recipientId: initialRecipientId,
  recipientName: initialRecipientName,
}) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; fullName: string; role: string } | null>(
    initialRecipientId ? { id: initialRecipientId, fullName: initialRecipientName || '', role: '' } : null
  );
  const [isSending, setIsSending] = useState(false);

  const { users, getAllUsers, isLoading: isLoadingUsers } = useUserStore();
  const { sendBulkNotification } = useNotificationStore();
  const { user: currentUser } = useAuthStore();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen) {
      getAllUsers();
    }
  }, [isOpen, getAllUsers]);

  // Filter users (exclude current user and only show active users)
  const filteredUsers = (users || [])
    .filter(u => u.id !== currentUser?.id && u.isActive !== false)
    .filter(u =>
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleSend = async () => {
    if (!selectedUser) {
      toastError('Error', 'Please select a recipient');
      return;
    }
    if (!title.trim() || !message.trim()) {
      toastError('Error', 'Please enter a title and message');
      return;
    }

    setIsSending(true);
    try {
      await sendBulkNotification({
        userIds: [selectedUser.id],
        senderId: currentUser?.id,
        title: title,
        message: message,
        type: 'info',
        priority: priority,
        actionUrl: '/dashboard/notifications'
      });
      success('Sent', `Message sent to ${selectedUser.fullName}`);
      setTitle('');
      setMessage('');
      setSelectedUser(null);
      onClose();
    } catch (err: any) {
      toastError('Message not sent', describeApiError(err, 'The message could not be sent.'));
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-xl max-w-lg w-full border border-[var(--border-color)]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[var(--icon-purple-bg)] rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-[var(--icon-purple-text)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Send Message</h2>
                <p className="text-xs text-[var(--text-secondary)]">Send a private message to another user</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
              <X className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Recipient *
              </label>
              {initialRecipientId ? (
                <div className="bg-[var(--bg-main)] rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--icon-blue-bg)] rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-[var(--icon-blue-text)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{initialRecipientName}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--icon-purple-text)]"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-[var(--border-color)] rounded-xl p-2 bg-[var(--bg-main)]/50">
                    {isLoadingUsers ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--icon-purple-text)] border-t-transparent mx-auto" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <p className="text-center text-sm text-[var(--text-secondary)] py-4">No users found</p>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser({ id: user.id, fullName: user.fullName, role: user.role })}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedUser?.id === user.id
                              ? 'bg-[var(--icon-purple-bg)] ring-1 ring-[var(--icon-purple-text)]'
                              : 'hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedUser?.id === user.id ? 'bg-[var(--icon-purple-text)]' : 'bg-[var(--text-tertiary)]'
                          }`}>
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-[var(--text-primary)]">{user.fullName}</p>
                            <p className="text-xs text-[var(--text-secondary)] capitalize">{user.role}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message subject"
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--icon-purple-text)] text-[var(--text-primary)]"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-[var(--icon-purple-text)] text-[var(--text-primary)]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your message here..."
                className="w-full px-4 py-2.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl resize-none focus:ring-2 focus:ring-[var(--icon-purple-text)] text-[var(--text-primary)]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[var(--border-color)] rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-main)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedUser || !title.trim() || !message.trim() || isSending}
                className="flex-1 px-4 py-2.5 bg-[var(--icon-purple-text)] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};