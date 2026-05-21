// modules/notification/NotificationService.ts

import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';
import { BaseService } from '../../shared/base/BaseService';
import { NotificationRepository } from './NotificationRepository';
import { SendBulkNotificationRequest, SendRoleNotificationRequest, SendUserMessageRequest, SendBulkUserMessagesRequest } from './NotificationTypes';

export class NotificationService extends BaseService {
  private notificationRepository: NotificationRepository;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    super('NotificationService'); // BaseService only accepts serviceName
    this.prisma = prisma;
    this.notificationRepository = new NotificationRepository(prisma);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async userExists(userId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, isActive: true }
    });
    return !!user;
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
    this.logDebug('Getting user notifications', { userId, page, limit });
    
    const result = await this.notificationRepository.findByUser(userId, { 
      unreadOnly, 
      page, 
      limit 
    });
    
    // ✅ Ensure we return the complete structure
    return {
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination
    };
  }

  async getNotificationStats(userId: string) {
    this.logDebug('Getting notification stats', { userId });
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
        Patient: { select: { id: true, surname: true, otherNames: true, folderNumber: true } },
        Ward: { select: { wardName: true } },
        Bed: { select: { bedNumber: true } }
      }
    });
  
    if (!admission) return;
  
    const patientFullName = `${admission.Patient?.surname || ''} ${admission.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const wardName = admission.Ward?.wardName || 'Unknown Ward';
    const bedNumber = admission.Bed?.bedNumber || 'Unknown';
  
    // 1. Notify admitting doctor (existing)
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
  
    // 2. Notify nursing staff (existing)
    await this.sendRoleNotification({
      roles: ['nurse', 'midwife'],
      title: 'New Admission',
      message: `Patient ${patientFullName} admitted to ${wardName}, Bed ${bedNumber}`,
      type: 'clinical',
      priority: 'medium',
      actionType: 'admission',
      actionId: admissionId,
      actionUrl: `/dashboard/admissions/${admissionId}`,
      excludeUserId: undefined
    });
  
    // 3. Notify billing department (existing)
    await this.sendRoleNotification({
      roles: ['accounts'],
      title: 'Admission - Bill Required',
      message: `Please create admission bill for patient ${patientFullName}`,
      type: 'billing',
      priority: 'high',
      actionType: 'admission_billing',
      actionId: admissionId,
      actionUrl: `/dashboard/billing?admissionId=${admissionId}`,
      excludeUserId: undefined
    });
  
    // 4. ✅ ADD THIS - Notify ALL admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true }
    });
    
    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: '📋 New Patient Admission',
        message: `${patientFullName} (${admission.Patient?.folderNumber}) admitted to ${wardName}. Review admission details.`,
        type: 'system',
        priority: 'medium',
        actionType: 'admission',
        actionId: admissionId,
        actionUrl: `/dashboard/admissions/${admissionId}`
      });
    }
  }
  
  async sendDischargeNotifications(admissionId: string) {
    const admission = await this.prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        Patient: { select: { surname: true, otherNames: true, folderNumber: true } },
        Ward: { select: { wardName: true } }
      }
    });
  
    if (!admission) return;
  
    const patientFullName = `${admission.Patient?.surname || ''} ${admission.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const wardName = admission.Ward?.wardName || 'Unknown Ward';
  
    // 1. Notify attending doctor (existing)
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
  
    // 2. Notify billing department (existing)
    await this.sendRoleNotification({
      roles: ['accounts'],
      title: 'URGENT: Discharge Billing Required',
      message: `Please finalize bill for discharged patient ${patientFullName}`,
      type: 'billing',
      priority: 'urgent',
      actionType: 'discharge_billing',
      actionId: admissionId,
      actionUrl: `/dashboard/billing?admissionId=${admissionId}`,
      excludeUserId: undefined
    });
  
    // 3. ✅ ADD THIS - Notify ALL admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true }
    });
    
    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: '✅ Patient Discharged',
        message: `${patientFullName} discharged from ${wardName}. Ensure final billing is complete.`,
        type: 'system',
        priority: 'medium',
        actionType: 'discharge',
        actionId: admissionId,
        actionUrl: `/dashboard/billing?admissionId=${admissionId}`
      });
    }
  }
  
  async sendLabResultNotifications(labTestId: string) {
    const labTest = await this.prisma.labTest.findUnique({
      where: { id: labTestId },
      include: {
        ServiceCatalog: { select: { name: true } },
        Attendance: { include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } }
      }
    });
  
    if (!labTest) return;
  
    const patientFullName = `${labTest.Attendance?.Patient?.surname || ''} ${labTest.Attendance?.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
    const testName = labTest.ServiceCatalog?.name || 'Lab Test';
  
    // 1. Notify requesting doctor (existing)
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
  
    // 2. ✅ ADD THIS - Notify ALL admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true }
    });
    
    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: '🔬 Lab Results Available',
        message: `${testName} results ready for ${patientFullName} (${labTest.Attendance?.Patient?.folderNumber})`,
        type: 'system',
        priority: 'low',
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
        Patient: { select: { surname: true, otherNames: true, folderNumber: true } }
      }
    });
  
    if (!bill) return;
  
    const patientFullName = `${bill.Patient?.surname || ''} ${bill.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
  
    // 1. Notify billing staff (existing)
    await this.sendRoleNotification({
      roles: ['accounts'],
      title: 'Payment Received',
      message: `Payment of GHS ${amount.toFixed(2)} received for bill ${bill.billNumber} for patient ${patientFullName}`,
      type: 'billing',
      priority: 'medium',
      actionType: 'payment',
      actionId: billId,
      actionUrl: `/dashboard/billing/${billId}`,
      excludeUserId: undefined
    });
  
    // 2. ✅ ADD THIS - Notify ALL admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true }
    });
    
    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: '💰 Payment Recorded',
        message: `GHS ${amount.toFixed(2)} received from ${patientFullName} (Bill: ${bill.billNumber})`,
        type: 'billing',
        priority: 'low',
        actionType: 'payment',
        actionId: billId,
        actionUrl: `/dashboard/billing/${billId}`
      });
    }
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
  
    const pharmacyStaff = await this.prisma.user.findMany({
      where: { role: { in: ['pharmacist', 'admin'] }, isActive: true }
    });
  
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
  
    // Critical out-of-stock - already sends to admins via pharmacyStaff query above
    const outOfStock = lowStockItems.filter(i => i.currentStock === 0);
    if (outOfStock.length > 0) {
      // This will also reach admins through the pharmacyStaff query
      console.log(`🚨 CRITICAL: ${outOfStock.length} items out of stock`);
    }
  
    return { sent: sentCount, items: lowStockItems };
  }
  
  async sendPrescriptionNotifications(medicationId: string) {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
      include: {
        Attendance: { include: { Patient: { select: { surname: true, otherNames: true, folderNumber: true } } } }
      }
    });
  
    if (!medication) return;
  
    const patientFullName = `${medication.Attendance?.Patient?.surname || ''} ${medication.Attendance?.Patient?.otherNames || ''}`.trim() || 'Unknown Patient';
  
    // 1. Notify pharmacists (existing)
    await this.sendRoleNotification({
      roles: ['pharmacist'],
      title: 'New Prescription',
      message: `New prescription for ${medication.name} for patient ${patientFullName} is ready for dispensing`,
      type: 'clinical',
      priority: 'medium',
      actionType: 'prescription',
      actionId: medicationId,
      actionUrl: `/dashboard/pharmacy?prescriptionId=${medicationId}`,
      excludeUserId: undefined
    });
  
    // 2. ✅ ADD THIS - Notify ALL admins
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', isActive: true }
    });
    
    for (const admin of admins) {
      await this.sendNotification({
        userId: admin.id,
        title: '💊 New Prescription Issued',
        message: `Prescription for ${medication.name} issued to ${patientFullName} (${medication.Attendance?.Patient?.folderNumber})`,
        type: 'system',
        priority: 'low',
        actionType: 'prescription',
        actionId: medicationId,
        actionUrl: `/dashboard/pharmacy?prescriptionId=${medicationId}`
      });
    }
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
        patient: { select: { id: true, surname: true, otherNames: true, phone: true, contact: true } },
        doctor: { select: { id: true, fullName: true } },
        department: { select: { name: true } }
      }
    });
  
    let reminderCount = 0;
    const appointmentsByDoctor = new Map(); // Track for summary
  
    for (const appointment of appointments) {
      const patientFullName = `${appointment.patient?.surname || ''} ${appointment.patient?.otherNames || ''}`.trim() || 'Unknown Patient';
      const departmentName = appointment.department?.name || 'General';
  
      // 1. Notify doctor (existing)
      if (appointment.doctorId) {
        const result = await this.sendNotification({
          userId: appointment.doctorId,
          title: 'Appointment Reminder',
          message: `You have an appointment with patient ${patientFullName} tomorrow at ${appointment.appointmentTime} (${departmentName})`,
          type: 'appointment',
          priority: 'medium',
          actionType: 'appointment',
          actionId: appointment.id,
          actionUrl: `/dashboard/appointments/${appointment.id}`
        });
        if (result) reminderCount++;
        
        // Track for summary
        if (!appointmentsByDoctor.has(appointment.doctorId)) {
          appointmentsByDoctor.set(appointment.doctorId, []);
        }
        appointmentsByDoctor.get(appointment.doctorId).push(patientFullName);
      }
  
      // 2. ✅ ADD THIS - Notify patient via in-app notification
      if (appointment.patientId) {
        await this.sendNotification({
          userId: appointment.patientId,
          title: 'Appointment Reminder',
          message: `Reminder: You have an appointment tomorrow at ${appointment.appointmentTime} with ${appointment.doctor?.fullName || 'doctor'} (${departmentName})`,
          type: 'appointment',
          priority: 'medium',
          actionType: 'appointment',
          actionId: appointment.id,
          actionUrl: `/dashboard/my-appointments/${appointment.id}`
        });
        
        // Optional: Send SMS if patient has phone number
        if (appointment.patient?.phone || appointment.patient?.contact) {
          // You can integrate SMS here if needed
          console.log(`📱 Would send SMS to ${appointment.patient?.phone || appointment.patient?.contact}`);
        }
      }
  
      // 3. ✅ ADD THIS - Notify ALL admins about upcoming appointments (summary)
      await this.prisma.$transaction(async (tx) => {
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true }
        });
      });
    }
  
    // 4. ✅ ADD THIS - Send daily summary to admins
    if (appointments.length > 0) {
      const admins = await this.prisma.user.findMany({
        where: { role: 'admin', isActive: true }
      });
      
      // Group by doctor for summary
      const doctorSummary: Record<string, { doctorName: string; count: number; patients: string[] }> = {};
      
      for (const appointment of appointments) {
        if (appointment.doctorId && appointment.doctor) {
          if (!doctorSummary[appointment.doctorId]) {
            doctorSummary[appointment.doctorId] = {
              doctorName: appointment.doctor.fullName,
              count: 0,
              patients: []
            };
          }
          doctorSummary[appointment.doctorId].count++;
          const patientName = `${appointment.patient?.surname || ''} ${appointment.patient?.otherNames || ''}`.trim() || 'Unknown';
          doctorSummary[appointment.doctorId].patients.push(patientName);
        }
      }
      
      const summaryMessage = Object.values(doctorSummary)
        .map(d => `• Dr. ${d.doctorName}: ${d.count} appointment(s)`)
        .join('\n');
      
      for (const admin of admins) {
        await this.sendNotification({
          userId: admin.id,
          title: `📅 Daily Appointment Summary (${tomorrow.toLocaleDateString()})`,
          message: `Tomorrow's appointments:\n${summaryMessage}\n\nTotal: ${appointments.length} appointments scheduled.`,
          type: 'system',
          priority: 'low',
          actionType: 'appointments_summary',
          actionUrl: `/dashboard/appointments?date=${tomorrow.toISOString().split('T')[0]}`
        });
      }
    }
  
    console.log(`📅 Sent ${reminderCount} appointment reminders to doctors, ${appointments.length} to patients, and summary to admins`);
    return reminderCount;
  }
}
