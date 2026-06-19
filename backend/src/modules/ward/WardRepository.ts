import { PrismaClient, Ward, PaymentMode } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateWardDTO, UpdateWardDTO, WardFilters, Bed } from './WardTypes';

// ✅ Helper to safely convert Prisma Decimal objects to JS numbers for math
const toNumber = (val: any): number => val ? parseFloat(val.toString()) : 0;

export class WardRepository extends BaseRepository<Ward, CreateWardDTO, UpdateWardDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'ward');
  }

  async findAllWithFilters(filters: WardFilters): Promise<Ward[]> {
    const { isActive, wardType, hasAvailableBeds, isNHISCovered } = filters;
    const where: any = {};
    
    if (isActive !== undefined) where.isActive = isActive;
    if (wardType) where.wardType = wardType;
    if (isNHISCovered !== undefined) where.isNHISCovered = isNHISCovered;

    const wards = await this.getModel().findMany({ where, orderBy: { wardName: 'asc' } });

    // ✅ FIXED: Prisma doesn't support comparing two fields directly. Filter in memory.
    if (hasAvailableBeds) {
      return wards.filter(w => w.totalBeds > w.occupiedBeds);
    }
    
    return wards;
  }

  async findByIdWithDetails(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Bed: {
          select: { id: true, bedNumber: true, isOccupied: true }, // ✅ FIXED: Removed Patient/currentPatientId
          orderBy: { bedNumber: 'asc' }
        },
        ServiceCatalog: {
          where: { serviceType: 'ward', isActive: true },
          select: { id: true, name: true, code: true, isNHISCovered: true, nhisServiceCode: true, pricing: { where: { isActive: true }, take: 1 } }
        },
        _count: { select: { Bed: true, Admission: { where: { dischargeStatus: null } } } } // Active admissions
      }
    });
  }

  async getAvailableBeds(wardId?: string) {
    const where: any = { isOccupied: false };
    if (wardId) where.wardId = wardId;
    
    return this.prisma.bed.findMany({
      where,
      include: {
        Ward: {
          select: {
            id: true, wardName: true, wardType: true, isActive: true,
            dailyCashRate: true, dailyNHISRate: true, dailyInsuranceRate: true,
            vatRate: true, isTaxable: true, isNHISCovered: true, isPrivateInsExempted: true
          }
        }
      },
      orderBy: [{ Ward: { wardName: 'asc' } }, { bedNumber: 'asc' }]
    });
  }

  async getStats() {
    const wards = await this.getModel().findMany({
      select: { totalBeds: true, occupiedBeds: true, isActive: true, isNHISCovered: true, isPrivateInsExempted: true, dailyCashRate: true, dailyNHISRate: true, dailyInsuranceRate: true }
    });
    
    const totalWards = wards.length;
    const activeWards = wards.filter(w => w.isActive).length;
    const totalBeds = wards.reduce((sum, w) => sum + w.totalBeds, 0);
    const occupiedBeds = wards.reduce((sum, w) => sum + w.occupiedBeds, 0);
    
    const totalNHISCovered = wards.filter(w => w.isNHISCovered).length;
    const totalPrivateInsuranceCovered = wards.filter(w => !w.isPrivateInsExempted).length;
    const totalCashOnly = wards.filter(w => !w.isNHISCovered && w.isPrivateInsExempted).length;
    
    // ✅ FIXED: Safely parse Decimals before math
    const avgCashRate = wards.reduce((sum, w) => sum + toNumber(w.dailyCashRate), 0) / (wards.length || 1);
    const revenueAtFullOccupancy = totalBeds * avgCashRate;
    
    return {
      totalWards, activeWards, totalBeds, occupiedBeds,
      availableBeds: totalBeds - occupiedBeds,
      occupancyRate: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
      byPaymentMode: { totalNHISCovered, totalPrivateInsuranceCovered, totalCashOnly },
      revenueProjection: { dailyAtFullOccupancy: revenueAtFullOccupancy, monthlyAtFullOccupancy: revenueAtFullOccupancy * 30 }
    };
  }

  async findByName(name: string, excludeId?: string) {
    return this.getModel().findFirst({
      where: { wardName: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) }
    });
  }

  async calculateWardCharge(wardId: string, numberOfDays: number, paymentMode: PaymentMode) {
    const ward = await this.getModel().findUnique({
      where: { id: wardId },
      select: { dailyCashRate: true, dailyNHISRate: true, dailyInsuranceRate: true, vatRate: true, isTaxable: true }
    });

    if (!ward) throw new Error('Ward not found');

    // ✅ FIXED: Safely parse Decimals before math
    const cashRate = toNumber(ward.dailyCashRate);
    const nhisRate = toNumber(ward.dailyNHISRate);
    const insRate = toNumber(ward.dailyInsuranceRate);

    let dailyRate: number;
    switch (paymentMode) {
      case 'nhis': dailyRate = nhisRate || cashRate * 0.8; break;
      case 'private_insurance': dailyRate = insRate || cashRate * 0.9; break;
      case 'corporate': dailyRate = insRate || cashRate * 0.85; break;
      case 'cash': default: dailyRate = cashRate; break;
    }

    const subtotal = dailyRate * numberOfDays;
    const vatAmount = ward.isTaxable ? subtotal * (toNumber(ward.vatRate) / 100) : 0;

    return { dailyRate, subtotal, vatAmount, totalAmount: subtotal + vatAmount };
  }
}