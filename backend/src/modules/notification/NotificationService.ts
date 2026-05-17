// modules/notification/NotificationService.ts

import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { NotificationRepository } from './NotificationRepository';
import { SendBulkNotificationRequest, SendRoleNotificationRequest, SendUserMessageRequest, SendBulkUserMessagesRequest } from './NotificationTypes';

export class NotificationService extends BaseService {
  private notificationRepository: NotificationRepository;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.notificationRepository = new NotificationRepository(prisma);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async userExists(userId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });
    return !!user && user.isActive;
  }

  private async getUsersByRole(roles: string[]) {
    return this.prisma.user.findMany({
      where: {
        role: { in: roles as any },
        isActive: true
      },
      select: { id: true, fullName: true, role: true }
    });
  }

  // ============================================
  // CORE NOTIFICATION METHODS
  // ============================================

  async getUserNotifications(
    userId: string,
    unreadOnly?: boolean,
    page: number = 1,
    limit: number = 20
  ) {
    return this.notificationRepository.findByUser(userId, { unreadOnly, page, limit });
  }

  async getNotificationStats(userId: string) {
    return this.notificationRepository.getStats(userId);
  }

  async getUnreadCount(userId: string) {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string) {
    const result = await this.notificationRepository.markAsRead(notificationId, userId);
    if (!result) {
      throw new Error('Notification not found');
    }
    return result;
  }

  async markAllAsRead(userId: string) {
    return this.notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string, userId: string) {
    const deleted = await this.notificationRepository.delete(notificationId, userId);
    if (!deleted) {
      throw new Error('Notification not found');
    }
  }

  // ============================================
  // SEND NOTIFICATIONS
  // ============================================

  async sendNotification(data: {
    userId: string;
    senderId?: string | null;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionType?: string | null;
    actionId?: string | null;
    actionUrl?: string | null;
  }) {
    if (!data.userId) {
      console.warn('⚠️ Cannot send notification: No userId provided');
      return null;
    }

    const userExists = await this.userExists(data.userId);
    if (!userExists) {
      console.warn(`⚠️ Cannot send notification: User ${data.userId} does not exist or is inactive`);
      return null;
    }

    if (data.senderId) {
      const senderExists = await this.userExists(data.senderId);
      if (!senderExists) {
        console.warn(`⚠️ Cannot send notification: Sender ${data.senderId} does not exist or is inactive`);
        return null;
      }
    }

    return this.notificationRepository.create(data);
  }

  async sendBulkNotification(data: SendBulkNotificationRequest) {
    let successCount = 0;
    let failCount = 0;
    const failedUsers: string[] = [];

    for (const userId of data.userIds) {
      try {
        const result = await this.sendNotification({
          userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          actionType: data.actionType,
          actionId: data.actionId,
          actionUrl: data.actionUrl
        });

        if (result) {
          successCount++;
        } else {
          failCount++;
          failedUsers.push(userId);
        }
      } catch (err) {
        failCount++;
        failedUsers.push(userId);
      }
    }

    return {
      successCount,
      failCount,
      failedUsers: failedUsers.slice(0, 10)
    };
  }

  async sendRoleNotification(data: SendRoleNotificationRequest) {
    const users = await this.getUsersByRole(data.roles);
    const userIds = users.map(u => u.id).filter(id => id !== data.excludeUserId);

    let successCount = 0;
    let failCount = 0;

    for (const userId of userIds) {
      const result = await this.sendNotification({
        userId,
        senderId: data.senderId || null,
        title: data.title,
        message: data.message,
        type: data.type,
        priority: data.priority,
        actionType: data.actionType,
        actionId: data.actionId,
        actionUrl: data.actionUrl
      });

      if (result) successCount++;
      else failCount++;
    }

    return { success: successCount, failed: failCount };
  }

  async sendUserMessage(fromUserId: string, data: SendUserMessageRequest) {
    return this.sendNotification({
      userId: data.toUserId,
      senderId: fromUserId,
      title: data.title,
      message: data.message,
      type: 'system',
      priority: data.priority || 'medium',
      actionUrl: data.actionUrl || null
    });
  }

  async sendBulkUserMessages(fromUserId: string, data: SendBulkUserMessagesRequest) {
    let successCount = 0;
    let failCount = 0;

    for (const userId of data.userIds) {
      const result = await this.sendUserMessage(fromUserId, {
        toUserId: userId,
        title: data.title,
        message: data.message,
        priority: data.priority,
        actionUrl: data.actionUrl
      });

      if (result) successCount++;
      else failCount++;
    }

    return { success: successCount, failed: failCount };
  }

  async getConversations(userId: string) {
    return this.notificationRepository.getConversations(userId);
  }

  async cleanupOldNotifications(daysToKeep: number = 30) {
    return this.notificationRepository.cleanupOldNotifications(daysToKeep);
  }

  // ============================================
  // EVENT-BASED NOTIFICATIONS
  // ============================================

  async sendAdmissionNotifications(admissionId: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Patient: { select: { id: true, surname: true, otherNames: true } },
        Ward: { select: { wardName: true } },
        Bed: { select: { bedNumber: true } }
      }
    });

    if (!admission) return;

    const patientFullName = `${admission.Patient?.surname || ''} ${admission.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const wardName = admission.Ward?.wardName || 'Unknown Ward';
    const bedNumber = admission.Bed?.bedNumber || 'Unknown';

    // Notify admitting doctor
    if (admission.createdBy) {
      await this.sendNotification({
        userId: admission.createdBy,
        title: 'New Admission',
        message: `Patient ${patientFullName} admitted to ${wardName}, Bed ${bedNumber}`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'admission',
        actionId: admissionId,
        actionUrl: `/dashboard/admissions/${admissionId}`
      });
    }

    // Notify nursing staff
    await this.sendRoleNotification({
      roles: ['nurse', 'midwife'],
      title: 'New Admission',
      message: `Patient ${patientFullName} admitted to ${wardName}, Bed ${bedNumber}`,
      type: 'clinical',
      priority: 'medium',
      actionType: 'admission',
      actionId: admissionId,
      actionUrl: `/dashboard/admissions/${admissionId}`
    });

    // Notify billing
    await this.sendRoleNotification({
      roles: ['accounts'],
      title: 'Admission - Bill Required',
      message: `Please create admission bill for patient ${patientFullName}`,
      type: 'billing',
      priority: 'high',
      actionType: 'admission_billing',
      actionId: admissionId,
      actionUrl: `/dashboard/billing?admissionId=${admissionId}`
    });
  }

  async sendDischargeNotifications(admissionId: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Patient: { select: { surname: true, otherNames: true } },
        Ward: { select: { wardName: true } }
      }
    });

    if (!admission) return;

    const patientFullName = `${admission.Patient?.surname || ''} ${admission.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const wardName = admission.Ward?.wardName || 'Unknown Ward';

    // Notify attending doctor
    if (admission.createdBy) {
      await this.sendNotification({
        userId: admission.createdBy,
        title: 'Patient Discharged',
        message: `Patient ${patientFullName} has been discharged from ${wardName}`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'discharge',
        actionId: admissionId,
        actionUrl: `/dashboard/admissions/${admissionId}`
      });
    }

    // Notify billing
    await this.sendRoleNotification({
      roles: ['accounts'],
      title: 'URGENT: Discharge Billing Required',
      message: `Please finalize bill for discharged patient ${patientFullName}`,
      type: 'billing',
      priority: 'urgent',
      actionType: 'discharge_billing',
      actionId: admissionId,
      actionUrl: `/dashboard/billing?admissionId=${admissionId}`
    });
  }

  async sendLabResultNotifications(labTestId: string) {
    const labTest = await this.prisma.labTest.findUnique({
      where: { id: labTestId },
      include: {
        ServiceCatalog: { select: { name: true } },
        Attendance: { include: { Patient: { select: { surname: true, otherNames: true } } } }
      }
    });

    if (!labTest) return;

    const patientFullName = `${labTest.Attendance?.Patient?.surname || ''} ${labTest.Attendance?.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const testName = labTest.ServiceCatalog?.name || 'Lab Test';

    if (labTest.createdById) {
      await this.sendNotification({
        userId: labTest.createdById,
        title: 'Lab Results Ready',
        message: `Results for ${testName} for patient ${patientFullName} are now available`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'lab_result',
        actionId: labTestId,
        actionUrl: `/dashboard/laboratory?testId=${labTestId}`
      });
    }
  }

  async sendPaymentNotifications(billId: string, amount: number) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: {
        Patient: { select: { surname: true, otherNames: true } }
      }
    });

    if (!bill) return;

    const patientFullName = `${bill.Patient?.surname || ''} ${bill.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';

    if (bill.createdById) {
      await this.sendNotification({
        userId: bill.createdById,
        title: 'Payment Received',
        message: `Payment of GHS ${amount.toFixed(2)} received for bill ${bill.billNumber} for patient ${patientFullName}`,
        type: 'billing',
        priority: 'medium',
        actionType: 'payment',
        actionId: billId,
        actionUrl: `/dashboard/billing/${billId}`
      });
    }
  }

  async sendPrescriptionNotifications(medicationId: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        Attendance: { include: { Patient: { select: { surname: true, otherNames: true } } } }
      }
    });

    if (!medication) return;

    const patientFullName = `${medication.Attendance?.Patient?.surname || ''} ${medication.Attendance?.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';

    await this.sendRoleNotification({
      roles: ['pharmacist'],
      title: 'New Prescription',
      message: `New prescription for ${medication.name} for patient ${patientFullName} is ready for dispensing`,
      type: 'clinical',
      priority: 'medium',
      actionType: 'prescription',
      actionId: medicationId,
      actionUrl: `/dashboard/pharmacy?prescriptionId=${medicationId}`
    });
  }

  async sendLowStockAlerts() {
    const stockItems = await this.prisma.stockItem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        drugCode: true,
        currentStock: true,
        reorderLevel: true,
        unitOfMeasure: true
      }
    });

    const lowStockItems = stockItems.filter(item => item.currentStock <= item.reorderLevel);

    if (lowStockItems.length === 0) {
      return { sent: 0, items: [] };
    }

    const pharmacyStaff = await this.getUsersByRole(['pharmacist', 'admin']);

    if (pharmacyStaff.length === 0) {
      return { sent: 0, items: lowStockItems };
    }

    const topItems = lowStockItems.slice(0, 5);
    const itemList = topItems.map(i => `• ${i.name}: ${i.currentStock} ${i.unitOfMeasure} left`).join('\n');
    const moreMessage = lowStockItems.length > 5 ? `\n+ ${lowStockItems.length - 5} more items` : '';

    let sentCount = 0;
    for (const staff of pharmacyStaff) {
      const result = await this.sendNotification({
        userId: staff.id,
        title: `⚠️ Low Stock Alert (${lowStockItems.length} items)`,
        message: `${lowStockItems.length} medications below reorder level:\n\n${itemList}${moreMessage}`,
        type: 'system',
        priority: 'high',
        actionType: 'low_stock',
        actionUrl: `/dashboard/inventory?filter=lowStock`
      });
      if (result) sentCount++;
    }

    const outOfStock = lowStockItems.filter(i => i.currentStock === 0);
    if (outOfStock.length > 0) {
      await this.sendRoleNotification({
        roles: ['admin'],
        title: `🚨 CRITICAL: ${outOfStock.length} Items Out of Stock`,
        message: outOfStock.map(i => i.name).join(', '),
        type: 'system',
        priority: 'urgent',
        actionType: 'out_of_stock',
        actionUrl: `/dashboard/inventory`
      });
    }

    return { sent: sentCount, items: lowStockItems };
  }

  async sendAppointmentReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: { gte: tomorrow, lte: endOfTomorrow },
        status: { in: ['scheduled', 'confirmed'] },
        reminderSent: false
      },
      include: {
        patient: { select: { surname: true, otherNames: true } },
        doctor: { select: { id: true, fullName: true } }
      }
    });

    let reminderCount = 0;

    for (const appointment of appointments) {
      const patientFullName = `${appointment.patient?.surname || ''} ${appointment.patient?.otherNames || ''}`.trim() || 'Unknown Patient';

      if (appointment.doctorId) {
        const result = await this.sendNotification({
          userId: appointment.doctorId,
          title: 'Appointment Reminder',
          message: `You have an appointment with patient ${patientFullName} tomorrow at ${appointment.appointmentTime}`,
          type: 'appointment',
          priority: 'medium',
          actionType: 'appointment',
          actionId: appointment.id,
          actionUrl: `/dashboard/appointments/${appointment.id}`
        });
        if (result) reminderCount++;
      }

      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true }
      });
    }

    return reminderCount;
  }
}
