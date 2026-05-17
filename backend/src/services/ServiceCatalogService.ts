import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class ServiceCatalogService {

    // Get NHIS investigation code (for both Lab Tests and Scans)
  static getNHISInvestigationCode(serviceCatalog: any): string | null {
    // Priority order: investigationCode -> nhisServiceCode -> null
    return serviceCatalog?.investigationCode || serviceCatalog?.nhisServiceCode || null;
  }

  // Get drug code for medication
  static getDrugCode(stockItem: any, serviceCatalog: any): string | null {
    // Priority: drugCode from StockItem -> code from ServiceCatalog -> null
    return stockItem?.drugCode || serviceCatalog?.code || null;
  }

  // Get procedure code
  static getProcedureCode(serviceCatalog: any): string | null {
    return serviceCatalog?.procedureCode || null;
  }

  static async findServiceForReference(serviceType: string, referenceId: string): Promise<string | null> {
    try {
      const fieldMap: Record<string, string> = {
        lab_test: 'labTestTemplateId',
        procedure: 'procedureTemplateId',
        medication: 'stockItemId',
        scan: 'scanTemplateId',
        ward: 'wardId',
        consultation: 'consultationTypeId',
        diagnosis: 'diagnosisId'
      };

      const relationField = fieldMap[serviceType];
      if (!relationField) {
        console.warn(`Unsupported service type: ${serviceType}`);
        return null;
      }

      // Special handling for consultations - they use consultationTypeId
      if (serviceType === 'consultation') {
        const service = await prisma.serviceCatalog.findFirst({
          where: {
            serviceType: 'consultation',
            [relationField]: referenceId,
            isActive: true  // ✅ Changed from isPending to isActive
          }
        });
        return service?.id || null;
      }

      const serviceTypeMap: Record<string, string> = {
        lab_test: 'lab_test',
        procedure: 'procedure',
        medication: 'medication',
        scan: 'scan',
        ward: 'ward',
        consultation: 'consultation',
        diagnosis: 'diagnosis'
      };

      const actualServiceType = serviceTypeMap[serviceType] || serviceType;

      const service = await prisma.serviceCatalog.findFirst({
        where: {
          serviceType: actualServiceType as any,
          [relationField]: referenceId,
          isActive: true  // ✅ Changed from isPending to isActive
        }
      });
      
      return service?.id || null;
    } catch (error) {
      console.error(`Error finding service for ${serviceType}:`, error);
      return null;
    }
  }

  static async validateNHISReadiness(serviceId: string): Promise<{ isReady: boolean; missingFields: string[] }> {
    // ✅ Get service with its pricing
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: {
        pricing: true  // ✅ Include the related pricing model
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
    
    // ✅ Check nhisPrice from the pricing relationship, not directly on ServiceCatalog
    const nhisPrice = service.pricing?.nhisPrice;
    if (nhisPrice === null || nhisPrice === undefined || nhisPrice === 0) {
      missingFields.push('NHIS price (check service pricing)');
    }

    // ✅ Check NHIS coverage flags
    if (service.isNHISCovered === false) {
      missingFields.push('Service marked as not NHIS covered');
    }

    return {
      isReady: missingFields.length === 0,
      missingFields
    };
  }

  static async getNHISReadinessReport() {
    // ✅ Get services with their pricing
    const services = await prisma.serviceCatalog.findMany({
      where: { 
        isActive: true  // ✅ Changed from isPending to isActive
      },
      include: {
        pricing: true  // ✅ Include pricing
      },
      select: {
        id: true,
        name: true,
        code: true,
        serviceType: true,
        nhisServiceCode: true,
        tariffCode: true,
        isNHISCovered: true,
        nhisCoverageType: true,
        nhisRequiresAuth: true,  // ✅ Use correct field name
        pricing: {
          select: {
            nhisPrice: true
          }
        }
      }
    });
    
    const report = {
      totalServices: services.length,
      nhisReady: services.filter(s => s.nhisServiceCode && s.isNHISCovered && s.pricing?.nhisPrice > 0).length,
      missingNHISCodes: services.filter(s => !s.nhisServiceCode).length,
      missingNHISPrice: services.filter(s => !s.pricing || s.pricing.nhisPrice === 0).length,
      notNHISCovered: services.filter(s => !s.isNHISCovered).length,
      byServiceType: services.reduce((acc, service) => {
        const type = service.serviceType;
        if (!acc[type]) {
          acc[type] = { total: 0, nhisReady: 0, missing: 0 };
        }
        acc[type].total++;
        if (service.nhisServiceCode && service.isNHISCovered) {
          acc[type].nhisReady++;
        } else {
          acc[type].missing++;
        }
        return acc;
      }, {} as any),
      servicesMissingNHIS: services
        .filter(s => !s.nhisServiceCode || !s.isNHISCovered)
        .map(s => ({ 
          id: s.id, 
          name: s.name, 
          code: s.code, 
          serviceType: s.serviceType,
          hasNHISCode: !!s.nhisServiceCode,
          isCovered: s.isNHISCovered
        }))
    };

    return report;
  }

  static async getServicesByCategory(category: 'opd' | 'ipd' | 'diagnostics' | 'pharmacy') {
    return await prisma.serviceCatalog.findMany({
      where: {
        serviceCategory: category,
        isActive: true  // ✅ Changed from isPending to isActive
      },
      include: {
        diagnosis: true,
        labTestTemplate: true,
        procedureTemplate: true,
        stockItem: true,
        scanTemplate: true,
        ward: true,
        consultationType: true,
        pricing: true,  // ✅ Include pricing
        User: {
          select: {
            fullName: true
          }
        }
      }
    });
  }

  // ADD: Get NHIS readiness by category
  static async getNHISReadinessByCategory() {
    // ✅ Get services with pricing
    const services = await prisma.serviceCatalog.findMany({
      where: { 
        isActive: true  // ✅ Changed from isPending to isActive
      },
      include: {
        pricing: true
      },
      select: {
        serviceCategory: true,
        isNHISCovered: true,
        nhisServiceCode: true,
        nhisCoverageType: true,
        pricing: {
          select: {
            nhisPrice: true
          }
        }
      }
    });

    const report: Record<string, any> = {
      opd: { total: 0, covered: 0, partial: 0, notCovered: 0, hasPricing: 0 },
      ipd: { total: 0, covered: 0, partial: 0, notCovered: 0, hasPricing: 0 },
      diagnostics: { total: 0, covered: 0, partial: 0, notCovered: 0, hasPricing: 0 },
      pharmacy: { total: 0, covered: 0, partial: 0, notCovered: 0, hasPricing: 0 }
    };

    services.forEach(s => {
      const cat = s.serviceCategory;
      report[cat].total++;
      
      if (s.pricing?.nhisPrice > 0) {
        report[cat].hasPricing++;
      }
      
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

  // ✅ NEW: Get complete service details with pricing for billing
  static async getServiceWithPricing(serviceId: string) {
    return await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: {
        pricing: true,
        diagnosis: true,
        labTestTemplate: true,
        procedureTemplate: true,
        stockItem: true,
        scanTemplate: true,
        ward: true,
        consultationType: true,
        GDRGTariff: true
      }
    });
  }

  // ✅ NEW: Get price for service by payment mode
  static async getServicePrice(serviceId: string, paymentMode: 'cash' | 'nhis' | 'private_insurance') {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      include: { pricing: true }
    });

    if (!service) {
      throw new Error('Service not found');
    }

    if (!service.pricing) {
      throw new Error('No pricing configured for this service');
    }

    switch (paymentMode) {
      case 'cash':
        return service.pricing.cashPrice;
      case 'nhis':
        return service.pricing.nhisPrice;
      case 'private_insurance':
        return service.pricing.insurancePrice;
      default:
        return service.pricing.cashPrice;
    }
  }

  // ✅ NEW: Check authorization requirements
  static async requiresAuthorization(serviceId: string, paymentMode: 'nhis' | 'private_insurance'): Promise<boolean> {
    const service = await prisma.serviceCatalog.findUnique({
      where: { id: serviceId },
      select: {
        nhisRequiresAuth: true,
        privateInsRequiresAuth: true
      }
    });

    if (!service) return false;

    if (paymentMode === 'nhis') {
      return service.nhisRequiresAuth;
    }
    if (paymentMode === 'private_insurance') {
      return service.privateInsRequiresAuth;
    }

    return false;
  }
}