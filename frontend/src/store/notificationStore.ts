import { create } from 'zustand';
import { 
  getNotifications as apiGetNotifications, 
  getNotification as apiGetNotification, 
  markNotificationAsRead as apiMarkNotificationAsRead, 
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification,
  getNotificationStats as apiGetNotificationStats,
  createNotification as apiCreateNotification,
  // ✅ ADDED MISSING FUNCTION
  sendBulkNotification as apiSendBulkNotification
} from '../api';
import type { Notification, NotificationStats, Pagination } from '../types';

interface NotificationStore {
  notifications: Notification[];
  currentNotification: Notification | null;
  stats: NotificationStats | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: Pagination | null; // ✅ ADDED
  
  // Actions
  getNotifications: (filters?: any) => Promise<void>;
  getNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationStats: () => Promise<void>;
  createNotification: (data: any) => Promise<void>;
  // ✅ ADDED MISSING FUNCTION
  sendBulkNotification: (data: any) => Promise<void>;
  
  clearError: () => void;
  clearCurrentNotification: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  currentNotification: null,
  stats: null,
  unreadCount: 0,
  isLoading: false,
  error: null,
  pagination: null, // ✅ ADDED

  getNotifications: async (filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetNotifications(filters);
      
      // ✅ IMPROVED: Handle different response formats
      let notifications: Notification[] = [];
      if (Array.isArray(response)) {
        notifications = response;
      } else if (Array.isArray(response.notifications)) {
        notifications = response.notifications;
      } else if (Array.isArray(response.data)) {
        notifications = response.data;
      }
      
      const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
      set({ 
        notifications, 
        unreadCount, 
        pagination: response.pagination || null,
        isLoading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch notifications', 
        isLoading: false 
      });
      throw error; // ✅ ADDED: Re-throw for component handling
    }
  },

  getNotification: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const notification = await apiGetNotification(id);
      set({ currentNotification: notification, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch notification', 
        isLoading: false 
      });
      throw error; // ✅ ADDED: Re-throw for component handling
    }
  },

  markAsRead: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNotification = await apiMarkNotificationAsRead(id);
      set(state => ({
        notifications: state.notifications.map(notif => 
          notif.id === id ? updatedNotification : notif
        ),
        currentNotification: state.currentNotification?.id === id ? updatedNotification : state.currentNotification,
        unreadCount: Math.max(0, state.unreadCount - 1),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to mark notification as read', 
        isLoading: false 
      });
      throw error;
    }
  },

  markAllAsRead: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiMarkAllNotificationsAsRead();
      set(state => ({
        notifications: state.notifications.map(notif => ({ ...notif, isRead: true })),
        unreadCount: 0,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to mark all notifications as read', 
        isLoading: false 
      });
      throw error;
    }
  },

  deleteNotification: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiDeleteNotification(id);
      const state = get();
      const deletedNotification = state.notifications.find(n => n.id === id);
      set({
        notifications: state.notifications.filter(notif => notif.id !== id),
        currentNotification: state.currentNotification?.id === id ? null : state.currentNotification,
        unreadCount: deletedNotification && !deletedNotification.isRead ? state.unreadCount - 1 : state.unreadCount,
        isLoading: false
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to delete notification', 
        isLoading: false 
      });
      throw error;
    }
  },

  getNotificationStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await apiGetNotificationStats();
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch notification stats', 
        isLoading: false 
      });
      throw error; // ✅ ADDED: Re-throw for component handling
    }
  },

  createNotification: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const newNotification = await apiCreateNotification(data);
      set(state => ({ 
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
        isLoading: false 
      }));
      return newNotification;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to create notification', 
        isLoading: false 
      });
      throw error;
    }
  },

  // ✅ ADDED MISSING FUNCTION
  sendBulkNotification: async (data: any) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiSendBulkNotification(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to send bulk notification', 
        isLoading: false 
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentNotification: () => set({ currentNotification: null }),
}));