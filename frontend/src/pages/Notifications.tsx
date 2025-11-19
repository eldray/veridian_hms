import { useEffect, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../store/toastStore';
import {
  Search,
  Bell,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  Stethoscope
} from 'lucide-react';

export default function Notifications() {
  const { 
    notifications, 
    getNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    isLoading 
  } = useNotificationStore();
  const { user } = useAuthStore();
  const { success, error } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const filters: any = {};
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (priorityFilter !== 'all') filters.priority = priorityFilter;
      if (readFilter !== 'all') filters.isRead = readFilter === 'read';
      
      await getNotifications(filters);
    } catch (err) {
      error('Load Failed', 'Failed to load notifications');
    }
  };

  const filteredNotifications = notifications.filter(notif => 
    notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notif.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      success('Marked as Read', 'Notification marked as read');
    } catch (err) {
      error('Update Failed', 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      success('All Marked as Read', 'All notifications marked as read');
    } catch (err) {
      error('Update Failed', 'Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      try {
        await deleteNotification(id);
        success('Deleted', 'Notification deleted successfully');
      } catch (err) {
        error('Delete Failed', 'Failed to delete notification');
      }
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      case 'appointment': return Calendar;
      case 'billing': return DollarSign;
      case 'clinical': return Stethoscope;
      default: return Info;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'appointment': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'billing': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'clinical': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notification Center</h1>
              <p className="text-blue-100 text-sm">Manage and review system notifications</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={notifications.filter(n => !n.isRead).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 border border-white/20 font-medium text-sm disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Mark All Read
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="appointment">Appointment</option>
            <option value="billing">Billing</option>
            <option value="clinical">Clinical</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <div className="flex gap-2">
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-sm"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 flex items-center gap-2 font-medium text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || readFilter !== 'all'
              ? 'No notifications found' 
              : 'No notifications yet'}
          </p>
          <p className="text-gray-400 text-sm">Notifications will appear here when available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const IconComponent = getTypeIcon(notif.type);
            return (
              <div 
                key={notif._id} 
                className={`bg-white rounded-xl p-4 shadow-sm border transition-all duration-300 hover:shadow-md ${
                  notif.isRead 
                    ? 'border-gray-200' 
                    : 'border-blue-300 bg-blue-50/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                    getTypeColor(notif.type).split(' ')[0]
                  }`}>
                    <IconComponent className={`w-5 h-5 ${
                      getTypeColor(notif.type).split(' ')[0]
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-lg ${
                          notif.isRead ? 'text-gray-900' : 'text-gray-900'
                        }`}>
                          {notif.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notif.priority)}`}>
                          {notif.priority.toUpperCase()}
                        </span>
                        {!notif.isRead && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            NEW
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatDate(notif.createdAt)}</span>
                        {notif.isRead && notif.readAt && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{notif.message}</p>
                    
                    {notif.actionUrl && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Action:</span>
                        <a 
                          href={notif.actionUrl}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Details
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 flex-shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif._id)}
                        className="p-1.5 text-gray-600 hover:text-green-600 transition-colors hover:bg-green-50 rounded-lg"
                        title="Mark as Read"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif._id)}
                      className="p-1.5 text-gray-600 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Summary */}
      {filteredNotifications.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900">{filteredNotifications.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Unread:</span>
              <span className="font-bold text-blue-600">
                {filteredNotifications.filter(n => !n.isRead).length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Urgent:</span>
              <span className="font-bold text-red-600">
                {filteredNotifications.filter(n => n.priority === 'urgent').length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}