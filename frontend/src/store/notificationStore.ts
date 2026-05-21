// src/store/notificationStore.ts
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
  sendRoleNotification as apiSendRoleNotification,
  triggerLowStockCheck as apiTriggerLowStockCheck,
  triggerAppointmentReminders as apiTriggerAppointmentReminders,
  cleanupOldNotifications as apiCleanupOldNotifications,
  getUnreadCount as apiGetUnreadCount,
  sendUserMessage as apiSendUserMessage,
  sendBulkUserMessages as apiSendBulkUserMessages,
  getConversations as apiGetConversations,
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
  conversations: any[];
  
  // Actions
  getNotifications: (page?: number, limit?: number) => Promise<void>;
  getNotification: (id: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getNotificationStats: () => Promise<void>;
  createNotification: (data: any) => Promise<void>;
  sendBulkNotification: (data: any) => Promise<void>;
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
  sendUserMessage: (data: any) => Promise<void>;
  sendBulkUserMessages: (data: any) => Promise<void>;
  getConversations: () => Promise<void>;
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
  conversations: [],

  getNotifications: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetNotifications({ page, limit });
      
      console.log('RAW response:', response);
      
      // ✅ Handle case where response is an array (your current backend)
      if (Array.isArray(response)) {
        console.log('Backend returned array - using as notifications list');
        set({ 
          notifications: response,
          unreadCount: response.length,
          pagination: { page: 1, limit: 20, total: response.length, pages: 1 },
          isLoading: false 
        });
        return;
      }
      
      // ✅ Handle wrapped response (after backend fix)
      const responseData = response?.data || response;
      const notifications = responseData?.notifications || [];
      const unreadCount = responseData?.unreadCount || 0;
      const pagination = responseData?.pagination || null;
      
      set({ 
        notifications, 
        unreadCount,
        pagination,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Get notifications error:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await apiGetUnreadCount();
      
      // ✅ Handle array response (current backend)
      if (Array.isArray(response)) {
        set({ unreadCount: response.length });
        return response.length;
      }
      
      // ✅ Handle wrapped response (after backend fix)
      const responseData = response?.data || response;
      const count = responseData?.unreadCount || 0;
      set({ unreadCount: count });
      return count;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
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
      throw error;
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
      throw error;
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

  sendUserMessage: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiSendUserMessage(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to send message', isLoading: false });
      throw error;
    }
  },

  sendBulkUserMessages: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiSendBulkUserMessages(data);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to send messages', isLoading: false });
      throw error;
    }
  },

  getConversations: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiGetConversations();
      const conversations = response.data || response;
      set({ conversations, isLoading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to fetch conversations', isLoading: false });
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

  clearError: () => set({ error: null }),
  clearCurrentNotification: () => set({ currentNotification: null }),
}));