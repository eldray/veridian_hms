import { NotificationType, NotificationPriority } from '@prisma/client';

export interface GetNotificationsRequest {
  unreadOnly?: string;
  page?: string;
  limit?: string;
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

// ✅ UPDATED: Changed 'pages' to 'totalPages' to match BaseController.paginated()
export interface NotificationResponse {
  success: boolean;
  data?: any;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number; 
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