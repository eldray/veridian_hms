// modules/procedure/ProcedureRepository.ts
import { PrismaClient, ServiceType, ServiceCategory, ProcedureCategory } from '@prisma/client';


export class ProcedureRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findTemplates(filters: {
    category?: string;
    department?: string;
    isActive?: boolean;
    page: number;
    limit: number;
  }) {
    const { category, department, isActive, page, limit } = filters;

    const where: any = {
      serviceType: ServiceType.procedure
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (category) {
      where.subType = category;
    }

    if (department) {
      where.department = department;
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: true,
          procedures: {
            select: { id: true, status: true },
            take: 1
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      this.prisma.serviceCatalog.count({ where })
    ]);

    return {
      templates,
      pagination: {
        currentPage: page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async findTemplateById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: {
        id,
        serviceType: ServiceType.procedure
      },
      include: {
        pricing: true,
        gdrgTariff: {  // ✅ ADDED
          select: {
            id: true,
            gdrgCode: true,
            description: true,
            nhiaTariff: true,
            mdc: true
          }
        },
        ward: {  // ✅ ADDED
          select: {
            id: true,
            wardName: true,
            wardType: true
          }
        },
        procedures: {
          include: {
            Attendance: {
              select: {
                attendanceNumber: true,
                Patient: {
                  select: {
                    surname: true,
                    otherNames: true,
                    folderNumber: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
  }

  async createTemplate(data: any, userId: string) {
    return this.prisma.serviceCatalog.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        serviceType: ServiceType.procedure,
        serviceCategory: data.serviceCategory,
        subType: data.category,
        department: data.department,  // ✅ ADDED - direct field
        nhisServiceCode: data.nhisServiceCode,
        tariffCode: data.tariffCode,
        isNHISCovered: data.isNHISCovered,
        nhisRequiresAuth: data.nhisRequiresAuth,  // ✅ ADDED
        isPrivateInsuranceExempted: data.isPrivateInsuranceExempted,  // ✅ ADDED
        privateInsRequiresAuth: data.privateInsRequiresAuth,  // ✅ ADDED
        requiresClinicalNotes: data.requiresClinicalNotes,  // ✅ ADDED
        duration: data.duration,  // ✅ ADDED - direct field
        isActive: data.isActive,
        unit: data.unit,
        gdrgTariffId: data.gdrgTariffId,  // ✅ ADDED
        wardId: data.wardId,  // ✅ ADDED
        metadata: {
          requiresAssistant: data.requiresAssistant,
          anesthesiaType: data.anesthesiaType,
          anesthesiaNotes: data.anesthesiaNotes,
          intraOperativeNotes: data.intraOperativeNotes,
          postOperativeNotes: data.postOperativeNotes,
          bloodLoss: data.bloodLoss,
          complications: data.complications,
          outcome: data.outcome,
          cost: data.cost
        },
        createdById: userId
      }
    });
  }

  async createPricing(data: {
    serviceCatalogId: string;
    cashPrice: number;
    nhisPrice: number;
    insurancePrice: number;
    vatRate: number;
    isTaxable: boolean;
  }) {
    return this.prisma.servicePricing.create({
      data: {
        serviceCatalogId: data.serviceCatalogId,
        cashPrice: data.cashPrice,
        nhisPrice: data.nhisPrice,
        insurancePrice: data.insurancePrice,
        vatRate: data.vatRate,
        isTaxable: data.isTaxable,
        isActive: true,
        effectiveDate: new Date()
      }
    });
  }

  async updateTemplate(id: string, data: any) {
    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async updatePricing(serviceCatalogId: string, data: any) {
    return this.prisma.servicePricing.update({
      where: { serviceCatalogId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.serviceCatalog.delete({
      where: { id }
    });
  }

  async deletePricing(serviceCatalogId: string) {
    return this.prisma.servicePricing.delete({
      where: { serviceCatalogId }
    });
  }

  async codeExists(code: string, excludeId?: string) {
    const where: any = { code };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const template = await this.prisma.serviceCatalog.findFirst({ where });
    return !!template;
  }

  async procedureCodeExists(procedureCode: string, excludeId?: string) {
    const where: any = { procedureCode };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const template = await this.prisma.serviceCatalog.findFirst({ where });
    return !!template;
  }

  async findWithRelations(id: string) {
    return this.prisma.serviceCatalog.findFirst({
      where: {
        id,
        serviceType: ServiceType.procedure
      },
      include: {
        procedures: { take: 1 },
        pricing: true
      }
    });
  }

  async bulkUpdate(ids: string[], isActive: boolean) {
    const result = await this.prisma.serviceCatalog.updateMany({
      where: {
        id: { in: ids },
        serviceType: ServiceType.procedure
      },
      data: {
        isActive,
        updatedAt: new Date()
      }
    });
    return result.count;
  }

  async getDepartments() {
    const services = await this.prisma.serviceCatalog.findMany({
      where: {
        serviceType: ServiceType.procedure,
        department: { not: null }
      },
      select: { department: true },
      distinct: ['department']
    });
    return services.map(s => s.department).filter(Boolean);
  }
}