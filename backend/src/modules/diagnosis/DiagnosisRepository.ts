import { PrismaClient, MorbidityGroup, Prisma } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';
import { CreateDiagnosisDTO, UpdateDiagnosisDTO, DiagnosisFilterDTO } from './DiagnosisTypes';

export class DiagnosisRepository extends BaseRepository<any, CreateDiagnosisDTO, UpdateDiagnosisDTO> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'diagnosis');
  }

  async findManyWithFilters(filters: DiagnosisFilterDTO) {
    const {
      page = 1,
      limit = 50,
      morbidityGroup,
      isActive,
      search,
      searchField = 'all'
    } = filters;

    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const where: Prisma.DiagnosisWhereInput = {};

    if (morbidityGroup) where.morbidityGroup = morbidityGroup;
    if (isActive !== undefined) where.isActive = isActive;

    if (search && search.trim().length >= 2) {
      const searchTerm = search.trim();
      const orConditions: Prisma.DiagnosisWhereInput[] = [];

      if (searchField === 'all' || searchField === 'name') {
        orConditions.push({ name: { contains: searchTerm, mode: 'insensitive' } });
      }
      if (searchField === 'all' || searchField === 'icdCode') {
        orConditions.push({ icdCode: { contains: searchTerm, mode: 'insensitive' } });
      }
      if (searchField === 'all' || searchField === 'morbidityGroup') {
        orConditions.push({ morbidityGroup: { equals: searchTerm as MorbidityGroup } });
      }

      if (orConditions.length > 0) where.OR = orConditions;
    }

    const [diagnoses, total] = await Promise.all([
      this.getModel().findMany({ where, orderBy: { name: 'asc' }, skip, take }),
      this.getModel().count({ where })
    ]);

    return {
      data: diagnoses,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) // ✅ Aligned with BaseController
      }
    };
  }

  async findByIdWithRelations(id: string) {
    return this.getModel().findUnique({
      where: { id },
      include: {
        gdrgTariffDiagnoses: {
          include: {
            gdrgTariff: {
              select: {
                id: true, gdrgCode: true, mdc: true, description: true, nhiaTariff: true,
                ageSplit: true, minAgeYears: true, maxAgeYears: true, applicableLevels: true,
                nhisServiceCode: true, isZoomCode: true, effectiveFrom: true, effectiveTo: true, isActive: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true, name: true, code: true, serviceType: true, serviceCategory: true,
            pricing: { select: { cashPrice: true, nhisPrice: true, insurancePrice: true } }
          }
        }
      }
    });
  }

  async getMorbidityGroups() {
    return Object.values(MorbidityGroup);
  }

  async findByMorbidityGroup(morbidityGroup: MorbidityGroup, page: number = 1, limit: number = 50) {
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limitNum;
    const where = { morbidityGroup };

    const [diagnoses, total] = await Promise.all([
      this.getModel().findMany({
        where,
        select: { id: true, name: true, icdCode: true, morbidityGroup: true, description: true, isActive: true },
        orderBy: { name: 'asc' }, skip, take: limitNum
      }),
      this.getModel().count({ where })
    ]);

    return {
      diagnoses,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
    };
  }

  async getStats() {
    const [totalDiagnoses, activeDiagnoses, diagnosesByMorbidityGroup, recentDiagnoses, diagnosesWithGDRG] = await Promise.all([
      this.getModel().count(),
      this.getModel().count({ where: { isActive: true } }),
      this.getModel().groupBy({ by: ['morbidityGroup'], _count: true }),
      this.getModel().count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      this.getModel().count({ where: { gdrgTariffDiagnoses: { some: {} } } })
    ]);

    return {
      total: totalDiagnoses, active: activeDiagnoses, inactive: totalDiagnoses - activeDiagnoses,
      byMorbidityGroup: diagnosesByMorbidityGroup, recentAdditions: recentDiagnoses, diagnosesWithGDRG,
      gdrgCoverage: totalDiagnoses > 0 ? ((diagnosesWithGDRG / totalDiagnoses) * 100).toFixed(1) + '%' : '0%'
    };
  }

  async hasRelatedRecords(id: string) {
    const diagnosis = await this.getModel().findUnique({
      where: { id },
      include: {
        ServiceCatalog: { take: 1 },
        gdrgTariffDiagnoses: { take: 1 },
        attendanceDiagnoses: { take: 1 } // ✅ CRITICAL FIX: Prevent deleting diagnoses used in patient visits
      }
    });

    if (!diagnosis) return false;

    return (
      diagnosis.ServiceCatalog.length > 0 ||
      diagnosis.gdrgTariffDiagnoses.length > 0 ||
      diagnosis.attendanceDiagnoses.length > 0
    );
  }
}