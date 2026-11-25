import { BaseService } from '../../shared/base/BaseService';
import { GDRGRepository } from './GDRGRepository';
import { CreateGDRGTariffRequest, UpdateGDRGTariffRequest } from './GDRGTypes';
import { PrismaClient } from '@prisma/client';

export class GDRGService extends BaseService {
  private gdrgRepository: GDRGRepository;
  protected prisma: PrismaClient; // ✅ ADDED: To fix runtime crashes

  constructor(prismaClient: PrismaClient) {
    super('GDRGService');
    this.prisma = prismaClient; // ✅ ADDED: Assign prisma to class scope
    this.gdrgRepository = new GDRGRepository(prismaClient);
  }

  async getAllTariffs(where?: any, include?: any, page?: number, limit?: number) {
    this.logInfo('Fetching all GDRG tariffs', { where, page, limit });
    return await this.gdrgRepository.findAllWithFilters(where, include, page, limit);
  }

  async getTariffByCode(code: string, include?: any) {
    this.logDebug('Fetching GDRG tariff by code', { code });
    return await this.gdrgRepository.findByCode(code, include);
  }

  // ✅ REMOVED manual duplicate check! Prisma throws P2002 (mapped to 400 by BaseController)
  async createTariff(data: CreateGDRGTariffRequest) {
    this.logInfo('Creating new GDRG tariff', { gdrgCode: data.gdrgCode });
    return await this.gdrgRepository.createTariff({
      ...data,
      isActive: true,
      effectiveFrom: data.effectiveFrom || new Date(),
    });
  }

  // ✅ REMOVED manual existence check! Prisma throws P2025 (mapped to 404 by BaseController)
  async updateTariff(code: string, data: UpdateGDRGTariffRequest) {
    this.logInfo('Updating GDRG tariff', { code });
    return await this.gdrgRepository.updateTariff(code, data);
  }

  async deleteTariff(code: string) {
    this.logInfo('Deleting GDRG tariff', { code });
    
    const tariff = await this.gdrgRepository.findByCode(code, {
      diagnoses: true,
      procedures: true, // ✅ Check procedures too
      ServiceCatalog: true
    });

    if (!tariff) {
      const err = new Error('GDRG tariff not found') as any;
      err.status = 404;
      throw err;
    }

    // ✅ Set status to 409 (Conflict) so BaseController returns a proper error instead of 500
    if (tariff.diagnoses && tariff.diagnoses.length > 0) {
      const err = new Error('Cannot delete GDRG tariff with associated diagnoses. Remove diagnosis links first.') as any;
      err.status = 409;
      throw err;
    }

    if (tariff.procedures && tariff.procedures.length > 0) {
      const err = new Error('Cannot delete GDRG tariff with associated procedures. Remove procedure links first.') as any;
      err.status = 409;
      throw err;
    }

    if (tariff.ServiceCatalog && tariff.ServiceCatalog.length > 0) {
      const err = new Error('Cannot delete GDRG tariff with associated service catalog items.') as any;
      err.status = 409;
      throw err;
    }

    return await this.gdrgRepository.deleteTariff(code);
  }

  async lookupByAge(gdrgCode: string, patientId?: string, attendanceDate?: string, ageInYears?: number) {
    this.logDebug('Looking up GDRG by age', { gdrgCode, patientId, ageInYears });
    
    let ageInDays: number | undefined;
    let patientInfo: any = null;

    if (patientId) {
      // ✅ FIXED: Use this.prisma instead of undefined prisma
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { dateOfBirth: true, folderNumber: true }
      });

      if (patient) {
        const asOfDate = attendanceDate ? new Date(attendanceDate) : new Date();
        const diffTime = asOfDate.getTime() - patient.dateOfBirth.getTime();
        ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        patientInfo = { id: patientId, ageInDays, ageInYears: Math.floor(ageInDays / 365.25), folderNumber: patient.folderNumber };
      }
    } else if (ageInYears) {
      ageInDays = ageInYears * 365;
    }

    const ageInYearsNum = ageInDays ? Math.floor(ageInDays / 365) : null;
    
    const where: any = {
      gdrgCode, isActive: true,
      effectiveFrom: { lte: new Date() },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }]
    };

    if (ageInYearsNum !== null) {
      where.AND = [
        { OR: [{ minAgeYears: null }, { minAgeYears: { lte: ageInYearsNum } }] },
        { OR: [{ maxAgeYears: null }, { maxAgeYears: { gte: ageInYearsNum } }] }
      ];
    }

    const tariff = await this.gdrgRepository.findFirstTariff(where);
    const ageSplit = ageInYearsNum !== null && ageInYearsNum < 12 ? 'C' : 'A';

    return {
      gdrgCode, patient: patientInfo, tariff: tariff || null, ageSplit,
      nhiaTariff: tariff?.nhiaTariff || 0,
      message: tariff ? 'Tariff found' : 'No matching tariff found for this age'
    };
  }

  // ✅ REMOVED manual existence checks! Prisma handles P2003 (Invalid reference) and P2002 (Already linked)
  async linkDiagnosis(gdrgCode: string, diagnosisId: string, isPrimary: boolean, mappedIcdCode?: string) {
    this.logInfo('Linking diagnosis to GDRG tariff', { gdrgCode, diagnosisId });
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) throw new Error('GDRG tariff not found');

    // ✅ FIXED: Use this.prisma
    const diagnosis = await this.prisma.diagnosis.findUnique({ where: { id: diagnosisId } });
    if (!diagnosis) throw new Error('Diagnosis not found');

    return await this.gdrgRepository.linkDiagnosis(tariff.id, diagnosisId, isPrimary, mappedIcdCode || diagnosis.icdCode);
  }

  async unlinkDiagnosis(gdrgCode: string, diagnosisId: string) {
    this.logInfo('Unlinking diagnosis from GDRG tariff', { gdrgCode, diagnosisId });
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) throw new Error('GDRG tariff not found');
    return await this.gdrgRepository.unlinkDiagnosis(tariff.id, diagnosisId);
  }

  async getDiagnosesByGDRG(gdrgCode: string) {
    const links = await this.gdrgRepository.getDiagnosesByGDRG(gdrgCode);
    return links.map((d: any) => ({
      id: d.id, diagnosisId: d.diagnosisId, name: d.diagnosis?.name, icdCode: d.diagnosis?.icdCode,
      morbidityGroup: d.diagnosis?.morbidityGroup, isPrimary: d.isPrimary, mappedIcdCode: d.mappedIcdCode
    }));
  }

  async getGDRGByDiagnosis(diagnosisId: string) {
    const links = await this.gdrgRepository.getGDRGByDiagnosis(diagnosisId);
    return links.map((l: any) => ({
      id: l.gdrgTariff.id, gdrgCode: l.gdrgTariff.gdrgCode, description: l.gdrgTariff.description,
      nhiaTariff: l.gdrgTariff.nhiaTariff, mdc: l.gdrgTariff.mdc, ageSplit: l.gdrgTariff.ageSplit,
      isActive: l.gdrgTariff.isActive, isPrimary: l.isPrimary
    }));
  }

  // ✅ REMOVED manual existence checks!
  async linkProcedure(gdrgCode: string, procedureId: string, isPrimary: boolean, mappedCode?: string) {
    this.logInfo('Linking procedure to GDRG tariff', { gdrgCode, procedureId });
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) throw new Error('GDRG tariff not found');

    // ✅ FIXED: Use this.prisma
    const procedure = await this.prisma.serviceCatalog.findFirst({
      where: { id: procedureId, serviceType: 'procedure' }
    });
    if (!procedure) throw new Error('Procedure not found');

    return await this.gdrgRepository.linkProcedure(tariff.id, procedureId, isPrimary, mappedCode || procedure.code);
  }

  async unlinkProcedure(gdrgCode: string, procedureId: string) {
    this.logInfo('Unlinking procedure from GDRG tariff', { gdrgCode, procedureId });
    const tariff = await this.gdrgRepository.findByCode(gdrgCode);
    if (!tariff) throw new Error('GDRG tariff not found');
    return await this.gdrgRepository.unlinkProcedure(tariff.id, procedureId);
  }

  async getProceduresByGDRG(gdrgCode: string) {
    const links = await this.gdrgRepository.getProceduresByGDRG(gdrgCode);
    return links.map((p: any) => {
      const pricing = p.procedure.pricing?.[0]; // ✅ Get the first (active) pricing record
      return {
        id: p.procedure.id, name: p.procedure.name, code: p.procedure.code,
        isPrimary: p.isPrimary, mappedCode: p.mappedCode,
        cashPrice: pricing?.cashPrice, nhisPrice: pricing?.nhisPrice,
        insurancePrice: pricing?.insurancePrice, corporatePrice: pricing?.corporatePrice
      };
    });
  }

  async getGDRGByProcedure(procedureId: string) {
    const links = await this.gdrgRepository.getGDRGByProcedure(procedureId);
    return links.map((l: any) => ({
      id: l.gdrgTariff.id, gdrgCode: l.gdrgTariff.gdrgCode, description: l.gdrgTariff.description,
      nhiaTariff: l.gdrgTariff.nhiaTariff, isPrimary: l.isPrimary
    }));
  }
}