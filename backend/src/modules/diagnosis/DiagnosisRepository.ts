// modules/diagnosis/DiagnosisRepository.ts

import { PrismaClient, MorbidityGroup } from '@prisma/client';
import { CreateDiagnosisDTO, UpdateDiagnosisDTO, DiagnosisFilterDTO } from './DiagnosisTypes';

export class DiagnosisRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================
  // FIND ALL DIAGNOSES WITH FILTERS
  // ============================================
  async findMany(filters: DiagnosisFilterDTO) {
    const {
      page = 1,
      limit = 50,
      morbidityGroup,
      isActive,
      search,
      searchField = 'all'
    } = filters;

    const take = Math.min(limit, 100); // ✅ Max 100 per page
    const skip = (page - 1) * take;

    const where: any = {};

    if (morbidityGroup) {
      where.morbidityGroup = morbidityGroup;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search && search.trim().length >= 2) {
      const searchTerm = search.trim();
      where.OR = [];

      if (searchField === 'all' || searchField === 'name') {
        where.OR.push({ name: { contains: searchTerm, mode: 'insensitive' } });
      }

      if (searchField === 'all' || searchField === 'icdCode') {
        where.OR.push({ icdCode: { contains: searchTerm, mode: 'insensitive' } });
      }

      if (searchField === 'all' || searchField === 'morbidityGroup') {
        where.OR.push({ morbidityGroup: { equals: searchTerm as MorbidityGroup } });
      }

      if (where.OR.length === 0) {
        where.OR.push({ name: { contains: searchTerm, mode: 'insensitive' } });
      }
    }

    const [diagnoses, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take
      }),
      this.prisma.diagnosis.count({ where })
    ]);

    return {
      data: diagnoses,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take)
      }
    };
  }

  // ============================================
  // FIND DIAGNOSIS BY ID
  // ============================================
  async findById(id: string) {
    return this.prisma.diagnosis.findUnique({
      where: { id },
      include: {
        gdrgTariffDiagnoses: {
          include: {
            gdrgTariff: {
              select: {
                id: true,
                gdrgCode: true,
                mdc: true,
                description: true,
                nhiaTariff: true,
                ageSplit: true,
                minAgeYears: true,
                maxAgeYears: true,
                applicableLevels: true,
                nhisServiceCode: true,
                isZoomCode: true,
                effectiveFrom: true,
                effectiveTo: true,
                isActive: true
              }
            }
          }
        },
        ServiceCatalog: {
          select: {
            id: true,
            name: true,
            code: true,
            serviceType: true,
            serviceCategory: true,
            pricing: {
              select: {
                cashPrice: true,
                nhisPrice: true,
                insurancePrice: true
              }
            }
          }
        }
      }
    });
  }

  // ============================================
  // CREATE DIAGNOSIS
  // ============================================
  async create(data: CreateDiagnosisDTO) {
    return this.prisma.diagnosis.create({
      data: {
        name: data.name.trim(),
        icdCode: data.icdCode.trim().toUpperCase(),
        morbidityGroup: data.morbidityGroup,
        description: data.description?.trim(),
        requiresAuthorization: data.requiresAuthorization || false,
        isChronic: data.isChronic || false,
        isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
        tariffCode: data.tariffCode || `DIAG-${data.icdCode}`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        gdrgTariffDiagnoses: {
          include: {
            gdrgTariff: {
              select: {
                gdrgCode: true,
                nhiaTariff: true
              }
            }
          }
        }
      }
    });
  }

  // ============================================
  // UPDATE DIAGNOSIS
  // ============================================
  async update(id: string, data: UpdateDiagnosisDTO) {
    const updateData: any = { ...data, updatedAt: new Date() };
    
    if (data.icdCode) {
      updateData.icdCode = data.icdCode.trim().toUpperCase();
    }
    
    if (data.name) {
      updateData.name = data.name.trim();
    }

    return this.prisma.diagnosis.update({
      where: { id },
      data: updateData,
      include: {
        gdrgTariffDiagnoses: {
          include: {
            gdrgTariff: {
              select: {
                gdrgCode: true,
                nhiaTariff: true
              }
            }
          }
        }
      }
    });
  }

  // ============================================
  // DELETE DIAGNOSIS
  // ============================================
  async delete(id: string) {
    return this.prisma.diagnosis.delete({
      where: { id }
    });
  }

  // ============================================
  // CHECK IF DIAGNOSIS EXISTS BY ICD CODE
  // ============================================
  async existsByIcdCode(icdCode: string, excludeId?: string) {
    const where: any = { icdCode: icdCode.trim().toUpperCase() };
    
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.diagnosis.findFirst({ where });
    return !!existing;
  }

  // ============================================
  // GET MORBIDITY GROUPS
  // ============================================
  async getMorbidityGroups() {
    return Object.values(MorbidityGroup);
  }

  // ============================================
  // GET DIAGNOSES BY MORBIDITY GROUP
  // ============================================
  async findByMorbidityGroup(morbidityGroup: MorbidityGroup, page: number = 1, limit: number = 50) {
    const limitNum = Math.min(100, Math.max(1, limit));
    const skip = (page - 1) * limitNum;

    const where = { morbidityGroup };

    const [diagnoses, total] = await Promise.all([
      this.prisma.diagnosis.findMany({
        where,
        select: {
          id: true,
          name: true,
          icdCode: true,
          morbidityGroup: true,
          description: true,
          isActive: true
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum
      }),
      this.prisma.diagnosis.count({ where })
    ]);

    return {
      morbidityGroup,
      count: total,
      diagnoses,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  // ============================================
  // GET DIAGNOSIS STATISTICS
  // ============================================
  async getStats() {
    const [
      totalDiagnoses,
      activeDiagnoses,
      diagnosesByMorbidityGroup,
      recentDiagnoses,
      diagnosesWithGDRG
    ] = await Promise.all([
      this.prisma.diagnosis.count(),
      this.prisma.diagnosis.count({ where: { isActive: true } }),
      this.prisma.diagnosis.groupBy({
        by: ['morbidityGroup'],
        _count: true
      }),
      this.prisma.diagnosis.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      this.prisma.diagnosis.count({
        where: {
          gdrgTariffDiagnoses: { some: {} }
        }
      })
    ]);

    return {
      total: totalDiagnoses,
      active: activeDiagnoses,
      inactive: totalDiagnoses - activeDiagnoses,
      byMorbidityGroup: diagnosesByMorbidityGroup,
      recentAdditions: recentDiagnoses,
      diagnosesWithGDRG,
      gdrgCoverage: totalDiagnoses > 0 
        ? ((diagnosesWithGDRG / totalDiagnoses) * 100).toFixed(1) + '%' 
        : '0%'
    };
  }

  // ============================================
  // CHECK FOR RELATED RECORDS BEFORE DELETE
  // ============================================
  async hasRelatedRecords(id: string) {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id },
      include: {
        ServiceCatalog: { take: 1 },
        gdrgTariffDiagnoses: { take: 1 }
      }
    });

    if (!diagnosis) {
      return false;
    }

    return (
      diagnosis.ServiceCatalog.length > 0 ||
      diagnosis.gdrgTariffDiagnoses.length > 0
    );
  }
}