import { BaseRepository } from '../../shared/base/BaseRepository';
import { PrismaClient } from '@prisma/client';
import { GDRGTariff } from './GDRGTypes';

export class GDRGRepository extends BaseRepository<GDRGTariff, any, any> {
  constructor(prisma: PrismaClient) {
    super(prisma, 'gDRGTariff');
  }

  async findAllWithFilters(where?: any, include?: any, page: number = 1, limit: number = 100) {
    const pageNum = Math.max(1, page);
    // ✅ Capped at 100 to match BaseController.getPaginationParams()
    const limitNum = Math.min(100, Math.max(1, limit)); 
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      this.getModel().findMany({ where, include, orderBy: { gdrgCode: 'asc' }, skip, take: limitNum }),
      this.getModel().count({ where })
    ]);

    return {
      data,
      pagination: {
        page: pageNum, limit: limitNum, total,
        totalPages: Math.ceil(total / limitNum) // ✅ Changed from 'pages' to 'totalPages'
      }
    };
  }

  async findByCode(code: string, include?: any) {
    return await this.getModel().findUnique({ where: { gdrgCode: code }, include });
  }

  async createTariff(data: any) {
    return await this.getModel().create({ data });
  }

  async updateTariff(code: string, data: any) {
    return await this.getModel().update({ where: { gdrgCode: code }, data });
  }

  async deleteTariff(code: string) {
    return await this.getModel().delete({ where: { gdrgCode: code } });
  }

  async findFirstTariff(where: any) {
    return await this.getModel().findFirst({ where });
  }

  async linkDiagnosis(gdrgTariffId: string, diagnosisId: string, isPrimary: boolean, mappedIcdCode: string) {
    return await this.prisma.gDRGTariffDiagnosis.create({
      data: { gdrgTariffId, diagnosisId, isPrimary, mappedIcdCode },
      include: { gdrgTariff: true, diagnosis: true }
    });
  }

  async unlinkDiagnosis(gdrgTariffId: string, diagnosisId: string) {
    return await this.prisma.gDRGTariffDiagnosis.delete({
      where: { gdrgTariffId_diagnosisId: { gdrgTariffId, diagnosisId } }
    });
  }

  async getDiagnosesByGDRG(gdrgCode: string) {
    const tariff = await this.getModel().findUnique({
      where: { gdrgCode },
      include: { diagnoses: { include: { diagnosis: { select: { id: true, name: true, icdCode: true, morbidityGroup: true, isActive: true } } } } }
    });
    return tariff?.diagnoses || [];
  }

  async getGDRGByDiagnosis(diagnosisId: string) {
    return await this.prisma.gDRGTariffDiagnosis.findMany({
      where: { diagnosisId },
      include: { gdrgTariff: { select: { id: true, gdrgCode: true, description: true, nhiaTariff: true, mdc: true, ageSplit: true, isActive: true } } }
    });
  }

  async linkProcedure(gdrgTariffId: string, procedureId: string, isPrimary: boolean, mappedCode: string) {
    return await this.prisma.gDRGTariffProcedure.create({
      data: { gdrgTariffId, procedureId, isPrimary, mappedCode },
      include: { gdrgTariff: true, procedure: true }
    });
  }

  async unlinkProcedure(gdrgTariffId: string, procedureId: string) {
    return await this.prisma.gDRGTariffProcedure.delete({
      where: { gdrgTariffId_procedureId: { gdrgTariffId, procedureId } }
    });
  }

  async getProceduresByGDRG(gdrgCode: string) {
    const tariff = await this.getModel().findUnique({
      where: { gdrgCode },
      include: {
        procedures: {
          include: {
            procedure: {
              // ✅ FIXED: Fetch only the active/latest price from the 1-to-N pricing relation
              include: { 
                pricing: {
                  where: { isActive: true },
                  take: 1,
                  orderBy: { effectiveDate: 'desc' }
                }
              }
            }
          }
        }
      }
    });
    return tariff?.procedures || [];
  }

  async getGDRGByProcedure(procedureId: string) {
    return await this.prisma.gDRGTariffProcedure.findMany({
      where: { procedureId },
      include: { 
        gdrgTariff: true,
        procedure: {
          include: {
            pricing: {
              where: { isActive: true },
              take: 1,
              orderBy: { effectiveDate: 'desc' }
            }
          }
        }
      }
    });
  }
}