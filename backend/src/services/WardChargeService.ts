import { PrismaClient } from '@prisma/client';

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
        attendance: true,
        ward: true,
        bed: true
      }
    });

    let chargesCreated = 0;

    for (const admission of activeAdmissions) {
      // Check if charge already exists for this date
      const existingCharge = await prisma.wardChargeRecord.findFirst({
        where: {
          attendanceId: admission.attendanceId!,
          chargeDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lt: new Date(targetDate.setHours(23, 59, 59, 999))
          }
        }
      });

      if (existingCharge) continue;

      // Determine daily rate based on payment mode
      let dailyRate = 0;
      let nhisPrice = 0;
      let cashPrice = 0;
      let insurancePrice = 0;

      switch (admission.attendance?.paymentMode) {
        case 'nhis':
          dailyRate = admission.ward.dailyNHISRate;
          nhisPrice = dailyRate;
          break;
        case 'private_insurance':
          dailyRate = admission.ward.dailyInsuranceRate;
          insurancePrice = dailyRate;
          break;
        default:
          dailyRate = admission.ward.dailyCashRate;
          cashPrice = dailyRate;
      }

      // Create ward charge record
      await prisma.wardChargeRecord.create({
        data: {
          attendanceId: admission.attendanceId!,
          admissionId: admission.id,
          wardId: admission.wardId,
          bedId: admission.bedId,
          chargeDate: targetDate,
          dailyRate,
          paymentMode: admission.attendance?.paymentMode || 'cash',
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
      },
      include: {
        attendance: {
          include: {
            bill: true
          }
        }
      }
    });

    for (const charge of unbilledCharges) {
      // Create service rendered entry for this ward charge
      const wardService = await prisma.serviceCatalog.findFirst({
        where: { 
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
            performedById: charge.attendance?.createdById || 'system',
            notes: `Daily bed charge - Day ${charge.chargeDate.toISOString().split('T')[0]}`
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
}