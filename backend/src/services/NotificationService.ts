// services/NotificationService.ts - UPDATED WITH CORRECT DASHBOARD URLS
import { PrismaClient, NotificationType, NotificationPriority } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  
  // Helper to validate user exists
  private static async userExists(userId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true }
    });
    return !!user && user.isActive;
  }

  // Get users by role
  private static async getUsersByRole(roles: string[]): Promise<{ id: string; fullName: string }[]> {
    const users = await prisma.user.findMany({
      where: {
        role: { in: roles as any },
        isActive: true
      },
      select: { id: true, fullName: true }
    });
    return users;
  }

  // Core notification sending function
  static async sendNotification(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionType?: string;
    actionId?: string;
    actionUrl?: string;
  }) {
    try {
      if (!data.userId) {
        console.warn('⚠️ Cannot send notification: No userId provided');
        return null;
      }

      const userExists = await this.userExists(data.userId);
      if (!userExists) {
        console.warn(`⚠️ Cannot send notification: User ${data.userId} does not exist or is inactive`);
        return null;
      }

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

      console.log(`📢 Notification sent to user ${data.userId}: ${data.title}`);
      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  // Send notification to multiple users
  static async sendBulkNotification(data: {
    userIds: string[];
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionType?: string;
    actionId?: string;
    actionUrl?: string;
  }) {
    const results = { success: 0, failed: 0 };
    
    for (const userId of data.userIds) {
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
      
      if (result) results.success++;
      else results.failed++;
    }
    
    return results;
  }

  // Send notification to all users with specific roles
  static async sendRoleNotification(data: {
    roles: string[];
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    actionType?: string;
    actionId?: string;
    actionUrl?: string;
    excludeUserId?: string;
  }) {
    const users = await this.getUsersByRole(data.roles);
    const userIds = users
      .map(u => u.id)
      .filter(id => id !== data.excludeUserId);
    
    return this.sendBulkNotification({
      userIds,
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      actionType: data.actionType,
      actionId: data.actionId,
      actionUrl: data.actionUrl
    });
  }

  // ============================================
  // ADMISSION NOTIFICATIONS - UPDATED URLS
  // ============================================

  static async sendAdmissionNotifications(admissionId: string) {
    try {
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true
            }
          },
          Bed: {
            select: {
              id: true,
              bedNumber: true
            }
          }
        }
      });

      if (!admission) return;

      const patientFullName = admission.Patient 
        ? `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
        : 'Unknown Patient';

      // Notify the admitting doctor
      if (admission.createdBy) {
        await this.sendNotification({
          userId: admission.createdBy,
          title: 'New Admission',
          message: `Patient ${patientFullName} admitted to ${admission.Ward?.wardName || 'Unknown Ward'}, Bed ${admission.Bed?.bedNumber || 'Unknown'}`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'admission',
          actionId: admissionId,
          actionUrl: `/dashboard/admissions/${admissionId}`  // ✅ Updated
        });
      }

      // Notify nursing staff
      await this.sendRoleNotification({
        roles: ['nurse', 'midwife'],
        title: 'New Admission',
        message: `Patient ${patientFullName} admitted to ${admission.Ward?.wardName || 'Unknown Ward'}, Bed ${admission.Bed?.bedNumber || 'Unknown'}`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'admission',
        actionId: admissionId,
        actionUrl: `/dashboard/admissions/${admissionId}`  // ✅ Updated
      });

      // Notify billing department
      await this.sendRoleNotification({
        roles: ['accounts'],
        title: 'Admission - Bill Required',
        message: `Please create admission bill for patient ${patientFullName}`,
        type: 'billing',
        priority: 'high',
        actionType: 'admission_billing',
        actionId: admissionId,
        actionUrl: `/dashboard/billing?admissionId=${admissionId}`  // ✅ Updated
      });

    } catch (error) {
      console.error('Error sending admission notifications:', error);
    }
  }

  // ============================================
  // DISCHARGE NOTIFICATIONS - UPDATED URLS
  // ============================================

  static async sendDischargeNotifications(admissionId: string) {
    try {
      const admission = await prisma.admission.findUnique({
        where: { id: admissionId },
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Ward: {
            select: {
              id: true,
              wardName: true
            }
          }
        }
      });

      if (!admission) return;

      const patientFullName = admission.Patient 
        ? `${admission.Patient.surname} ${admission.Patient.otherNames}`.trim()
        : 'Unknown Patient';

      // Notify the attending doctor
      if (admission.createdBy) {
        await this.sendNotification({
          userId: admission.createdBy,
          title: 'Patient Discharged',
          message: `Patient ${patientFullName} has been discharged from ${admission.Ward?.wardName || 'Unknown Ward'}`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'discharge',
          actionId: admissionId,
          actionUrl: `/dashboard/admissions/${admissionId}`  // ✅ Updated
        });
      }

      // Notify billing department
      await this.sendRoleNotification({
        roles: ['accounts'],
        title: 'URGENT: Discharge Billing Required',
        message: `Please finalize bill for discharged patient ${patientFullName}`,
        type: 'billing',
        priority: 'urgent',
        actionType: 'discharge_billing',
        actionId: admissionId,
        actionUrl: `/dashboard/billing?admissionId=${admissionId}`  // ✅ Updated
      });

    } catch (error) {
      console.error('Error sending discharge notifications:', error);
    }
  }

  // ============================================
  // LAB RESULT NOTIFICATIONS - UPDATED URLS
  // ============================================

  static async sendLabResultNotifications(labTestId: string) {
    try {
      const labTest = await prisma.labTest.findUnique({
        where: { id: labTestId },
        include: {
          ServiceCatalog: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          Attendance: {
            include: {
              Patient: {
                select: {
                  id: true,
                  surname: true,
                  otherNames: true,
                  folderNumber: true
                }
              }
            }
          }
        }
      });

      if (!labTest) return;

      const patientFullName = labTest.Attendance?.Patient
        ? `${labTest.Attendance.Patient.surname} ${labTest.Attendance.Patient.otherNames}`.trim()
        : 'Unknown Patient';

      const testName = labTest.ServiceCatalog?.name || 'Lab Test';

      // Notify the ordering doctor
      if (labTest.createdById) {
        await this.sendNotification({
          userId: labTest.createdById,
          title: 'Lab Results Ready',
          message: `Results for ${testName} for patient ${patientFullName} are now available`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'lab_result',
          actionId: labTestId,
          actionUrl: `/dashboard/laboratory?testId=${labTestId}`  // ✅ Updated
        });
      }

    } catch (error) {
      console.error('Error sending lab result notifications:', error);
    }
  }

  // ============================================
  // PAYMENT NOTIFICATIONS - UPDATED URLS
  // ============================================

  static async sendPaymentNotifications(billId: string, amount: number) {
    try {
      const bill = await prisma.bill.findUnique({
        where: { id: billId },
        include: {
          Patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              folderNumber: true
            }
          },
          Attendance: {
            select: {
              id: true,
              attendanceNumber: true
            }
          }
        }
      });

      if (!bill) return;

      const patientFullName = bill.Patient
        ? `${bill.Patient.surname} ${bill.Patient.otherNames}`.trim()
        : 'Unknown Patient';

      // Notify the user who created the bill
      if (bill.createdById) {
        await this.sendNotification({
          userId: bill.createdById,
          title: 'Payment Received',
          message: `Payment of GHS ${amount.toFixed(2)} received for bill ${bill.billNumber} for patient ${patientFullName}`,
          type: 'billing',
          priority: 'medium',
          actionType: 'payment',
          actionId: billId,
          actionUrl: `/dashboard/billing/${billId}`  // ✅ Updated
        });
      }

    } catch (error) {
      console.error('Error sending payment notifications:', error);
    }
  }

  // ============================================
  // PRESCRIPTION NOTIFICATIONS - UPDATED URLS
  // ============================================

  static async sendPrescriptionNotifications(medicationId: string) {
    try {
      const medication = await prisma.medication.findUnique({
        where: { id: medicationId },
        include: {
          Attendance: {
            include: {
              Patient: {
                select: {
                  id: true,
                  surname: true,
                  otherNames: true
                }
              }
            }
          },
          prescribedBy: {
            select: { id: true, fullName: true }
          }
        }
      });

      if (!medication) return;

      const patientFullName = medication.Attendance?.Patient
        ? `${medication.Attendance.Patient.surname} ${medication.Attendance.Patient.otherNames}`.trim()
        : 'Unknown Patient';

      // Notify pharmacy staff
      await this.sendRoleNotification({
        roles: ['pharmacist'],
        title: 'New Prescription',
        message: `New prescription for ${medication.name} for patient ${patientFullName} is ready for dispensing`,
        type: 'clinical',
        priority: 'medium',
        actionType: 'prescription',
        actionId: medicationId,
        actionUrl: `/dashboard/pharmacy?prescriptionId=${medicationId}`  // ✅ Updated
      });

    } catch (error) {
      console.error('Error sending prescription notifications:', error);
    }
  }

  // ============================================
  // LOW STOCK ALERTS - UPDATED URLS
  // ============================================

  static async sendLowStockAlerts() {
    try {
      const stockItems = await prisma.stockItem.findMany({
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

      const lowStockItems = stockItems.filter(
        item => item.currentStock <= item.reorderLevel
      );

      if (lowStockItems.length === 0) return { sent: 0, items: [] };

      const pharmacyStaff = await this.getUsersByRole(['pharmacist', 'admin']);

      if (pharmacyStaff.length === 0) {
        console.log('⚠️ No pharmacy staff found to send low stock alerts');
        return { sent: 0, items: lowStockItems };
      }

      const topItems = lowStockItems.slice(0, 5);
      const itemList = topItems.map(i => `• ${i.name}: ${i.currentStock} ${i.unitOfMeasure} left (Reorder at ${i.reorderLevel})`).join('\n');
      const moreMessage = lowStockItems.length > 5 ? `\n+ ${lowStockItems.length - 5} more items low in stock` : '';

      let sentCount = 0;
      for (const staff of pharmacyStaff) {
        const result = await this.sendNotification({
          userId: staff.id,
          title: `⚠️ Low Stock Alert (${lowStockItems.length} items)`,
          message: `${lowStockItems.length} medications are below reorder level:\n\n${itemList}${moreMessage}\n\nPlease review and restock.`,
          type: 'system',
          priority: 'high',
          actionType: 'low_stock',
          actionUrl: `/dashboard/inventory?filter=lowStock`  // ✅ Updated
        });
        if (result) sentCount++;
      }

      // Notify admin for critical shortages (stock = 0)
      const outOfStock = lowStockItems.filter(i => i.currentStock === 0);
      if (outOfStock.length > 0) {
        await this.sendRoleNotification({
          roles: ['admin'],
          title: `🚨 CRITICAL: ${outOfStock.length} Items Out of Stock`,
          message: `${outOfStock.map(i => i.name).join(', ')} ${outOfStock.length === 1 ? 'is' : 'are'} completely out of stock. Immediate action required.`,
          type: 'system',
          priority: 'urgent',
          actionType: 'out_of_stock',
          actionUrl: `/dashboard/inventory`  // ✅ Updated
        });
      }

      return { sent: sentCount, items: lowStockItems };
    } catch (error) {
      console.error('Error sending low stock alerts:', error);
      return { sent: 0, items: [] };
    }
  }

  // ============================================
  // APPOINTMENT REMINDERS - UPDATED URLS
  // ============================================

  static async sendAppointmentReminders() {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          appointmentDate: {
            gte: tomorrow,
            lte: endOfTomorrow
          },
          status: {
            in: ['scheduled', 'confirmed']
          },
          reminderSent: false
        },
        include: {
          patient: {
            select: {
              id: true,
              surname: true,
              otherNames: true,
              contact: true
            }
          },
          doctor: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      });

      let reminderCount = 0;

      for (const appointment of appointments) {
        const patientFullName = appointment.patient
          ? `${appointment.patient.surname} ${appointment.patient.otherNames}`.trim()
          : 'Unknown Patient';

        if (appointment.doctorId) {
          const result = await this.sendNotification({
            userId: appointment.doctorId,
            title: 'Appointment Reminder',
            message: `You have an appointment with patient ${patientFullName} tomorrow at ${appointment.appointmentTime}`,
            type: 'appointment',
            priority: 'medium',
            actionType: 'appointment',
            actionId: appointment.id,
            actionUrl: `/dashboard/appointments/${appointment.id}`  // ✅ Updated
          });
          if (result) reminderCount++;
        }

        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true }
        });
      }

      return reminderCount;
    } catch (error) {
      console.error('Error sending appointment reminders:', error);
      return 0;
    }
  }

  static async cleanupOldNotifications(daysToKeep: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = await prisma.notification.deleteMany({
        where: {
          isRead: true,
          createdAt: { lt: cutoffDate }
        }
      });

      console.log(`🧹 Cleaned up ${deleted.count} old notifications`);
      return deleted.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }
}

export default NotificationService;