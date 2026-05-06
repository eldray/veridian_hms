// src/components/AdminNotificationPanel.tsx
import React, { useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useUserStore } from '../store/userStore';
import { useToast } from '../store/toastStore';
import { Send, Users, Bell, AlertCircle } from 'lucide-react';

export const AdminNotificationPanel: React.FC = () => {
  const { sendBulkNotification, sendRoleNotification, triggerLowStockCheck, triggerAppointmentReminders } = useNotificationStore();
  const { users, getUsers } = useUserStore();
  const { success, error } = useToast();
  
  const [notificationType, setNotificationType] = useState<'bulk' | 'role'>('bulk');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error' | 'system'>('info');
  const [isSending, setIsSending] = useState(false);

  const roles = ['admin', 'doctor', 'nurse', 'midwife', 'pharmacist', 'accounts', 'lab_tech', 'records'];

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      error('Validation Error', 'Title and message are required');
      return;
    }

    setIsSending(true);
    try {
      if (notificationType === 'bulk') {
        if (selectedUserIds.length === 0) {
          error('Validation Error', 'Please select at least one user');
          return;
        }
        await sendBulkNotification({
          userIds: selectedUserIds,
          title,
          message,
          type,
          priority
        });
        success('Sent', `Notification sent to ${selectedUserIds.length} users`);
      } else {
        if (selectedRoles.length === 0) {
          error('Validation Error', 'Please select at least one role');
          return;
        }
        await sendRoleNotification({
          roles: selectedRoles,
          title,
          message,
          type,
          priority
        });
        success('Sent', `Notification sent to ${selectedRoles.join(', ')} role(s)`);
      }
      
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedUserIds([]);
      setSelectedRoles([]);
    } catch (err) {
      error('Send Failed', 'Could not send notification');
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerLowStock = async () => {
    try {
      const result = await triggerLowStockCheck();
      success('Low Stock Check', `Sent ${result.data?.sent || 0} alerts for ${result.data?.items?.length || 0} low stock items`);
    } catch (err) {
      error('Check Failed', 'Could not trigger low stock check');
    }
  };

  const handleTriggerReminders = async () => {
    try {
      const result = await triggerAppointmentReminders();
      success('Reminders Sent', `Sent ${result.data?.remindersSent || 0} appointment reminders`);
    } catch (err) {
      error('Send Failed', 'Could not send reminders');
    }
  };

  return (
    <div className="space-y-6">
      {/* Notification Type Toggle */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setNotificationType('bulk')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${notificationType === 'bulk' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Send to Specific Users
        </button>
        <button
          onClick={() => setNotificationType('role')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${notificationType === 'role' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Bell className="w-4 h-4 inline mr-2" />
          Send by Role
        </button>
      </div>

      {/* User Selection (Bulk) */}
      {notificationType === 'bulk' && (
        <div>
          <label className="block text-sm font-medium mb-1">Select Users</label>
          <select
            multiple
            value={selectedUserIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions, option => option.value);
              setSelectedUserIds(options);
            }}
            className="w-full p-2 border rounded-lg h-32"
          >
            {users.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.fullName} ({user.role})
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
        </div>
      )}

      {/* Role Selection (Role-based) */}
      {notificationType === 'role' && (
        <div>
          <label className="block text-sm font-medium mb-1">Select Roles</label>
          <div className="flex flex-wrap gap-2">
            {roles.map(role => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setSelectedRoles(prev =>
                    prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                  );
                }}
                className={`px-3 py-1 rounded-full text-sm transition-all capitalize ${
                  selectedRoles.includes(role)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notification Details */}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          className="w-full p-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Notification message..."
          className="w-full p-2 border rounded-lg resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="system">System</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className="w-full p-2 border rounded-lg"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleSend}
          disabled={isSending}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Notification
        </button>
      </div>

      {/* System Actions */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-3">System Actions</h4>
        <div className="flex gap-3">
          <button
            onClick={handleTriggerLowStock}
            className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200 transition-all"
          >
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Check Low Stock
          </button>
          <button
            onClick={handleTriggerReminders}
            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-all"
          >
            <Bell className="w-4 h-4 inline mr-1" />
            Send Reminders
          </button>
        </div>
      </div>
    </div>
  );
};