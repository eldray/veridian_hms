import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { NotificationRepository } from './NotificationRepository';

export class NotificationService extends BaseService {
  private repo: NotificationRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('NotificationService');
    this.prisma = prisma;
    this.repo = new NotificationRepository(prisma);
  }

  async getUserNotifications(userId: string, unreadOnly?: boolean, page: number = 1, limit: number = 20) {
    return this.repo.findByUser(userId, { unreadOnly, page, limit });
  }

  async createNotification(data: any) {
    return this.repo.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      actionType: data.actionType,
      actionId: data.actionId,
      actionUrl: data.actionUrl,
    });
  }

  async getNotificationStats(userId: string) { return this.repo.getStats(userId); }
  async getUnreadCount(userId: string) { return this.repo.getUnreadCount(userId); }
  
  async markAsRead(notificationId: string, userId: string) {
    return this.repo.markAsRead(notificationId, userId);
  }

  async markAllAsRead(userId: string) { return this.repo.markAllAsRead(userId); }
  
  async deleteNotification(notificationId: string, userId: string) {
    await this.repo.delete(notificationId, userId);
  }

  // ✅ OPTIMIZED: Bulk insert instead of N+1 loop
  async sendBulkNotification(data: any) {
    // 1. Validate users in a single query
    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: data.userIds }, isActive: true },
      select: { id: true }
    });
    
    const validUserIds = validUsers.map(u => u.id);
    if (validUserIds.length === 0) {
      return { successCount: 0, failCount: data.userIds.length, failedUsers: data.userIds.slice(0, 10) };
    }

    // 2. Insert all notifications in a single query
    await this.prisma.notification.createMany({
      data: validUserIds.map(userId => ({
        userId, senderId: data.senderId, title: data.title, message: data.message,
        type: data.type, priority: data.priority, actionType: data.actionType,
        actionId: data.actionId, actionUrl: data.actionUrl
      }))
    });

    const failedUsers = data.userIds.filter(id => !validUserIds.includes(id));
    return { successCount: validUserIds.length, failCount: failedUsers.length, failedUsers: failedUsers.slice(0, 10) };
  }

  // ✅ OPTIMIZED: Bulk insert instead of N+1 loop
  async sendRoleNotification(data: any) {
    const users = await this.prisma.user.findMany({
      where: { role: { in: data.roles }, isActive: true, id: { not: data.excludeUserId } },
      select: { id: true }
    });

    if (users.length === 0) return { success: 0, failed: 0 };

    await this.prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id, title: data.title, message: data.message,
        type: data.type, priority: data.priority, actionType: data.actionType,
        actionId: data.actionId, actionUrl: data.actionUrl
      }))
    });

    return { success: users.length, failed: 0 };
  }

  async sendUserMessage(fromUserId: string, data: any) {
    return this.repo.create({ 
      userId: data.toUserId, senderId: fromUserId, title: data.title, 
      message: data.message, type: 'system', priority: data.priority || 'medium', 
      actionUrl: data.actionUrl 
    });
  }

  // ✅ OPTIMIZED: Bulk insert instead of N+1 loop
  async sendBulkUserMessages(fromUserId: string, data: any) {
    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: data.userIds }, isActive: true },
      select: { id: true }
    });

    if (validUsers.length === 0) return { success: 0, failed: data.userIds.length };

    await this.prisma.notification.createMany({
      data: validUsers.map(u => ({
        userId: u.id, senderId: fromUserId, title: data.title, 
        message: data.message, type: 'system', priority: data.priority || 'medium', 
        actionUrl: data.actionUrl
      }))
    });

    return { success: validUsers.length, failed: data.userIds.length - validUsers.length };
  }

  async getConversations(userId: string) { return this.repo.getConversations(userId); }
  async cleanupOldNotifications(daysToKeep: number = 30) { return this.repo.cleanupOldNotifications(daysToKeep); }

  // ==========================================
  // EVENT-BASED NOTIFICATIONS (Schema Aligned)
  // ==========================================

  async sendAdmissionNotifications(admissionId: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: { attendance: { include: { Patient: true, Ward: true, Bed: true } } }
    });
    if (!admission) return;

    const p = admission.attendance?.Patient;
    const patientFullName = p ? `${p.surname} ${p.otherNames}`.trim() : 'Unknown Patient';
    const wardName = admission.attendance?.Ward?.wardName || 'Unknown Ward';
    const bedNumber = admission.attendance?.Bed?.bedNumber || 'Unknown';
    const createdById = admission.attendance?.createdById;

    const notificationsData: any[] = [];

    if (createdById) {
      notificationsData.push({ userId: createdById, title: 'New Admission', message: `Patient ${patientFullName} admitted to ${wardName}, Bed ${bedNumber}`, type: 'clinical', priority: 'medium', actionType: 'admission', actionId: admissionId });
    }

    // Get nurses/midwives
    const nurses = await this.prisma.user.findMany({ where: { role: { in: ['nurse', 'midwife'] }, isActive: true }, select: { id: true } });
    nurses.forEach(n => notificationsData.push({ userId: n.id, title: 'New Admission', message: `Patient ${patientFullName} admitted to ${wardName}, Bed ${bedNumber}`, type: 'clinical', priority: 'medium', actionType: 'admission', actionId: admissionId }));

    // Get accounts
    const accounts = await this.prisma.user.findMany({ where: { role: 'accounts', isActive: true }, select: { id: true } });
    accounts.forEach(a => notificationsData.push({ userId: a.id, title: 'Admission - Bill Required', message: `Please create admission bill for patient ${patientFullName}`, type: 'billing', priority: 'high', actionType: 'admission_billing', actionId: admissionId }));

    // Get admins
    const admins = await this.prisma.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } });
    admins.forEach(a => notificationsData.push({ userId: a.id, title: '📋 New Patient Admission', message: `${patientFullName} (${p?.folderNumber}) admitted to ${wardName}.`, type: 'system', priority: 'medium', actionType: 'admission', actionId: admissionId }));

    if (notificationsData.length > 0) {
      await this.prisma.notification.createMany({ data: notificationsData });
    }
  }

  async sendLabResultNotifications(labTestId: string) {
    const labTest = await this.prisma.labTest.findUnique({
      where: { id: labTestId },
      include: { ServiceCatalog: true, Attendance: { include: { Patient: true } } }
    });
    if (!labTest) return;

    const p = labTest.Attendance?.Patient;
    const patientFullName = p ? `${p.surname} ${p.otherNames}`.trim() : 'Unknown Patient';
    const testName = labTest.ServiceCatalog?.name || 'Lab Test';

    const notificationsData: any[] = [];

    if (labTest.createdById) {
      notificationsData.push({ userId: labTest.createdById, title: 'Lab Results Ready', message: `Results for ${testName} for patient ${patientFullName} are now available`, type: 'clinical', priority: 'medium', actionType: 'lab_result', actionId: labTestId });
    }

    const admins = await this.prisma.user.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } });
    admins.forEach(a => notificationsData.push({ userId: a.id, title: '🔬 Lab Results Available', message: `${testName} results ready for ${patientFullName} (${p?.folderNumber})`, type: 'system', priority: 'low', actionType: 'lab_result', actionId: labTestId }));

    if (notificationsData.length > 0) {
      await this.prisma.notification.createMany({ data: notificationsData });
    }
  }

  // ✅ OPTIMIZED: Bulk insert instead of N+1 loop
  async sendAppointmentReminders() {
    const tomorrow = new Date(); 
    tomorrow.setDate(tomorrow.getDate() + 1); 
    tomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow); 
    endOfTomorrow.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: { scheduledAt: { gte: tomorrow, lte: endOfTomorrow }, status: { in: ['scheduled', 'confirmed'] }, reminderSent: false },
      include: { patient: true, clinician: true, department: true }
    });

    const notificationsData: any[] = [];
    const appointmentIds: string[] = [];

    for (const appt of appointments) {
      appointmentIds.push(appt.id);
      const pName = appt.patient ? `${appt.patient.surname} ${appt.patient.otherNames}`.trim() : 'Unknown';
      const timeStr = appt.scheduledAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const dept = appt.department?.name || 'General';

      if (appt.clinicianId) {
        notificationsData.push({ userId: appt.clinicianId, title: 'Appointment Reminder', message: `Appointment with ${pName} tomorrow at ${timeStr} (${dept})`, type: 'appointment', priority: 'medium', actionId: appt.id });
      }

      if (appt.patientId) {
        notificationsData.push({ userId: appt.patientId, title: 'Appointment Reminder', message: `Reminder: Appointment tomorrow at ${timeStr} with ${appt.clinician?.fullName || 'doctor'}`, type: 'appointment', priority: 'medium', actionId: appt.id });
      }
    }

    if (notificationsData.length > 0) {
      await this.prisma.notification.createMany({ data: notificationsData });
    }

    if (appointmentIds.length > 0) {
      await this.prisma.appointment.updateMany({ where: { id: { in: appointmentIds } }, data: { reminderSent: true } });
    }

    return notificationsData.length;
  }

  async sendLowStockAlerts() {
    // Note: Prisma doesn't natively support comparing two fields (currentStock <= reorderLevel) in standard where.
    // We fetch active items and filter in JS. For massive datasets, consider $queryRaw.
    const stockItems = await this.prisma.stockItem.findMany({ where: { isActive: true } });
    const lowStockItems = stockItems.filter(item => item.currentStock <= item.reorderLevel);
    
    if (lowStockItems.length === 0) return { sent: 0, items: [] };

    const topItems = lowStockItems.slice(0, 5);
    const itemList = topItems.map(i => `• ${i.name}: ${i.currentStock} ${i.unitOfMeasure} left`).join('\n');
    const msg = `${lowStockItems.length} medications below reorder level:\n\n${itemList}`;

    const staff = await this.prisma.user.findMany({ 
      where: { role: { in: ['pharmacist', 'admin'] }, isActive: true }, 
      select: { id: true } 
    });

    if (staff.length > 0) {
      await this.prisma.notification.createMany({
        data: staff.map(s => ({ 
          userId: s.id, 
          title: `⚠️ Low Stock Alert (${lowStockItems.length} items)`, 
          message: msg, 
          type: 'system' as NotificationType, 
          priority: 'high' as NotificationPriority, 
          actionType: 'low_stock' 
        }))
      });
    }
    
    return { sent: staff.length, items: lowStockItems };
  }
}