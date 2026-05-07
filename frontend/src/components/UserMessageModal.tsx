// src/components/UserMessageModal.tsx
import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useToast } from '../store/toastStore';
import { Search, User, Mail, Send, X, Users } from 'lucide-react';

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

  const { users, getAllUsers, isLoading: isLoadingUsers } = useSettingsStore();
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
    } catch (err) {
      toastError('Send Failed', 'Could not send message');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Send Message</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Send a private message to another user</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Recipient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipient *
              </label>
              {initialRecipientId ? (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{initialRecipientName}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-700 rounded-xl p-2 bg-gray-50 dark:bg-gray-700/50">
                    {isLoadingUsers ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent mx-auto" />
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No users found</p>
                    ) : (
                      filteredUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser({ id: user.id, fullName: user.fullName, role: user.role })}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedUser?.id === user.id
                              ? 'bg-purple-100 dark:bg-purple-900/30 ring-1 ring-purple-500'
                              : 'hover:bg-white dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            selectedUser?.id === user.id ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.fullName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Message subject"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your message here..."
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!selectedUser || !title.trim() || !message.trim() || isSending}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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