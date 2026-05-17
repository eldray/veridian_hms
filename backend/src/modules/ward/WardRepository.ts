/**
 * Ward Repository
 * Data access layer for Ward entity
 */

import { PrismaClient, Ward } from '@prisma/client';
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
    const { isActive, wardType, hasAvailableBeds } = filters;
    
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (wardType) {
      where.wardType = wardType;
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
  async findByIdWithDetails(id: string): Promise<Ward & { 
    Bed: Bed[]; 
    ServiceCatalog: any[];
    _count: { Bed: number; Admission: number };
  } | null> {
    return this.getModel().findUnique({
      where: { id },
      include: {
        Bed: {
          select: {
            id: true,
            bedNumber: true,
            isOccupied: true,
            Patient: {
              select: {
                surname: true,
                otherNames: true,
                folderNumber: true
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
            nhisServiceCode: true
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
   * Get available beds
   */
  async getAvailableBeds(wardId?: string): Promise<(Bed & { Ward: { id: string; wardName: string; wardType: string; isActive: boolean } })[]> {
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
            isActive: true
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
   * Get ward statistics
   */
  async getStats(): Promise<{
    totalWards: number;
    activeWards: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
  }> {
    const wards = await this.getModel().findMany({
      select: {
        totalBeds: true,
        occupiedBeds: true,
        isActive: true
      }
    });
    
    const totalWards = wards.length;
    const activeWards = wards.filter(w => w.isActive).length;
    const totalBeds = wards.reduce((sum, w) => sum + w.totalBeds, 0);
    const occupiedBeds = wards.reduce((sum, w) => sum + w.occupiedBeds, 0);
    const availableBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
    
    return {
      totalWards,
      activeWards,
      totalBeds,
      occupiedBeds,
      availableBeds,
      occupancyRate
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
}
