// modules/procedure/ProcedureRepository.ts

import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';
import { BaseRepository } from '../../shared/base/BaseRepository';

export class ProcedureRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  // ============================================
  // FIND PROCEDURE TEMPLATES
  // ============================================

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
      where.serviceCategory = category as ServiceCategory;
    }

    if (department) {
      where.metadata = {
        path: ['department'],
        equals: department
      };
    }

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: true,
          procedures: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
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

  // ============================================
  // FIND TEMPLATE BY ID
  // ============================================

  async findTemplateById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: {
        id,
        serviceType: ServiceType.procedure
      },
      include: {
        pricing: true,
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
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    });
  }

  // ============================================
  // CREATE TEMPLATE
  // ============================================

  async createTemplate(data: any, userId: string) {
    return this.prisma.serviceCatalog.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        serviceType: ServiceType.procedure,
        serviceCategory: data.serviceCategory as ServiceCategory,
        subType: data.category || null,
        nhisServiceCode: data.nhisServiceCode,
        tariffCode: data.tariffCode,
        isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
        metadata: {
          department: data.department,
          duration: data.duration || 30,
          requiresAssistant: data.requiresAssistant,
          anesthesiaType: data.anesthesiaType,
          anesthesiaNotes: data.anesthesiaNotes,
          intraOperativeNotes: data.intraOperativeNotes,
          postOperativeNotes: data.postOperativeNotes,
          bloodLoss: data.bloodLoss,
          complications: data.complications,
          outcome: data.outcome,
          cost: data.cost,
          procedureCategory: data.procedureCategory
        },
        isActive: data.isActive !== undefined ? data.isActive : true,
        unit: data.unit || 'Procedure',
        createdById: userId
      }
    });
  }

  // ============================================
  // CREATE PRICING
  // ============================================

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
        nhisPrice: data.nhisPrice || 0,
        insurancePrice: data.insurancePrice,
        vatRate: data.vatRate || 0,
        isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
        isActive: true,
        effectiveDate: new Date()
      }
    });
  }

  // ============================================
  // UPDATE TEMPLATE
  // ============================================

  async updateTemplate(id: string, data: any) {
    return this.prisma.serviceCatalog.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // ============================================
  // UPDATE PRICING
  // ============================================

  async updatePricing(serviceCatalogId: string, data: any) {
    return this.prisma.servicePricing.update({
      where: { serviceCatalogId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  // ============================================
  // DELETE TEMPLATE
  // ============================================

  async deleteTemplate(id: string) {
    return this.prisma.serviceCatalog.delete({
      where: { id }
    });
  }

  // ============================================
  // DELETE PRICING
  // ============================================

  async deletePricing(serviceCatalogId: string) {
    return this.prisma.servicePricing.delete({
      where: { serviceCatalogId }
    });
  }

  // ============================================
  // CHECK IF CODE EXISTS
  // ============================================

  async codeExists(code: string, excludeId?: string) {
    const where: any = { code };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const template = await this.prisma.serviceCatalog.findUnique({ where });
    return !!template;
  }

  // ============================================
  // FIND WITH PROCEDURES AND PRICING
  // ============================================

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

  // ============================================
  // BULK UPDATE
  // ============================================

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

  // ============================================
  // GET CATEGORIES
  // ============================================

  async getCategories() {
    return Object.values(ServiceCategory);
  }

  // ============================================
  // GET DEPARTMENTS
  // ============================================

  async getDepartments() {
    const services = await this.prisma.serviceCatalog.findMany({
      where: {
        serviceType: ServiceType.procedure,
        metadata: {
          path: ['department'],
          not: null
        }
      },
      select: { metadata: true }
    });

    const departments = services
      .map(service => (service.metadata as any)?.department)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index);

    return departments;
  }
}
