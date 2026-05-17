// services/WardChargeService.ts - COMPLETE REWRITE
import { PrismaClient, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

export class WardChargeService {
  static async generateDailyCharges(targetDate: Date = new Date()): Promise<number> {
    // Find all active admissions on this date
    const activeAdmissions = await prisma.admission.findMany({
      where: {
        status: 'admitted',
        admissionDate: { lte: targetDate },
        OR: [
          { dischargeDate: null },
          { dischargeDate: { gt: targetDate } }
        ]
      },
      include: {
        attendance: {
          include: {
            patient: true
          }
        },
        ward: true,
        bed: true
      }
    });

    let chargesCreated = 0;

    for (const admission of activeAdmissions) {
      // Check if charge already exists for this date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingCharge = await prisma.wardChargeRecord.findFirst({
        where: {
          attendanceId: admission.attendanceId!,
          chargeDate: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      if (existingCharge) continue;

      // ✅ FIXED: Get pricing from ServiceCatalog linked to ward
      const wardService = await prisma.serviceCatalog.findFirst({
        where: {
          wardId: admission.wardId,
          serviceType: 'ward',
          isActive: true
        },
        include: {
          pricing: true
        }
      });

      if (!wardService || !wardService.pricing) {
        console.warn(`No service catalog pricing for ward ${admission.wardId}`);
        continue;
      }

      const pricing = wardService.pricing;
      const paymentMode = admission.attendance?.paymentMode || 'cash';
      
      let dailyRate = 0;
      let nhisPrice = 0;
      let cashPrice = 0;
      let insurancePrice = 0;

      switch (paymentMode) {
        case 'nhis':
          dailyRate = pricing.nhisPrice;
          nhisPrice = dailyRate;
          break;
        case 'private_insurance':
          dailyRate = pricing.insurancePrice;
          insurancePrice = dailyRate;
          break;
        default:
          dailyRate = pricing.cashPrice;
          cashPrice = dailyRate;
      }

      await prisma.wardChargeRecord.create({
        data: {
          attendanceId: admission.attendanceId!,
          admissionId: admission.id,
          wardId: admission.wardId,
          bedId: admission.bedId,
          chargeDate: targetDate,
          dailyRate,
          paymentMode: paymentMode as PaymentMode,
          nhisPrice,
          cashPrice,
          insurancePrice,
          isBilled: false
        }
      });

      chargesCreated++;
    }

    return chargesCreated;
  }

  static async billUnbilledCharges(attendanceId: string): Promise<number> {
    const unbilledCharges = await prisma.wardChargeRecord.findMany({
      where: {
        attendanceId,
        isBilled: false
      }
    });

    for (const charge of unbilledCharges) {
      // Find the ward service catalog entry
      const wardService = await prisma.serviceCatalog.findFirst({
        where: {
          wardId: charge.wardId,
          serviceType: 'ward',
          isActive: true
        }
      });

      if (wardService) {
        await prisma.serviceRendered.create({
          data: {
            attendanceId,
            serviceItemId: wardService.id,
            quantity: 1,
            date: charge.chargeDate,
            performedById: 'system',
            notes: `Daily bed charge for ${charge.chargeDate.toISOString().split('T')[0]}`
          }
        });
      }

      await prisma.wardChargeRecord.update({
        where: { id: charge.id },
        data: { isBilled: true }
      });
    }

    return unbilledCharges.length;
  }

  static async getPendingWardCharges(admissionId: string) {
    return await prisma.wardChargeRecord.findMany({
      where: {
        admissionId,
        isBilled: false
      },
      orderBy: { chargeDate: 'asc' }
    });
  }
}