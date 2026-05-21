/**
 * Ward Repository
 * Data access layer for Ward entity matching Prisma schema
 */

import { PrismaClient, Ward, PaymentMode } from '@prisma/client';
import { BaseRepository, FindManyOptions, PaginationResult } from '../../shared/base/BaseRepository';
import { CreateWardDTO, UpdateWardDTO, WardFilters, Bed } from './WardTypes';

export class WardRepository extends BaseRepository<Ward, CreateWardDTO, UpdateWardDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'ward');
  }

  /**
   * Find all wards with optional filters
   */
  async findAllWithFilters(filters: WardFilters): Promise<Ward[]> {
    const { isActive, wardType, hasAvailableBeds, isNHISCovered } = filters;
    
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (wardType) {
      where.wardType = wardType;
    }
    
    if (isNHISCovered !== undefined) {
      where.isNHISCovered = isNHISCovered;
    }
    
    if (hasAvailableBeds) {
      where.totalBeds = { gt: this.getModel().fields.occupiedBeds };
    }
    
    return this.getModel().findMany({
      where,
      orderBy: { wardName: 'asc' }
    });
  }

  /**
   * Find ward by ID with beds and service catalog
   */
  async findByIdWithDetails(id: string): Promise<(Ward & { 
    Bed: Bed[]; 
    ServiceCatalog: any[];
    _count: { Bed: number; Admission: number };
  }) | null> {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Bed: {
          select: {
            id: true,
            bedNumber: true,
            isOccupied: true,
            currentPatientId: true,
            Patient: {
              select: {
                id: true,
                surname: true,
                otherNames: true,
                folderNumber: true,
                paymentMode: true
              }
            }
          },
          orderBy: { bedNumber: 'asc' }
        },
        ServiceCatalog: {
          where: { 
            serviceType: 'ward',
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true,
            isNHISCovered: true,
            nhisServiceCode: true,
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true,
                corporatePrice: true,
                vatRate: true
              }
            }
          }
        },
        _count: {
          select: {
            Bed: true,
            Admission: {
              where: { status: 'admitted' }
            }
          }
        }
      }
    });
  }

  /**
   * Get available beds with rates for different payment modes
   */
  async getAvailableBeds(wardId?: string): Promise<(Bed & { 
    Ward: { 
      id: string; 
      wardName: string; 
      wardType: string; 
      isActive: boolean;
      dailyCashRate: number;
      dailyNHISRate: number;
      dailyInsuranceRate: number;
      vatRate: number;
      isTaxable: boolean;
      isNHISCovered: boolean;
      isPrivateInsExempted: boolean;
    } 
  })[]> {
    const where: any = {
      isOccupied: false
    };
    
    if (wardId) {
      where.wardId = wardId;
    }
    
    return this.prisma.bed.findMany({
      where,
      include: {
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true,
            isActive: true,
            dailyCashRate: true,
            dailyNHISRate: true,
            dailyInsuranceRate: true,
            vatRate: true,
            isTaxable: true,
            isNHISCovered: true,
            isPrivateInsExempted: true
          }
        }
      },
      orderBy: [
        { Ward: { wardName: 'asc' } },
        { bedNumber: 'asc' }
      ]
    });
  }

  /**
   * Get ward statistics with payment mode analysis
   */
  async getStats(): Promise<{
    totalWards: number;
    activeWards: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    byPaymentMode: {
      totalNHISCovered: number;
      totalPrivateInsuranceCovered: number;
      totalCashOnly: number;
    };
    revenueProjection: {
      dailyAtFullOccupancy: number;
      monthlyAtFullOccupancy: number;
    };
  }> {
    const wards = await this.getModel().findMany({
      select: {
        totalBeds: true,
        occupiedBeds: true,
        isActive: true,
        isNHISCovered: true,
        isPrivateInsExempted: true,
        dailyCashRate: true,
        dailyNHISRate: true,
        dailyInsuranceRate: true
      }
    });
    
    const totalWards = wards.length;
    const activeWards = wards.filter(w => w.isActive).length;
    const totalBeds = wards.reduce((sum, w) => sum + w.totalBeds, 0);
    const occupiedBeds = wards.reduce((sum, w) => sum + w.occupiedBeds, 0);
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
    
    // Payment mode analysis
    const totalNHISCovered = wards.filter(w => w.isNHISCovered).length;
    const totalPrivateInsuranceCovered = wards.filter(w => !w.isPrivateInsExempted).length;
    const totalCashOnly = wards.filter(w => !w.isNHISCovered && w.isPrivateInsExempted).length;
    
    // Revenue projection (using average of all rates)
    const avgCashRate = wards.reduce((sum, w) => sum + w.dailyCashRate, 0) / (wards.length || 1);
    const revenueAtFullOccupancy = totalBeds * avgCashRate;
    
    return {
      totalWards,
      activeWards,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate,
      byPaymentMode: {
        totalNHISCovered,
        totalPrivateInsuranceCovered,
        totalCashOnly
      },
      revenueProjection: {
        dailyAtFullOccupancy: revenueAtFullOccupancy,
        monthlyAtFullOccupancy: revenueAtFullOccupancy * 30
      }
    };
  }

  /**
   * Check if ward name exists
   */
  async findByName(name: string, excludeId?: string): Promise<Ward | null> {
    return this.getModel().findFirst({
      where: {
        wardName: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
  }

  /**
   * Get wards by NHIS coverage
   */
  async findByNHISCoverage(isCovered: boolean): Promise<Ward[]> {
    return this.getModel().findMany({
      where: { isNHISCovered: isCovered, isActive: true },
      orderBy: { wardName: 'asc' }
    });
  }

  /**
   * Get wards by private insurance coverage
   */
  async findByPrivateInsuranceCoverage(isExempted: boolean): Promise<Ward[]> {
    return this.getModel().findMany({
      where: { isPrivateInsExempted: isExempted, isActive: true },
      orderBy: { wardName: 'asc' }
    });
  }

  /**
   * Calculate ward charge for a specific payment mode
   */
  async calculateWardCharge(
    wardId: string, 
    numberOfDays: number, 
    paymentMode: PaymentMode
  ): Promise<{ dailyRate: number; subtotal: number; vatAmount: number; totalAmount: number }> {
    const ward = await this.getModel().findUnique({
      where: { id: wardId },
      select: {
        dailyCashRate: true,
        dailyNHISRate: true,
        dailyInsuranceRate: true,
        vatRate: true,
        isTaxable: true
      }
    });

    if (!ward) {
      throw new Error('Ward not found');
    }

    let dailyRate: number;
    switch (paymentMode) {
      case 'nhis':
        dailyRate = ward.dailyNHISRate || ward.dailyCashRate * 0.8;
        break;
      case 'private_insurance':
        dailyRate = ward.dailyInsuranceRate || ward.dailyCashRate * 0.9;
        break;
      case 'corporate':
        // Corporate uses insurance rate or 10% discount
        dailyRate = ward.dailyInsuranceRate || ward.dailyCashRate * 0.85;
        break;
      case 'cash':
      default:
        dailyRate = ward.dailyCashRate;
        break;
    }

    const subtotal = dailyRate * numberOfDays;
    const vatAmount = ward.isTaxable ? subtotal * (ward.vatRate / 100) : 0;
    const totalAmount = subtotal + vatAmount;

    return { dailyRate, subtotal, vatAmount, totalAmount };
  }
}