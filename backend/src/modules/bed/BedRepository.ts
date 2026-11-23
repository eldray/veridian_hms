import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateBedInput, UpdateBedInput, BedFilter, BedWithRelations } from './BedTypes';

export class BedRepository extends BaseRepository<any, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'bed');
  }

  async findAll(filter?: BedFilter, page: number = 1, limit: number = 50) {
    const where: any = {};
    if (filter?.wardId) where.wardId = filter.wardId;
    if (filter?.isOccupied !== undefined) where.isOccupied = filter.isOccupied;

    const result = await this.findManyWithPagination({
      where, page, limit,
      orderBy: [{ wardId: 'asc' }, { bedNumber: 'asc' }],
      include: {
        Ward: { select: { id: true, wardName: true, wardType: true } }
      }
    });

    // ✅ FIXED: Efficient reverse-lookup to find current occupants without N+1 queries
    const bedIds = result.data.map((b: any) => b.id);
    const activeAttendances = await this.prisma.attendance.findMany({
      where: { bedId: { in: bedIds }, status: { in: ['admitted', 'pending'] } },
      include: { Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } } }
    });

    const occupantMap = new Map(activeAttendances.map(a => [a.bedId, a.Patient]));

    const beds: BedWithRelations[] = result.data.map((bed: any) => ({
      ...bed,
      currentOccupant: occupantMap.get(bed.id) || null
    }));

    return { beds, total: result.total, page: result.page, limit: result.limit };
  }

  async findById(id: string): Promise<BedWithRelations | null> {
    const bed = await this.getModel().findUnique({
      where: { id },
      include: { Ward: { select: { id: true, wardName: true, wardType: true } } }
    });

    if (!bed) return null;

    // Reverse lookup for single bed
    const activeAttendance = await this.prisma.attendance.findFirst({
      where: { bedId: id, status: { in: ['admitted', 'pending'] } },
      include: { Patient: { select: { id: true, folderNumber: true, surname: true, otherNames: true } } }
    });

    return { ...bed, currentOccupant: activeAttendance?.Patient || null };
  }

  async create(data: CreateBedInput) {
    // ✅ FIXED: Wrapped in transaction to prevent desynchronized ward counts
    return this.prisma.$transaction(async (tx) => {
      const ward = await tx.ward.findUnique({
        where: { id: data.wardId },
        select: { id: true, wardName: true, totalBeds: true, isActive: true }
      });
      if (!ward) throw new Error('Ward not found');
      if (!ward.isActive) throw new Error('Cannot add beds to an inactive ward');

      const registeredBeds = await tx.bed.count({ where: { wardId: data.wardId } });
      if (registeredBeds >= ward.totalBeds) {
        throw new Error(`Ward has reached its configured capacity of ${ward.totalBeds} beds`);
      }

      return tx.bed.create({
        data: { wardId: data.wardId, bedNumber: data.bedNumber.trim(), isOccupied: false },
        include: { Ward: { select: { id: true, wardName: true, wardType: true } } }
      });
    });
  }

  async update(id: string, data: UpdateBedInput) {
    const updateData: any = {};
    if (data.bedNumber !== undefined) updateData.bedNumber = data.bedNumber.trim();
    if (data.isOccupied !== undefined) updateData.isOccupied = data.isOccupied;

    return this.getModel().update({
      where: { id }, data: updateData,
      include: { Ward: { select: { id: true, wardName: true, wardType: true } } }
    });
  }

  async delete(id: string) {
    // ✅ FIXED: Wrapped in transaction
    return this.prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findUnique({ where: { id } });
      if (!bed) throw new Error('Bed not found');
      if (bed.isOccupied) throw new Error('Cannot delete occupied bed');

      const activeAttendance = await tx.attendance.findFirst({
        where: { bedId: id, status: { in: ['admitted', 'pending'] } },
        select: { id: true }
      });
      if (activeAttendance) throw new Error('Cannot delete a bed assigned to an active patient');

      // Ward.totalBeds is the configured capacity, not a live count of Bed rows.
      await tx.bed.delete({ where: { id } });
    });
  }

  async findByWardAndBedNumber(wardId: string, bedNumber: string) {
    return this.getModel().findFirst({ where: { wardId, bedNumber: bedNumber.trim() } });
  }

  async findDuplicateInWard(wardId: string, bedNumber: string, excludeId?: string) {
    return this.getModel().findFirst({
      where: { wardId, bedNumber: bedNumber.trim(), id: excludeId ? { not: excludeId } : undefined }
    });
  }

  async wardExists(wardId: string): Promise<boolean> {
    return !!(await this.prisma.ward.findUnique({ where: { id: wardId } }));
  }

  async getStats() {
    const [total, occupied] = await Promise.all([
      this.getModel().count(),
      this.getModel().count({ where: { isOccupied: true } })
    ]);
    return { total, occupied, available: total - occupied };
  }
}