// LabTestRepository.ts - Data access layer for Lab Test module

import { PrismaClient, ServiceType, ServiceCategory } from '@prisma/client';
import { LabTestServiceQuery, CreateLabTestServiceDTO, UpdateLabTestServiceDTO } from './LabTestTypes';

export class LabTestRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ============================================
  // FIND ALL LAB TEST SERVICES
  // ============================================
  async findAll(query: LabTestServiceQuery) {
    const {
      serviceCategory,
      subType,
      isActive,
      isNHISCovered,
      page = 1,
      limit = 50
    } = query;

    const where: any = {
      serviceType: ServiceType.lab_test
    };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isNHISCovered !== undefined) {
      where.isNHISCovered = isNHISCovered;
    }

    if (serviceCategory) {
      where.serviceCategory = serviceCategory as ServiceCategory;
    }

    if (subType) {
      where.subType = subType;
    }

    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      this.prisma.serviceCatalog.findMany({
        where,
        include: {
          pricing: {
            select: {
              cashPrice: true,
              nhisPrice: true,
              insurancePrice: true,
              isActive: true
            }
          },
          LabTestTemplate: {
            select: {
              id: true,
              name: true,
              investigationCode: true,
              category: true
            }
          },
          labTests: {
            select: {
              id: true,
              status: true,
              Attendance: {
                select: {
                  attendanceNumber: true
                }
              }
            },
            take: 5,
            orderBy: {
              requestedAt: 'desc'
            }
          },
          User: {
            select: {
              id: true,
              fullName: true,
              username: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        skip,
        take: limitNum
      }),
      this.prisma.serviceCatalog.count({ where })
    ]);

    return { services, total, page: pageNum, limit: limitNum };
  }

  // ============================================
  // FIND LAB TEST SERVICE BY ID
  // ============================================
  async findById(id: string) {
    return this.prisma.serviceCatalog.findUnique({
      where: {
        id,
        serviceType: ServiceType.lab_test
      },
      include: {
        pricing: true,
        LabTestTemplate: {
          select: {
            id: true,
            name: true,
            investigationCode: true,
            category: true,
            specimenType: true
          }
        },
        LabTest: {
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
            },
            User_LabTest_performedByIdToUser: {
              select: {
                fullName: true,
                username: true
              }
            },
            User_LabTest_verifiedByIdToUser: {
              select: {
                fullName: true,
                username: true
              }
            }
          },
          orderBy: {
            requestedAt: 'desc'
          },
          take: 20
        },
        User: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        }
      }
    });
  }

  // ============================================
  // CREATE LAB TEST SERVICE
  // ============================================
  async create(data: CreateLabTestServiceDTO, createdById: string) {
    return this.prisma.$transaction(async (tx) => {
      const service = await tx.serviceCatalog.create({
        data: {
          name: data.name,
          code: data.code,
          description: data.description,
          serviceType: ServiceType.lab_test,
          serviceCategory: data.serviceCategory || ServiceCategory.diagnostics,
          subType: data.subType,
          nhisServiceCode: data.nhisServiceCode,
          tariffCode: data.tariffCode,
          isNHISCovered: data.isNHISCovered !== undefined ? data.isNHISCovered : true,
          nhisCoverageType: data.nhisCoverageType || 'full',
          nhisRequiresAuth: data.nhisRequiresAuth !== undefined ? data.nhisRequiresAuth : false,
          privateInsRequiresAuth: data.privateInsRequiresAuth !== undefined ? data.privateInsRequiresAuth : false,
          isPrivateInsuranceExempted: data.isPrivateInsuranceExempted !== undefined ? data.isPrivateInsuranceExempted : false,
          metadata: data.metadata || {
            specimenType: data.metadata?.specimenType,
            preparationInstructions: data.metadata?.preparationInstructions,
            turnaroundTime: data.metadata?.turnaroundTime,
            normalRange: data.metadata?.normalRange,
            containerType: data.metadata?.containerType,
            resultTemplate: data.metadata?.resultTemplate,
            storageRequirements: data.metadata?.storageRequirements
          },
          requiresClinicalNotes: data.requiresClinicalNotes !== undefined ? data.requiresClinicalNotes : false,
          isActive: data.isActive !== undefined ? data.isActive : true,
          unit: data.unit || 'Test',
          createdById
        }
      });

      const pricing = await tx.servicePricing.create({
        data: {
          serviceCatalogId: service.id,
          cashPrice: parseFloat(String(data.cashPrice)),
          nhisPrice: data.nhisPrice ? parseFloat(String(data.nhisPrice)) : 0,
          insurancePrice: parseFloat(String(data.insurancePrice)),
          vatRate: data.vatRate ? parseFloat(String(data.vatRate)) : 0,
          isTaxable: data.isTaxable !== undefined ? data.isTaxable : true,
          isActive: true,
          effectiveDate: new Date()
        }
      });

      return { ...service, pricing };
    });
  }

  // ============================================
  // UPDATE LAB TEST SERVICE
  // ============================================
  async update(id: string, data: UpdateLabTestServiceDTO) {
    const existingService = await this.prisma.serviceCatalog.findFirst({
      where: {
        id,
        serviceType: ServiceType.lab_test
      },
      include: {
        pricing: true
      }
    });

    if (!existingService) {
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const serviceUpdateData: any = {
        ...data,
        nhisRequiresAuth: data.nhisRequiresAuth !== undefined ? data.nhisRequiresAuth : undefined,
        privateInsRequiresAuth: data.privateInsRequiresAuth !== undefined ? data.privateInsRequiresAuth : undefined,
        isPrivateInsuranceExempted: data.isPrivateInsuranceExempted !== undefined ? data.isPrivateInsuranceExempted : undefined,
        updatedAt: new Date()
      };

      delete serviceUpdateData.cashPrice;
      delete serviceUpdateData.nhisPrice;
      delete serviceUpdateData.insurancePrice;
      delete serviceUpdateData.vatRate;
      delete serviceUpdateData.isTaxable;

      const service = await tx.serviceCatalog.update({
        where: { id },
        data: serviceUpdateData
      });

      let pricing = existingService.pricing;
      if (data.cashPrice !== undefined || data.nhisPrice !== undefined || data.insurancePrice !== undefined) {
        pricing = await tx.servicePricing.update({
          where: { serviceCatalogId: id },
          data: {
            cashPrice: data.cashPrice !== undefined ? parseFloat(String(data.cashPrice)) : undefined,
            nhisPrice: data.nhisPrice !== undefined ? parseFloat(String(data.nhisPrice)) : undefined,
            insurancePrice: data.insurancePrice !== undefined ? parseFloat(String(data.insurancePrice)) : undefined,
            vatRate: data.vatRate !== undefined ? parseFloat(String(data.vatRate)) : undefined,
            isTaxable: data.isTaxable !== undefined ? data.isTaxable : undefined,
            updatedAt: new Date()
          }
        });
      }

      return { ...service, pricing };
    });
  }

  // ============================================
  // DELETE LAB TEST SERVICE
  // ============================================
  async delete(id: string) {
    const existingService = await this.prisma.serviceCatalog.findFirst({
      where: {
        id,
        serviceType: ServiceType.lab_test
      },
      include: {
        LabTest: { take: 1 },
        pricing: true
      }
    });

    if (!existingService) {
      return { found: false, hasAssociatedTests: false };
    }

    if (existingService.LabTest.length > 0) {
      return { found: true, hasAssociatedTests: true };
    }

    await this.prisma.$transaction(async (tx) => {
      if (existingService.pricing) {
        await tx.servicePricing.delete({
          where: { serviceCatalogId: id }
        });
      }

      await tx.serviceCatalog.delete({
        where: { id }
      });
    });

    return { found: true, hasAssociatedTests: false, deleted: true };
  }

  // ============================================
  // GET LAB TEST SUB-CATEGORIES
  // ============================================
  async getSubCategories() {
    const subCategories = await this.prisma.serviceCatalog.findMany({
      distinct: ['subType'],
      select: {
        subType: true
      },
      where: {
        serviceType: ServiceType.lab_test,
        subType: {
          not: null
        }
      },
      orderBy: {
        subType: 'asc'
      }
    });

    return subCategories.map(item => item.subType).filter(Boolean) as string[];
  }

  // ============================================
  // BULK UPDATE LAB TEST SERVICES
  // ============================================
  async bulkUpdate(ids: string[], isActive: boolean) {
    const result = await this.prisma.serviceCatalog.updateMany({
      where: {
        id: { in: ids },
        serviceType: ServiceType.lab_test
      },
      data: {
        isActive,
        updatedAt: new Date()
      }
    });

    return result.count;
  }

  // ============================================
  // CHECK IF CODE EXISTS
  // ============================================
  async codeExists(code: string, excludeId?: string) {
    const existingService = await this.prisma.serviceCatalog.findUnique({
      where: { code }
    });

    if (!existingService) {
      return false;
    }

    if (excludeId && existingService.id === excludeId) {
      return false;
    }

    return true;
  }
}
