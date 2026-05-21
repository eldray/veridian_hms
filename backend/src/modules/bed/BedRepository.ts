import { PrismaClient } from '@prisma/client';
import { Bed, BedWithRelations, CreateBedInput, UpdateBedInput, BedFilter } from './BedTypes';

export class BedRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(filter?: BedFilter, page: number = 1, limit: number = 50): Promise<{ beds: BedWithRelations[]; total: number }> {
    const where: any = {};
    
    if (filter?.wardId) {
      where.wardId = filter.wardId;
    }
    
    if (filter?.isOccupied !== undefined) {
      where.isOccupied = filter.isOccupied;
    }

    const skip = (page - 1) * limit;

    const [beds, total] = await Promise.all([
      this.prisma.bed.findMany({
        where,
        include: {
          Ward: {
            select: {
              id: true,
              wardName: true,
              wardType: true,
              isPending: true
            }
          },
          Patient: {
            select: {
              id: true,
              folderNumber: true,
              surname: true,
              otherNames: true
            }
          }
        },
        orderBy: [
          { wardId: 'asc' },
          { bedNumber: 'asc' }
        ],
        skip,
        take: limit
      }),
      this.prisma.bed.count({ where })
    ]);

    return { beds, total };
  }

  async findById(id: string): Promise<BedWithRelations | null> {
    return this.prisma.bed.findUnique({
      where: { id },
      include: {
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        },
        Patient: {
          select: {
            id: true,
            folderNumber: true,
            surname: true,
            otherNames: true
          }
        }
      }
    });
  }

  async create(data: CreateBedInput): Promise<BedWithRelations> {
    const bed = await this.prisma.bed.create({
      data: {
        wardId: data.wardId,
        bedNumber: data.bedNumber.trim(),
        isOccupied: false
      },
      include: {
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        }
      }
    });

    // Update ward bed count
    await this.prisma.ward.update({
      where: { id: data.wardId },
      data: {
        totalBeds: { increment: 1 }
      }
    });

    return bed;
  }

  async update(id: string, data: UpdateBedInput): Promise<BedWithRelations> {
    const updateData: any = {};
    
    if (data.bedNumber !== undefined) {
      updateData.bedNumber = data.bedNumber.trim();
    }
    
    if (data.isOccupied !== undefined) {
      updateData.isOccupied = data.isOccupied;
    }

    return this.prisma.bed.update({
      where: { id },
      data: updateData,
      include: {
        Ward: {
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    const bed = await this.prisma.bed.findUnique({
      where: { id },
      include: { Ward: true }
    });

    if (!bed) {
      throw new Error('Bed not found');
    }

    if (bed.isOccupied) {
      throw new Error('Cannot delete occupied bed');
    }

    await this.prisma.bed.delete({
      where: { id }
    });

    // Update ward bed count
    await this.prisma.ward.update({
      where: { id: bed.wardId },
      data: {
        totalBeds: { decrement: 1 }
      }
    });
  }

  async findByWardAndBedNumber(wardId: string, bedNumber: string): Promise<Bed | null> {
    return this.prisma.bed.findFirst({
      where: {
        wardId,
        bedNumber: bedNumber.trim()
      }
    });
  }

  async findDuplicateInWard(wardId: string, bedNumber: string, excludeId?: string): Promise<Bed | null> {
    return this.prisma.bed.findFirst({
      where: {
        wardId,
        bedNumber: bedNumber.trim(),
        id: excludeId ? { not: excludeId } : undefined
      }
    });
  }

  async wardExists(wardId: string): Promise<boolean> {
    const ward = await this.prisma.ward.findUnique({
      where: { id: wardId }
    });
    return !!ward;
  }

  async getStats(): Promise<{ total: number; occupied: number; available: number }> {
    const [total, occupied] = await Promise.all([
      this.prisma.bed.count(),
      this.prisma.bed.count({ where: { isOccupied: true } })
    ]);

    return {
      total,
      occupied,
      available: total - occupied
    };
  }
}