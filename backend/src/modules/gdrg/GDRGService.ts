// GDRGService.ts - Business logic layer for GDRG module

import { BaseService } from '../base/BaseService';
import { GDRGRepository } from './GDRGRepository';
import { GDRGTariff, CreateGDRGTariffRequest, UpdateGDRGTariffRequest } from './GDRGTypes';

export class GDRGService extends BaseService<GDRGTariff> {
  private gdrgRepository: GDRGRepository;

  constructor() {
    super();
    this.gdrgRepository = new GDRGRepository();
  }

  async getAllTariffs(where?: any, include?: any) {
    return await this.gdrgRepository.findAll(where, include);
  }

  async getTariffByCode(code: string, include?: any) {
    return await this.gdrgRepository.findByCode(code, include);
  }

  async createTariff(data: CreateGDRGTariffRequest) {
    // Check for duplicate
    const existing = await this.gdrgRepository.findByCode(data.gdrgCode);
    if (existing) {
      throw new Error('GDRG code already exists');
    }

    return await this.gdrgRepository.create({
      ...data,
      isActive: true,
      effectiveFrom: data.effectiveFrom || new Date()
    });
  }

  async updateTariff(code: string, data: UpdateGDRGTariffRequest) {
    const existing = await this.gdrgRepository.findByCode(code);
    if (!existing) {
      throw new Error('GDRG tariff not found');
    }

    return await this.gdrgRepository.update(code, {
      ...data,
      updatedAt: new Date()
    });
  }

  async deleteTariff(code: string) {
    const tariff = await this.gdrgRepository.findByCode(code, {
      diagnoses: true,
      ServiceCatalog: true
    });

    if (!tariff) {
      throw new Error('GDRG tariff not found');
    }

    if (tariff.diagnoses && tariff.diagnoses.length > 0) {
      throw new Error('Cannot delete GDRG tariff with associated diagnoses. Remove diagnosis links first.');
    }

    if (tariff.ServiceCatalog && tariff.ServiceCatalog.length > 0) {
      throw new Error('Cannot delete GDRG tariff with associated service catalog items.');
    }

    return await this.gdrgRepository.delete(code);
  }

  async lookupByAge(gdrgCode: string, patientId?: string, attendanceDate?: string, ageInYears?: number) {
    let ageInDays: number | undefined;
    let patientInfo: any = null;

    if (patientId) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { dateOfBirth: true, folderNumber: true }
      });

      if (patient) {
        const asOfDate = attendanceDate ? new Date(attendanceDate) : new Date();
        const diffTime = asOfDate.getTime() - patient.dateOfBirth.getTime();
        ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        patientInfo = {
          id: patientId,
          ageInDays,
          ageInYears: Math.floor(ageInDays / 365.25),
          folderNumber: patient.folderNumber
        };
      }
    } else if (ageInYears) {
      ageInDays = ageInYears * 365;
    }

    const ageInYearsNum = ageInDays ? Math.floor(ageInDays / 365) : null;
    
    const where: any = {
      gdrgCode,
      isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: new Date() } }
      ]
    };

    if (ageInYearsNum !== null) {
      where.AND = [
        {
          OR: [
            { minAgeYears: null },
            { minAgeYears: { lte: ageInYearsNum } }
          ]
        },
        {
          OR: [
            { maxAgeYears: null },
            { maxAgeYears: { gte: ageInYearsNum } }
          ]
        }
      ];
    }

    const tariff = await this.gdrgRepository.findFirst(where);
    const ageSplit = ageInYearsNum !== null && ageInYearsNum < 12 ? 'C' : 'A';

    return {
      gdrgCode,
      patient: patientInfo,
      tariff: tariff || null,
      ageSplit,
      message: tariff ? 'Tariff found' : 'No matching tariff found for this age'
    };
  }

  // Diagnosis linking
  async linkDiagnosis(gdrgCode: string, diagnosisId: string, isPrimary: boolean, mappedIcdCode?: string) {
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) {
      throw new Error('GDRG tariff not found');
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const diagnosis = await prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) {
      throw new Error('Diagnosis not found');
    }

    // Check if link already exists
    const existingLink = await prisma.gDRGTariffDiagnosis.findUnique({
      where: {
        gdrgTariffId_diagnosisId: {
          gdrgTariffId: tariff.id,
          diagnosisId
        }
      }
    });

    if (existingLink) {
      throw new Error('Diagnosis already linked to this GDRG tariff');
    }

    return await this.gdrgRepository.linkDiagnosis(
      tariff.id,
      diagnosisId,
      isPrimary,
      mappedIcdCode || diagnosis.icdCode
    );
  }

  async unlinkDiagnosis(gdrgCode: string, diagnosisId: string) {
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) {
      throw new Error('GDRG tariff not found');
    }

    return await this.gdrgRepository.unlinkDiagnosis(tariff.id, diagnosisId);
  }

  async getDiagnosesByGDRG(gdrgCode: string) {
    const links = await this.gdrgRepository.getDiagnosesByGDRG(gdrgCode);
    return links.map(d => ({
      id: d.id,
      diagnosisId: d.diagnosisId,
      name: d.diagnosis?.name,
      icdCode: d.diagnosis?.icdCode,
      morbidityGroup: d.diagnosis?.morbidityGroup,
      isPrimary: d.isPrimary,
      mappedIcdCode: d.mappedIcdCode
    }));
  }

  async getGDRGByDiagnosis(diagnosisId: string) {
    const links = await this.gdrgRepository.getGDRGByDiagnosis(diagnosisId);
    return links.map(l => ({
      id: l.gdrgTariff.id,
      gdrgCode: l.gdrgTariff.gdrgCode,
      description: l.gdrgTariff.description,
      nhiaTariff: l.gdrgTariff.nhiaTariff,
      mdc: l.gdrgTariff.mdc,
      ageSplit: l.gdrgTariff.ageSplit,
      isActive: l.gdrgTariff.isActive,
      isPrimary: l.isPrimary
    }));
  }

  // Procedure linking
  async linkProcedure(gdrgCode: string, procedureId: string, isPrimary: boolean, mappedCode?: string) {
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) {
      throw new Error('GDRG tariff not found');
    }

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const procedure = await prisma.serviceCatalog.findFirst({
      where: { id: procedureId, serviceType: 'procedure' }
    });
    if (!procedure) {
      throw new Error('Procedure not found');
    }

    const existingLink = await prisma.gDRGTariffProcedure.findUnique({
      where: {
        gdrgTariffId_procedureId: {
          gdrgTariffId: tariff.id,
          procedureId
        }
      }
    });

    if (existingLink) {
      throw new Error('Procedure already linked to this GDRG tariff');
    }

    return await this.gdrgRepository.linkProcedure(
      tariff.id,
      procedureId,
      isPrimary,
      mappedCode || procedure.code
    );
  }

  async unlinkProcedure(gdrgCode: string, procedureId: string) {
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) {
      throw new Error('GDRG tariff not found');
    }

    return await this.gdrgRepository.unlinkProcedure(tariff.id, procedureId);
  }

  async getProceduresByGDRG(gdrgCode: string) {
    const links = await this.gdrgRepository.getProceduresByGDRG(gdrgCode);
    return links.map(p => ({
      id: p.procedure.id,
      name: p.procedure.name,
      code: p.procedure.code,
      isPrimary: p.isPrimary,
      mappedCode: p.mappedCode,
      cashPrice: p.procedure.pricing?.cashPrice,
      nhisPrice: p.procedure.pricing?.nhisPrice
    }));
  }

  async getGDRGByProcedure(procedureId: string) {
    const links = await this.gdrgRepository.getGDRGByProcedure(procedureId);
    return links.map(l => ({
      id: l.gdrgTariff.id,
      gdrgCode: l.gdrgTariff.gdrgCode,
      description: l.gdrgTariff.description,
      nhiaTariff: l.gdrgTariff.nhiaTariff,
      isPrimary: l.isPrimary
    }));
  }
}
