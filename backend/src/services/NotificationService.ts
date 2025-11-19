import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class NotificationService {
  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'system' | 'appointment' | 'billing' | 'clinical';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    actionType?: string;
    actionId?: string;
    actionUrl?: string;
  }) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          actionType: data.actionType,
          actionId: data.actionId,
          actionUrl: data.actionUrl,
          isRead: false,
          isArchived: false
        }
      });

      // Integrate with real-time notifications (Socket.io, push notifications, etc.)
      console.log(`Notification sent to user ${data.userId}: ${data.title}`);

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  static async sendAdmissionNotifications(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        ward: true,
        bed: true
      }
    });

    if (!admission) return;

    // Notify attending doctor
    await this.sendNotification({
      userId: admission.createdBy,
      title: 'New Admission',
      message: `Patient ${admission.patient.fullName} admitted to ${admission.ward.wardName}, Bed ${admission.bed.bedNumber}`,
      type: 'clinical',
      priority: 'medium'
    });

    // Notify nursing station
    // This would need to be enhanced to find nurses assigned to the ward
  }

  static async sendDischargeNotifications(admissionId: string) {
    const admission = await prisma.admission.findUnique({
      where: { id: admissionId },
      include: {
        patient: true,
        ward: true
      }
    });

    if (!admission) return;

    await this.sendNotification({
      userId: admission.createdBy,
      title: 'Patient Discharged',
      message: `Patient ${admission.patient.fullName} discharged from ${admission.ward.wardName}`,
      type: 'clinical',
      priority: 'medium'
    });

    // Notify billing department
    await this.sendNotification({
      userId: 'accounts', // This should be a specific user or role-based
      title: 'Discharge Billing',
      message: `Please finalize bill for discharged patient ${admission.patient.fullName}`,
      type: 'billing',
      priority: 'high'
    });
  }

  static async sendLabResultNotifications(labTestId: string) {
    const labTest = await prisma.labTest.findUnique({
      where: { id: labTestId },
      include: {
        template: true,
        attendance: {
          include: {
            patient: true,
            createdBy: true
          }
        }
      }
    });

    if (!labTest) return;

    await this.sendNotification({
      userId: labTest.attendance.createdBy,
      title: 'Lab Results Ready',
      message: `Lab results for ${labTest.template.name} for patient ${labTest.attendance.patient.fullName} are available`,
      type: 'clinical',
      priority: 'medium',
      actionType: 'lab_result',
      actionId: labTestId,
      actionUrl: `/lab-tests/${labTestId}`
    });
  }

  static async sendPaymentNotifications(billId: string, amount: number) {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        patient: true,
        attendance: true
      }
    });

    if (!bill) return;

    await this.sendNotification({
      userId: bill.createdBy,
      title: 'Payment Received',
      message: `Payment of ${amount} received for bill ${bill.billNumber} for patient ${bill.patient.fullName}`,
      type: 'billing',
      priority: 'medium',
      actionType: 'payment_received',
      actionId: billId,
      actionUrl: `/bills/${billId}`
    });
  }
}