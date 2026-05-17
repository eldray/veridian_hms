// modules/notification/NotificationTypes.ts

import { NotificationType, NotificationPriority } from '@prisma/client';

// ============================================
// REQUEST DTOs
// ============================================

export interface GetNotificationsRequest {
  unreadOnly?: string;
  page?: string;
  limit?: string;
}

export interface MarkAsReadRequest {
  id: string;
}

export interface DeleteNotificationRequest {
  id: string;
}

export interface SendBulkNotificationRequest {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  metadata?: any;
}

export interface SendRoleNotificationRequest {
  roles: string[];
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  actionType?: string;
  actionId?: string;
  actionUrl?: string;
  excludeUserId?: string;
}

export interface SendUserMessageRequest {
  toUserId: string;
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

export interface SendBulkUserMessagesRequest {
  userIds: string[];
  title: string;
  message: string;
  priority?: NotificationPriority;
  actionUrl?: string;
}

export interface CleanupOldNotificationsRequest {
  daysToKeep?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export interface NotificationResponse {
  success: boolean;
  data?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount?: number;
}

export interface NotificationStatsResponse {
  success: boolean;
  data: {
    total: number;
    unread: number;
    read: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    unreadPercentage: number;
  };
}

export interface BulkNotificationResponse {
  success: boolean;
  message: string;
  data: {
    successCount: number;
    failCount: number;
    failedUsers: string[];
  };
}

export interface RoleNotificationResponse {
  success: boolean;
  message: string;
  data: {
    success: number;
    failed: number;
  };
}

export interface UserMessageResponse {
  success: boolean;
  message: string;
  data: any;
}

export interface ConversationsResponse {
  success: boolean;
  data: Array<{
    userId: string;
    userName: string;
    userRole: string;
    messageCount: number;
    lastMessageAt: Date | null;
  }>;
}

export interface CleanupResponse {
  success: boolean;
  message: string;
  data: {
    deletedCount: number;
  };
}

// ============================================
// SERVICE INTERFACES
// ============================================

export interface INotificationService {
  getUserNotifications(userId: string, unreadOnly?: boolean, page?: number, limit?: number): Promise<any>;
  getNotificationStats(userId: string): Promise<any>;
  markAsRead(notificationId: string, userId: string): Promise<any>;
  markAllAsRead(userId: string): Promise<any>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  sendBulkNotification(data: SendBulkNotificationRequest): Promise<any>;
  sendRoleNotification(data: SendRoleNotificationRequest): Promise<any>;
  sendUserMessage(fromUserId: string, data: SendUserMessageRequest): Promise<any>;
  sendBulkUserMessages(fromUserId: string, data: SendBulkUserMessagesRequest): Promise<any>;
  getConversations(userId: string): Promise<any>;
  cleanupOldNotifications(daysToKeep: number): Promise<number>;
}

// ============================================
// NOTIFICATION MODEL TYPE
// ============================================

export interface NotificationDTO {
  id: string;
  userId: string;
  senderId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  readAt: Date | null;
  actionType: string | null;
  actionId: string | null;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
