// services/NotificationService.ts - FIXED VERSION
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class NotificationService {
  
  // Helper to validate user exists before sending
  private static async userExists(userId: string): Promise<boolean> {
    if (!userId) return false;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    return !!user;
  }

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
      // ✅ VALIDATE USER EXISTS FIRST
      if (!data.userId) {
        console.warn('⚠️ Cannot send notification: No userId provided');
        return null;
      }

      const userExists = await this.userExists(data.userId);
      if (!userExists) {
        console.warn(`⚠️ Cannot send notification: User ${data.userId} does not exist`);
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
      // Don't throw - just log the error so it doesn't break the main flow
      return null;
    }
  }

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

      // ✅ SAFE: Only send notification if createdBy exists and user is valid
      if (admission.createdBy) {
        await this.sendNotification({
          userId: admission.createdBy,
          title: 'New Admission',
          message: `Patient ${patientFullName} admitted to ${admission.Ward?.wardName || 'Unknown Ward'}, Bed ${admission.Bed?.bedNumber || 'Unknown'}`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'admission',
          actionId: admissionId,
          actionUrl: `/admissions/${admissionId}`
        });
      } else {
        console.log(`ℹ️ No createdBy user for admission ${admissionId}, skipping notification`);
      }
    } catch (error) {
      console.error('Error sending admission notifications:', error);
    }
  }

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

      // ✅ SAFE: Only send notification if createdBy exists and user is valid
      if (admission.createdBy) {
        await this.sendNotification({
          userId: admission.createdBy,
          title: 'Patient Discharged',
          message: `Patient ${patientFullName} discharged from ${admission.Ward?.wardName || 'Unknown Ward'}`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'discharge',
          actionId: admissionId,
          actionUrl: `/admissions/${admissionId}`
        });
      }

      // Notify billing department (find accounts users that exist)
      const accountsUsers = await prisma.user.findMany({
        where: {
          role: 'accounts',
          isActive: true
        },
        select: { id: true }
      });

      for (const user of accountsUsers) {
        await this.sendNotification({
          userId: user.id,
          title: 'Discharge Billing Required',
          message: `Please finalize bill for discharged patient ${patientFullName}`,
          type: 'billing',
          priority: 'high',
          actionType: 'billing',
          actionId: admissionId,
          actionUrl: `/billing?admissionId=${admissionId}`
        });
      }
    } catch (error) {
      console.error('Error sending discharge notifications:', error);
    }
  }

  static async sendLabResultNotifications(labTestId: string) {
    try {
      const labTest = await prisma.labTest.findUnique({
        where: { id: labTestId },
        include: {
          LabTestTemplate: {
            select: {
              id: true,
              name: true,
              investigationCode: true
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
              },
              User_Attendance_createdByIdToUser: {
                select: {
                  id: true,
                  fullName: true
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

      const testName = labTest.LabTestTemplate?.name || 'Lab Test';
      const orderingDoctorId = labTest.createdById || labTest.Attendance?.createdById;

      if (orderingDoctorId) {
        await this.sendNotification({
          userId: orderingDoctorId,
          title: 'Lab Results Ready',
          message: `Lab results for ${testName} for patient ${patientFullName} are now available`,
          type: 'clinical',
          priority: 'medium',
          actionType: 'lab_result',
          actionId: labTestId,
          actionUrl: `/lab-tests/${labTestId}`
        });
      }
    } catch (error) {
      console.error('Error sending lab result notifications:', error);
    }
  }

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
          actionType: 'payment_received',
          actionId: billId,
          actionUrl: `/bills/${billId}`
        });
      }

      // Also notify accounts department if bill is now fully paid
      if (bill.balance - amount <= 0) {
        const accountsUsers = await prisma.user.findMany({
          where: {
            role: 'accounts',
            isActive: true
          },
          select: { id: true }
        });

        for (const user of accountsUsers) {
          await this.sendNotification({
            userId: user.id,
            title: 'Bill Fully Paid',
            message: `Bill ${bill.billNumber} for patient ${patientFullName} has been fully paid (GHS ${amount.toFixed(2)})`,
            type: 'billing',
            priority: 'low',
            actionType: 'payment_completed',
            actionId: billId,
            actionUrl: `/bills/${billId}`
          });
        }
      }
    } catch (error) {
      console.error('Error sending payment notifications:', error);
    }
  }

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
          Patient: {
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

      for (const appointment of appointments) {
        const patientFullName = appointment.Patient
          ? `${appointment.Patient.surname} ${appointment.Patient.otherNames}`.trim()
          : 'Unknown Patient';

        // Notify doctor
        if (appointment.doctorId) {
          await this.sendNotification({
            userId: appointment.doctorId,
            title: 'Appointment Reminder',
            message: `You have an appointment with patient ${patientFullName} tomorrow at ${appointment.appointmentTime}`,
            type: 'appointment',
            priority: 'medium',
            actionType: 'appointment',
            actionId: appointment.id,
            actionUrl: `/appointments/${appointment.id}`
          });
        }

        // Mark reminder as sent
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSent: true }
        });
      }

      return appointments.length;
    } catch (error) {
      console.error('Error sending appointment reminders:', error);
      return 0;
    }
  }

  static async sendLowStockAlerts() {
    try {
      const lowStockItems = await prisma.stockItem.findMany({
        where: {
          currentStock: {
            lte: prisma.stockItem.fields.reorderLevel
          },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          drugCode: true,
          currentStock: true,
          reorderLevel: true
        }
      });

      if (lowStockItems.length === 0) return 0;

      const pharmacyUsers = await prisma.user.findMany({
        where: {
          role: 'pharmacist',
          isActive: true
        },
        select: { id: true }
      });

      for (const user of pharmacyUsers) {
        await this.sendNotification({
          userId: user.id,
          title: `Low Stock Alert (${lowStockItems.length} items)`,
          message: `${lowStockItems.length} medications are below reorder level. Please review stock.`,
          type: 'system',
          priority: 'high',
          actionType: 'low_stock',
          actionUrl: '/inventory?filter=lowStock'
        });
      }

      return lowStockItems.length;
    } catch (error) {
      console.error('Error sending low stock alerts:', error);
      return 0;
    }
  }
}