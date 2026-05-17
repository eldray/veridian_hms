// GDRGRepository.ts - Data access layer for GDRG module

import { BaseRepository } from '../base/BaseRepository';
import { PrismaClient, GDRGMDC } from '@prisma/client';
import { GDRGTariff, GDRGDiagnosisLink, GDRGProcedureLink } from './GDRGTypes';

const prisma = new PrismaClient();

export class GDRGRepository extends BaseRepository<GDRGTariff> {
  constructor() {
    super();
  }

  async findAll(where?: any, include?: any) {
    return await prisma.gDRGTariff.findMany({
      where,
      include,
      orderBy: { gdrgCode: 'asc' }
    });
  }

  async findByCode(code: string, include?: any) {
    return await prisma.gDRGTariff.findUnique({
      where: { gdrgCode: code },
      include
    });
  }

  async create(data: any) {
    return await prisma.gDRGTariff.create({ data });
  }

  async update(code: string, data: any) {
    return await prisma.gDRGTariff.update({
      where: { gdrgCode: code },
      data
    });
  }

  async delete(code: string) {
    return await prisma.gDRGTariff.delete({
      where: { gdrgCode: code }
    });
  }

  async findFirst(where: any) {
    return await prisma.gDRGTariff.findFirst({ where });
  }

  // Diagnosis linking
  async linkDiagnosis(gdrgTariffId: string, diagnosisId: string, isPrimary: boolean, mappedIcdCode: string) {
    return await prisma.gDRGTariffDiagnosis.create({
      data: {
        gdrgTariffId,
        diagnosisId,
        isPrimary,
        mappedIcdCode
      },
      include: {
        gdrgTariff: true,
        diagnosis: true
      }
    });
  }

  async unlinkDiagnosis(gdrgTariffId: string, diagnosisId: string) {
    return await prisma.gDRGTariffDiagnosis.delete({
      where: {
        gdrgTariffId_diagnosisId: {
          gdrgTariffId,
          diagnosisId
        }
      }
    });
  }

  async getDiagnosesByGDRG(gdrgCode: string) {
    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode },
      include: {
        diagnoses: {
          include: {
            diagnosis: {
              select: {
                id: true,
                name: true,
                icdCode: true,
                morbidityGroup: true,
                isActive: true
              }
            }
          }
        }
      }
    });
    return tariff?.diagnoses || [];
  }

  async getGDRGByDiagnosis(diagnosisId: string) {
    return await prisma.gDRGTariffDiagnosis.findMany({
      where: { diagnosisId },
      include: {
        gdrgTariff: {
          select: {
            id: true,
            gdrgCode: true,
            description: true,
            nhiaTariff: true,
            mdc: true,
            ageSplit: true,
            isActive: true
          }
        }
      }
    });
  }

  // Procedure linking
  async linkProcedure(gdrgTariffId: string, procedureId: string, isPrimary: boolean, mappedCode: string) {
    return await prisma.gDRGTariffProcedure.create({
      data: {
        gdrgTariffId,
        procedureId,
        isPrimary,
        mappedCode
      },
      include: {
        gdrgTariff: true,
        procedure: true
      }
    });
  }

  async unlinkProcedure(gdrgTariffId: string, procedureId: string) {
    return await prisma.gDRGTariffProcedure.delete({
      where: {
        gdrgTariffId_procedureId: {
          gdrgTariffId,
          procedureId
        }
      }
    });
  }

  async getProceduresByGDRG(gdrgCode: string) {
    const tariff = await prisma.gDRGTariff.findUnique({
      where: { gdrgCode },
      include: {
        procedures: {
          include: {
            procedure: {
              include: { pricing: true }
            }
          }
        }
      }
    });
    return tariff?.procedures || [];
  }

  async getGDRGByProcedure(procedureId: string) {
    return await prisma.gDRGTariffProcedure.findMany({
      where: { procedureId },
      include: { gdrgTariff: true }
    });
  }
}
