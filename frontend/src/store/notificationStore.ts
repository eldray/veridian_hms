// src/store/notificationStore.ts - ADD THESE ACTIONS

import { create } from 'zustand';
import { 
  getNotifications as apiGetNotifications, 
  getNotification as apiGetNotification, 
  markNotificationAsRead as apiMarkNotificationAsRead, 
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification,
  getNotificationStats as apiGetNotificationStats,
  createNotification as apiCreateNotification,
  sendBulkNotification as apiSendBulkNotification,
  // ✅ ADD THESE NEW IMPORTS
  sendRoleNotification as apiSendRoleNotification,
  triggerLowStockCheck as apiTriggerLowStockCheck,
  triggerAppointmentReminders as apiTriggerAppointmentReminders,
  cleanupOldNotifications as apiCleanupOldNotifications,
  getUnreadCount as apiGetUnreadCount,
} from '../api';
import type { Notification, NotificationStats, Pagination } from '../types';

interface NotificationStore {
  notifications: Notification[];
  currentNotification: Notification | null;
  stats: NotificationStats | null;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  pagination: Pagination | null;
  
  // Existing actions
  getNotifications: (filters?: any) => Promise<void>;
  getNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationStats: () => Promise<void>;
  createNotification: (data: any) => Promise<void>;
  sendBulkNotification: (data: any) => Promise<void>;
  
  // ✅ ADD THESE NEW ACTIONS
  sendRoleNotification: (data: {
    roles: string[];
    title: string;
    message: string;
    type: string;
    priority: string;
    actionType?: string;
    actionId?: string;
    actionUrl?: string;
    excludeUserId?: string;
  }) => Promise<void>;
  triggerLowStockCheck: () => Promise<any>;
  triggerAppointmentReminders: () => Promise<any>;
  cleanupOldNotifications: (daysToKeep?: number) => Promise<any>;
  getUnreadCount: () => Promise<number>;
  
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
  pagination: null,


  getNotifications: async (filters?: any) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetNotifications(filters);
      
      // Handle different response formats
      let notifications: Notification[] = [];
      if (response.data && Array.isArray(response.data)) {
        notifications = response.data;
      } else if (Array.isArray(response)) {
        notifications = response;
      } else if (response.notifications && Array.isArray(response.notifications)) {
        notifications = response.notifications;
      } else if (response.data?.notifications) {
        notifications = response.data.notifications;
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
      throw error;
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

  // ✅ ADD NEW ACTIONS:

  sendRoleNotification: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiSendRoleNotification(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to send role notification', 
        isLoading: false 
      });
      throw error;
    }
  },

  triggerLowStockCheck: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiTriggerLowStockCheck();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to trigger low stock check', 
        isLoading: false 
      });
      throw error;
    }
  },

  triggerAppointmentReminders: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiTriggerAppointmentReminders();
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to trigger appointment reminders', 
        isLoading: false 
      });
      throw error;
    }
  },

  cleanupOldNotifications: async (daysToKeep = 30) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiCleanupOldNotifications(daysToKeep);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to cleanup notifications', 
        isLoading: false 
      });
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const result = await apiGetUnreadCount();
      const count = result.data?.unreadCount || result.unreadCount || 0;
      set({ unreadCount: count });
      return count;
    } catch (error: any) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentNotification: () => set({ currentNotification: null }),
}));