import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ServiceCatalogService {
  static async findServiceForReference(serviceType: string, referenceId: string): Promise<string | null> {
    try {
      const fieldMap: Record<string, string> = {
        lab_test: 'labTestTemplateId',
        procedure: 'procedureTemplateId',
        medication: 'stockItemId',
        scan: 'scanTemplateId',
      };

      const relationField = fieldMap[serviceType];
      if (!relationField) {
        console.warn(`Unsupported service type: ${serviceType}`);
        return null;
      }

      const serviceTypeMap: Record<string, string> = {
        lab_test: 'lab_test',
        procedure: 'procedure',
        medication: 'medication',
        scan: 'scan',
      };

      const actualServiceType = serviceTypeMap[serviceType] || serviceType;

      const service = await prisma.serviceCatalog.findFirst({
        where: {
          serviceType: actualServiceType,
          [relationField]: referenceId,
          isPending: true,
        }
      });
      
      return service?.id || null;
    } catch (error) {
      console.error(`Error finding service for ${serviceType}:`, error);
      return null;
    }
  }

  static async validateNHISReadiness(serviceId: string): Promise<{ isReady: boolean; missingFields: string[] }> {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      select: {
        serviceType: true,
        nhisServiceCode: true,
        tariffCode: true,
        // UPDATED: Check nhisPrice instead of insurancePrice
        nhisPrice: true
      }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    const missingFields: string[] = [];
    
    if (!service.nhisServiceCode) {
      missingFields.push('NHIS service code');
    }
    
    if (!service.tariffCode) {
      missingFields.push('Tariff code');
    }
    
    // UPDATED: Check nhisPrice instead of insurancePrice
    if (service.nhisPrice === null || service.nhisPrice === undefined) {
      missingFields.push('NHIS price');
    }

    return {
      isReady: missingFields.length === 0,
      missingFields
    };
  }

  static async getNHISReadinessReport() {
    const services = await prisma.serviceCatalog.findMany({
      where: { isPending: true },
      select: {
        id: true,
        name: true,
        code: true,
        serviceType: true,
        nhisServiceCode: true,
        requiresAuthorization: true
      }
    });
    
    const report = {
      totalServices: services.length,
      nhisReady: services.filter(s => s.nhisServiceCode).length,
      missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
      byServiceType: services.reduce((acc, service) => {
        const type = service.serviceType;
        if (!acc[type]) {
          acc[type] = { total: 0, nhisReady: 0, missing: 0 };
        }
        acc[type].total++;
        if (service.nhisServiceCode) {
          acc[type].nhisReady++;
        } else {
          acc[type].missing++;
        }
        return acc;
      }, {} as any),
      servicesMissingNHIS: services
        .filter(s => !s.nhisServiceCode)
        .map(s => ({ id: s.id, name: s.name, code: s.code, serviceType: s.serviceType }))
    };

    return report;
  }

  // ADD THIS METHOD
static async getServicesByCategory(category: 'opd' | 'ipd' | 'diagnostics' | 'pharmacy') {
  return await prisma.serviceCatalog.findMany({
    where: {
      serviceCategory: category,
      isPending: true
    },
    include: {
      diagnosis: true,
      labTestTemplate: true,
      procedureTemplate: true,
      stockItem: true,
      scanTemplate: true,
      ward: true
    }
  });
}

// UPDATE findServiceForReference to handle new categories
static async findServiceForReference(
  serviceType: string, 
  referenceId: string
): Promise<string | null> {
  try {
    const fieldMap: Record<string, string> = {
      lab_test: 'labTestTemplateId',
      procedure: 'procedureTemplateId',
      medication: 'stockItemId',
      scan: 'scanTemplateId',
      ward: 'wardId',
      consultation: 'code' // Handle consultations
    };

    const relationField = fieldMap[serviceType];
    if (!relationField) {
      console.warn(`Unsupported service type: ${serviceType}`);
      return null;
    }

    // Special handling for consultations
    if (serviceType === 'consultation') {
      const service = await prisma.serviceCatalog.findFirst({
        where: {
          serviceType: 'consultation',
          code: referenceId,
          isPending: true
        }
      });
      return service?.id || null;
    }

    const service = await prisma.serviceCatalog.findFirst({
      where: {
        serviceType: serviceType as any,
        [relationField]: referenceId,
        isPending: true
      }
    });

    return service?.id || null;
  } catch (error) {
    console.error(`Error finding service for ${serviceType}:`, error);
    return null;
  }
}

// ADD: Get NHIS readiness by category
static async getNHISReadinessByCategory() {
  const services = await prisma.serviceCatalog.findMany({
    where: { isPending: true },
    select: {
      serviceCategory: true,
      isNHISCovered: true,
      nhisServiceCode: true,
      nhisCoverageType: true
    }
  });

  const report: Record<string, any> = {
    opd: { total: 0, covered: 0, partial: 0, notCovered: 0 },
    ipd: { total: 0, covered: 0, partial: 0, notCovered: 0 },
    diagnostics: { total: 0, covered: 0, partial: 0, notCovered: 0 },
    pharmacy: { total: 0, covered: 0, partial: 0, notCovered: 0 }
  };

  services.forEach(s => {
    const cat = s.serviceCategory;
    report[cat].total++;
    
    if (!s.isNHISCovered) {
      report[cat].notCovered++;
    } else if (s.nhisCoverageType === 'full') {
      report[cat].covered++;
    } else if (s.nhisCoverageType === 'partial') {
      report[cat].partial++;
    }
  });

  return report;
}
}